export interface SelectOption {
  label: string;
  /** Whether selecting this option shows a text input (e.g. for account number) */
  hasInput: boolean;
  /** Title/label for the text input (e.g. "Account Number") */
  inputTitle?: string;
  /** Where the text input appears relative to the selected option: top, bottom, left, right */
  inputPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Bold formatting for the input line on the receipt */
  inputBold?: boolean;
  /** Alignment for the input line on the receipt */
  inputAlign?: 'left' | 'center' | 'right';
}

export interface TemplateRow {
  id: string;
  text: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  type: 'text' | 'separator' | 'auto-date' | 'auto-time' | 'qr-code' | 'barcode' | 'image' | 'select' | 'input';
  /** URI for image rows */
  imageUri?: string;
  /** Dropdown options for select rows */
  options?: SelectOption[];
  /** Currently selected option label for select rows */
  selectedOption?: string;
  /** Text input value when selected option has hasInput=true */
  inputValue?: string;
}

export interface Template {
  id: string;
  name: string;
  rows: TemplateRow[];
  createdAt: string;
  updatedAt: string;
}

export interface PrintJob {
  id: string;
  templateId: string;
  templateName: string;
  printedAt: string;
  rows: TemplateRow[];
}

export interface PrinterDevice {
  name: string;
  address: string;
  connected: boolean;
}

export type PaperSize = '58mm' | '80mm';

export interface AppSettings {
  paperSize: PaperSize;
  lastPrinterAddress: string | null;
}
