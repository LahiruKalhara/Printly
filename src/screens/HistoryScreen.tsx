import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrintJob, TemplateRow } from '../types';
import { RootStackParamList } from '../types/navigation';
import { getHistory, clearHistory, addToHistory, deleteHistoryItem } from '../utils/storage';
import { formatTimeAgo } from '../utils/helpers';
import { useTheme } from '../contexts/ThemeContext';
import QRCodeView from '../components/QRCodeView';
import BarcodeView from '../components/BarcodeView';

export default function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<PrintJob[]>([]);
  const [previewJob, setPreviewJob] = useState<PrintJob | null>(null);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    const data = await getHistory();
    setHistory(data);
  };

  const filtered = history.filter(job => {
    // Search filter
    if (search && !job.templateName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Time filter
    if (timeFilter !== 'all') {
      const jobDate = new Date(job.printedAt);
      const now = new Date();
      if (timeFilter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (jobDate < startOfDay) return false;
      } else if (timeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (jobDate < weekAgo) return false;
      } else if (timeFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (jobDate < monthAgo) return false;
      }
    }
    return true;
  });

  const handleClearAll = () => {
    const isFiltered = search || timeFilter !== 'all';
    const count = isFiltered ? filtered.length : history.length;
    const title = isFiltered ? 'Clear Filtered' : 'Clear History';
    const message = isFiltered
      ? `Delete ${count} filtered print job${count !== 1 ? 's' : ''}?`
      : 'Are you sure you want to clear all print history?';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isFiltered ? `Delete ${count}` : 'Clear all',
        style: 'destructive',
        onPress: async () => {
          if (isFiltered) {
            const filteredIds = new Set(filtered.map(j => j.id));
            const remaining = history.filter(j => !filteredIds.has(j.id));
            await clearHistory();
            // Re-save remaining
            for (const job of remaining.reverse()) {
              await addToHistory(job);
            }
            setHistory(remaining);
          } else {
            await clearHistory();
            setHistory([]);
          }
        },
      },
    ]);
  };

  const handleDelete = (job: PrintJob) => {
    Alert.alert('Delete', `Delete "${job.templateName}" from history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteHistoryItem(job.id);
          setHistory(prev => prev.filter(j => j.id !== job.id));
        },
      },
    ]);
  };

  const handleReprint = (job: PrintJob) => {
    navigation.navigate('PrintBill', { rows: job.rows, templateName: job.templateName, templateId: job.templateId });
  };

  const handleEdit = (job: PrintJob) => {
    navigation.navigate('PrintBill', { rows: job.rows, templateName: job.templateName, templateId: job.templateId });
  };

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
    if (row.type === 'separator') {
      return <View key={row.id} style={styles.receiptSeparator} />;
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

  const renderItem = ({ item, index }: { item: PrintJob; index: number }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => setPreviewJob(item)}
      activeOpacity={0.7}
      accessibilityLabel={item.templateName + ', printed ' + formatTimeAgo(item.printedAt)}
      accessibilityRole="button"
    >
      <View style={[styles.cardIndex, { backgroundColor: colors.accentMuted }]}>
        <Text style={[styles.cardIndexText, { color: colors.accent }]}>
          {String(index + 1).padStart(2, '0')}
        </Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.templateName}
        </Text>
        <View style={styles.cardMeta}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.cardTime, { color: colors.textMuted }]}>
            {formatTimeAgo(item.printedAt)}
          </Text>
          <View style={[styles.metaDot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.cardRows, { color: colors.textMuted }]}>
            {item.rows.length} rows
          </Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); handleDelete(item); }}
          style={[styles.actionBtn, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}
          accessibilityLabel="Delete from history"
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={14} color={colors.error} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); handleReprint(item); }}
          style={[styles.actionBtn, { backgroundColor: colors.accentMuted }]}
          accessibilityLabel="Reprint bill"
          accessibilityRole="button"
        >
          <Ionicons name="print-outline" size={16} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const timeFilters: { key: typeof timeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>History</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {history.length > 0 ? `${filtered.length} of ${history.length} print jobs` : 'No prints yet'}
          </Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            style={[styles.clearBtn, { backgroundColor: 'rgba(248, 113, 113, 0.1)' }]}
            accessibilityLabel={(search || timeFilter !== 'all') ? `Clear ${filtered.length} filtered items` : 'Clear all history'}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.clearText, { color: colors.error }]}>
              {(search || timeFilter !== 'all') ? `Clear (${filtered.length})` : 'Clear All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      {history.length > 0 && (
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.inputBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by template name..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            accessibilityLabel="Search history"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Time Filter Chips */}
      {history.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          {timeFilters.map((f) => {
            const isActive = timeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: isActive ? colors.accent : colors.surface, borderColor: isActive ? colors.accent : colors.cardBorder },
                ]}
                onPress={() => setTimeFilter(f.key)}
              >
                <Text style={[styles.filterChipText, { color: isActive ? '#FFF' : colors.textSecondary }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {history.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Print History</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Your printed bills will appear here
          </Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Results</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No print jobs match your filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Receipt Preview Modal */}
      <Modal visible={previewJob !== null} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.previewModal, { backgroundColor: colors.card }]}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={[styles.previewTitle, { color: colors.text }]}>{previewJob?.templateName}</Text>
                <Text style={[styles.previewSub, { color: colors.textMuted }]}>
                  {previewJob ? formatTimeAgo(previewJob.printedAt) : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPreviewJob(null)}
                style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                accessibilityLabel="Close preview"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.receipt}>
                <View style={styles.receiptEdge} />
                {previewJob?.rows.map(renderPreviewRow)}
                <View style={[styles.receiptEdge, { marginTop: 16 }]} />
              </View>
            </ScrollView>
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={[styles.previewActionBtn, { backgroundColor: colors.accent }]}
                onPress={() => { const job = previewJob; setPreviewJob(null); if (job) handleReprint(job); }}
                accessibilityLabel="Reprint this bill"
                accessibilityRole="button"
              >
                <Ionicons name="print-outline" size={16} color="#FFF" />
                <Text style={[styles.previewActionText, { color: '#FFF' }]}>Reprint</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  filterRow: {
    marginBottom: 16,
    flexGrow: 0,
  },
  filterRowContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardIndex: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIndexText: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  cardRows: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewModal: {
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
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
  receiptSeparator: {
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#CCC',
    marginVertical: 8,
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
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  previewActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  previewActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
