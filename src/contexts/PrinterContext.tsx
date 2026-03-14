import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useGlobalAlert } from './AlertContext';
import { TemplateRow, PaperSize } from '../types';
import { getSettings, saveSettings } from '../utils/storage';

// Lazy-load native Bluetooth module — crashes in Expo Go
let BLEPrinter: any = null;
let RNBLEPrinter: any = null;
let nativeModulesAvailable = false;

try {
  // Check if the actual native module is registered (not just the JS wrapper)
  const hasNativeModule = !!NativeModules.RNBLEPrinter;
  if (hasNativeModule) {
    const thermalPrinter = require('react-native-thermal-receipt-printer-image-qr');
    BLEPrinter = thermalPrinter.BLEPrinter;
    RNBLEPrinter = NativeModules.RNBLEPrinter;
    nativeModulesAvailable = !!BLEPrinter;
  }
} catch {
  // Native modules not available (Expo Go)
}

export interface BluetoothDevice {
  device_name: string;
  inner_mac_address: string;
}

interface PrinterContextType {
  isConnected: boolean;
  connectedDevice: BluetoothDevice | null;
  isScanning: boolean;
  devices: BluetoothDevice[];
  isNativeAvailable: boolean;
  scanDevices: () => Promise<void>;
  connectDevice: (address: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  printReceipt: (rows: TemplateRow[], paperSize: PaperSize) => Promise<boolean>;
}

const PrinterContext = createContext<PrinterContextType>({
  isConnected: false,
  connectedDevice: null,
  isScanning: false,
  devices: [],
  isNativeAvailable: false,
  scanDevices: async () => {},
  connectDevice: async () => false,
  disconnect: async () => {},
  printReceipt: async () => false,
});

export const usePrinter = () => useContext(PrinterContext);

async function requestBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = Platform.Version;

