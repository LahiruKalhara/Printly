import AsyncStorage from '@react-native-async-storage/async-storage';
import { Template, PrintJob, AppSettings } from '../types';

const TEMPLATES_KEY = 'printer_app_templates';
const HISTORY_KEY = 'printer_app_history';
const SETTINGS_KEY = 'printer_app_settings';

function safeParse<T>(data: string | null, fallback: T): T {
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

export async function getTemplates(): Promise<Template[]> {
  try {
    const data = await AsyncStorage.getItem(TEMPLATES_KEY);
    return safeParse<Template[]>(data, []);
  } catch {
    return [];
  }
}

export async function saveTemplate(template: Template): Promise<void> {
  try {
    const templates = await getTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.unshift(template);
    }
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // Silently fail — could add error reporting here
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    const templates = await getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}

export async function getHistory(): Promise<PrintJob[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    return safeParse<PrintJob[]>(data, []);
  } catch {
    return [];
  }
}

export async function addToHistory(job: PrintJob): Promise<void> {
  try {
    const history = await getHistory();
    history.unshift(job);
    if (history.length > 100) history.splice(100);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Silently fail
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    const history = await getHistory();
    const filtered = history.filter(j => j.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch {
    // Silently fail
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  } catch {
    // Silently fail
  }
}

export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return safeParse<AppSettings>(data, { paperSize: '58mm', lastPrinterAddress: null });
  } catch {
    return { paperSize: '58mm', lastPrinterAddress: null };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Silently fail
  }
}
