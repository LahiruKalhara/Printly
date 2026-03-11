import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { TemplateRow, PaperSize } from '../types';
import { getSettings, saveSettings } from '../utils/storage';

// Lazy-load native Bluetooth module — crashes in Expo Go
let BLEPrinter: any = null;
let nativeModulesAvailable = false;

try {
  const thermalPrinter = require('react-native-thermal-receipt-printer-image-qr');
  BLEPrinter = thermalPrinter.BLEPrinter;
  nativeModulesAvailable = !!BLEPrinter;
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

  const scanDevices = useCallback(async () => {
    if (!nativeModulesAvailable) {
      Alert.alert(
        'Expo Go Detected',
        'Bluetooth printing requires a development build (APK).\n\nRun: npx eas build --platform android --profile preview\n\nThen install the APK on your phone.'
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
      // Initialize BLE printer module
      await BLEPrinter.init();

      // Get device list (paired BLE devices)
      const deviceList: BluetoothDevice[] = await BLEPrinter.getDeviceList();
      setDevices(deviceList || []);
    } catch (err: any) {
      Alert.alert('Scan Failed', err?.message || 'Could not scan for Bluetooth devices. Make sure Bluetooth is enabled.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const connectDevice = useCallback(async (address: string): Promise<boolean> => {
    if (!nativeModulesAvailable) return false;

    try {
      await BLEPrinter.connectPrinter(address);
      const device = devices.find(d => d.inner_mac_address === address);
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
  }, [devices]);

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
      // Build the receipt text with ESC/POS formatting tags
      // The library uses HTML-like tags: <C>, <B>, <CB>, <CM>, <CD>, <D>, <M>
      // C = center, B = bold, D = double, M = medium
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

            // Apply alignment
            if (row.align === 'center') line += '<C>';
            // Right alignment: pad with spaces
            if (row.align === 'right') {
              const padded = text.padStart(charWidth);
              line += row.bold ? `<B>${padded}</B>` : padded;
            } else {
              line += row.bold ? `<B>${text}</B>` : text;
            }
            if (row.align === 'center') line += '</C>';

            receiptText += line + '\n';
            break;
          }

          case 'separator': {
            receiptText += '-'.repeat(charWidth) + '\n';
            break;
          }

          case 'qr-code':
          case 'barcode':
          case 'image': {
            // These need special handling — print as text fallback for now
            const label = row.type === 'qr-code' ? `[QR: ${row.text}]` :
                          row.type === 'barcode' ? `[Barcode: ${row.text}]` :
                          '[Image]';
            receiptText += `<C>${label}</C>\n`;
            break;
          }
        }
      }

      // Print using printBill (adds cut + beep)
      await BLEPrinter.printBill(receiptText, { encoding: 'UTF8' });

      return true;
    } catch (err: any) {
      Alert.alert('Print Failed', err?.message || 'Could not print. Check printer connection.');
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
