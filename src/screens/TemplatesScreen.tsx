import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Template } from '../types';
import { getTemplates, deleteTemplate } from '../utils/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function TemplatesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Template', `Delete "${name}"?`, [
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

  const handleSelect = (template: Template) => {
    navigation.navigate('TemplateEditor', {
      templateId: template.id,
      rows: template.rows,
      templateName: template.name,
    });
  };

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
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            style={[styles.deleteBtn, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={14} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Templates</Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate('TemplateEditor', {})}
        >
          <Ionicons name="add" size={20} color="#FFF" />
        </TouchableOpacity>
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
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    maxWidth: '48.5%',
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
});
