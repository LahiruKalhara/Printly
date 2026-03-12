import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Template } from '../types';
import { RootStackParamList } from '../types/navigation';
import { getTemplates, deleteTemplate, saveAllTemplates, saveTemplate } from '../utils/storage';
import { generateId } from '../utils/helpers';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useGlobalAlert } from '../contexts/AlertContext';

export default function TemplatesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showAlert } = useGlobalAlert();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'mine'>('mine');

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [])
  );

  const loadTemplates = async () => {
    const data = await getTemplates();
    setTemplates(data);
  };

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const quickPrintTemplates = filtered.filter(t => t.isQuickPrint);
  const regularTemplates = filtered.filter(t => !t.isQuickPrint);

  const handleDelete = (id: string, name: string) => {
    showAlert('confirm', 'Delete Template', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTemplate(id);
          loadTemplates();
        },
      },
    ]);
  };

  const handleDuplicate = async (template: Template) => {
    const duplicate: Template = {
      ...template,
      id: generateId(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const all = await getTemplates();
    const idx = all.findIndex(t => t.id === template.id);
    all.splice(idx + 1, 0, duplicate);
    await saveAllTemplates(all);
    loadTemplates();
  };

  const handleSelect = (template: Template) => {
    navigation.navigate('TemplateEditor', {
      templateId: template.id,
      rows: template.rows,
      templateName: template.name,
      isQuickPrint: template.isQuickPrint,
    });
  };

  const handleExport = async (template: Template) => {
    try {
      // Convert image URIs to base64 for portability
      const exportRows = await Promise.all(
        template.rows.map(async r => {
          const { selectedOption, inputValue, ...rest } = r;
          if (rest.type === 'image' && rest.imageUri) {
            try {
              const base64 = await FileSystem.readAsStringAsync(rest.imageUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              return { ...rest, imageUri: `data:image/png;base64,${base64}` };
            } catch {
              return { ...rest, imageUri: undefined };
            }
          }
          return rest;
        })
      );
      const exportData = { ...template, rows: exportRows };
      const json = JSON.stringify(exportData, null, 2);
      const fileName = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}.printly`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, json);
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: `Export "${template.name}"`,
      });
    } catch (e: any) {
      console.log('Export error:', e);
      showAlert('error', 'Export Failed', e?.message || 'Could not export the template.');
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.uri) return;
      const content = await FileSystem.readAsStringAsync(asset.uri);
      const parsed = JSON.parse(content);

      // Validate basic structure
      if (!parsed.name || !Array.isArray(parsed.rows)) {
        showAlert('error', 'Invalid File', 'This file is not a valid Printly template.');
        return;
      }

      // Restore base64 images to local files
      const restoredRows = await Promise.all(
        parsed.rows.map(async (r: any) => {
          if (r.type === 'image' && r.imageUri && r.imageUri.startsWith('data:')) {
            try {
              const base64 = r.imageUri.split(',')[1];
              const localPath = `${FileSystem.documentDirectory}img_${generateId()}.png`;
              await FileSystem.writeAsStringAsync(localPath, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              return { ...r, imageUri: localPath };
            } catch {
              return { ...r, imageUri: undefined };
            }
          }
          return r;
        })
      );

      // Save as new template with new ID
      const imported: Template = {
        ...parsed,
        rows: restoredRows,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveTemplate(imported);
      loadTemplates();
      showAlert('success', 'Imported!', `Template "${imported.name}" has been imported.`);
    } catch {
      showAlert('error', 'Import Failed', 'Could not read the file. Make sure it is a valid .printly template.');
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const gridGap = 12;
  const horizontalPadding = 20 * 2; // container paddingHorizontal
  const cardWidth = (screenWidth - horizontalPadding - gridGap) / 2;

  const renderItem = ({ item }: { item: Template }) => {
    const previewLines = item.rows
      .map(r => r.text)
      .filter(Boolean)
      .slice(0, 3);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        {/* Preview Lines */}
        <View style={[styles.cardPreview, { backgroundColor: colors.bgSecondary }]}>
          {previewLines.length > 0 ? (
            previewLines.map((line, i) => (
              <Text
                key={i}
                style={[styles.previewLine, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {line}
              </Text>
            ))
          ) : (
            <Text style={[styles.previewLine, { color: colors.textMuted }]}>Empty template</Text>
          )}
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.cardCount, { color: colors.textMuted }]}>
              {item.rows.length} rows
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={() => handleExport(item)}
              style={[styles.deleteBtn, { backgroundColor: colors.accentMuted }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Export template"
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={14} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDuplicate(item)}
              style={[styles.deleteBtn, { backgroundColor: colors.accentMuted }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Duplicate template"
              accessibilityRole="button"
            >
              <Ionicons name="copy-outline" size={14} color={colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id, item.name)}
              style={[styles.deleteBtn, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Delete template"
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Templates</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.surface }]}
            onPress={handleImport}
            accessibilityLabel="Import template"
            accessibilityRole="button"
          >
            <Ionicons name="download-outline" size={20} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.accent }]}
            onPress={() => showAlert('confirm', 'New Template', 'What type of template do you want to create?', [
              { text: 'Quick Print', onPress: () => navigation.navigate('TemplateEditor', { isQuickPrint: true }) },
              { text: 'Regular', onPress: () => navigation.navigate('TemplateEditor', {}) },
            ])}
            accessibilityLabel="Create new template"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
        </View>
      </View>


      {/* Search */}
      <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.inputBorder }]}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search templates..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          accessibilityLabel="Search templates"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="layers-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Templates</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {search ? 'No templates match your search' : 'Create your first template to get started'}
          </Text>
          {!search && (
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.accent }]}
              onPress={() => navigation.navigate('TemplateEditor', {})}
            >
              <Ionicons name="add" size={18} color="#FFF" />
              <Text style={styles.emptyBtnText}>Create Template</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {quickPrintTemplates.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="flash" size={16} color="#2ED573" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Print Templates</Text>
              </View>
              <View style={styles.gridWrap}>
                {quickPrintTemplates.map(item => (
                  <View key={item.id} style={{ width: cardWidth }}>
                    {renderItem({ item })}
                  </View>
                ))}
              </View>
            </>
          )}

          {regularTemplates.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="layers-outline" size={16} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>My Templates</Text>
              </View>
              <View style={styles.gridWrap}>
                {regularTemplates.map(item => (
                  <View key={item.id} style={{ width: cardWidth }}>
                    {renderItem({ item })}
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
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
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  newBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 18,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  row: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardPreview: {
    padding: 14,
    minHeight: 80,
    justifyContent: 'center',
  },
  previewLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
});
