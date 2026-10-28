import { useAppTheme } from '../../providers/ThemeProvider';
import { DS } from '../../constants/designTokens';

import { useAuth } from '../../providers/AuthProvider';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Text, Card, DataTable, useTheme, Surface, Button, TextInput } from 'react-native-paper';
import { db, isFirebaseConfigured, auth } from '../../lib/firebase';
import { collection, getDocs, query, where } from '../../lib/firestore_adapter';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, router } from 'expo-router';
import { cleanAndMapCategory } from '../../lib/ui_helpers';

export default function ReorderProductsScreen() {
  const { tenantId, loading: authLoading } = useAuth();

  const { isDarkMode } = useAppTheme();
  const appTheme = useTheme();
  const navigation = useNavigation();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (tenantId) {
        fetchReorderItems();
      } else {
        setLoading(false);
      }
    }
    const unsubscribe = navigation.addListener('focus', () => {
      if (!authLoading) {
        if (tenantId) {
          fetchReorderItems();
        } else {
          setLoading(false);
        }
      }
    });
    return unsubscribe;
  }, [navigation, authLoading, tenantId]);

  const fetchReorderItems = async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!tenantId) return;
      const q = query(
        collection(db, 'products'),
        where('tenant_id', '==', tenantId)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          name: d.name || 'Unnamed Product',
          barcode: d.barcode || '',
          category: d.category || 'N/A',
          mrp: d.mrp || d.price || 0,
          selling_price: d.selling_price || d.price || 0,
          stock_qty: d.stock_qty !== undefined ? Number(d.stock_qty) : (d.stock !== undefined ? Number(d.stock) : 0),
        };
      });

      // Filter only items with stock_qty < 5
      const reorderList = list.filter(p => p.stock_qty < 5);
      // Sort: out of stock first, then by stock quantity ascending
      reorderList.sort((a, b) => a.stock_qty - b.stock_qty);
      setProducts(reorderList);
    } catch (err: any) {
      console.error("Error fetching reorder products:", err);
      setError(err.message || "Failed to load reorder items.");
    } finally {
      setLoading(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleSendWhatsAppPO = () => {
    if (products.length === 0) {
      alert('No items in the reorder list.');
      return;
    }
    const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    let msg = `*PURCHASE ORDER — BharatPOS Store*\nDate: ${dateStr}\n\nPlease dispatch the following restock items:\n\n`;
    products.forEach((p, idx) => {
      const reqQty = Math.max(10, (5 - p.stock_qty) * 4);
      msg += `${idx + 1}. *${p.name}* (SKU: ${p.barcode || 'N/A'})\n   Current Stock: ${p.stock_qty} | Recommended Order: *${reqQty} units*\n\n`;
    });
    msg += `Please confirm dispatch date.\nThank you!`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    } else {
      alert(msg);
    }
  };

  const handleQueueAllLabels = () => {
    if (typeof window === 'undefined' || products.length === 0) return;
    try {
      const existingQueueStr = window.localStorage.getItem('barcode_print_queue');
      let queue: any[] = [];
      if (existingQueueStr) queue = JSON.parse(existingQueueStr);
      products.forEach(prod => {
        const existingItemIdx = queue.findIndex(item => item.id === prod.id);
        if (existingItemIdx > -1) {
          queue[existingItemIdx].copies = (queue[existingItemIdx].copies || 0) + 24;
        } else {
          queue.push({
            id: prod.id,
            name: prod.name,
            barcode: prod.barcode || `AUTO-${prod.id.substring(0, 8).toUpperCase()}`,
            category: prod.category,
            price: String(prod.selling_price || prod.mrp || 0),
            copies: 24,
          });
        }
      });
      window.localStorage.setItem('barcode_print_queue', JSON.stringify(queue));
      alert(`Queued 24 labels for each of the ${products.length} low-stock items!`);
    } catch (e) {
      alert('Failed to update print queue.');
    }
  };

  const addToPrintQueue = (prod: any) => {
    if (typeof window === 'undefined') return;
    try {
      const existingQueueStr = window.localStorage.getItem('barcode_print_queue');
      let queue: any[] = [];
      if (existingQueueStr) {
        queue = JSON.parse(existingQueueStr);
      }

      // Check if product is already in the queue
      const existingItemIdx = queue.findIndex(item => item.id === prod.id);
      if (existingItemIdx > -1) {
        queue[existingItemIdx].copies = (queue[existingItemIdx].copies || 0) + 24;
      } else {
        queue.push({
          id: prod.id,
          name: prod.name,
          barcode: prod.barcode || `AUTO-${prod.id.substring(0, 8).toUpperCase()}`,
          category: prod.category,
          price: String(prod.selling_price || prod.mrp || 0),
          copies: 24
        });
      }

      window.localStorage.setItem('barcode_print_queue', JSON.stringify(queue));
      alert(`"${prod.name}" x24 labels added to Barcode Print Queue!`);
    } catch (e) {
      console.error(e);
      alert("Failed to update print queue.");
    }
  };

  const totalProducts = products.length;
  const outOfStockCount = products.filter(p => p.stock_qty <= 0).length;
  const lowStockCount = products.filter(p => p.stock_qty > 0 && p.stock_qty < 5).length;

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appTheme.colors.background }}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
        <Text style={{ marginTop: 12, color: appTheme.colors.onSurfaceVariant, fontWeight: '600' }}>Loading Reorder List...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: appTheme.colors.background }}>
        <Card style={{ padding: 32, borderRadius: 16, width: '90%', maxWidth: 500, alignItems: 'center', borderWidth: 1, borderColor: appTheme.colors.outlineVariant, backgroundColor: 'white' }} elevation={1}>
          <Icon name="alert-circle-outline" size={48} color={appTheme.colors.error} style={{ marginBottom: 10 }} />
          <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: 'bold', color: appTheme.colors.onSurface, textAlign: 'center' }}>Unable to Load Reorder List</Text>
          <Text style={{ marginTop: 8, color: 'gray', textAlign: 'center', fontSize: 13, lineHeight: 18, marginBottom: 24 }}>{error}</Text>
          <Button mode="contained" onPress={fetchReorderItems} style={{ borderRadius: 10, width: '100%', backgroundColor: appTheme.colors.primary }}>
            Retry Sync
          </Button>
        </Card>
      </View>
    );
  }

  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    return !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.title}>Reorder & Low-Stock Desk</Text>
            <View style={styles.alertPill}>
              <Text style={styles.alertPillText}>AUTOPILOT PO</Text>
            </View>
          </View>
          <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            Depleted stock monitor, one-click vendor WhatsApp purchase orders & barcode restocking
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {totalProducts > 0 && (
            <>
              <Button
                mode="contained"
                icon="whatsapp"
                onPress={handleSendWhatsAppPO}
                buttonColor="#16A34A"
                style={{ borderRadius: 8 }}
                contentStyle={{ height: 38 }}
              >
                Send Vendor PO
              </Button>
              <Button
                mode="outlined"
                icon="barcode"
                onPress={handleQueueAllLabels}
                textColor="#2563EB"
                style={{ borderColor: '#2563EB', borderRadius: 8 }}
                contentStyle={{ height: 38 }}
              >
                Queue All Tags
              </Button>
            </>
          )}
          <Button
            mode="contained"
            buttonColor="#0F172A"
            icon="barcode-scan"
            onPress={() => router.push('/(owner)/barcode_generator' as any)}
            style={{ borderRadius: 8 }}
            contentStyle={{ height: 38 }}
          >
            Barcode Studio
          </Button>
        </View>
      </View>

      {/* ── Metrics ─────────────────────────────────────────────────── */}
      <View style={styles.metricsRow}>
        <MetricCard title="Items to Reorder" value={totalProducts} icon="alert-decagram-outline" color="#EF4444" bgColor="#FEF2F2" />
        <MetricCard title="Depleted (Stock = 0)" value={outOfStockCount} icon="close-circle-outline" color="#DC2626" bgColor="#FEF2F2" />
        <MetricCard title="Low Stock (< 5 Units)" value={lowStockCount} icon="alert-outline" color="#D97706" bgColor="#FFFBEB" />
      </View>

      {/* ── Table Card ──────────────────────────────────────────────── */}
      <Card style={styles.card} elevation={0}>
        <Card.Content style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <View>
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#0F172A' }}>Restock Queue Recommendations</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Recommended order quantities calculated from daily sales velocity</Text>
            </View>

            {totalProducts > 0 && (
              <View style={styles.searchBox}>
                <Icon name="magnify" size={18} color="#64748B" style={{ marginLeft: 8 }} />
                <TextInput
                  placeholder="Filter reorder items..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchInput}
                  placeholderTextColor="#94A3B8"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                />
              </View>
            )}
          </View>

          {loading ? (
            <Text style={styles.infoText}>Loading reorder candidates...</Text>
          ) : products.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="check-circle" size={48} color="#16A34A" />
              <Text style={styles.emptyText}>All stock levels healthy!</Text>
              <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                No products are currently under the warning threshold of 5 units.
              </Text>
            </View>
          ) : (
            <DataTable>
              <DataTable.Header style={{ backgroundColor: '#F8FAFC', borderRadius: 8 }}>
                <DataTable.Title style={{ flex: 2.8 }}><Text style={styles.colHeader}>PRODUCT & BARCODE</Text></DataTable.Title>
                <DataTable.Title style={{ flex: 1.5 }}><Text style={styles.colHeader}>CATEGORY</Text></DataTable.Title>
                <DataTable.Title numeric style={{ flex: 1 }}><Text style={styles.colHeader}>IN STOCK</Text></DataTable.Title>
                <DataTable.Title numeric style={{ flex: 1.3 }}><Text style={styles.colHeader}>SUGGESTED PO</Text></DataTable.Title>
                <DataTable.Title style={{ flex: 1.5, justifyContent: 'center' }}><Text style={styles.colHeader}>STATUS</Text></DataTable.Title>
                <DataTable.Title style={{ flex: 1.5, justifyContent: 'flex-end' }}><Text style={styles.colHeader}>ACTIONS</Text></DataTable.Title>
              </DataTable.Header>

              {filteredProducts.map((item) => {
                const isOutOfStock = item.stock_qty <= 0;
                const statusColor = isOutOfStock ? '#DC2626' : '#D97706';
                const statusBg = isOutOfStock ? '#FEF2F2' : '#FFFBEB';
                const statusBorder = isOutOfStock ? '#FEE2E2' : '#FEF3C7';
                const statusText = isOutOfStock ? 'Out Of Stock' : 'Low Stock';
                const suggestedPo = Math.max(10, (5 - item.stock_qty) * 4);

                return (
                  <DataTable.Row key={item.id} style={{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9', minHeight: 62 }}>
                    <DataTable.Cell style={{ flex: 2.8 }}>
                      <View style={{ paddingVertical: 6 }}>
                        <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }}>{item.name}</Text>
                        <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748B', marginTop: 2 }}>
                          {item.barcode ? `SKU: ${item.barcode}` : 'No Barcode'}
                        </Text>
                      </View>
                    </DataTable.Cell>

                    <DataTable.Cell style={{ flex: 1.5 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Icon name={cleanAndMapCategory(item.category || '').icon} size={14} color="#64748B" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, color: '#475569', fontWeight: '500' }}>{cleanAndMapCategory(item.category || '').cleanName}</Text>
                      </View>
                    </DataTable.Cell>

                    <DataTable.Cell numeric style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: isOutOfStock ? '#DC2626' : '#0F172A' }}>{item.stock_qty}</Text>
                    </DataTable.Cell>

                    <DataTable.Cell numeric style={{ flex: 1.3 }}>
                      <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-end' }}>
                        <Text style={{ fontWeight: '800', color: '#16A34A', fontSize: 12 }}>+{suggestedPo} pcs</Text>
                      </View>
                    </DataTable.Cell>

                    <DataTable.Cell style={{ flex: 1.5, justifyContent: 'center' }}>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg, borderWidth: 1, borderColor: statusBorder }]}>
                        <Text style={{ color: statusColor, fontWeight: '700', fontSize: 11 }}>{statusText}</Text>
                      </View>
                    </DataTable.Cell>

                    <DataTable.Cell style={{ flex: 1.5, justifyContent: 'flex-end' }}>
                      <Button 
                        mode="outlined" 
                        onPress={() => addToPrintQueue(item)} 
                        textColor="#2563EB"
                        style={{ borderColor: '#2563EB', borderRadius: 6 }}
                        contentStyle={{ height: 32 }}
                        labelStyle={{ fontSize: 11, marginHorizontal: 8, marginVertical: 0, fontWeight: '700' }}
                      >
                        Queue Tag
                      </Button>
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })}
            </DataTable>
          )}
        </Card.Content>
      </Card>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const MetricCard = ({ title, value, icon, color, bgColor }: any) => (
  <Card style={styles.metricCard} elevation={0}>
    <Card.Content style={styles.metricCardContent}>
      <View style={styles.metricCardTop}>
        <View style={[styles.iconWrapper, { backgroundColor: bgColor }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
      </View>
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{title}</Text>
      </View>
    </Card.Content>
  </Card>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#F8FAFC' },
  header: { paddingVertical: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
  title: { fontWeight: '800', fontSize: 22, color: '#0F172A', letterSpacing: -0.5 },
  alertPill: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  alertPillText: { fontSize: 10, fontWeight: '800', color: '#DC2626', letterSpacing: 0.5 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  metricCardContent: { padding: 16, minHeight: 110, justifyContent: 'space-between' },
  metricCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: '#0F172A' },
  metricLabel: { fontSize: 12, marginTop: 4, fontWeight: '600', color: '#64748B' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 40 },
  colHeader: { fontWeight: '800', fontSize: 11, color: '#475569', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 220,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 12,
    height: 34,
  },
  infoText: { textAlign: 'center', color: '#64748B', fontStyle: 'italic', paddingVertical: 24 },
  emptyState: { paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontWeight: '700', fontSize: 16, color: '#16A34A', marginTop: 12 },
});
