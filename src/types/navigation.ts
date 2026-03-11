import { TemplateRow } from './index';

export type RootStackParamList = {
  Main: undefined;
  TemplateEditor: {
    templateId?: string;
    rows?: TemplateRow[];
    templateName?: string;
    initialRowType?: TemplateRow['type'];
  } | undefined;
  PrintBill: {
    templateId?: string;
    rows?: TemplateRow[];
    templateName?: string;
  };
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  History: undefined;
  Templates: undefined;
};
