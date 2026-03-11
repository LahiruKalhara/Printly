import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import QRCodeView from '../components/QRCodeView';
import BarcodeView from '../components/BarcodeView';
import { TemplateRow, SelectOption } from '../types';
import { generateId, getCurrentDate, getCurrentTime } from '../utils/helpers';
import { addToHistory } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function PrintBillScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PrintBill'>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const templateName: string = route.params?.templateName || 'Bill';
  const templateId: string = route.params?.templateId || 'quick';
  const initialRows: TemplateRow[] = route.params?.rows || [];

  // Resolve auto fields and prepare editable state
  const [rows, setRows] = useState<TemplateRow[]>(
    initialRows.map(r => {
      if (r.type === 'auto-date') return { ...r, text: getCurrentDate() };
      if (r.type === 'auto-time') return { ...r, text: getCurrentTime() };
      return { ...r };
    })
  );
  const [showPreview, setShowPreview] = useState(false);

  // Select row state
  const [showSelectPicker, setShowSelectPicker] = useState(false);
  const [activeSelectRowId, setActiveSelectRowId] = useState<string | null>(null);

  // Date/Time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeDateTimeRowId, setActiveDateTimeRowId] = useState<string | null>(null);
  // Store actual Date objects for each row so the picker opens at the current value
  const [rowDates, setRowDates] = useState<Record<string, Date>>(() => {
    const map: Record<string, Date> = {};
    initialRows.forEach(r => {
      if (r.type === 'auto-date' || r.type === 'auto-time') {
        map[r.id] = new Date();
      }
    });
    return map;
  });

  const openDatePicker = (rowId: string) => {
    setActiveDateTimeRowId(rowId);
    setShowDatePicker(true);
  };

  const openTimePicker = (rowId: string) => {
    setActiveDateTimeRowId(rowId);
    setShowTimePicker(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selectedDate || !activeDateTimeRowId) return;
    setRowDates(prev => ({ ...prev, [activeDateTimeRowId]: selectedDate }));
    const d = selectedDate;
    const formatted = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    updateRow(activeDateTimeRowId, { text: formatted });
    setActiveDateTimeRowId(null);
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selectedDate || !activeDateTimeRowId) return;
    setRowDates(prev => ({ ...prev, [activeDateTimeRowId]: selectedDate }));
    const d = selectedDate;
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const formatted = `${h}:${mins} ${ampm}`;
    updateRow(activeDateTimeRowId, { text: formatted });
    setActiveDateTimeRowId(null);
  };

  const updateRow = (id: string, updates: Partial<TemplateRow>) => {
    setRows(rows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const openSelectPicker = (rowId: string) => {
    setActiveSelectRowId(rowId);
    setShowSelectPicker(true);
  };

  const pickSelectOption = (option: SelectOption) => {
    if (activeSelectRowId) {
      updateRow(activeSelectRowId, {
        selectedOption: option.label,
        text: option.label,
        // Clear inputValue when switching options
        inputValue: '',
      });
    }
    setShowSelectPicker(false);
    setActiveSelectRowId(null);
  };

  const handlePrint = async () => {
    // Check if any select rows don't have a selection
    const unselected = rows.filter(
      r => r.type === 'select' && (r.options || []).length > 0 && !r.selectedOption
    );
    if (unselected.length > 0) {
      Alert.alert('Missing Selection', 'Please select an option for all dropdown fields.');
      return;
    }

    // Check if any select rows with hasInput need input values
    const missingInput = rows.filter(r => {
      if (r.type !== 'select' || !r.selectedOption) return false;
      const opt = (r.options || []).find(o => o.label === r.selectedOption);
      return opt?.hasInput && !(r.inputValue || '').trim();
    });
    if (missingInput.length > 0) {
      Alert.alert('Missing Input', 'Please fill in all required text fields.');
      return;
    }

    // Check if any input rows are empty
    const emptyInputs = rows.filter(r => r.type === 'input' && !(r.inputValue || '').trim());
    if (emptyInputs.length > 0) {
      Alert.alert('Missing Input', 'Please fill in all input fields.');
      return;
    }

    // Build final rows — for select rows with input, keep selected option as text
    // and append a second row for the input value with its own formatting
    const finalRows: TemplateRow[] = [];
    rows.forEach(r => {
      if (r.type === 'select' && r.selectedOption) {
        finalRows.push({ ...r, text: r.selectedOption });
        const opt = (r.options || []).find(o => o.label === r.selectedOption);
        if (opt?.hasInput && r.inputValue) {
          const inputText = opt.inputTitle ? `${opt.inputTitle}: ${r.inputValue}` : r.inputValue;
          finalRows.push({
            ...r,
            id: r.id + '_input',
            type: 'text',
            text: inputText,
            bold: opt.inputBold || false,
            align: opt.inputAlign || 'center',
          });
        }
      } else if (r.type === 'input') {
        const inputText = r.text ? `${r.text}: ${r.inputValue || ''}` : (r.inputValue || '');
        finalRows.push({ ...r, text: inputText, type: 'text' });
      } else {
        finalRows.push(r);
      }
    });

    await addToHistory({
      id: generateId(),
      templateId,
      templateName,
      printedAt: new Date().toISOString(),
      rows: finalRows,
    });

    Alert.alert(
      'Printed!',
      'Bill sent to printer.\n\n(Bluetooth printing requires APK build. This is a simulation.)',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const renderField = (row: TemplateRow) => {
    // Select dropdown
    if (row.type === 'select') {
      const options = row.options || [];
      if (options.length === 0) return null;
      const selectedOpt = options.find(o => o.label === row.selectedOption);
      const needsInput = selectedOpt?.hasInput || false;
      const inputTitle = selectedOpt?.inputTitle || '';
      const inputPosition = selectedOpt?.inputPosition || 'bottom';
      const placeholder = inputTitle ? `Enter ${inputTitle}...` : `Enter details for ${row.selectedOption}...`;

      const selectCard = (
        <TouchableOpacity
          style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => openSelectPicker(row.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name="list-outline" size={18} color={colors.accent} />
          </View>
          <View style={styles.fieldBody}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Tap to select</Text>
            <Text style={[styles.fieldValue, { color: row.selectedOption ? colors.text : colors.textMuted }]}>
              {row.selectedOption || 'Choose an option...'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      );

      const inputCard = needsInput ? (
        <View style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name="create-outline" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            {inputTitle ? (
              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 4 }]}>{inputTitle}</Text>
            ) : null}
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={row.inputValue || ''}
              onChangeText={(text) => updateRow(row.id, { inputValue: text })}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      ) : null;

      // Arrange based on position
      if (!needsInput) {
        return <View key={row.id}>{selectCard}</View>;
      }

      if (inputPosition === 'top') {
        return (
          <View key={row.id}>
            {inputCard}
            {selectCard}
          </View>
        );
      }

      if (inputPosition === 'bottom') {
        return (
          <View key={row.id}>
            {selectCard}
            {inputCard}
          </View>
        );
      }

      // Left or right: side by side
      return (
        <View key={row.id} style={styles.selectSideBySide}>
          {inputPosition === 'left' ? (
            <>
              <View style={styles.selectSideItem}>{inputCard}</View>
              <View style={styles.selectSideItem}>{selectCard}</View>
            </>
          ) : (
            <>
              <View style={styles.selectSideItem}>{selectCard}</View>
              <View style={styles.selectSideItem}>{inputCard}</View>
            </>
          )}
        </View>
      );
    }

    // Input field — fillable at print time
    if (row.type === 'input') {
      return (
        <View
          key={row.id}
          style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name="create-outline" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            {row.text ? (
              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginBottom: 4 }]}>{row.text}</Text>
            ) : null}
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={row.inputValue || ''}
              onChangeText={(text) => updateRow(row.id, { inputValue: text })}
              placeholder={row.text ? `Enter ${row.text}...` : 'Enter value...'}
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
      );
    }

    // Editable text
    if (row.type === 'text') {
      return (
        <View
          key={row.id}
          style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name="text-outline" size={18} color={colors.accent} />
          </View>
          <TextInput
            style={[styles.fieldInput, { color: colors.text }]}
            value={row.text}
            onChangeText={(text) => updateRow(row.id, { text })}
            placeholder="Enter text..."
            placeholderTextColor={colors.textMuted}
          />
        </View>
      );
    }

    // QR Code — editable value
    if (row.type === 'qr-code') {
      return (
        <View
          key={row.id}
          style={[styles.fieldCard, styles.fieldCardColumn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <View style={styles.fieldRowTop}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="qr-code-outline" size={18} color={colors.accent} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={row.text}
              onChangeText={(text) => updateRow(row.id, { text })}
              placeholder="QR code value..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.fieldPreview}>
            <View style={{ backgroundColor: '#FFF', padding: 8, borderRadius: 8 }}>
              <QRCodeView value={row.text || ' '} size={80} />
            </View>
          </View>
        </View>
      );
    }

    // Barcode — editable value
    if (row.type === 'barcode') {
      return (
        <View
          key={row.id}
          style={[styles.fieldCard, styles.fieldCardColumn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <View style={styles.fieldRowTop}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="barcode-outline" size={18} color={colors.accent} />
            </View>
            <TextInput
              style={[styles.fieldInput, { color: colors.text }]}
              value={row.text}
              onChangeText={(text) => updateRow(row.id, { text })}
              placeholder="Barcode value..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.fieldPreview}>
            <View style={{ backgroundColor: '#FFF', padding: 8, borderRadius: 8 }}>
              <BarcodeView value={row.text || '0000'} width={160} height={44} />
            </View>
          </View>
        </View>
      );
    }

    // Image — display only
    if (row.type === 'image' && row.imageUri) {
      return (
        <View
          key={row.id}
          style={[styles.fieldCard, styles.fieldCardColumn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <View style={styles.fieldRowTop}>
            <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
              <Ionicons name="image-outline" size={18} color={colors.accent} />
            </View>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Image</Text>
          </View>
          <Image source={{ uri: row.imageUri }} style={styles.fieldImage} resizeMode="contain" />
        </View>
      );
    }

    // Separator — display only
    if (row.type === 'separator') {
      return (
        <View key={row.id} style={[styles.separatorRow, { borderColor: colors.divider }]} />
      );
    }

    // Auto date/time — tap to pick
    if (row.type === 'auto-date' || row.type === 'auto-time') {
      return (
        <TouchableOpacity
          key={row.id}
          style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => row.type === 'auto-date' ? openDatePicker(row.id) : openTimePicker(row.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
            <Ionicons
              name={row.type === 'auto-date' ? 'calendar-outline' : 'time-outline'}
              size={18}
              color={colors.accent}
            />
          </View>
          <View style={styles.fieldBody}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
              {row.type === 'auto-date' ? 'Date' : 'Time'} · Tap to change
            </Text>
            <Text style={[styles.fieldValue, { color: colors.text }]}>{row.text}</Text>
          </View>
          <Ionicons name={row.type === 'auto-date' ? 'calendar' : 'time'} size={18} color={colors.accent} />
        </TouchableOpacity>
      );
    }

    return null;
  };

  // Receipt preview
  const renderPreviewRow = (row: TemplateRow) => {
    if (row.type === 'qr-code') {
      return (
        <View key={row.id} style={[styles.previewRowWrap, { justifyContent: 'center' }]}>
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
      return (
        <View key={row.id} style={[styles.previewRowWrap, { justifyContent: 'center' }]}>
          <Image source={{ uri: row.imageUri }} style={styles.previewImage} resizeMode="contain" />
        </View>
      );
    }
    // Input rows
    if (row.type === 'input') {
      const displayText = row.inputValue
        ? (row.text ? `${row.text}: ${row.inputValue}` : row.inputValue)
        : (row.text ? `${row.text}: ___________` : '___________');
      return (
        <Text
          key={row.id}
          style={[
            styles.receiptText,
            { textAlign: row.align },
            row.bold && { fontWeight: 'bold' },
          ]}
        >
          {displayText}
        </Text>
      );
    }

    // Select rows: show selected option + input value if applicable
    if (row.type === 'select') {
      const opt = (row.options || []).find(o => o.label === row.selectedOption);
      const selectedLabel = row.selectedOption || 'Not selected';
      return (
        <View key={row.id}>
          <Text
            style={[
              styles.receiptText,
              { textAlign: row.align },
              row.bold && { fontWeight: 'bold' },
            ]}
          >
            {selectedLabel}
          </Text>
          {opt?.hasInput && row.inputValue ? (
            <Text
              style={[
                styles.receiptText,
                { textAlign: opt.inputAlign || 'center' },
                opt.inputBold && { fontWeight: 'bold' },
              ]}
            >
              {opt.inputTitle ? `${opt.inputTitle}: ` : ''}{row.inputValue}
            </Text>
          ) : null}
        </View>
      );
    }
    return (
      <Text
        key={row.id}
        style={[
          styles.receiptText,
          { textAlign: row.align },
          row.bold && { fontWeight: 'bold' },
        ]}
      >
        {row.text || ' '}
      </Text>
    );
  };

  const activeSelectRow = rows.find(r => r.id === activeSelectRowId);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: colors.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Print Bill</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{templateName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowPreview(true)}
          style={[styles.previewBtn, { backgroundColor: colors.accentMuted }]}
          accessibilityLabel="Preview receipt"
          accessibilityRole="button"
        >
          <Ionicons name="eye-outline" size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Fields */}
      <ScrollView
        style={styles.fields}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>FILL IN YOUR BILL</Text>
        {rows.map(renderField)}
      </ScrollView>

      {/* Bottom: Print Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.tabBar, borderTopColor: colors.tabBarBorder, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.printBtn, { backgroundColor: colors.accent }]}
          onPress={handlePrint}
          activeOpacity={0.85}
          accessibilityLabel="Print bill"
          accessibilityRole="button"
        >
          <Ionicons name="print" size={20} color="#FFF" />
          <Text style={styles.printBtnText}>Print Bill</Text>
        </TouchableOpacity>
      </View>

      {/* Select Picker Modal */}
      <Modal visible={showSelectPicker} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.selectModal, { backgroundColor: colors.card }]}>
            <View style={styles.selectHeader}>
              <Text style={[styles.selectTitle, { color: colors.text }]}>Select an Option</Text>
              <TouchableOpacity
                onPress={() => setShowSelectPicker(false)}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {(activeSelectRow?.options || []).map((opt) => {
                const isSelected = activeSelectRow?.selectedOption === opt.label;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    style={[
                      styles.selectOption,
                      isSelected && { backgroundColor: colors.accentMuted },
                    ]}
                    onPress={() => pickSelectOption(opt)}
                  >
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off-outline'}
                      size={22}
                      color={isSelected ? colors.accent : colors.textMuted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.selectOptionText,
                        { color: isSelected ? colors.text : colors.textSecondary },
                        isSelected && { fontWeight: '600' },
                      ]}>
                        {opt.label}
                      </Text>
                      {opt.hasInput && (
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          Has text input
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={20} color={colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreview} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.previewModal, { backgroundColor: colors.card }]}>
            <View style={styles.selectHeader}>
              <Text style={[styles.selectTitle, { color: colors.text }]}>Receipt Preview</Text>
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
              <View style={styles.receipt}>
                <View style={styles.receiptEdge} />
                {rows.map(renderPreviewRow)}
                <View style={[styles.receiptEdge, { marginTop: 16 }]} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.pickerModalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => { setShowDatePicker(false); setActiveDateTimeRowId(null); }}
        >
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Date</Text>
              <TouchableOpacity
                onPress={() => { setShowDatePicker(false); setActiveDateTimeRowId(null); }}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={activeDateTimeRowId ? (rowDates[activeDateTimeRowId] || new Date()) : new Date()}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                style={styles.pickerInModal}
                textColor={colors.text}
              />
            </View>
            <TouchableOpacity
              style={[styles.pickerDoneBtn, { backgroundColor: colors.accent }]}
              onPress={() => {
                if (activeDateTimeRowId) {
                  const d = rowDates[activeDateTimeRowId] || new Date();
                  const formatted = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  updateRow(activeDateTimeRowId, { text: formatted });
                }
                setShowDatePicker(false);
                setActiveDateTimeRowId(null);
              }}
              accessibilityLabel="Confirm date"
              accessibilityRole="button"
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="fade">
        <TouchableOpacity
          style={[styles.pickerModalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => { setShowTimePicker(false); setActiveDateTimeRowId(null); }}
        >
          <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.pickerModalHeader}>
              <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Select Time</Text>
              <TouchableOpacity
                onPress={() => { setShowTimePicker(false); setActiveDateTimeRowId(null); }}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={activeDateTimeRowId ? (rowDates[activeDateTimeRowId] || new Date()) : new Date()}
                mode="time"
                display="spinner"
                onChange={onTimeChange}
                style={styles.pickerInModal}
                textColor={colors.text}
              />
            </View>
            <TouchableOpacity
              style={[styles.pickerDoneBtn, { backgroundColor: colors.accent }]}
              onPress={() => {
                if (activeDateTimeRowId) {
                  const d = rowDates[activeDateTimeRowId] || new Date();
                  const hours = d.getHours();
                  const mins = d.getMinutes().toString().padStart(2, '0');
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  const h = hours % 12 || 12;
                  updateRow(activeDateTimeRowId, { text: `${h}:${mins} ${ampm}` });
                }
                setShowTimePicker(false);
                setActiveDateTimeRowId(null);
              }}
              accessibilityLabel="Confirm time"
              accessibilityRole="button"
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  previewBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fields: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 14,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  fieldCardColumn: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  selectSideBySide: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  selectSideItem: {
    flex: 1,
  },
  fieldRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fieldBody: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  fieldPreview: {
    alignItems: 'center',
    marginTop: 14,
  },
  fieldImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 12,
  },
  separatorRow: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
  },
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  printBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  selectModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  selectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectTitle: {
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
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  selectOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  previewModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  receipt: {
    padding: 20,
    borderRadius: 4,
    backgroundColor: '#FAFAF5',
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
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    borderRadius: 20,
    padding: 20,
    width: '88%',
    alignItems: 'center',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  pickerInModal: {
    height: 180,
    width: '100%',
    marginVertical: 10,
    alignSelf: 'center',
  },
  pickerWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerDoneBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  pickerDoneText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