    if (typeof apiLevel === 'number' && apiLevel >= 31) {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return (
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === 'granted' &&
        results[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === 'granted' &&
        results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === 'granted'
      );
    } else {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return result === 'granted';
    }
  } catch {
    return false;
  }
}

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const { showAlert } = useGlobalAlert();
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const devicesRef = useRef<BluetoothDevice[]>([]);

  // Keep ref in sync with state to avoid stale closures
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const scanDevices = useCallback(async () => {
    if (!nativeModulesAvailable) {
      showAlert('error', 'Bluetooth Not Available',
        'Bluetooth native module is not loaded. This can happen in Expo Go or if the app needs to be rebuilt.\n\nRun: npx eas build --platform android --profile preview\n\nThen install the new APK on your phone.'
      );
      return;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      showAlert('warning', 'Permission Required', 'Bluetooth and Location permissions are needed to scan for printers.');
      return;
    }

    setIsScanning(true);
    setDevices([]);

    try {
      // Initialize Bluetooth adapter
      await BLEPrinter.init();

      // Get paired devices — only devices already paired in Android Bluetooth settings will appear
      // Note: library rejects with "No Device Found" when list is empty instead of returning []
      let deviceList: BluetoothDevice[] = [];
      try {
        deviceList = await BLEPrinter.getDeviceList();
      } catch (listErr: any) {
        const listMsg = listErr?.message || String(listErr);
        // "No Device Found" means empty list, not an error
        if (!listMsg.includes('No Device Found')) {
          throw listErr;
        }
      }

      setDevices(deviceList || []);

      if (!deviceList || deviceList.length === 0) {
        showAlert('info', 'No Paired Printers Found',
          'This app shows devices that are already paired in your phone\'s Bluetooth settings.\n\n' +
          'Steps:\n' +
          '1. Turn on your printer\n' +
          '2. Open Android Settings → Bluetooth\n' +
          '3. Pair with your printer there\n' +
          '4. Come back and tap "Connect Printer" again',
          [
            { text: 'Open Bluetooth Settings', onPress: () => Linking.openSettings().catch(() => {}) },
            { text: 'OK', style: 'cancel' },
          ]
        );
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('not enabled')) {
        showAlert('error', 'Bluetooth Off', 'Please turn on Bluetooth and try again.');
      } else {
        showAlert('error', 'Scan Failed', msg || 'Could not scan for Bluetooth devices.');
      }
    } finally {
      setIsScanning(false);
    }
  }, []);

  const connectDevice = useCallback(async (address: string): Promise<boolean> => {
    if (!nativeModulesAvailable) return false;

    try {
      await BLEPrinter.connectPrinter(address);
      const device = devicesRef.current.find(d => d.inner_mac_address === address);
      setIsConnected(true);
      setConnectedDevice(device || { device_name: 'Printer', inner_mac_address: address });

      // Save last connected printer
      const settings = await getSettings();
      await saveSettings({ ...settings, lastPrinterAddress: address });

      return true;
    } catch (err: any) {
      showAlert('error', 'Connection Failed', err?.message || 'Could not connect to printer.');
      setIsConnected(false);
      setConnectedDevice(null);
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      if (nativeModulesAvailable) {
        await BLEPrinter.closeConn();
      }
    } catch {
      // Ignore disconnect errors
    }
    setIsConnected(false);
    setConnectedDevice(null);
  }, []);

  const printReceipt = useCallback(async (rows: TemplateRow[], paperSize: PaperSize): Promise<boolean> => {
    if (!nativeModulesAvailable) {
      showAlert('info', 'Expo Go Detected',
        'Bluetooth printing requires a development build (APK). Bill has been saved to history.'
      );
      return false;
    }

    if (!isConnected) {
      showAlert('warning', 'Not Connected', 'Please connect to a Bluetooth printer first.');
      return false;
    }

    const charWidth = paperSize === '58mm' ? 32 : 48;

    try {
      // Build receipt as segments: text chunks and image commands
      // We split at image rows because images need a separate native call (printImageBase64)
      type Segment = { type: 'text'; content: string } | { type: 'image'; uri: string; width: number; height: number };
      const segments: Segment[] = [];
      let currentText = '';

      const flushText = () => {
        if (currentText) {
          segments.push({ type: 'text', content: currentText });
          currentText = '';
        }
      };

      const buildTextLine = (row: TemplateRow): string => {
        const text = row.text || '';
        const size = row.fontSize || 'normal';
        let line = '';

        if (size === 'large') {
          // <CB> = center + bold + double, <B> = bold + double, <CD>/<D> = double only
          if (row.align === 'center' && row.bold) {
            line = `<CB>${text}</CB>`;
          } else if (row.align === 'center') {
            line = `<CD>${text}</CD>`;
          } else if (row.bold && row.align === 'right') {
            line = `<B>${text.padStart(Math.floor(charWidth / 2))}</B>`;
          } else if (row.bold) {
            line = `<B>${text}</B>`;
          } else if (row.align === 'right') {
            line = `<D>${text.padStart(Math.floor(charWidth / 2))}</D>`;
          } else {
            line = `<D>${text}</D>`;
          }
        } else {
          // <M> = bold only (normal size), <CM> = center + bold only
          // <B>/<CB> are bold + double-size — only for 'large' fontSize
          if (row.align === 'center' && row.bold) {
            line = `<CM>${text}</CM>`;
          } else if (row.align === 'center') {
            line = `<C>${text}</C>`;
          } else if (row.bold && row.align === 'right') {
            line = `<M>${text.padStart(charWidth)}</M>`;
          } else if (row.bold) {
            line = `<M>${text}</M>`;
          } else if (row.align === 'right') {
            line = text.padStart(charWidth);
          } else {
            line = text;
          }
        }
        return line + '\n';
      };

      for (const row of rows) {
        switch (row.type) {
          case 'text':
          case 'auto-date':
          case 'auto-time':
          case 'select':
          case 'input': {
            currentText += buildTextLine(row);
            break;
          }

          case 'separator': {
            currentText += `<C>${'-'.repeat(charWidth)}</C>\n`;
            break;
          }

          case 'qr-code': {
            if (row.text) {
              currentText += `<C>${row.text}</C>\n`;
            }
            break;
          }

          case 'barcode': {
            if (row.text) {
              currentText += `<C>${row.text}</C>\n`;
            }
            break;
          }

          case 'image': {
            if (row.imageUri) {
              flushText();
              // Scale image based on imageSize setting
              // 58mm paper ≈ 384 dots, 80mm ≈ 576 dots
              const fullWidth = paperSize === '58mm' ? 384 : 576;
              const sizeFactor = row.imageSize === 'small' ? 0.35
                : row.imageSize === 'large' ? 0.8
                : 0.55; // medium default
              const printWidth = Math.round(fullWidth * sizeFactor);
              // Calculate height maintaining aspect ratio
              // Library doesn't auto-scale height, so we must compute it
              const origW = row.imageWidth || 200;
              const origH = row.imageHeight || 200;
              const printHeight = Math.round(printWidth * (origH / origW));
              segments.push({
                type: 'image',
                uri: row.imageUri,
                width: printWidth,
                height: printHeight,
              });
            }
            break;
          }
        }
      }
      flushText();

      // Pre-check: verify Bluetooth socket is still alive before printing.
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        RNBLEPrinter.printRawData('', (error: string) => {
          if (!settled) {
            settled = true;
            reject(new Error(error));
          }
        });
        setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, 500);
      });

      // Print each segment sequentially with small delays between them
      const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (i > 0) await delay(300);
        if (segment.type === 'text') {
          BLEPrinter.printBill(segment.content, { encoding: 'UTF8' });
        } else if (segment.type === 'image') {
          try {
            const base64 = await FileSystem.readAsStringAsync(segment.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            await new Promise<void>((resolve, reject) => {
              let settled = false;
              RNBLEPrinter.printImageBase64(
                base64,
                segment.width,
                segment.height,
                (error: string) => {
                  if (!settled) { settled = true; reject(new Error(error)); }
                }
              );
              setTimeout(() => {
                if (!settled) { settled = true; resolve(); }
              }, 3000);
            });
          } catch (imgErr: any) {
            console.warn('Image print failed:', imgErr?.message);
          }
        }
      }

      return true;
    } catch (err: any) {
      showAlert('error', 'Print Failed', err?.message || 'Could not print. Check printer connection.');
      setIsConnected(false);
      setConnectedDevice(null);
      return false;
    }
  }, [isConnected]);

  return (
    <PrinterContext.Provider
      value={{
        isConnected,
        connectedDevice,
        isScanning,
        devices,
        isNativeAvailable: nativeModulesAvailable,
        scanDevices,
        connectDevice,
        disconnect,
        printReceipt,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}
