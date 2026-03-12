# Printly - Project Documentation

> Last Updated: 2026-03-12 (v4.9)
> Use this document to track progress and resume work at any time.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Current Implementation Status](#current-implementation-status)
5. [Data Models](#data-models)
6. [Screen-by-Screen Breakdown](#screen-by-screen-breakdown)
7. [Utility Modules](#utility-modules)
8. [Bluetooth Printing](#bluetooth-printing)
9. [Navigation Architecture](#navigation-architecture)
10. [Build & Deployment](#build--deployment)
11. [Known Issues & Future Work](#known-issues--future-work)
12. [Progress Tracker](#progress-tracker)

---

## Project Overview

**Printly** is a React Native mobile app for creating, managing, and printing customizable bill/receipt templates via Bluetooth thermal printers. Users can design bill layouts with text, separators, auto-date/time fields, QR codes, barcodes, images, dropdown selectors, and input fields, then save as reusable templates and print them.

**App Name**: Printly
**Package**: `com.printly.app`
**Default Theme**: Dark mode (toggleable to light)
**New Architecture**: Enabled

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81.5 | Core framework |
| Expo | ~54.0.33 | Build tooling & dev server |
| TypeScript | ~5.9.2 | Type safety |
| React Navigation | v7 | Navigation (bottom tabs + native stack) |
| AsyncStorage | 2.2.0 | Local data persistence |
| React Native Reanimated | ~4.1.1 | Animations |
| React Native Worklets | 0.5.1 | Required by Reanimated |
| React Native Gesture Handler | ~2.28.0 | Gesture support |
| React Native SVG | (Expo managed) | SVG rendering for barcodes |
| react-native-thermal-receipt-printer-image-qr | ^0.1.12 | Bluetooth thermal printer communication (BLEPrinter API) |
| patch-package | ^8.0.1 | Post-install patches for native library fixes |
| qrcode (JS) | latest | Pure JS QR code matrix generation |
| Expo Image Picker | (Expo managed) | Photo/image selection (free-form crop) |
| Expo File System | (Expo managed) | File read/write for template export/import |
| Expo Sharing | (Expo managed) | System share sheet for template export |
| Expo Document Picker | (Expo managed) | File selection for template import |
| @react-native-community/datetimepicker | latest | Native date/time picker modals |

**Notes**:
- `react-native-qrcode-svg` was replaced with pure JS `qrcode` package + custom `QRCodeView` component to avoid `css-tree` module resolution issues on Windows.
- `react-native-ping` is shimmed (not installed) — only needed for WiFi printers, not Bluetooth.
- The thermal printer library is patched via `patch-package` (see `patches/` directory) to fix Android SDK compatibility and Bluetooth socket connection issues.

---

## Project Structure

```
BillPrinterApp/
├── App.tsx                          # Root - AlertProvider + ThemeProvider + PrinterProvider + Navigation
├── index.ts                         # Entry point
├── app.json                         # Expo config (newArchEnabled: true)
├── eas.json                         # EAS Build config (preview, production profiles)
├── metro.config.js                  # Metro bundler config (react-native-ping shim)
├── .npmrc                           # npm config (legacy-peer-deps=true)
├── package.json                     # Dependencies
├── patches/
│   └── react-native-thermal-receipt-printer-image-qr+0.1.12.patch  # SDK & BLE socket fix
├── tsconfig.json                    # TypeScript config (strict, path mappings)
├── shims/
│   └── react-native-ping.js        # Empty shim for unused network printer dep
├── assets/                          # Expo default assets (icon, splash, etc.)
└── src/
    ├── Logo/
    │   └── Printly.png              # App logo
    ├── components/
    │   ├── QRCodeView.tsx           # Pure JS QR code renderer (View-based)
    │   ├── BarcodeView.tsx          # SVG-based barcode renderer
    │   ├── AutoImage.tsx            # Dynamic aspect-ratio image component
    │   └── CustomAlert.tsx          # Themed modal alert (success/error/warning/info/confirm)
    ├── contexts/
    │   ├── ThemeContext.tsx          # Dark/Light theme provider + useTheme hook
    │   ├── PrinterContext.tsx        # Bluetooth printer provider + usePrinter hook
    │   └── AlertContext.tsx          # Global alert provider + useGlobalAlert hook
    ├── theme/
    │   └── index.ts                 # Color palettes (darkTheme, lightTheme, ThemeColors interface)
    ├── types/
    │   ├── index.ts                 # All TypeScript interfaces (TemplateRow, Template, etc.)
    │   └── navigation.ts            # Type-safe navigation params (RootStackParamList, TabParamList)
    ├── utils/
    │   ├── helpers.ts               # ID generation, date/time formatting
    │   ├── storage.ts               # AsyncStorage CRUD with error handling + safeParse
    │   └── escpos.ts                # ESC/POS command builder for thermal printers
    └── screens/
        ├── CategoriesScreen.tsx     # Home dashboard + Bluetooth device picker (Tab 1)
        ├── HistoryScreen.tsx        # Print history with search, filters, preview (Tab 2)
        ├── TemplatesScreen.tsx      # Saved templates gallery (Tab 3)
        ├── TemplateEditorScreen.tsx # Template builder with all row types (Stack)
        ├── PrintBillScreen.tsx      # Print-focused form + real Bluetooth printing (Stack)
        └── SettingsScreen.tsx       # Theme toggle + paper size (Stack)
```

---

## Current Implementation Status

### COMPLETED

| Feature | File(s) |
|---|---|
| Bottom tab navigation (Home, History, Templates) | App.tsx |
| Stack navigation (editor, print, settings) | App.tsx |
| Type-safe navigation (RootStackParamList, TabParamList) | types/navigation.ts, all screens |
| Modern dark-first UI/UX with safe area handling | All screens |
| Dark/Light theme system with persistence | ThemeContext.tsx, theme/index.ts |
| Bluetooth thermal printer scanning & connecting | PrinterContext.tsx |
| Bluetooth device picker modal | CategoriesScreen.tsx |
| Real ESC/POS printing (text, QR, barcode, separators) | PrinterContext.tsx, escpos.ts |
| Graceful fallback in Expo Go (simulation mode) | PrinterContext.tsx |
| Home dashboard with primary "Print a Bill" card | CategoriesScreen.tsx |
| Template picker modal (bottom sheet) | CategoriesScreen.tsx |
| Quick Start categories grid (Text, QR, Barcode, Photos) | CategoriesScreen.tsx |
| Dynamic paper size display from settings | CategoriesScreen.tsx |
| Template editor with 9 row types | TemplateEditorScreen.tsx |
| Row types: text, separator, auto-date, auto-time | TemplateEditorScreen.tsx |
| Row types: qr-code, barcode, image | TemplateEditorScreen.tsx |
| Row type: select (dropdown with input per option) | TemplateEditorScreen.tsx |
| Row type: input (standalone fillable field) | TemplateEditorScreen.tsx |
| Select options: hasInput, inputTitle, inputPosition, inputBold, inputAlign | TemplateEditorScreen.tsx |
| Row formatting: bold, alignment cycling | TemplateEditorScreen.tsx |
| Row reordering (up/down) | TemplateEditorScreen.tsx |
| Live preview modal in editor | TemplateEditorScreen.tsx |
| Save template + Discard (no print button in editor) | TemplateEditorScreen.tsx |
| PrintBill screen with form-style fields | PrintBillScreen.tsx |
| Print form: native date/time pickers in centered modals | PrintBillScreen.tsx |
| Print form: select with input (top/bottom/left/right position) | PrintBillScreen.tsx |
| Print form: receipt preview modal | PrintBillScreen.tsx |
| Real Bluetooth printing with fallback messages | PrintBillScreen.tsx |
| History: clickable cards with receipt preview modal | HistoryScreen.tsx |
| History: search bar + time filters (All/Today/This Week/This Month) | HistoryScreen.tsx |
| History: filtered clear + individual delete | HistoryScreen.tsx |
| History: reprint button | HistoryScreen.tsx |
| Templates gallery with search (2-column grid) | TemplatesScreen.tsx |
| Template duplicate, export (.printly), import | TemplatesScreen.tsx |
| Quick Print template type | TemplateEditorScreen.tsx, TemplatesScreen.tsx |
| Font size control per row (small/normal/large) | TemplateEditorScreen.tsx |
| Free-form image cropping (no fixed aspect ratio) | TemplateEditorScreen.tsx |
| AutoImage component (dynamic aspect ratio) | AutoImage.tsx, all screens |
| Input row with configurable position (top/bottom/left/right) | TemplateEditorScreen.tsx |
| Themed custom modal alerts (replaces native Alert) | CustomAlert.tsx, AlertContext.tsx |
| KeyboardAvoidingView on all input screens | All screens with TextInput |
| 30-day rolling history retention | storage.ts |
| Settings: theme toggle, paper size, about section | SettingsScreen.tsx |
| AsyncStorage with try/catch + safeParse utility | storage.ts |
| Accessibility labels and roles on all interactive elements | All screens |
| EAS Build configured for Android preview + production | eas.json |

### NOT YET IMPLEMENTED

| Feature | Priority |
|---|---|
| Image printing (bitmap conversion for ESC/POS) | MEDIUM |
| Pre-built template library | MEDIUM |
| Drag-and-drop row reordering | LOW |
| Multiple printer management | LOW |

---

## Data Models

### SelectOption
```typescript
interface SelectOption {
  label: string;
  hasInput: boolean;
  inputTitle?: string;
  inputPosition?: 'top' | 'bottom' | 'left' | 'right';
  inputBold?: boolean;
  inputAlign?: 'left' | 'center' | 'right';
}
```

### TemplateRow
```typescript
interface TemplateRow {
  id: string;
  text: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  fontSize?: 'small' | 'normal' | 'large';
  type: 'text' | 'separator' | 'auto-date' | 'auto-time' | 'qr-code' | 'barcode' | 'image' | 'select' | 'input';
  imageUri?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageSize?: 'small' | 'medium' | 'large';
  options?: SelectOption[];
  selectedOption?: string;
  inputValue?: string;
  inputPosition?: 'top' | 'bottom' | 'left' | 'right';
}
```

### Template
```typescript
interface Template {
  id: string;
  name: string;
  rows: TemplateRow[];
  createdAt: string;
  updatedAt: string;
  isQuickPrint?: boolean;
}
```

### PrintJob
```typescript
interface PrintJob {
  id: string;
  templateId: string;
  templateName: string;
  printedAt: string;
  rows: TemplateRow[];
}
```

### PrinterDevice (BluetoothDevice)
```typescript
interface BluetoothDevice {
  device_name: string;
  inner_mac_address: string;
}
```

### AppSettings
```typescript
interface AppSettings {
  paperSize: '58mm' | '80mm';
  lastPrinterAddress: string | null;
}
```

### Storage Keys
- `printer_app_templates` - Template[] array
- `printer_app_history` - PrintJob[] array (30-day rolling retention, newest first)
- `printer_app_settings` - AppSettings object
- `printer_app_theme` - 'dark' | 'light'

---

## Screen-by-Screen Breakdown

### 1. CategoriesScreen (Tab 1 - "Home")
- **File**: `src/screens/CategoriesScreen.tsx`
- **Purpose**: Home dashboard — primary entry point
- **Features**:
  - Printly logo + title in header
  - Settings gear icon → SettingsScreen
  - Printer connection status card (shows device name when connected)
  - Bluetooth connect button → opens device picker modal with scan
  - Disconnect button when connected
  - **"Print a Bill" primary card** → opens template picker modal
  - Template picker: bottom sheet → PrintBillScreen
  - "Create New Template" secondary card → TemplateEditorScreen
  - Quick Start category grid (Text, QR, Barcode, Photos)
  - Quick stats row (Paper Size from settings, Bluetooth Status)

### 2. HistoryScreen (Tab 2 - "History")
- **File**: `src/screens/HistoryScreen.tsx`
- **Purpose**: View and manage past print jobs
- **Features**:
  - Search bar filters by template name
  - Time filter chips: All, Today, This Week, This Month
  - Clickable cards → receipt preview modal
  - Preview modal with full receipt rendering (QR, barcode, image support)
  - Reprint button → PrintBillScreen
  - Individual delete per card with confirmation
  - Clear button respects active filters (filtered clear)
  - Relative timestamps (Just now, 5m ago, 3h ago, etc.)
  - 30-day rolling data retention
  - KeyboardAvoidingView for search input

### 3. TemplatesScreen (Tab 3 - "Templates")
- **File**: `src/screens/TemplatesScreen.tsx`
- **Purpose**: Browse and manage saved templates
- **Features**:
  - Search bar filters by name
  - 2-column grid with template cards (monospace preview, Dimensions-based layout)
  - Separate sections for Quick Print templates and regular templates
  - Plus button offers choice: Quick Print or Regular template
  - Duplicate template (appears next to original)
  - Export template as `.printly` file (images embedded as base64)
  - Import `.printly` files with automatic image restoration
  - Delete with confirmation
  - Tap to edit → TemplateEditorScreen
  - KeyboardAvoidingView for search input

### 4. TemplateEditorScreen (Stack)
- **File**: `src/screens/TemplateEditorScreen.tsx`
- **Purpose**: Create and edit bill/receipt templates
- **Route Params**: `templateId?`, `rows?`, `templateName?`, `initialRowType?`, `isQuickPrint?`
- **9 row types**: text, separator, auto-date, auto-time, qr-code, barcode, image, select, input
- **Select row**: options with hasInput toggle, inputTitle, position selector, independent bold/alignment for input
- **Input row**: standalone fillable text field with title and configurable position
- **Image row**: free-form cropping (no fixed aspect ratio), stores original dimensions
- **Font size**: small/normal/large per text row
- **Bottom bar**: Discard + Save Template only (no print button)
- **Features**: bold toggle, alignment cycling, font size, reorder, preview modal (AutoImage), save with name
- **KeyboardAvoidingView** on editor and save modal

### 5. PrintBillScreen (Stack)
- **File**: `src/screens/PrintBillScreen.tsx`
- **Purpose**: Fill in and print a bill using a template
- **Route Params**: `templateId?`, `rows?`, `templateName?`
- **Features**:
  - Form-style field cards for each row type
  - Text rows: inline editable TextInput
  - Select rows: radio picker modal + optional input field (positioned top/bottom/left/right)
  - Date/Time rows: native DateTimePicker in centered modal
  - QR/Barcode: editable value + live preview
  - Receipt preview modal (eye icon)
  - "Print Bill" button → sends to Bluetooth printer if connected
  - Falls back gracefully if no printer (saves to history with message)
  - Saves to history on every print
  - AutoImage component for dynamic aspect-ratio image rendering
  - KeyboardAvoidingView for form inputs

### 6. SettingsScreen (Stack)
- **File**: `src/screens/SettingsScreen.tsx`
- **Features**: Dark/Light mode switch, paper size radio buttons (58mm/80mm), about section

---

## Utility Modules

### helpers.ts (`src/utils/helpers.ts`)
| Function | Returns | Description |
|---|---|---|
| `generateId()` | `string` | Timestamp(base36) + 6 random chars |
| `formatTimeAgo(dateString)` | `string` | "Just now", "5m ago", "3h ago", "2d ago", or locale date |
| `getCurrentDate()` | `string` | Format: `DD/MM/YYYY` |
| `getCurrentTime()` | `string` | Format: `H:MM AM/PM` |

### storage.ts (`src/utils/storage.ts`)
| Function | Returns | Description |
|---|---|---|
| `safeParse<T>(data, fallback)` | `T` | Safe JSON.parse with fallback |
| `getTemplates()` | `Promise<Template[]>` | Read all templates |
| `saveTemplate(template)` | `Promise<void>` | Create or update (by ID match) |
| `saveAllTemplates(templates)` | `Promise<void>` | Batch save all templates |
| `deleteTemplate(id)` | `Promise<void>` | Remove by ID |
| `getHistory()` | `Promise<PrintJob[]>` | Read all print jobs |
| `addToHistory(job)` | `Promise<void>` | Add to front, 30-day rolling retention |
| `deleteHistoryItem(id)` | `Promise<void>` | Delete single history entry |
| `clearHistory()` | `Promise<void>` | Clear all history |
| `getSettings()` | `Promise<AppSettings>` | Read settings (default: 58mm) |
| `saveSettings(settings)` | `Promise<void>` | Write settings |

All storage functions wrapped in try/catch for error safety.

### escpos.ts (`src/utils/escpos.ts`)
ESC/POS command builder for thermal printers. Converts template rows into raw ESC/POS byte commands.
- Text with alignment and bold
- Separators (dashes matching paper width)
- QR codes (native GS ( k command)
- Barcodes (Code 128)
- Paper feed and cut

**Note**: The `escpos.ts` module builds raw ESC/POS byte sequences. However, the current `printReceipt()` in PrinterContext uses `BLEPrinter.printBill()` with HTML-like tags (`<C>`, `<B>`, `<CB>`) instead, as the library handles ESC/POS conversion internally. The raw `escpos.ts` builder is retained for potential future use with `printRawData()`.

---

## Bluetooth Printing

### Architecture
- **PrinterContext** (`src/contexts/PrinterContext.tsx`) — Global React context wrapping the app
- **Library**: `react-native-thermal-receipt-printer-image-qr` using the **BLEPrinter** API (not BluetoothManager/BluetoothEscposPrinter)
- **Native module**: `RNBLEPrinter` — checked via `NativeModules.RNBLEPrinter` before loading JS wrapper
- **Lazy loading**: Native module availability checked via `NativeModules.RNBLEPrinter` before `require()` — app works in both Expo Go (simulation) and APK builds (real printing)
- **patch-package**: The library's Android `build.gradle` is patched to use the project's `compileSdkVersion`/`targetSdkVersion` (34) instead of hardcoded 32, and `BLEPrinterAdapter.java` is patched to fix the Bluetooth socket fallback connection (adds `mBluetoothSocket.connect()` call after `createRfcommSocket`)

### BluetoothDevice Interface
```typescript
interface BluetoothDevice {
  device_name: string;       // Printer name (from BLEPrinter API)
  inner_mac_address: string; // MAC address (from BLEPrinter API)
}
```

### PrinterContext API (usePrinter hook)
| Property/Method | Type | Description |
|---|---|---|
| `isConnected` | `boolean` | Whether a printer is connected |
| `connectedDevice` | `BluetoothDevice \| null` | Connected device info (device_name, inner_mac_address) |
| `isScanning` | `boolean` | Whether scanning is in progress |
| `devices` | `BluetoothDevice[]` | Discovered paired devices list |
| `isNativeAvailable` | `boolean` | Whether native Bluetooth modules loaded |
| `scanDevices()` | `Promise<void>` | Init BLE adapter + get paired devices list |
| `connectDevice(address)` | `Promise<boolean>` | Connect to a device by MAC address |
| `disconnect()` | `Promise<void>` | Disconnect from current printer (calls `BLEPrinter.closeConn()`) |
| `printReceipt(rows, paperSize)` | `Promise<boolean>` | Build receipt with HTML-like tags + send via `BLEPrinter.printBill()` |

### Android Permissions (app.json)
- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_CONNECT` (Android 12+)
- `BLUETOOTH_SCAN` (Android 12+)
- `ACCESS_FINE_LOCATION`

Runtime permissions are requested via `PermissionsAndroid.requestMultiple()` before scanning.

### Key Bluetooth Implementation Details
- **Device scanning**: Uses `BLEPrinter.init()` + `BLEPrinter.getDeviceList()` to get paired devices. The library throws "No Device Found" when list is empty (handled gracefully).
- **Empty device list**: Shows helpful alert with steps to pair in Android Bluetooth settings, with a button to open Bluetooth Settings directly via `Linking.openSettings()`.
- **Connection**: Uses `BLEPrinter.connectPrinter(address)` instead of the old `BluetoothManager.connect()`.
- **Stale closure fix**: `devicesRef` (useRef) keeps device list in sync to avoid stale closures in `connectDevice` callback.
- **Disconnect**: Calls `BLEPrinter.closeConn()` with error suppression.
- **Print pre-check**: Before printing, a no-op `RNBLEPrinter.printRawData('')` call verifies the Bluetooth socket is still alive. If the socket is dead, the error callback fires and the user is notified (with auto-disconnect).
- **Print format**: Uses `BLEPrinter.printBill()` with HTML-like tags (`<C>`, `<B>`, `<CB>`, etc.) instead of the old `BluetoothEscposPrinter.printText()` API. The library internally converts tags to ESC/POS commands and Base64-encodes them.
- **Print failure handling**: On print error, `isConnected` and `connectedDevice` are reset to prevent further silent failures.

### Printing Flow
1. User taps Bluetooth button on Home → device picker modal opens
2. App calls `BLEPrinter.init()` then `BLEPrinter.getDeviceList()` for paired devices
3. User taps a printer → connects via `BLEPrinter.connectPrinter(address)`
4. Last connected printer address saved to AsyncStorage
5. User fills bill on PrintBillScreen → taps Print
6. Pre-check: `RNBLEPrinter.printRawData('')` verifies socket is alive
7. `BLEPrinter.printBill(receiptText)` sends HTML-tagged receipt text
8. Bill saved to history regardless of print success

### Library Patch Details (`patches/react-native-thermal-receipt-printer-image-qr+0.1.12.patch`)
1. **`android/build.gradle`**: Changed hardcoded `compileSdkVersion=32` and `targetSdkVersion=32` to inherit from `rootProject.ext` (defaults to 34). Changed `minSdkVersion` from 16 to 24.
2. **`BLEPrinterAdapter.java`**: Fixed Bluetooth socket fallback — the `createRfcommSocket` fallback path was missing the `.connect()` call, causing silent connection failures. Added proper error propagation.

---

## Navigation Architecture

```
NavigationContainer (themed)
└── NativeStackNavigator<RootStackParamList> (headerShown: false)
    ├── "Main" → BottomTabNavigator<TabParamList>
    │   ├── "Home" → CategoriesScreen (Tab 1)
    │   ├── "History" → HistoryScreen (Tab 2)
    │   └── "Templates" → TemplatesScreen (Tab 3)
    ├── "TemplateEditor" → TemplateEditorScreen (slide_from_right)
    ├── "PrintBill" → PrintBillScreen (slide_from_right)
    └── "Settings" → SettingsScreen (slide_from_right)
```

### Type-Safe Navigation
- `RootStackParamList` and `TabParamList` defined in `src/types/navigation.ts`
- All screens use typed `NativeStackNavigationProp<RootStackParamList>` and `RouteProp`
- Tab bar: themed (dark/light), accent color for active tab, dynamic safe area padding
- Icons: Ionicons from @expo/vector-icons

---

## Build & Deployment

### Development (Expo Go)
```bash
npm install
npx expo start
```
Bluetooth printing is disabled in Expo Go — shows informational alert instead.

### APK Build (EAS)
```bash
npx eas build --platform android --profile preview
```
- Produces installable APK with full Bluetooth support
- `eas.json` configured with `NPM_CONFIG_LEGACY_PEER_DEPS=true`
- `.npmrc` has `legacy-peer-deps=true` for npm ci compatibility
- New Architecture enabled (`newArchEnabled: true` in app.json)

### Production Build
```bash
npx eas build --platform android --profile production
```
- Auto-increments version number
- Produces AAB for Play Store submission

### Build Configuration Files
| File | Purpose |
|---|---|
| `app.json` | Expo config, permissions, splash, icons, newArchEnabled |
| `eas.json` | EAS Build profiles (dev, preview, production) |
| `.npmrc` | legacy-peer-deps for thermal printer library compatibility |
| `metro.config.js` | react-native-ping shim for Metro resolution |
| `shims/react-native-ping.js` | Empty module shim (WiFi printer dep not needed) |
| `patches/react-native-thermal-receipt-printer-image-qr+0.1.12.patch` | SDK version + BLE socket fix, applied via `postinstall: patch-package` |

---

## Color Theme Reference

### Dark Theme (Default)
| Usage | Color |
|---|---|
| Accent | `#7B6CF6` (Purple) |
| Background | `#0B0B14` |
| Surface | `#12121E` |
| Card | `#161625` |
| Text | `#EEEEF0` |
| Text Muted | `#6B6B80` |

### Light Theme
| Usage | Color |
|---|---|
| Accent | `#6C5CE7` (Purple) |
| Background | `#F8F8FC` |
| Card | `#FFFFFF` |
| Text | `#1A1A2E` |

---

## Known Issues & Future Work

### Known Limitations
1. **Image printing** — ESC/POS bitmap conversion not implemented; prints `[Image]` placeholder
2. **QR/Barcode printing** — `BLEPrinter.printBill()` does not support native QR/barcode commands via HTML tags; QR and barcode values are printed as centered text instead
3. **Printer auto-reconnect** — Last printer address is saved but auto-reconnect on app start is not implemented
4. **WiFi printers** — Only Bluetooth Classic supported; `react-native-ping` shimmed out
5. **Device discovery** — Only shows devices already paired in Android Bluetooth settings; no active BLE scanning/discovery

### Future Enhancements
| Feature | Priority |
|---|---|
| Image bitmap printing via ESC/POS | MEDIUM |
| Pre-built template library | MEDIUM |
| Auto-reconnect to last printer on app start | MEDIUM |
| Drag-and-drop row reordering | LOW |
| Multiple printer profiles | LOW |

---

## Progress Tracker

| Phase | Task | Status | Date |
|---|---|---|---|
| 1.0 | Core UI & Local Features | COMPLETED | 2026-03-11 |
| 1.1 | Dark/Light Theme System | COMPLETED | 2026-03-11 |
| 1.2 | Modern UI Redesign (Printly branding) | COMPLETED | 2026-03-11 |
| 1.3 | QR Code + Barcode + Image support | COMPLETED | 2026-03-11 |
| 1.4 | Select/Dropdown with input options | COMPLETED | 2026-03-11 |
| 1.5 | Input row type (standalone fillable field) | COMPLETED | 2026-03-11 |
| 1.6 | Separate PrintBill screen | COMPLETED | 2026-03-11 |
| 1.7 | Native date/time pickers | COMPLETED | 2026-03-11 |
| 1.8 | History: search, filters, preview, individual delete | COMPLETED | 2026-03-11 |
| 1.9 | Safe area handling for all Android phones | COMPLETED | 2026-03-11 |
| 2.0 | Type-safe navigation + accessibility audit | COMPLETED | 2026-03-11 |
| 2.1 | Error handling (try/catch + safeParse) | COMPLETED | 2026-03-11 |
| 3.0 | Bluetooth printer scanning & connecting | COMPLETED | 2026-03-11 |
| 3.1 | ESC/POS command builder | COMPLETED | 2026-03-11 |
| 3.2 | Real Bluetooth printing in PrintBillScreen | COMPLETED | 2026-03-11 |
| 3.3 | Expo Go fallback (lazy native module loading) | COMPLETED | 2026-03-11 |
| 3.4 | EAS Build configuration + dependency fixes | COMPLETED | 2026-03-11 |
| 3.5 | Fix Bluetooth: switch to BLEPrinter API (from BluetoothManager) | COMPLETED | 2026-03-12 |
| 3.6 | Patch thermal printer library for EAS build (SDK + socket fix) | COMPLETED | 2026-03-12 |
| 3.7 | Fix empty device list error + silent print failure detection | COMPLETED | 2026-03-12 |
| 4.0 | GitHub push (LahiruKalhara/Printly) | COMPLETED | 2026-03-11 |
| 4.1 | Free-form image cropping + AutoImage component | COMPLETED | 2026-03-12 |
| 4.2 | Font size control per row (small/normal/large) | COMPLETED | 2026-03-12 |
| 4.3 | Quick Print template type | COMPLETED | 2026-03-12 |
| 4.4 | Template duplicate, export (.printly), import | COMPLETED | 2026-03-12 |
| 4.5 | Themed custom modal alerts (AlertContext + CustomAlert) | COMPLETED | 2026-03-12 |
| 4.6 | KeyboardAvoidingView on all input screens | COMPLETED | 2026-03-12 |
| 4.7 | 30-day rolling history retention | COMPLETED | 2026-03-12 |
| 4.8 | Input row position control + paste button | COMPLETED | 2026-03-12 |
| 4.9 | 2-column template grid (Dimensions-based) | COMPLETED | 2026-03-12 |

---

## Repository

**GitHub**: https://github.com/LahiruKalhara/Printly.git
**Branch**: master
