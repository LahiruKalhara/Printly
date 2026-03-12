import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Alert, Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
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
      Alert.alert(
        'Bluetooth Not Available',
        'Bluetooth native module is not loaded. This can happen in Expo Go or if the app needs to be rebuilt.\n\nRun: npx eas build --platform android --profile preview\n\nThen install the new APK on your phone.'
      );
      return;
    }

    const hasPermission = await requestBluetoothPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Bluetooth and Location permissions are needed to scan for printers.');
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
        Alert.alert(
          'No Paired Printers Found',
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
        Alert.alert('Bluetooth Off', 'Please turn on Bluetooth and try again.');
      } else {
        Alert.alert('Scan Failed', msg || 'Could not scan for Bluetooth devices.');
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
      Alert.alert('Connection Failed', err?.message || 'Could not connect to printer.');
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
      Alert.alert(
        'Expo Go Detected',
        'Bluetooth printing requires a development build (APK). Bill has been saved to history.'
      );
      return false;
    }

    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to a Bluetooth printer first.');
      return false;
    }

    const charWidth = paperSize === '58mm' ? 32 : 48;

    try {
      // Build receipt text with HTML-like tags that the library processes internally
      // The library converts these tags to ESC/POS commands and Base64-encodes for the native side
      // Tags: <C> center, <B> bold, <CB> center+bold, <D> double, <M> medium
      let receiptText = '';

      for (const row of rows) {
        switch (row.type) {
          case 'text':
          case 'auto-date':
          case 'auto-time':
          case 'select':
          case 'input': {
            const text = row.text || '';
            let line = '';

            if (row.align === 'center' && row.bold) {
              line = `<CB>${text}</CB>`;
            } else if (row.align === 'center') {
              line = `<C>${text}</C>`;
            } else if (row.bold && row.align === 'right') {
              line = `<B>${text.padStart(charWidth)}</B>`;
            } else if (row.bold) {
              line = `<B>${text}</B>`;
            } else if (row.align === 'right') {
              line = text.padStart(charWidth);
            } else {
              line = text;
            }

            receiptText += line + '\n';
            break;
          }

          case 'separator': {
            receiptText += '-'.repeat(charWidth) + '\n';
            break;
          }

          case 'qr-code': {
            // Library doesn't support QR via printBill tags — print as text
            if (row.text) {
              receiptText += `<C>${row.text}</C>\n`;
            }
            break;
          }

          case 'barcode': {
            if (row.text) {
              receiptText += `<C>${row.text}</C>\n`;
            }
            break;
          }

          case 'image': {
            receiptText += `<C>[Image]</C>\n`;
            break;
          }
        }
      }

      // Pre-check: verify Bluetooth socket is still alive before printing.
      // The native printRawData checks socket != null synchronously and calls errorCallback if dead.
      // printBill itself is fire-and-forget (errors go to console.warn), so we check first.
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        // Send a no-op base64 payload to trigger the native socket-null check
        // Base64 of empty = "", native decodes to 0 bytes, writes nothing, but checks socket first
        RNBLEPrinter.printRawData('', (error: string) => {
          if (!settled) {
            settled = true;
            reject(new Error(error));
          }
        });
        // If errorCallback doesn't fire through the bridge within 500ms, socket is alive
        setTimeout(() => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, 500);
      });

      // Socket is alive — send the actual print job
      // printBill converts HTML-like tags to ESC/POS bytes, Base64-encodes, and sends to printer
      BLEPrinter.printBill(receiptText, { encoding: 'UTF8' });

      return true;
    } catch (err: any) {
      Alert.alert('Print Failed', err?.message || 'Could not print. Check printer connection.');
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
