/**
 * ESC/POS command builder for thermal printers.
 * Converts template rows into ESC/POS byte commands.
 */
import { TemplateRow, PaperSize } from '../types';

// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

// Initialize printer
const INIT = ESC + '@';

// Text alignment
const ALIGN_LEFT = ESC + 'a' + '\x00';
const ALIGN_CENTER = ESC + 'a' + '\x01';
const ALIGN_RIGHT = ESC + 'a' + '\x02';

// Bold
const BOLD_ON = ESC + 'E' + '\x01';
const BOLD_OFF = ESC + 'E' + '\x00';

// Font size
const FONT_NORMAL = GS + '!' + '\x00';
const FONT_DOUBLE_HEIGHT = GS + '!' + '\x01';
const FONT_DOUBLE_WIDTH = GS + '!' + '\x10';
const FONT_DOUBLE = GS + '!' + '\x11';

// Cut paper
const CUT = GS + 'V' + '\x00';
const PARTIAL_CUT = GS + 'V' + '\x01';

// Feed lines
const FEED_3 = ESC + 'd' + '\x03';
const FEED_5 = ESC + 'd' + '\x05';

function getAlignCmd(align?: string): string {
  switch (align) {
    case 'center': return ALIGN_CENTER;
    case 'right': return ALIGN_RIGHT;
    default: return ALIGN_LEFT;
  }
}

function getCharWidth(paperSize: PaperSize): number {
  return paperSize === '58mm' ? 32 : 48;
}

function buildSeparator(paperSize: PaperSize): string {
  const width = getCharWidth(paperSize);
  return ALIGN_LEFT + '-'.repeat(width) + LF;
}

function buildTextRow(text: string, bold: boolean, align?: string): string {
  let cmd = '';
  cmd += getAlignCmd(align);
  if (bold) cmd += BOLD_ON;
  cmd += (text || '') + LF;
  if (bold) cmd += BOLD_OFF;
  return cmd;
}

/**
 * Build ESC/POS commands for a QR code using GS ( k command.
 * Many cheap thermal printers don't support this — we fall back to printing the text value.
 */
function buildQRCode(value: string): string {
  if (!value) return '';

  // Try native QR — model 2
  const data = value;
  const len = data.length + 3;
  const pL = len % 256;
  const pH = Math.floor(len / 256);

  let cmd = ALIGN_CENTER;
  // QR model
  cmd += GS + '(k' + '\x04\x00' + '\x31\x41\x32\x00';
  // QR size (module size 6)
  cmd += GS + '(k' + '\x03\x00' + '\x31\x43\x06';
  // QR error correction (L)
  cmd += GS + '(k' + '\x03\x00' + '\x31\x45\x30';
  // Store data
  cmd += GS + '(k' + String.fromCharCode(pL, pH) + '\x31\x50\x30' + data;
  // Print QR
  cmd += GS + '(k' + '\x03\x00' + '\x31\x51\x30';
  cmd += LF;

  return cmd;
}

/**
 * Build ESC/POS commands for a barcode (Code 128).
 */
function buildBarcode(value: string): string {
  if (!value) return '';

  let cmd = ALIGN_CENTER;
  // Set barcode height (80 dots)
  cmd += GS + 'h' + '\x50';
  // Set barcode width (3)
  cmd += GS + 'w' + '\x03';
  // Print HRI below barcode
  cmd += GS + 'H' + '\x02';
  // Print Code 128
  cmd += GS + 'k' + '\x49' + String.fromCharCode(value.length) + value;
  cmd += LF;

  return cmd;
}

/**
 * Convert template rows to a single ESC/POS command string.
 */
export function buildPrintData(rows: TemplateRow[], paperSize: PaperSize): string {
  let cmd = INIT; // Reset printer

  for (const row of rows) {
    switch (row.type) {
      case 'text':
      case 'auto-date':
      case 'auto-time':
        cmd += buildTextRow(row.text, row.bold, row.align);
        break;

      case 'separator':
        cmd += buildSeparator(paperSize);
        break;

      case 'qr-code':
        cmd += buildQRCode(row.text);
        break;

      case 'barcode':
        cmd += buildBarcode(row.text);
        break;

      case 'image':
        // Image printing requires bitmap conversion — skip for now, print placeholder
        cmd += ALIGN_CENTER + '[Image]' + LF;
        break;

      case 'select':
        // Select rows are resolved to text before printing
        cmd += buildTextRow(row.text, row.bold, row.align);
        break;

      case 'input':
        cmd += buildTextRow(row.text, row.bold, row.align);
        break;

      default:
        if (row.text) {
          cmd += buildTextRow(row.text, row.bold, row.align);
        }
    }
  }

  // Feed and cut
  cmd += FEED_5;
  cmd += PARTIAL_CUT;

  return cmd;
}
