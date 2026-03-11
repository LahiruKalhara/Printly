import AsyncStorage from '@react-native-async-storage/async-storage';
import { Template, PrintJob, AppSettings } from '../types';

const TEMPLATES_KEY = 'printer_app_templates';
const HISTORY_KEY = 'printer_app_history';
const SETTINGS_KEY = 'printer_app_settings';

export async function getTemplates(): Promise<Template[]> {
  const data = await AsyncStorage.getItem(TEMPLATES_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveTemplate(template: Template): Promise<void> {
  const templates = await getTemplates();
  const index = templates.findIndex(t => t.id === template.id);
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.unshift(template);
  }
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export async function deleteTemplate(id: string): Promise<void> {
  const templates = await getTemplates();
  const filtered = templates.filter(t => t.id !== id);
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
}

export async function getHistory(): Promise<PrintJob[]> {
  const data = await AsyncStorage.getItem(HISTORY_KEY);
  return data ? JSON.parse(data) : [];
}

export async function addToHistory(job: PrintJob): Promise<void> {
  const history = await getHistory();
  history.unshift(job);
  if (history.length > 100) history.splice(100);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter(j => j.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}

export async function getSettings(): Promise<AppSettings> {
  const data = await AsyncStorage.getItem(SETTINGS_KEY);
  return data ? JSON.parse(data) : { paperSize: '58mm', lastPrinterAddress: null };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
