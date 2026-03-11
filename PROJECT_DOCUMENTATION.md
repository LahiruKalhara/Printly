# Printly - Project Documentation & Implementation Plan

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
8. [Navigation Architecture](#navigation-architecture)
9. [Known Issues & Gaps](#known-issues--gaps)
10. [Implementation Plan - Remaining Work](#implementation-plan---remaining-work)
11. [Progress Tracker](#progress-tracker)

---

## Project Overview

**Printly** is a React Native mobile app for creating, managing, and printing customizable bill/receipt templates via Bluetooth thermal printers. Users can design bill layouts with text, separators, auto-date/time fields, QR codes, barcodes, images, and dropdown selectors, then save as reusable templates and print them.

**App Name**: Printly
**Package**: `com.printly.app`
**Default Theme**: Dark mode (toggleable to light)

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
| React Native Gesture Handler | ~2.28.0 | Gesture support |
| React Native SVG | (Expo managed) | SVG rendering for barcodes |
| qrcode (JS) | latest | Pure JS QR code matrix generation |
| Expo Image Picker | (Expo managed) | Photo/image selection |
| @react-native-community/datetimepicker | latest | Native date/time picker modals |

**Note**: `react-native-qrcode-svg` was replaced with pure JS `qrcode` package + custom `QRCodeView` component to avoid `css-tree` module resolution issues on Windows.

---

## Project Structure

```
BillPrinterApp/
├── App.tsx                          # Root - ThemeProvider + NavigationContainer + Tab/Stack
├── index.ts                         # Entry point
├── app.json                         # Expo config (Printly, com.printly.app)
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── assets/                          # Expo default assets (icon, splash, etc.)
└── src/
    ├── Logo/
    │   └── Printly.png              # App logo
    ├── components/
    │   ├── QRCodeView.tsx           # Pure JS QR code renderer (View-based)
    │   └── BarcodeView.tsx          # SVG-based barcode renderer
    ├── contexts/
    │   └── ThemeContext.tsx          # Dark/Light theme provider + useTheme hook
    ├── theme/
    │   └── index.ts                 # Color palettes (darkTheme, lightTheme, ThemeColors interface)
    ├── types/
    │   └── index.ts                 # All TypeScript interfaces
    ├── utils/
    │   ├── helpers.ts               # ID generation, date/time formatting
    │   └── storage.ts               # AsyncStorage CRUD operations
    └── screens/
        ├── CategoriesScreen.tsx     # Home dashboard with "Print a Bill" primary action (Tab 1)
        ├── HistoryScreen.tsx        # Print history list (Tab 2)
        ├── TemplatesScreen.tsx      # Saved templates gallery (Tab 3)
        ├── TemplateEditorScreen.tsx # Template builder with all row types (Stack)
        ├── PrintBillScreen.tsx      # Print-focused form screen (Stack)
        └── SettingsScreen.tsx       # Theme toggle + paper size (Stack)
```

---

## Current Implementation Status

### COMPLETED

| Feature | Status | File(s) |
|---|---|---|
| Bottom tab navigation (3 tabs: Home, History, Templates) | DONE | App.tsx |
| Stack navigation (editor, print, settings) | DONE | App.tsx |
| Modern dark-first UI/UX redesign | DONE | All screens |
| Dark/Light theme system with persistence | DONE | ThemeContext.tsx, theme/index.ts |
| Theme toggle (switch in settings) | DONE | SettingsScreen.tsx |
| Home dashboard with primary "Print a Bill" card | DONE | CategoriesScreen.tsx |
| Template picker modal (bottom sheet) | DONE | CategoriesScreen.tsx |
| "Create New Template" secondary action | DONE | CategoriesScreen.tsx |
| Quick Start categories grid (Text, QR, Barcode, Photos) | DONE | CategoriesScreen.tsx |
| Printly logo in header | DONE | CategoriesScreen.tsx |
| Template editor with all row types | DONE | TemplateEditorScreen.tsx |
| Row types: text, separator, auto-date, auto-time | DONE | TemplateEditorScreen.tsx |
| Row types: qr-code, barcode, image | DONE | TemplateEditorScreen.tsx |
| Row type: select (dropdown with custom options) | DONE | TemplateEditorScreen.tsx |
| Row formatting: bold, alignment cycling | DONE | TemplateEditorScreen.tsx |
| Row reordering (up/down) | DONE | TemplateEditorScreen.tsx |
| 8 add-row buttons in editor | DONE | TemplateEditorScreen.tsx |
| Live preview modal | DONE | TemplateEditorScreen.tsx |
| Save template with name modal | DONE | TemplateEditorScreen.tsx |
| **Separate PrintBill screen** (form-style, not editor) | DONE | PrintBillScreen.tsx |
| Print form: text fields editable inline | DONE | PrintBillScreen.tsx |
| Print form: select dropdown with radio picker modal | DONE | PrintBillScreen.tsx |
| Print form: date picker (native modal, centered) | DONE | PrintBillScreen.tsx |
| Print form: time picker (native modal, centered) | DONE | PrintBillScreen.tsx |
| Print form: QR/barcode/image preview | DONE | PrintBillScreen.tsx |
| Receipt preview modal on print screen | DONE | PrintBillScreen.tsx |
| Template CRUD (create, read, update, delete) | DONE | storage.ts, TemplatesScreen.tsx |
| Templates gallery with search | DONE | TemplatesScreen.tsx |
| Print history list with relative timestamps | DONE | HistoryScreen.tsx |
| History: edit → TemplateEditor, reprint → PrintBill | DONE | HistoryScreen.tsx |
| History clear all with confirmation | DONE | HistoryScreen.tsx |
| Settings - paper size selection (58mm/80mm) | DONE | SettingsScreen.tsx |
| AsyncStorage persistence layer | DONE | storage.ts |
| Custom QR code component (pure JS, no SVG/CSS deps) | DONE | QRCodeView.tsx |
| Custom barcode component (react-native-svg) | DONE | BarcodeView.tsx |
| Simulated printer connection toggle | DONE | CategoriesScreen.tsx |

### NOT YET IMPLEMENTED

| Feature | Status | Priority |
|---|---|---|
| Actual Bluetooth printer connection | NOT STARTED | HIGH |
| Real ESC/POS print commands | NOT STARTED | HIGH |
| Bluetooth device scanning/pairing | NOT STARTED | HIGH |
| Pre-built template library | NOT STARTED | MEDIUM |
| Font size control per row | NOT STARTED | LOW |
| Row duplication | NOT STARTED | LOW |
| Drag-and-drop row reordering | NOT STARTED | LOW |
| Export/import templates | NOT STARTED | LOW |
| Multiple printer management | NOT STARTED | LOW |

---

## Data Models

### TemplateRow
```typescript
interface TemplateRow {
  id: string;
  text: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  type: 'text' | 'separator' | 'auto-date' | 'auto-time' | 'qr-code' | 'barcode' | 'image' | 'select';
  imageUri?: string;       // URI for image rows
  options?: string[];      // Dropdown options for select rows
  selectedOption?: string; // Currently selected option for select rows
}
```

### Template
```typescript
interface Template {
  id: string;
  name: string;
  rows: TemplateRow[];
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

### PrintJob
```typescript
interface PrintJob {
  id: string;
  templateId: string;
  templateName: string;
  printedAt: string;    // ISO timestamp
  rows: TemplateRow[];  // Snapshot with resolved auto-fields
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
  - Printer connection status card with connect/disconnect
  - **"Print a Bill" primary card** (big purple) → opens template picker modal
  - Template picker: bottom sheet with saved templates list, tap to go to PrintBillScreen
  - "Create New Template" secondary card → TemplateEditorScreen
  - Quick Start category grid (Text, QR, Barcode, Photos) → TemplateEditorScreen with initialRowType
  - Quick stats row (Paper Size, Bluetooth Status)

### 2. HistoryScreen (Tab 2 - "History")
- **File**: `src/screens/HistoryScreen.tsx`
- **Purpose**: View and manage past print jobs
- **Features**:
  - Numbered card list with template name, time ago, row count
  - Edit button → TemplateEditorScreen
  - Reprint button → PrintBillScreen
  - "Clear all" with destructive confirmation

### 3. TemplatesScreen (Tab 3 - "Templates")
- **File**: `src/screens/TemplatesScreen.tsx`
- **Purpose**: Browse and manage saved templates
- **Features**:
  - Search bar filters by name
  - 2-column grid with template cards
  - Delete with confirmation, select to edit

### 4. TemplateEditorScreen (Stack)
- **File**: `src/screens/TemplateEditorScreen.tsx`
- **Purpose**: Create and edit bill/receipt templates
- **Route Params** (all optional): `templateId`, `rows`, `templateName`, `initialRowType`
- **Supports 8 row types**: text, separator, auto-date, auto-time, qr-code, barcode, image, select
- **Select row**: add options with + button, remove with X, no label field
- **Features**: bold toggle, alignment cycling, reorder, preview modal, save with name

### 5. PrintBillScreen (Stack) — NEW
- **File**: `src/screens/PrintBillScreen.tsx`
- **Purpose**: Fill in and print a bill using a template
- **Route Params**: `templateId`, `rows`, `templateName`
- **Features**:
  - Form-style field cards for each row type
  - Text rows: inline editable TextInput
  - Select rows: tap → radio button picker modal
  - Date rows: tap → native DateTimePicker in centered modal with "Done" button
  - Time rows: tap → native DateTimePicker in centered modal with "Done" button
  - QR/Barcode: editable value + live preview
  - Image: display only
  - Receipt preview modal (eye icon in header)
  - "Print Bill" button at bottom
  - Saves to history on print

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
| `getTemplates()` | `Promise<Template[]>` | Read all templates |
| `saveTemplate(template)` | `Promise<void>` | Create or update (by ID match) |
| `deleteTemplate(id)` | `Promise<void>` | Remove by ID |
| `getHistory()` | `Promise<PrintJob[]>` | Read all print jobs |
| `addToHistory(job)` | `Promise<void>` | Add to front, cap at 100 |
| `clearHistory()` | `Promise<void>` | Clear all history |
| `getSettings()` | `Promise<AppSettings>` | Read settings (default: 58mm) |
| `saveSettings(settings)` | `Promise<void>` | Write settings |

---

## Navigation Architecture

```
NavigationContainer (themed)
└── NativeStackNavigator (headerShown: false)
    ├── "Main" → BottomTabNavigator
    │   ├── "Home" → CategoriesScreen (Tab 1)
    │   ├── "History" → HistoryScreen (Tab 2)
    │   └── "Templates" → TemplatesScreen (Tab 3)
    ├── "TemplateEditor" → TemplateEditorScreen (slide_from_right)
    ├── "PrintBill" → PrintBillScreen (slide_from_right)
    └── "Settings" → SettingsScreen (slide_from_right)
```

- Tab bar: themed (dark/light), accent color for active tab
- Icons: Ionicons from @expo/vector-icons

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
| Splash Background | `#6C5CE7` |

### Light Theme
| Usage | Color |
|---|---|
| Accent | `#6C5CE7` (Purple) |
| Background | `#F8F8FC` |
| Card | `#FFFFFF` |
| Text | `#1A1A2E` |

---

## Known Issues & Gaps

1. **No actual Bluetooth printing** - All printing is simulated. Real printing needs a dev build with Bluetooth libraries.
2. **Printer state not persisted** - `printerConnected` resets on reload (local useState).
3. **No type-safe navigation** - All navigation uses `<any>()`.
4. **Paper size setting unused** - Saved but never referenced during printing/preview.
5. **No error handling** - AsyncStorage operations have no try/catch wrappers.

---

## Implementation Plan - Remaining Work

### Phase 2: Bluetooth Printing (HIGH PRIORITY)

- [ ] **2.1** Switch from Expo Go to dev build (`npx expo prebuild`)
- [ ] **2.2** Install Bluetooth printing library
- [ ] **2.3** Add Android Bluetooth permissions in `AndroidManifest.xml`
- [ ] **2.4** Create `src/utils/bluetooth.ts` - Bluetooth scan/connect/disconnect
- [ ] **2.5** Create `src/utils/printer.ts` - ESC/POS command builder
- [ ] **2.6** Update CategoriesScreen with real Bluetooth connection
- [ ] **2.7** Create BluetoothScanScreen for device picker
- [ ] **2.8** Wire PrintBillScreen print button to real printer
- [ ] **2.9** Persist last connected printer in settings

### Phase 3: Pre-built Template Library (MEDIUM PRIORITY)

- [ ] **3.1** Create `src/data/defaultTemplates.ts` with common formats
- [ ] **3.2** Update TemplatesScreen to show default vs user templates
- [ ] **3.3** "Use Template" action to copy defaults

### Phase 4: Editor Enhancements (LOW PRIORITY)

- [ ] **4.1** Font size control per row
- [ ] **4.2** Row duplication
- [ ] **4.3** Drag-and-drop row reordering
- [ ] **4.4** Undo/redo

### Phase 5: Polish & Production (LOW PRIORITY)

- [ ] **5.1** Type-safe navigation
- [ ] **5.2** Error handling for all async ops
- [ ] **5.3** Loading indicators
- [ ] **5.4** Export/import templates
- [ ] **5.5** Build and test APK on real device
- [ ] **5.6** Configure EAS Build for production

---

## Progress Tracker

| Phase | Task | Status | Date Completed |
|---|---|---|---|
| 1 | Core UI & Local Features | COMPLETED | 2026-03-11 |
| 1.5 | Dark/Light Theme System | COMPLETED | 2026-03-11 |
| 1.5 | Modern UI Redesign (Printly branding) | COMPLETED | 2026-03-11 |
| 1.6 | QR Code support (pure JS) | COMPLETED | 2026-03-11 |
| 1.6 | Barcode support (SVG) | COMPLETED | 2026-03-11 |
| 1.6 | Image support (expo-image-picker) | COMPLETED | 2026-03-11 |
| 1.7 | Select/Dropdown row type | COMPLETED | 2026-03-11 |
| 1.8 | Separate PrintBill screen | COMPLETED | 2026-03-11 |
| 1.9 | Native date/time pickers in modals | COMPLETED | 2026-03-11 |
| 1.9 | Picker modal alignment & centering | COMPLETED | 2026-03-11 |
| 2 | Bluetooth Printing | NOT STARTED | - |
| 3 | Pre-built Templates | NOT STARTED | - |
| 4 | Editor Enhancements | NOT STARTED | - |
| 5 | Polish & Production | NOT STARTED | - |

---

## How to Run

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on Android (Expo Go)
npx expo start --android

# For Bluetooth features, you need a dev build:
npx expo prebuild
npx expo run:android
```
