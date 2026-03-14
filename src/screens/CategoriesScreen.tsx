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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { usePrinter, BluetoothDevice } from '../contexts/PrinterContext';
import { Template, TemplateRow } from '../types';
import { RootStackParamList } from '../types/navigation';
import { getTemplates, getSettings } from '../utils/storage';

export default function CategoriesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const printer = usePrinter();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showQuickPrintPicker, setShowQuickPrintPicker] = useState(false);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [paperSize, setPaperSize] = useState('58mm');

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplates = async () => {
    const data = await getTemplates();
    setTemplates(data);
    const settings = await getSettings();
    setPaperSize(settings.paperSize);
  };

  const handleConnectPrinter = async () => {
    setShowDevicePicker(true);
    await printer.scanDevices();
  };

  const handleSelectDevice = async (device: BluetoothDevice) => {
    setConnectingAddress(device.inner_mac_address);
    const success = await printer.connectDevice(device.inner_mac_address);
    setConnectingAddress(null);
    if (success) {
      setShowDevicePicker(false);
    }
  };

  const handleDisconnect = () => {
    printer.disconnect();
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

  const quickPrintTemplates = templates.filter(t => t.isQuickPrint);

  const handleQuickPrint = () => {
    if (quickPrintTemplates.length === 0) {
      navigation.navigate('TemplateEditor', { isQuickPrint: true });
    } else {
      setShowQuickPrintPicker(true);
    }
  };

  const handlePickQuickPrint = (template: Template) => {
    setShowQuickPrintPicker(false);
    navigation.navigate('PrintBill', {
      templateId: template.id,
      rows: template.rows,
      templateName: template.name,
      isQuickPrint: true,
    });
  };

  const categories = [
    { id: 'text', label: 'Text', icon: 'document-text-outline' as const },
    { id: 'qr', label: 'QR Code', icon: 'qr-code-outline' as const },
    { id: 'barcode', label: 'Barcode', icon: 'barcode-outline' as const },
    { id: 'photos', label: 'Photos', icon: 'image-outline' as const },
  ];

  const categoryRowType: Record<string, TemplateRow['type']> = {
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
            { backgroundColor: printer.isConnected ? colors.success : colors.textMuted }
          ]} />
          <View style={styles.printerInfo}>
            <Text style={[styles.printerLabel, { color: colors.text }]}>
              {printer.isConnected ? (printer.connectedDevice?.device_name || 'Printer Connected') : 'No Printer'}
            </Text>
            <Text style={[styles.printerSub, { color: colors.textMuted }]}>
              {printer.isConnected ? 'Ready to print' : 'Tap to connect'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.printerAction,
              {
                backgroundColor: printer.isConnected ? 'rgba(248, 113, 113, 0.12)' : colors.accentMuted,
              },
            ]}
            onPress={printer.isConnected ? handleDisconnect : handleConnectPrinter}
            accessibilityLabel={printer.isConnected ? 'Disconnect printer' : 'Connect printer'}
            accessibilityRole="button"
          >
            <Ionicons
              name={printer.isConnected ? 'close' : 'bluetooth'}
              size={18}
              color={printer.isConnected ? colors.error : colors.accent}
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

      {/* Quick Print */}
      <TouchableOpacity
        style={[styles.quickPrintCard, { backgroundColor: '#2ED573' }]}
        onPress={handleQuickPrint}
        activeOpacity={0.85}
        accessibilityLabel="Quick print"
        accessibilityRole="button"
      >
        <View style={styles.printCardLeft}>
          <Text style={styles.printCardTitle}>Quick Print</Text>
          <Text style={styles.printCardSub}>
            {quickPrintTemplates.length > 0
              ? `${quickPrintTemplates.length} quick template${quickPrintTemplates.length > 1 ? 's' : ''} ready`
              : 'Create a quick print template to start'}
          </Text>
        </View>
        <View style={styles.printCardIcon}>
          <Ionicons name="flash" size={40} color="rgba(255,255,255,0.3)" />
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

      {/* Create Quick Print Template */}
      <TouchableOpacity
        style={[styles.createCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => navigation.navigate('TemplateEditor', { isQuickPrint: true })}
        activeOpacity={0.7}
        accessibilityLabel="Create quick print template"
        accessibilityRole="button"
      >
        <View style={[styles.createIconWrap, { backgroundColor: 'rgba(46, 213, 115, 0.12)' }]}>
          <Ionicons name="flash" size={22} color="#2ED573" />
        </View>
        <View style={styles.createInfo}>
          <Text style={[styles.createTitle, { color: colors.text }]}>Create Quick Print Template</Text>
          <Text style={[styles.createSub, { color: colors.textMuted }]}>Save to quick print for fast access</Text>
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
          <Text style={[styles.statValue, { color: colors.text }]}>{paperSize}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="bluetooth-outline" size={20} color={printer.isConnected ? colors.success : colors.textMuted} />
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Status</Text>
          <Text style={[styles.statValue, { color: printer.isConnected ? colors.success : colors.textMuted }]}>
            {printer.isConnected ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={{ height: 30 }} />

      {/* Bluetooth Device Picker Modal */}
      <Modal visible={showDevicePicker} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.pickerModal, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Connect Printer</Text>
              <TouchableOpacity
                onPress={() => setShowDevicePicker(false)}
                style={[styles.pickerClose, { backgroundColor: colors.surface }]}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.pickerHint, { color: colors.textSecondary }]}>
              Make sure your printer is turned on and Bluetooth is enabled.
            </Text>

            {printer.isScanning ? (
              <View style={styles.scanningWrap}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.scanningText, { color: colors.textMuted }]}>
                  Scanning for devices...
                </Text>
              </View>
            ) : printer.devices.length === 0 ? (
              <View style={styles.scanningWrap}>
                <Ionicons name="bluetooth-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.scanningText, { color: colors.textMuted }]}>
                  No devices found
                </Text>
                <TouchableOpacity
                  style={[styles.rescanBtn, { backgroundColor: colors.accentMuted }]}
                  onPress={() => printer.scanDevices()}
                >
                  <Ionicons name="refresh" size={18} color={colors.accent} />
                  <Text style={[styles.rescanText, { color: colors.accent }]}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <FlatList
                  data={printer.devices}
                  keyExtractor={(item) => item.inner_mac_address}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.deviceItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                      onPress={() => handleSelectDevice(item)}
                      disabled={connectingAddress === item.inner_mac_address}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.deviceIcon, { backgroundColor: colors.accentMuted }]}>
                        <Ionicons name="print-outline" size={20} color={colors.accent} />
                      </View>
                      <View style={styles.deviceInfo}>
                        <Text style={[styles.deviceName, { color: colors.text }]}>{item.device_name || 'Unknown Device'}</Text>
                        <Text style={[styles.deviceAddr, { color: colors.textMuted }]}>{item.inner_mac_address}</Text>
                      </View>
                      {connectingAddress === item.inner_mac_address ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  contentContainerStyle={{ paddingBottom: 10 }}
                  showsVerticalScrollIndicator={false}
                />
                <TouchableOpacity
                  style={[styles.rescanBtn, { backgroundColor: colors.accentMuted, alignSelf: 'center', marginTop: 12 }]}
                  onPress={() => printer.scanDevices()}
                >
                  <Ionicons name="refresh" size={18} color={colors.accent} />
                  <Text style={[styles.rescanText, { color: colors.accent }]}>Scan Again</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

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
      {/* Quick Print Template Picker Modal */}
      <Modal visible={showQuickPrintPicker} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.pickerModal, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Quick Print</Text>
              <TouchableOpacity
                onPress={() => setShowQuickPrintPicker(false)}
                style={[styles.pickerClose, { backgroundColor: colors.surface }]}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.pickerHint, { color: colors.textSecondary }]}>
              Choose a template. You'll only need to fill in the input fields.
            </Text>

            <FlatList
              data={quickPrintTemplates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const inputCount = item.rows.filter(r => r.type === 'input' || r.type === 'input-amount' || r.type === 'select').length;
                return (
                  <TouchableOpacity
                    style={[styles.templateItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                    onPress={() => handlePickQuickPrint(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.templateIcon, { backgroundColor: 'rgba(46, 213, 115, 0.12)' }]}>
                      <Ionicons name="flash" size={20} color="#2ED573" />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={[styles.templateName, { color: colors.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.templatePreview, { color: colors.textMuted }]} numberOfLines={1}>
                        {inputCount > 0 ? `${inputCount} field${inputCount > 1 ? 's' : ''} to fill` : 'No input fields'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.pickerList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />

            <TouchableOpacity
              style={[styles.pickerCreate, { borderColor: colors.cardBorder }]}
              onPress={() => {
                setShowQuickPrintPicker(false);
                navigation.navigate('TemplateEditor', { isQuickPrint: true });
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#2ED573" />
              <Text style={[styles.pickerCreateText, { color: '#2ED573' }]}>
                Create Quick Print Template
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
  quickPrintCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  // Secondary: Create New
  createCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  // Bluetooth device picker
  scanningWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 14,
  },
  scanningText: {
    fontSize: 14,
    fontWeight: '500',
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  rescanText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  deviceAddr: {
    fontSize: 12,
    fontWeight: '500',
  },
});
