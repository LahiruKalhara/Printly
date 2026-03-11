# Printly - Project Documentation

> Last Updated: 2026-03-11
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
| react-native-thermal-receipt-printer-image-qr | ^0.1.12 | Bluetooth thermal printer communication |
| qrcode (JS) | latest | Pure JS QR code matrix generation |
| Expo Image Picker | (Expo managed) | Photo/image selection |
| @react-native-community/datetimepicker | latest | Native date/time picker modals |

**Notes**:
- `react-native-qrcode-svg` was replaced with pure JS `qrcode` package + custom `QRCodeView` component to avoid `css-tree` module resolution issues on Windows.
- `react-native-ping` is shimmed (not installed) — only needed for WiFi printers, not Bluetooth.

---

## Project Structure

```
BillPrinterApp/
├── App.tsx                          # Root - ThemeProvider + PrinterProvider + Navigation
├── index.ts                         # Entry point
├── app.json                         # Expo config (newArchEnabled: true)
├── eas.json                         # EAS Build config (preview, production profiles)
├── metro.config.js                  # Metro bundler config (react-native-ping shim)
├── .npmrc                           # npm config (legacy-peer-deps=true)
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config (strict, path mappings)
├── shims/
│   └── react-native-ping.js        # Empty shim for unused network printer dep
├── assets/                          # Expo default assets (icon, splash, etc.)
└── src/
    ├── Logo/
    │   └── Printly.png              # App logo
    ├── components/
    │   ├── QRCodeView.tsx           # Pure JS QR code renderer (View-based)
    │   └── BarcodeView.tsx          # SVG-based barcode renderer
    ├── contexts/
    │   ├── ThemeContext.tsx          # Dark/Light theme provider + useTheme hook
    │   └── PrinterContext.tsx        # Bluetooth printer provider + usePrinter hook
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
| Templates gallery with search (My Templates only) | TemplatesScreen.tsx |
| Settings: theme toggle, paper size, about section | SettingsScreen.tsx |
| AsyncStorage with try/catch + safeParse utility | storage.ts |
| Accessibility labels and roles on all interactive elements | All screens |
| EAS Build configured for Android preview + production | eas.json |

### NOT YET IMPLEMENTED

| Feature | Priority |
|---|---|
| Image printing (bitmap conversion for ESC/POS) | MEDIUM |
| Pre-built template library | MEDIUM |
| Font size control per row | LOW |
| Row duplication | LOW |
| Drag-and-drop row reordering | LOW |
| Export/import templates | LOW |
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
  type: 'text' | 'separator' | 'auto-date' | 'auto-time' | 'qr-code' | 'barcode' | 'image' | 'select' | 'input';
  imageUri?: string;
  options?: SelectOption[];
  selectedOption?: string;
  inputValue?: string;
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

### PrinterDevice
```typescript
interface PrinterDevice {
  name: string;
  address: string;
  connected: boolean;
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
- `printer_app_history` - PrintJob[] array (max 100, newest first)
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

### 3. TemplatesScreen (Tab 3 - "Templates")
- **File**: `src/screens/TemplatesScreen.tsx`
- **Purpose**: Browse and manage saved templates
- **Features**:
  - Search bar filters by name
  - 2-column grid with template cards (monospace preview)
  - Delete with confirmation
  - Tap to edit → TemplateEditorScreen

### 4. TemplateEditorScreen (Stack)
- **File**: `src/screens/TemplateEditorScreen.tsx`
- **Purpose**: Create and edit bill/receipt templates
- **Route Params**: `templateId?`, `rows?`, `templateName?`, `initialRowType?`
- **9 row types**: text, separator, auto-date, auto-time, qr-code, barcode, image, select, input
- **Select row**: options with hasInput toggle, inputTitle, position selector, independent bold/alignment for input
- **Input row**: standalone fillable text field with title
- **Bottom bar**: Discard + Save Template only (no print button)
- **Features**: bold toggle, alignment cycling, reorder, preview modal, save with name

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
| `deleteTemplate(id)` | `Promise<void>` | Remove by ID |
| `getHistory()` | `Promise<PrintJob[]>` | Read all print jobs |
| `addToHistory(job)` | `Promise<void>` | Add to front, cap at 100 |
| `deleteHistoryItem(id)` | `Promise<void>` | Delete single history entry |
| `clearHistory()` | `Promise<void>` | Clear all history |
| `getSettings()` | `Promise<AppSettings>` | Read settings (default: 58mm) |
| `saveSettings(settings)` | `Promise<void>` | Write settings |

All storage functions wrapped in try/catch for error safety.

### escpos.ts (`src/utils/escpos.ts`)
ESC/POS command builder for thermal printers. Converts template rows into printer commands.
- Text with alignment and bold
- Separators (dashes matching paper width)
- QR codes (native GS ( k command)
- Barcodes (Code 128)
- Paper feed and cut

---

## Bluetooth Printing

### Architecture
- **PrinterContext** (`src/contexts/PrinterContext.tsx`) — Global React context wrapping the app
- **Library**: `react-native-thermal-receipt-printer-image-qr` (Bluetooth Classic / SPP)
- **Lazy loading**: Native modules loaded via `try/catch require()` — app works in both Expo Go (simulation) and APK builds (real printing)

### PrinterContext API (usePrinter hook)
| Property/Method | Type | Description |
|---|---|---|
| `isConnected` | `boolean` | Whether a printer is connected |
| `connectedDevice` | `BluetoothDevice \| null` | Connected device info (name, address) |
| `isScanning` | `boolean` | Whether scanning is in progress |
| `devices` | `BluetoothDevice[]` | Discovered devices list |
| `isNativeAvailable` | `boolean` | Whether native Bluetooth modules loaded |
| `scanDevices()` | `Promise<void>` | Scan for paired + nearby Bluetooth devices |
| `connectDevice(address)` | `Promise<boolean>` | Connect to a device by MAC address |
| `disconnect()` | `Promise<void>` | Disconnect from current printer |
| `printReceipt(rows, paperSize)` | `Promise<boolean>` | Send ESC/POS commands to printer |

### Android Permissions (app.json)
- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_CONNECT` (Android 12+)
- `BLUETOOTH_SCAN` (Android 12+)
- `ACCESS_FINE_LOCATION`

Runtime permissions are requested via `PermissionsAndroid.requestMultiple()` before scanning.

### Printing Flow
1. User taps Bluetooth button on Home → device picker modal opens
2. App scans for paired + nearby devices (shows all Bluetooth devices)
3. User taps a printer → connects via `BluetoothManager.connect()`
4. Last connected printer address saved to AsyncStorage
5. User fills bill on PrintBillScreen → taps Print
6. `printReceipt()` sends ESC/POS commands via `BluetoothEscposPrinter`
7. Bill saved to history regardless of print success

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
2. **Printer auto-reconnect** — Last printer address is saved but auto-reconnect on app start is not implemented
3. **WiFi printers** — Only Bluetooth Classic supported; `react-native-ping` shimmed out

### Future Enhancements
| Feature | Priority |
|---|---|
| Image bitmap printing via ESC/POS | MEDIUM |
| Pre-built template library | MEDIUM |
| Auto-reconnect to last printer on app start | MEDIUM |
| Font size control per row | LOW |
| Row duplication | LOW |
| Drag-and-drop row reordering | LOW |
| Export/import templates (JSON/share) | LOW |
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
| 4.0 | GitHub push (LahiruKalhara/Printly) | COMPLETED | 2026-03-11 |

---

## Repository

**GitHub**: https://github.com/LahiruKalhara/Printly.git
**Branch**: master
