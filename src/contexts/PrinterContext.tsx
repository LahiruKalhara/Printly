import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { TemplateRow, PaperSize } from '../types';
import { getSettings, saveSettings } from '../utils/storage';

// Lazy-load native Bluetooth modules — they crash in Expo Go
let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;
let nativeModulesAvailable = false;

try {
  const thermalPrinter = require('react-native-thermal-receipt-printer-image-qr');
  BluetoothManager = thermalPrinter.BluetoothManager;
  BluetoothEscposPrinter = thermalPrinter.BluetoothEscposPrinter;
  nativeModulesAvailable = true;
} catch {
  // Native modules not available (Expo Go) — will use simulation mode
}

export interface BluetoothDevice {
  name: string;
  address: string;
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
      // Android 12+
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
      // Android 11 and below
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
      // Enable Bluetooth if not already
      const enabled = await BluetoothManager.isBluetoothEnabled();
      if (!enabled) {
        await BluetoothManager.enableBluetooth();
      }

      // Scan for paired + nearby devices
      const paired = await BluetoothManager.scanDevices();
      const parsed = typeof paired === 'string' ? JSON.parse(paired) : paired;

      const pairedDevices: BluetoothDevice[] = (parsed.paired || [])
        .filter((d: any) => d.name && d.address)
        .map((d: any) => ({ name: d.name, address: d.address }));

      const foundDevices: BluetoothDevice[] = (parsed.found || [])
        .filter((d: any) => d.name && d.address)
        .map((d: any) => ({ name: d.name, address: d.address }));

      // Merge and deduplicate
      const all = [...pairedDevices, ...foundDevices];
      const unique = all.filter(
        (d, i) => all.findIndex(x => x.address === d.address) === i
      );

      setDevices(unique);
    } catch (err: any) {
      Alert.alert('Scan Failed', err?.message || 'Could not scan for Bluetooth devices.');
    } finally {
      setIsScanning(false);
    }
  }, []);

  const connectDevice = useCallback(async (address: string): Promise<boolean> => {
    if (!nativeModulesAvailable) return false;

    try {
      await BluetoothManager.connect(address);
      const device = devices.find(d => d.address === address);
      setIsConnected(true);
      setConnectedDevice(device || { name: 'Printer', address });

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
      // Initialize
      await BluetoothEscposPrinter.printerInit();
      await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);

      for (const row of rows) {
        // Set alignment
        const alignMap: Record<string, number> = {
          left: BluetoothEscposPrinter.ALIGN.LEFT,
          center: BluetoothEscposPrinter.ALIGN.CENTER,
          right: BluetoothEscposPrinter.ALIGN.RIGHT,
        };
        const align = alignMap[row.align] ?? BluetoothEscposPrinter.ALIGN.LEFT;

        switch (row.type) {
          case 'text':
          case 'auto-date':
          case 'auto-time':
          case 'select':
          case 'input': {
            await BluetoothEscposPrinter.printerAlign(align);
            await BluetoothEscposPrinter.printText(
              (row.text || '') + '\n',
              {
                encoding: 'GBK',
                codepage: 0,
                widthtimes: row.bold ? 1 : 0,
                heigthtimes: 0,
                fonttype: 0,
              }
            );
            break;
          }

          case 'separator': {
            await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
            await BluetoothEscposPrinter.printText(
              '-'.repeat(charWidth) + '\n',
              { encoding: 'GBK', codepage: 0, widthtimes: 0, heigthtimes: 0, fonttype: 0 }
            );
            break;
          }

          case 'qr-code': {
            if (row.text) {
              await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
              await BluetoothEscposPrinter.printQRCode(
                row.text,
                200,
                BluetoothEscposPrinter.ERROR_CORRECTION.L
              );
              await BluetoothEscposPrinter.printText('\n', {});
            }
            break;
          }

          case 'barcode': {
            if (row.text) {
              await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
              await BluetoothEscposPrinter.printBarCode(
                row.text,
                BluetoothEscposPrinter.BARCODETYPE.CODE128,
                3,
                80,
                0,
                2
              );
              await BluetoothEscposPrinter.printText('\n', {});
            }
            break;
          }

          case 'image': {
            await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
            await BluetoothEscposPrinter.printText(
              '[Image]\n',
              { encoding: 'GBK', codepage: 0, widthtimes: 0, heigthtimes: 0, fonttype: 0 }
            );
            break;
          }
        }
      }

      // Feed and cut
      await BluetoothEscposPrinter.printText('\n\n\n', {});

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
