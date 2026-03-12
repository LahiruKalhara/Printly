import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertConfig {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  buttons?: AlertButton[];
}

interface CustomAlertProps extends AlertConfig {
  onDismiss: () => void;
}

const iconMap: Record<AlertType, { name: string; color: string }> = {
  success: { name: 'checkmark-circle', color: '' },
  error: { name: 'close-circle', color: '' },
  warning: { name: 'warning', color: '' },
  info: { name: 'information-circle', color: '' },
  confirm: { name: 'help-circle', color: '' },
};

export default function CustomAlert({ visible, type, title, message, buttons, onDismiss }: CustomAlertProps) {
  const { colors } = useTheme();

  const getColor = () => {
    switch (type) {
      case 'success': return colors.success;
      case 'error': return colors.error;
      case 'warning': return colors.warning;
      case 'info': return colors.info;
      case 'confirm': return colors.accent;
    }
  };

  const iconColor = getColor();
  const icon = iconMap[type];

  const alertButtons = buttons || [{ text: 'OK', style: 'default' }];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {/* Icon */}
              <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
                <Ionicons name={icon.name as any} size={32} color={iconColor} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

              {/* Buttons */}
              <View style={styles.buttonRow}>
                {alertButtons.map((btn, i) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';
                  const isPrimary = !isCancel && !isDestructive;

                  let bgColor = colors.accent;
                  let textColor = '#FFF';
                  if (isCancel) {
                    bgColor = colors.surface;
                    textColor = colors.textSecondary;
                  } else if (isDestructive) {
                    bgColor = colors.error;
                    textColor = '#FFF';
                  }

                  return (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.button,
                        { backgroundColor: bgColor },
                        isCancel && { borderWidth: 1, borderColor: colors.cardBorder },
                      ]}
                      onPress={() => {
                        onDismiss();
                        btn.onPress?.();
                      }}
                    >
                      <Text style={[styles.buttonText, { color: textColor }]}>{btn.text}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  container: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
