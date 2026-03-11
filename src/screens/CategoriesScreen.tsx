import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Template } from '../types';
import { RootStackParamList } from '../types/navigation';
import { getTemplates } from '../utils/storage';

export default function CategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [printerConnected, setPrinterConnected] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplates = async () => {
    const data = await getTemplates();
    setTemplates(data);
  };

  const handleConnectPrinter = () => {
    setPrinterConnected(true);
  };

  const handleDisconnect = () => {
    setPrinterConnected(false);
  };

  const handlePrintBill = () => {
    if (templates.length === 0) {
      // No templates yet — go straight to editor to create one
      navigation.navigate('TemplateEditor', {});
    } else {
      setShowTemplatePicker(true);
    }
  };

  const handlePickTemplate = (template: Template) => {
    setShowTemplatePicker(false);
    navigation.navigate('PrintBill', {
      templateId: template.id,
      rows: template.rows,
      templateName: template.name,
    });
  };

  const categories = [
    { id: 'text', label: 'Text', icon: 'document-text-outline' as const },
    { id: 'qr', label: 'QR Code', icon: 'qr-code-outline' as const },
    { id: 'barcode', label: 'Barcode', icon: 'barcode-outline' as const },
    { id: 'photos', label: 'Photos', icon: 'image-outline' as const },
  ];

  const categoryRowType: Record<string, string> = {
    text: 'text',
    qr: 'qr-code',
    barcode: 'barcode',
    photos: 'image',
  };

  const handleCategory = (id: string) => {
    navigation.navigate('TemplateEditor', { initialRowType: categoryRowType[id] || 'text' });
  };

  const renderTemplateItem = ({ item }: { item: Template }) => {
    const previewLines = item.rows
      .map(r => r.text)
      .filter(Boolean)
      .slice(0, 2)
      .join(' · ');

    return (
      <TouchableOpacity
        style={[styles.templateItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        onPress={() => handlePickTemplate(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.templateIcon, { backgroundColor: colors.accentMuted }]}>
          <Ionicons name="document-text-outline" size={20} color={colors.accent} />
        </View>
        <View style={styles.templateInfo}>
          <Text style={[styles.templateName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.templatePreview, { color: colors.textMuted }]} numberOfLines={1}>
            {previewLines || 'Empty template'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <Image source={require('../Logo/Printly.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>Printly</Text>
        </View>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Settings')}
          accessibilityLabel="Settings"
          accessibilityRole="button"
        >
          <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Printer Status Card */}
      <View style={[styles.printerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.printerRow}>
          <View style={[
            styles.statusDot,
            { backgroundColor: printerConnected ? colors.success : colors.textMuted }
          ]} />
          <View style={styles.printerInfo}>
            <Text style={[styles.printerLabel, { color: colors.text }]}>
              {printerConnected ? 'Printer Connected' : 'No Printer'}
            </Text>
            <Text style={[styles.printerSub, { color: colors.textMuted }]}>
              {printerConnected ? 'Ready to print' : 'Tap to connect'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.printerAction,
              {
                backgroundColor: printerConnected ? 'rgba(248, 113, 113, 0.12)' : colors.accentMuted,
              },
            ]}
            onPress={printerConnected ? handleDisconnect : handleConnectPrinter}
            accessibilityLabel={printerConnected ? 'Disconnect printer' : 'Connect printer'}
            accessibilityRole="button"
          >
            <Ionicons
              name={printerConnected ? 'close' : 'bluetooth'}
              size={18}
              color={printerConnected ? colors.error : colors.accent}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* PRIMARY: Print a Bill */}
      <TouchableOpacity
        style={[styles.printCard, { backgroundColor: colors.accent }]}
        onPress={handlePrintBill}
        activeOpacity={0.85}
        accessibilityLabel="Print a bill"
        accessibilityRole="button"
      >
        <View style={styles.printCardLeft}>
          <Text style={styles.printCardTitle}>Print a Bill</Text>
          <Text style={styles.printCardSub}>
            {templates.length > 0
              ? `Choose from ${templates.length} saved template${templates.length > 1 ? 's' : ''}`
              : 'Create your first template to get started'}
          </Text>
        </View>
        <View style={styles.printCardIcon}>
          <Ionicons name="print" size={40} color="rgba(255,255,255,0.3)" />
        </View>
      </TouchableOpacity>

      {/* SECONDARY: Create New Template */}
      <TouchableOpacity
        style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => navigation.navigate('TemplateEditor', {})}
        activeOpacity={0.7}
        accessibilityLabel="Create new template"
        accessibilityRole="button"
      >
        <View style={[styles.createIconWrap, { backgroundColor: colors.accentMuted }]}>
          <Ionicons name="add" size={22} color={colors.accent} />
        </View>
        <View style={styles.createInfo}>
          <Text style={[styles.createTitle, { color: colors.text }]}>Create New Template</Text>
          <Text style={[styles.createSub, { color: colors.textMuted }]}>Design a custom receipt layout</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Categories */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK START</Text>
      <View style={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => handleCategory(cat.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.gridIconWrap, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name={cat.icon} size={24} color={colors.accent} />
            </View>
            <Text style={[styles.gridLabel, { color: colors.text }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="print-outline" size={20} color={colors.accent} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paper Size</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>58mm</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="bluetooth-outline" size={20} color={printerConnected ? colors.success : colors.textMuted} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Status</Text>
          <Text style={[styles.statValue, { color: printerConnected ? colors.success : colors.textMuted }]}>
            {printerConnected ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={{ height: 30 }} />

      {/* Template Picker Modal */}
      <Modal visible={showTemplatePicker} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.pickerModal, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Choose a Template</Text>
              <TouchableOpacity
                onPress={() => setShowTemplatePicker(false)}
                style={[styles.pickerClose, { backgroundColor: colors.surface }]}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.pickerHint, { color: colors.textSecondary }]}>
              Select a template to print. You can edit it before printing.
            </Text>

            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={renderTemplateItem}
              contentContainerStyle={styles.pickerList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />

            {/* Create new from picker */}
            <TouchableOpacity
              style={[styles.pickerCreate, { borderColor: colors.cardBorder }]}
              onPress={() => {
                setShowTemplatePicker(false);
                navigation.navigate('TemplateEditor', {});
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.accent} />
              <Text style={[styles.pickerCreateText, { color: colors.accent }]}>
                Create New Template
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
  },
  printerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 14,
  },
  printerInfo: {
    flex: 1,
  },
  printerLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  printerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  printerAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Primary: Print a Bill
  printCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  printCardLeft: {
    flex: 1,
  },
  printCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
  },
  printCardSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    lineHeight: 18,
  },
  printCardIcon: {
    marginLeft: 12,
  },
  // Secondary: Create New
  createCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
  },
  createIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  createInfo: {
    flex: 1,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  createSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    width: '47.5%',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  gridIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  gridLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Template Picker Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  pickerClose: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerHint: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 18,
  },
  pickerList: {
    paddingBottom: 10,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  templateIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  templatePreview: {
    fontSize: 12,
    fontWeight: '500',
  },
  pickerCreate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 10,
  },
  pickerCreateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
