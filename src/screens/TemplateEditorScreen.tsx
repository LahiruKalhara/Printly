import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AutoImage from '../components/AutoImage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';
import QRCodeView from '../components/QRCodeView';
import * as ImagePicker from 'expo-image-picker';
import { TemplateRow, Template, SelectOption, FontSize, ImageSize } from '../types';
import { generateId, getCurrentDate, getCurrentTime } from '../utils/helpers';
import { saveTemplate, getTemplates, addToHistory } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';
import { useGlobalAlert } from '../contexts/AlertContext';
import BarcodeView from '../components/BarcodeView';

export default function TemplateEditorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TemplateEditor'>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useGlobalAlert();

  const initialRowType: TemplateRow['type'] = route.params?.initialRowType || 'text';

  const initialRows: TemplateRow[] = route.params?.rows || [
    {
      id: generateId(),
      text: '',
      align: 'center',
      bold: false,
      type: initialRowType,
    },
  ];
  const initialName: string = route.params?.templateName || '';
  const templateId: string | undefined = route.params?.templateId;
  const isQuickPrint: boolean = route.params?.isQuickPrint || false;

  const [rows, setRows] = useState<TemplateRow[]>(initialRows);
  const [templateName] = useState(initialName);
  const [showPreview, setShowPreview] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [saveName, setSaveName] = useState(initialName);

  // Select row: option input state
  const [selectOptionInput, setSelectOptionInput] = useState<Record<string, string>>({});

  // Print-time select modal
  const [showPrintSelect, setShowPrintSelect] = useState(false);
  const [printSelections, setPrintSelections] = useState<Record<string, string>>({});
  const [activeSelectRowId, setActiveSelectRowId] = useState<string | null>(null);

  const addRow = (type: TemplateRow['type'] = 'text') => {
    const newRow: TemplateRow = {
      id: generateId(),
      text: type === 'separator' ? '--------------------------------' :
            type === 'auto-date' ? `Auto: ${getCurrentDate()}` :
            type === 'auto-time' ? `Time: ${getCurrentTime()}` :
            type === 'qr-code' ? 'https://example.com' :
            type === 'barcode' ? '123456789' :
            type === 'input' ? '' :
            type === 'select' ? '' : '',
      align: 'center',
      bold: false,
      type,
      ...(type === 'select' ? { options: [], selectedOption: '' } : {}),
      ...(type === 'image' ? { imageSize: 'medium' as ImageSize } : {}),
      ...(type === 'input' ? { inputPosition: 'bottom' as const } : {}),
    };
    setRows([...rows, newRow]);

    if (type === 'image') {
      pickImage(newRow.id);
    }
  };

  const pickImage = async (rowId: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('warning', 'Permission Required',
          'Photo library access is needed to add images. Please grant permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => { try { require('react-native').Linking.openSettings(); } catch {} } },
          ]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        updateRow(rowId, { imageUri: asset.uri, text: 'Image', imageSize: 'medium', imageWidth: asset.width, imageHeight: asset.height });
      } else {
        // Remove the row if user cancelled and it has no image yet
        setRows(prev => {
          const row = prev.find(r => r.id === rowId);
          if (row && !row.imageUri) {
            return prev.filter(r => r.id !== rowId);
          }
          return prev;
        });
      }
    } catch (err: any) {
      showAlert('error', 'Error', 'Could not open image picker. Please try again.');
    }
  };

  const getImageDimensions = (size?: ImageSize) => {
    if (size === 'small') return { width: 80, height: 60 };
    if (size === 'large') return { width: '100%' as const, height: 200 };
    return { width: 160, height: 120 }; // medium (default)
  };

  const cycleImageSize = (id: string, current?: ImageSize) => {
    const size = current || 'medium';
    const next: ImageSize = size === 'small' ? 'medium' : size === 'medium' ? 'large' : 'small';
    updateRow(id, { imageSize: next });
  };

  const getImageSizeLabel = (size?: ImageSize) => {
    if (size === 'small') return 'S';
    if (size === 'large') return 'L';
    return 'M';
  };

  const updateRow = (id: string, updates: Partial<TemplateRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRow = (id: string) => {
    setRows(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(r => r.id !== id);
    });
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    setRows(prev => {
      const newRows = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newRows.length) return prev;
      [newRows[index], newRows[targetIndex]] = [newRows[targetIndex], newRows[index]];
      return newRows;
    });
  };

  const cycleAlign = (id: string, current: string) => {
    const next = current === 'left' ? 'center' : current === 'center' ? 'right' : 'left';
    updateRow(id, { align: next as TemplateRow['align'] });
  };

  const cycleFontSize = (id: string, current?: FontSize) => {
    const size = current || 'normal';
    const next: FontSize = size === 'small' ? 'normal' : size === 'normal' ? 'large' : 'small';
    updateRow(id, { fontSize: next });
  };

  const getFontSizeLabel = (size?: FontSize) => {
    if (size === 'small') return 'S';
    if (size === 'large') return 'L';
    return 'N';
  };

  // --- Select row helpers ---
  const addSelectOption = (rowId: string) => {
    const val = (selectOptionInput[rowId] || '').trim();
    if (!val) return;
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const existing = row.options || [];
    if (existing.some(o => o.label === val)) {
      showAlert('warning', 'Duplicate', 'This option already exists');
      return;
    }
    updateRow(rowId, { options: [...existing, { label: val, hasInput: false }] });
    setSelectOptionInput({ ...selectOptionInput, [rowId]: '' });
  };

  const removeSelectOption = (rowId: string, optionLabel: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    updateRow(rowId, {
      options: (row.options || []).filter(o => o.label !== optionLabel),
      selectedOption: row.selectedOption === optionLabel ? '' : row.selectedOption,
    });
  };

  const toggleOptionInput = (rowId: string, optionLabel: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    updateRow(rowId, {
      options: (row.options || []).map(o =>
        o.label === optionLabel
          ? { ...o, hasInput: !o.hasInput, inputTitle: !o.hasInput ? '' : o.inputTitle, inputPosition: !o.hasInput ? 'bottom' : o.inputPosition }
          : o
      ),
    });
  };

  const updateOptionField = (rowId: string, optionLabel: string, updates: Partial<import('../types').SelectOption>) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    updateRow(rowId, {
      options: (row.options || []).map(o =>
        o.label === optionLabel ? { ...o, ...updates } : o
      ),
    });
  };

  // --- Print flow ---
  const handleSave = () => {
    setShowNameInput(true);
  };

  const confirmSave = async () => {
    if (!saveName.trim()) {
      showAlert('error', 'Error', 'Please enter a template name');
      return;
    }
    const template: Template = {
      id: templateId || generateId(),
      name: saveName.trim(),
      rows,
      createdAt: templateId ? '' : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(isQuickPrint ? { isQuickPrint: true } : {}),
    };
    if (templateId) {
      const templates = await getTemplates();
      const existing = templates.find(t => t.id === templateId);
      if (existing) template.createdAt = existing.createdAt;
    }
    await saveTemplate(template);
    setShowNameInput(false);
    showAlert('success', 'Saved', `Template "${saveName}" saved successfully!`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const handlePrint = () => {
    const selectRows = rows.filter(r => r.type === 'select' && (r.options || []).length > 0);
    if (selectRows.length > 0) {
      // Initialize selections with existing selectedOption or first option
      const initial: Record<string, string> = {};
      selectRows.forEach(r => {
        initial[r.id] = r.selectedOption || (r.options?.[0]?.label || '');
      });
      setPrintSelections(initial);
      setShowPrintSelect(true);
    } else {
      executePrint({});
    }
  };

  const executePrint = async (selections: Record<string, string>) => {
    const resolvedRows = rows.map(r => {
      if (r.type === 'auto-date') return { ...r, text: getCurrentDate() };
      if (r.type === 'auto-time') return { ...r, text: getCurrentTime() };
      if (r.type === 'select') {
        const selected = selections[r.id] || r.selectedOption || r.options?.[0]?.label || '';
        return { ...r, text: selected, selectedOption: selected };
      }
      return r;
    });

    await addToHistory({
      id: generateId(),
      templateId: templateId || 'quick',
      templateName: templateName || 'Quick Print',
      printedAt: new Date().toISOString(),
      rows: resolvedRows,
    });

    showAlert('success', 'Print',
      'Bill sent to printer!\n\n(Bluetooth printing requires APK build. This is a simulation.)');
  };

  const confirmPrintSelections = () => {
    setShowPrintSelect(false);
    executePrint(printSelections);
  };

  const getAlignLabel = (align: string) => {
    if (align === 'left') return 'L';
    if (align === 'right') return 'R';
    return 'C';
  };

  const getRowTypeIcon = (type: string): string => {
    if (type === 'separator') return 'remove-outline';
    if (type === 'auto-date') return 'calendar-outline';
    if (type === 'auto-time') return 'time-outline';
    if (type === 'qr-code') return 'qr-code-outline';
    if (type === 'barcode') return 'barcode-outline';
    if (type === 'image') return 'image-outline';
    if (type === 'input') return 'create-outline';
    if (type === 'select') return 'list-outline';
    return 'text-outline';
  };

  const getRowTypeLabel = (type: string): string => {
    if (type === 'qr-code') return 'QR Code';
    if (type === 'barcode') return 'Barcode';
    if (type === 'image') return 'Image';
    if (type === 'separator') return 'Separator';
    if (type === 'auto-date') return 'Date';
    if (type === 'auto-time') return 'Time';
    if (type === 'input') return 'Input';
    if (type === 'select') return 'Select';
    return 'Text';
  };

  const getPreviewFontSize = (size?: FontSize) => {
    if (size === 'small') return 10;
    if (size === 'large') return 18;
    return 13;
  };

  /** Render the inline content for a row */
  const renderRowContent = (row: TemplateRow) => {
    if (row.type === 'qr-code') {
      return (
        <View style={styles.specialContent}>
          <View style={styles.qrInline}>
            <QRCodeView value={row.text || ' '} size={48} />
          </View>
          <TextInput
            style={[styles.rowInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]}
            value={row.text}
            onChangeText={(text) => updateRow(row.id, { text })}
            placeholder="Enter URL or text..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
      );
    }

    if (row.type === 'barcode') {
      return (
        <View style={styles.specialContent}>
          <View style={styles.barcodeInline}>
            <BarcodeView value={row.text || '0000'} width={120} height={36} showText={false} />
          </View>
          <TextInput
            style={[styles.rowInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flex: 1 }]}
            value={row.text}
            onChangeText={(text) => updateRow(row.id, { text })}
            placeholder="Enter barcode value..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
      );
    }

    if (row.type === 'input') {
      const pos = row.inputPosition || 'bottom';
      return (
        <View style={styles.specialContent}>
          <TextInput
            style={[styles.rowInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            value={row.text}
            onChangeText={(text) => updateRow(row.id, { text })}
            placeholder="Input title (e.g. Customer Name, Address...)"
            placeholderTextColor={colors.textMuted}
          />
          <View style={[styles.inputConfigWrap, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
            <Text style={[styles.positionLabel, { color: colors.textMuted }]}>Value Position</Text>
            <View style={styles.positionRow}>
              {(['left', 'right', 'top', 'bottom'] as const).map((p) => {
                const isActive = pos === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.positionBtn,
                      { backgroundColor: isActive ? colors.accent : colors.inputBg, borderColor: isActive ? colors.accent : colors.inputBorder },
                    ]}
                    onPress={() => updateRow(row.id, { inputPosition: p })}
                  >
                    <Text style={[styles.positionBtnText, { color: isActive ? '#FFF' : colors.textMuted }]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={[styles.inputPreviewHint, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.inputPreviewHintText, { color: colors.textMuted }]}>
                {pos === 'left' ? 'Value  Title' :
                 pos === 'right' ? 'Title  Value' :
                 pos === 'top' ? 'Value appears above title' :
                 'Value appears below title'}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (row.type === 'image') {
      const imgDims = getImageDimensions(row.imageSize);
      return (
        <View style={styles.specialContent}>
          {row.imageUri ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => pickImage(row.id)}>
                <Image
                  source={{ uri: row.imageUri }}
                  style={{
                    width: imgDims.width,
                    height: imgDims.height,
                    borderRadius: 10,
                  }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.imageTapText, { color: colors.textMuted }]}>Tap image to change</Text>
                <Text style={[styles.imageTapText, { color: colors.textMuted }]}>·</Text>
                <Text style={[styles.imageTapText, { color: colors.accent }]}>
                  Size: {(row.imageSize || 'medium').charAt(0).toUpperCase() + (row.imageSize || 'medium').slice(1)}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => pickImage(row.id)}
              style={[styles.imagePicker, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
            >
              <Ionicons name="image-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.imagePickText, { color: colors.textMuted }]}>Pick Image</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (row.type === 'select') {
      const options = row.options || [];
      return (
        <View style={styles.specialContent}>
          {/* Options list */}
          {options.length > 0 && (
            <View style={[styles.optionsList, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
              {options.map((opt, i) => (
                <View
                  key={i}
                  style={[
                    styles.optionItem,
                    { flexDirection: 'column', alignItems: 'stretch' },
                    i < options.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                  ]}
                >
                  <View style={styles.optionMainRow}>
                    <Ionicons name="radio-button-off-outline" size={16} color={colors.accent} />
                    <Text style={[styles.optionText, { color: colors.text }]}>{opt.label}</Text>
                    <TouchableOpacity
                      onPress={() => removeSelectOption(row.id, opt.label)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  {/* Toggle: needs text input */}
                  <TouchableOpacity
                    style={styles.optionToggleRow}
                    onPress={() => toggleOptionInput(row.id, opt.label)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.hasInput ? 'checkbox' : 'square-outline'}
                      size={16}
                      color={opt.hasInput ? colors.accent : colors.textMuted}
                    />
                    <Text style={[styles.optionToggleText, { color: colors.textMuted }]}>
                      Needs text input
                    </Text>
                  </TouchableOpacity>

                  {/* Input config: title + position + formatting (shown when hasInput is true) */}
                  {opt.hasInput && (
                    <View style={[styles.inputConfigWrap, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
                      <TextInput
                        style={[styles.inputTitleField, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                        value={opt.inputTitle || ''}
                        onChangeText={(text) => updateOptionField(row.id, opt.label, { inputTitle: text })}
                        placeholder="Input title (e.g. Account Number)"
                        placeholderTextColor={colors.textMuted}
                      />
                      <Text style={[styles.positionLabel, { color: colors.textMuted }]}>Position</Text>
                      <View style={styles.positionRow}>
                        {(['top', 'bottom', 'left', 'right'] as const).map((pos) => {
                          const isActive = (opt.inputPosition || 'bottom') === pos;
                          return (
                            <TouchableOpacity
                              key={pos}
                              style={[
                                styles.positionBtn,
                                { backgroundColor: isActive ? colors.accent : colors.inputBg, borderColor: isActive ? colors.accent : colors.inputBorder },
                              ]}
                              onPress={() => updateOptionField(row.id, opt.label, { inputPosition: pos })}
                            >
                              <Text style={[styles.positionBtnText, { color: isActive ? '#FFF' : colors.textMuted }]}>
                                {pos.charAt(0).toUpperCase() + pos.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={[styles.positionLabel, { color: colors.textMuted }]}>Input Formatting</Text>
                      <View style={styles.positionRow}>
                        <TouchableOpacity
                          style={[
                            styles.positionBtn,
                            { backgroundColor: opt.inputBold ? colors.accent : colors.inputBg, borderColor: opt.inputBold ? colors.accent : colors.inputBorder },
                          ]}
                          onPress={() => updateOptionField(row.id, opt.label, { inputBold: !opt.inputBold })}
                        >
                          <Text style={[styles.positionBtnText, { color: opt.inputBold ? '#FFF' : colors.textMuted, fontWeight: '700' }]}>
                            Bold
                          </Text>
                        </TouchableOpacity>
                        {(['left', 'center', 'right'] as const).map((al) => {
                          const isActive = (opt.inputAlign || 'center') === al;
                          return (
                            <TouchableOpacity
                              key={al}
                              style={[
                                styles.positionBtn,
                                { backgroundColor: isActive ? colors.accent : colors.inputBg, borderColor: isActive ? colors.accent : colors.inputBorder },
                              ]}
                              onPress={() => updateOptionField(row.id, opt.label, { inputAlign: al })}
                            >
                              <Text style={[styles.positionBtnText, { color: isActive ? '#FFF' : colors.textMuted }]}>
                                {al === 'left' ? 'L' : al === 'center' ? 'C' : 'R'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Add option input */}
          <View style={styles.addOptionRow}>
            <TextInput
              style={[styles.addOptionInput, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
              value={selectOptionInput[row.id] || ''}
              onChangeText={(text) => setSelectOptionInput({ ...selectOptionInput, [row.id]: text })}
              placeholder="Add an option..."
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => addSelectOption(row.id)}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.addOptionBtn, { backgroundColor: colors.accent }]}
              onPress={() => addSelectOption(row.id)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {options.length === 0 && (
            <Text style={[styles.optionHint, { color: colors.textMuted }]}>
              Add items like "CEB Bill", "Water Bill" etc. You can pick one when printing.
            </Text>
          )}
        </View>
      );
    }

    // Default text / separator / auto-date / auto-time
    return (
      <TextInput
        style={[
          styles.rowInput,
          {
            color: colors.text,
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            textAlign: row.align,
          },
          row.bold && { fontWeight: 'bold' },
        ]}
        value={row.text}
        onChangeText={(text) => updateRow(row.id, { text })}
        placeholder={row.type === 'text' ? 'Type here...' : row.type}
        placeholderTextColor={colors.textMuted}
        editable={row.type === 'text' || row.type === 'separator'}
      />
    );
  };

  /** Render the receipt preview row */
  const renderPreviewRow = (row: TemplateRow) => {
    const resolved = { ...row };
    if (row.type === 'auto-date') resolved.text = getCurrentDate();
    if (row.type === 'auto-time') resolved.text = getCurrentTime();

    if (row.type === 'qr-code') {
      return (
        <View key={row.id} style={[styles.previewRowWrap, { justifyContent: row.align === 'left' ? 'flex-start' : row.align === 'right' ? 'flex-end' : 'center' }]}>
          <QRCodeView value={row.text || ' '} size={100} />
        </View>
      );
    }

    if (row.type === 'barcode') {
      return (
        <View key={row.id} style={[styles.previewRowWrap, { justifyContent: 'center' }]}>
          <BarcodeView value={row.text || '0000'} width={180} height={56} />
        </View>
      );
    }

    if (row.type === 'image' && row.imageUri) {
      const pct = row.imageSize === 'small' ? 40
        : row.imageSize === 'large' ? 90
        : 65;
      return (
        <AutoImage key={row.id} uri={row.imageUri} widthPercent={pct} />
      );
    }

    if (row.type === 'input') {
      const pos = row.inputPosition || 'bottom';
      const title = row.text || '';
      const blank = '___________';
      const textStyle = [
        styles.receiptText,
        { textAlign: resolved.align, fontSize: getPreviewFontSize(resolved.fontSize) } as any,
        resolved.bold && { fontWeight: 'bold' as const },
      ];

      if (!title) {
        return <Text key={row.id} style={textStyle}>{blank}</Text>;
      }

      if (pos === 'right') {
        return <Text key={row.id} style={textStyle}>{`${title} - ${blank}`}</Text>;
      }
      if (pos === 'left') {
        return <Text key={row.id} style={textStyle}>{`${blank} - ${title}`}</Text>;
      }
      // top or bottom
      return (
        <View key={row.id}>
          {pos === 'top' && <Text style={textStyle}>{blank}</Text>}
          <Text style={textStyle}>{title}</Text>
          {pos === 'bottom' && <Text style={textStyle}>{blank}</Text>}
        </View>
      );
    }

    if (row.type === 'select') {
      const val = row.selectedOption || (row.options?.[0]?.label || '[ pick when printing ]');
      return (
        <Text
          key={row.id}
          style={[
            styles.receiptText,
            { textAlign: resolved.align, fontSize: getPreviewFontSize(resolved.fontSize) },
            resolved.bold && { fontWeight: 'bold' },
          ]}
        >
          {val}
        </Text>
      );
    }

    return (
      <Text
        key={row.id}
        style={[
          styles.receiptText,
          { textAlign: resolved.align, fontSize: getPreviewFontSize(resolved.fontSize) },
          resolved.bold && { fontWeight: 'bold' },
        ]}
      >
        {resolved.text || ' '}
      </Text>
    );
  };

  // --- Print-time select modal ---
  const renderPrintSelectModal = () => {
    const selectRows = rows.filter(r => r.type === 'select' && (r.options || []).length > 0);

    return (
      <Modal visible={showPrintSelect} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.printSelectModal, { backgroundColor: colors.card }]}>
            <View style={styles.previewHeader}>
              <Text style={[styles.previewTitle, { color: colors.text }]}>Select Options</Text>
              <TouchableOpacity
                onPress={() => setShowPrintSelect(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.printSelectHint, { color: colors.textSecondary }]}>
              Pick an option for each dropdown before printing
            </Text>

            <ScrollView style={styles.printSelectList}>
              {selectRows.map((row) => (
                <View key={row.id} style={styles.printSelectGroup}>
                  <Text style={[styles.printSelectLabel, { color: colors.text }]}>
                    Select an option
                  </Text>
                  <View style={[styles.printSelectOptions, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    {(row.options || []).map((opt) => {
                      const isSelected = printSelections[row.id] === opt.label;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[
                            styles.printSelectOption,
                            isSelected && { backgroundColor: colors.accentMuted },
                          ]}
                          onPress={() => setPrintSelections({ ...printSelections, [row.id]: opt.label })}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off-outline'}
                            size={20}
                            color={isSelected ? colors.accent : colors.textMuted}
                          />
                          <Text style={[
                            styles.printSelectOptionText,
                            { color: isSelected ? colors.text : colors.textSecondary },
                            isSelected && { fontWeight: '600' },
                          ]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.printConfirmBtn, { backgroundColor: colors.accent }]}
              onPress={confirmPrintSelections}
            >
              <Ionicons name="print-outline" size={18} color="#FFF" />
              <Text style={styles.printConfirmText}>Print Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderPreview = () => (
    <Modal visible={showPreview} animationType="slide" transparent>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.previewContainer, { backgroundColor: colors.card }]}>
          <View style={styles.previewHeader}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>Receipt Preview</Text>
            <TouchableOpacity
              onPress={() => setShowPreview(false)}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              accessibilityLabel="Close preview"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <View style={[styles.receipt, { backgroundColor: '#FAFAF5' }]}>
              <View style={styles.receiptEdge} />
              {rows.map(renderPreviewRow)}
              <View style={[styles.receiptEdge, { marginTop: 16 }]} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.divider, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {templateId ? 'Edit Template' : isQuickPrint ? 'Quick Print Template' : 'New Template'}
        </Text>
        <TouchableOpacity
          onPress={() => setShowPreview(true)}
          style={[styles.previewToggle, { backgroundColor: colors.accentMuted }]}
          accessibilityLabel="Preview receipt"
          accessibilityRole="button"
        >
          <Ionicons name="eye-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Editor */}
      <ScrollView
        style={styles.editor}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, index) => (
          <View key={row.id} style={[styles.rowContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Row Type Indicator */}
            <View style={[styles.rowTypeBar, { backgroundColor: colors.accentMuted }]}>
              <Ionicons
                name={getRowTypeIcon(row.type) as any}
                size={14}
                color={colors.accent}
              />
            </View>

            <View style={styles.rowMain}>
              {/* Top Controls */}
              <View style={styles.rowControls}>
                <View style={styles.rowMoveControls}>
                  <TouchableOpacity
                    onPress={() => moveRow(index, 'up')}
                    style={[styles.moveBtn, { backgroundColor: colors.surface }]}
                    disabled={index === 0}
                  >
                    <Ionicons name="chevron-up" size={14} color={index === 0 ? colors.textMuted : colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveRow(index, 'down')}
                    style={[styles.moveBtn, { backgroundColor: colors.surface }]}
                    disabled={index === rows.length - 1}
                  >
                    <Ionicons name="chevron-down" size={14} color={index === rows.length - 1 ? colors.textMuted : colors.textSecondary} />
                  </TouchableOpacity>
                  <View style={[styles.typeBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.textMuted }]}>
                      {getRowTypeLabel(row.type)}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowFormatControls}>
                  {(row.type === 'text' || row.type === 'separator' || row.type === 'select' || row.type === 'input') && (
                    <TouchableOpacity
                      onPress={() => updateRow(row.id, { bold: !row.bold })}
                      style={[
                        styles.formatBtn,
                        { backgroundColor: row.bold ? colors.accent : colors.surface },
                      ]}
                    >
                      <Text style={[
                        styles.formatBtnText,
                        { color: row.bold ? '#FFF' : colors.textSecondary },
                      ]}>
                        B
                      </Text>
                    </TouchableOpacity>
                  )}

                  {row.type !== 'image' && row.type !== 'separator' && row.type !== 'qr-code' && row.type !== 'barcode' && (
                    <TouchableOpacity
                      onPress={() => cycleFontSize(row.id, row.fontSize)}
                      style={[
                        styles.formatBtn,
                        { backgroundColor: row.fontSize && row.fontSize !== 'normal' ? colors.accent : colors.surface },
                      ]}
                    >
                      <Text style={[
                        styles.formatBtnText,
                        { color: row.fontSize && row.fontSize !== 'normal' ? '#FFF' : colors.textSecondary },
                        row.fontSize === 'large' && { fontSize: 15 },
                        row.fontSize === 'small' && { fontSize: 10 },
                      ]}>
                        {getFontSizeLabel(row.fontSize)}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {row.type === 'image' && (
                    <TouchableOpacity
                      onPress={() => cycleImageSize(row.id, row.imageSize)}
                      style={[
                        styles.formatBtn,
                        { backgroundColor: row.imageSize && row.imageSize !== 'medium' ? colors.accent : colors.surface },
                      ]}
                    >
                      <Text style={[
                        styles.formatBtnText,
                        { color: row.imageSize && row.imageSize !== 'medium' ? '#FFF' : colors.textSecondary },
                      ]}>
                        {getImageSizeLabel(row.imageSize)}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {row.type !== 'image' && (
                    <TouchableOpacity
                      onPress={() => cycleAlign(row.id, row.align)}
                      style={[styles.formatBtn, { backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.formatBtnText, { color: colors.accent }]}>
                        {getAlignLabel(row.align)}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {rows.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeRow(row.id)}
                      style={[styles.formatBtn, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}
                    >
                      <Ionicons name="close" size={14} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Row Content */}
              {renderRowContent(row)}
            </View>
          </View>
        ))}

        {/* Add Row Buttons */}
        <View style={styles.addSection}>
          <Text style={[styles.addLabel, { color: colors.textMuted }]}>ADD ROW</Text>
          <View style={styles.addRow}>
            {[
              { type: 'text' as const, label: 'Text', icon: 'text-outline' },
              { type: 'separator' as const, label: 'Line', icon: 'remove-outline' },
              { type: 'auto-date' as const, label: 'Date', icon: 'calendar-outline' },
              { type: 'auto-time' as const, label: 'Time', icon: 'time-outline' },
              { type: 'qr-code' as const, label: 'QR Code', icon: 'qr-code-outline' },
              { type: 'barcode' as const, label: 'Barcode', icon: 'barcode-outline' },
              { type: 'image' as const, label: 'Image', icon: 'image-outline' },
              { type: 'input' as const, label: 'Input', icon: 'create-outline' },
              { type: 'select' as const, label: 'Select', icon: 'list-outline' },
            ].map((item) => (
              <TouchableOpacity
                key={item.type}
                style={[styles.addBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => addRow(item.type)}
              >
                <Ionicons name={item.icon as any} size={18} color={colors.accent} />
                <Text style={[styles.addBtnText, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveActionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Discard changes"
          accessibilityRole="button"
        >
          <Ionicons name="close-outline" size={18} color={colors.text} />
          <Text style={[styles.saveActionText, { color: colors.text }]}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveActionBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
          onPress={handleSave}
          accessibilityLabel="Save template"
          accessibilityRole="button"
        >
          <Ionicons name="bookmark-outline" size={18} color="#FFF" />
          <Text style={[styles.saveActionText, { color: '#FFF' }]}>Save Template</Text>
        </TouchableOpacity>
      </View>

      {renderPreview()}

      {/* Save Name Modal */}
      <Modal visible={showNameInput} transparent animationType="fade">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.nameModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.nameModalTitle, { color: colors.text }]}>Save Template</Text>
            <Text style={[styles.nameModalSub, { color: colors.textSecondary }]}>
              Give your template a name
            </Text>
            <TextInput
              style={[styles.nameInput, {
                color: colors.text,
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
              }]}
              value={saveName}
              onChangeText={setSaveName}
              placeholder="e.g. Restaurant Bill"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.nameModalActions}>
              <TouchableOpacity
                style={[styles.nameCancelBtn, { backgroundColor: colors.surface }]}
                onPress={() => setShowNameInput(false)}
              >
                <Text style={[styles.nameCancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nameSaveBtn, { backgroundColor: colors.accent }]} onPress={confirmSave}>
                <Text style={styles.nameSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    letterSpacing: -0.3,
  },
  previewToggle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editor: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowTypeBar: {
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    padding: 12,
  },
  rowControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowMoveControls: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  moveBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  rowFormatControls: {
    flexDirection: 'row',
    gap: 6,
  },
  formatBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formatBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  rowInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  specialContent: {
    gap: 10,
  },
  qrInline: {
    alignSelf: 'center',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
  },
  barcodeInline: {
    alignSelf: 'center',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
  },
  imagePreview: {
    alignItems: 'center',
    gap: 6,
  },
  imageThumb: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  imageTapText: {
    fontSize: 12,
    fontWeight: '500',
  },
  imagePicker: {
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  imagePickText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Select row styles
  inputPreviewHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  inputPreviewHintText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  optionsList: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
  },
  optionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  optionToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 26,
    marginTop: 4,
  },
  optionToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputConfigWrap: {
    marginLeft: 26,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  inputTitleField: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  positionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  positionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  positionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  positionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addOptionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addOptionInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  addOptionBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionHint: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  // Add row section
  addSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  addLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  saveActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  printActionBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  printActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    borderRadius: 20,
    width: '88%',
    maxHeight: '80%',
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receipt: {
    padding: 20,
    borderRadius: 4,
  },
  receiptEdge: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CCC',
    marginBottom: 16,
  },
  receiptText: {
    fontSize: 13,
    color: '#222',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  previewRowWrap: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  previewImage: {
    width: '80%',
    height: 120,
    borderRadius: 4,
  },
  // Print-time select modal
  printSelectModal: {
    borderRadius: 20,
    width: '88%',
    maxHeight: '80%',
    padding: 20,
  },
  printSelectHint: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 18,
  },
  printSelectList: {
    maxHeight: 400,
  },
  printSelectGroup: {
    marginBottom: 20,
  },
  printSelectLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  printSelectOptions: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  printSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  printSelectOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  printConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  printConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  nameModal: {
    borderRadius: 20,
    padding: 24,
    width: '88%',
  },
  nameModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  nameModalSub: {
    fontSize: 14,
    marginBottom: 20,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 20,
  },
  nameModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  nameCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nameCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  nameSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  nameSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
