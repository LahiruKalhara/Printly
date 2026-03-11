import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PaperSize } from '../types';
import { RootStackParamList } from '../types/navigation';
import { getSettings, saveSettings } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [paperSize, setPaperSize] = useState<PaperSize>('58mm');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    setPaperSize(settings.paperSize);
  };

  const handleSizeChange = async (size: PaperSize) => {
    setPaperSize(size);
    const settings = await getSettings();
    await saveSettings({ ...settings, paperSize: size });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Theme Toggle */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>APPEARANCE</Text>
      <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.settingRow}>
          <View style={[styles.settingIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={colors.accent} />
          </View>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingName, { color: colors.text }]}>Dark Mode</Text>
            <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
              {isDark ? 'Dark theme is active' : 'Light theme is active'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.inputBorder, true: colors.accent }}
            thumbColor="#FFF"
            accessibilityLabel="Toggle dark mode"
          />
        </View>
      </View>

      {/* Paper Size */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PRINTER</Text>
      <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <TouchableOpacity
          style={[
            styles.sizeOption,
            paperSize === '58mm' && { backgroundColor: colors.accentMuted },
          ]}
          onPress={() => handleSizeChange('58mm')}
          accessibilityLabel="58mm"
          accessibilityRole="radio"
        >
          <View style={styles.sizeLeft}>
            <View style={[styles.radio, { borderColor: paperSize === '58mm' ? colors.accent : colors.textMuted }]}>
              {paperSize === '58mm' && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
            </View>
            <View>
              <Text style={[styles.sizeName, { color: colors.text }]}>58mm</Text>
              <Text style={[styles.sizeDesc, { color: colors.textMuted }]}>Small thermal printers</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={[styles.sizeDivider, { backgroundColor: colors.divider }]} />

        <TouchableOpacity
          style={[
            styles.sizeOption,
            paperSize === '80mm' && { backgroundColor: colors.accentMuted },
          ]}
          onPress={() => handleSizeChange('80mm')}
          accessibilityLabel="80mm"
          accessibilityRole="radio"
        >
          <View style={styles.sizeLeft}>
            <View style={[styles.radio, { borderColor: paperSize === '80mm' ? colors.accent : colors.textMuted }]}>
              {paperSize === '80mm' && <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />}
            </View>
            <View>
              <Text style={[styles.sizeName, { color: colors.text }]}>80mm</Text>
              <Text style={[styles.sizeDesc, { color: colors.textMuted }]}>Standard thermal printers</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.accentMuted }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
        <Text style={[styles.infoText, { color: colors.accent }]}>
          Paper size affects how your bill is formatted for printing. Make sure it matches your printer's paper width.
        </Text>
      </View>

      {/* About */}
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>ABOUT</Text>
      <View style={[styles.settingCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Version</Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>1.0.0</Text>
        </View>
        <View style={[styles.sizeDivider, { backgroundColor: colors.divider }]} />
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>Platform</Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>Expo / React Native</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  settingCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingName: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  sizeOption: {
    padding: 16,
    borderRadius: 4,
  },
  sizeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sizeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sizeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  sizeDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 28,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
