import { TemplateRow } from './index';

export type RootStackParamList = {
  Main: undefined;
  TemplateEditor: {
    templateId?: string;
    rows?: TemplateRow[];
    templateName?: string;
    initialRowType?: TemplateRow['type'];
    isQuickPrint?: boolean;
  } | undefined;
  PrintBill: {
    templateId?: string;
    rows?: TemplateRow[];
    templateName?: string;
    isQuickPrint?: boolean;
  };
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Templates: undefined;
};
