import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import CustomAlert, { AlertType, AlertButton, AlertConfig } from '../components/CustomAlert';

const initialState: AlertConfig = {
  visible: false,
  type: 'info',
  title: '',
  message: '',
  buttons: undefined,
};

interface AlertContextType {
  showAlert: (type: AlertType, title: string, message: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
});

export function AlertProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AlertConfig>(initialState);

  const showAlert = useCallback((type: AlertType, title: string, message: string, buttons?: AlertButton[]) => {
    setConfig({ visible: true, type, title, message, buttons });
  }, []);

  const hideAlert = useCallback(() => {
    setConfig(initialState);
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert {...config} onDismiss={hideAlert} />
    </AlertContext.Provider>
  );
}

export function useGlobalAlert() {
  return useContext(AlertContext);
}
