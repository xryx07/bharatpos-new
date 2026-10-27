import { useAppTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Platform, ActivityIndicator, TouchableOpacity, useWindowDimensions, Alert } from 'react-native';
import { Text, Card, DataTable, useTheme, TextInput, Button, SegmentedButtons, Dialog, Portal } from 'react-native-paper';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, where, doc, getDoc, setDoc, updateDoc } from '../../lib/firestore_adapter';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from 'expo-router';
import { DS } from '../../constants/designTokens';

// ─── Types ────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string;
  category: string;
  gst_pct: number;
  hsn: string;
  stock_qty: number;
  min_stock?: number;
  location_stocks: Record<string, number>;
}

const DEFAULT_INVENTORY_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Amul Butter 100g', category: 'Groceries', stock_qty: 45, price: 52, barcode: '8901262010053', gst_pct: 5, hsn: '0402', location_stocks: { 'Main Shop': 45 } },
  { id: 'p2', name: 'Britannia Marie Gold 250g', category: 'Biscuits', stock_qty: 32, price: 35, barcode: '8901063012016', gst_pct: 5, hsn: '1905', location_stocks: { 'Main Shop': 32 } },
  { id: 'p3', name: 'Tata Tea Premium 250g', category: 'Beverages', stock_qty: 18, price: 120, barcode: '8901052000017', gst_pct: 5, hsn: '0902', location_stocks: { 'Main Shop': 18 } },
  { id: 'p4', name: 'Maggi Noodles 70g', category: 'Snacks', stock_qty: 56, price: 14, barcode: '8901058852276', gst_pct: 5, hsn: '1902', location_stocks: { 'Main Shop': 56 } },
  { id: 'p5', name: 'Surf Excel 1kg', category: 'Household', stock_qty: 24, price: 125, barcode: '8901030704405', gst_pct: 18, hsn: '3402', location_stocks: { 'Main Shop': 24 } },
  { id: 'p6', name: 'Dove Soap', category: 'Soap', stock_qty: 40, price: 45, barcode: '8901396112203', gst_pct: 18, hsn: '3401', location_stocks: { 'Main Shop': 40 } },
];

export default function InventoryManagementScreen() {
  const { tenantId, loading: authLoading } = useAuth();
  const { isDarkMode } = useAppTheme();
  const appTheme = useTheme();
  const navigation = useNavigation();

  // ── State ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'stock' | 'locations' | 'transfers'>('stock');
  const [products, setProducts] = useState<Product[]>(() => DEFAULT_INVENTORY_PRODUCTS);
  const [locations, setLocations] = useState<string[]>(['Main Shop']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Location modal state
  const [showAddLoc, setShowAddLoc] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);

  // Transfer stock modal state
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [fromLoc, setFromLoc] = useState('Main Shop');
  const [toLoc, setToLoc] = useState('');
  const [transferQty, setTransferQty] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  useEffect(() => {
    if (!authLoading) {
      if (tenantId) {
        fetchData();
      } else {
        setLoading(false);
      }
    }
    const unsubscribe = navigation.addListener('focus', () => {
      if (!authLoading) {
        if (tenantId) {
          fetchData();
        } else {
          setLoading(false);
        }
      }
    });
    return unsubscribe;
  }, [navigation, authLoading, tenantId]);

  const fetchData = async () => {
    if (!isFirebaseConfigured || !tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const locRef = doc(db, 'settings', tenantId);
      const q = query(
        collection(db, 'products'),
        where('tenant_id', '==', tenantId)
      );

      const [locRes, prodsRes] = await Promise.allSettled([
        getDoc(locRef),
        getDocs(q)
      ]);

      if (locRes.status === 'fulfilled' && locRes.value.exists && locRes.value.exists()) {
        const d = locRes.value.data();
        if (d?.locations) setLocations(d.locations);
        else setLocations(['Main Shop']);
      } else {
        setLocations(['Main Shop']);
      }

      if (prodsRes.status === 'fulfilled') {
        const fetchedProds: Product[] = prodsRes.value.docs.map((dSnap: any) => {
          const p = dSnap.data();
          const stockVal = p.stock_qty !== undefined ? p.stock_qty : (p.stock || 0);
          return {
            id: dSnap.id,
            name: p.name || 'Unnamed Product',
            price: p.selling_price || p.price || 0,
            barcode: p.barcode || '',
            category: p.category || '',
            gst_pct: p.gst_pct || 0,
            hsn: p.hsn || '',
            stock_qty: stockVal,
            min_stock: p.min_stock || 0,
            location_stocks: p.location_stocks || { 'Main Shop': stockVal }
          };
        });
        fetchedProds.sort((a, b) => a.stock_qty - b.stock_qty);
        setProducts(fetchedProds.length > 0 ? fetchedProds : DEFAULT_INVENTORY_PRODUCTS);
      }
    } catch (err: any) {
      console.error("Error fetching inventory data:", err);
      setError(err.message || "Failed to load inventory details.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!tenantId) return;
    if (!newLocName.trim()) {
      Alert.alert('Error', 'Please enter a valid warehouse/godown name.');
      return;
    }
    if (locations.includes(newLocName.trim())) {
      Alert.alert('Error', 'Location name already exists.');
      return;
    }
    setSavingLoc(true);
    try {
      const updated = [...locations, newLocName.trim()];
      const locRef = doc(db, 'settings', tenantId);
      await setDoc(locRef, { locations: updated }, { merge: true });
      setLocations(updated);
      setNewLocName('');
      setShowAddLoc(false);
      Alert.alert('Success', `Warehouse "${newLocName.trim()}" registered successfully!`);
    } catch (e: any) {
      Alert.alert('Error', 'Failed to add warehouse: ' + e.message);
    } finally {
      setSavingLoc(false);
    }
  };

  const handleTransferStock = async () => {
    if (!selectedProd || !fromLoc || !toLoc || !transferQty) {
      Alert.alert('Error', 'Please fill all details.');
      return;
    }
    if (fromLoc === toLoc) {
      Alert.alert('Error', 'Source and destination locations cannot be the same.');
      return;
    }
    const qty = parseInt(transferQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid transfer quantity.');
      return;
    }
    const fromStock = selectedProd.location_stocks[fromLoc] || 0;
    if (qty > fromStock) {
      Alert.alert('Error', `Insufficient stock in ${fromLoc}. Available: ${fromStock}`);
      return;
    }

    setSavingTransfer(true);
    try {
      const updatedStocks = { ...selectedProd.location_stocks };
      updatedStocks[fromLoc] = fromStock - qty;
      updatedStocks[toLoc] = (updatedStocks[toLoc] || 0) + qty;

      const totalQty = Object.values(updatedStocks).reduce((sum, v) => sum + v, 0);

      const prodRef = doc(db, 'products', selectedProd.id);
      await updateDoc(prodRef, {
        location_stocks: updatedStocks,
        stock_qty: totalQty
      });

      Alert.alert('Success', `Transferred ${qty} units of "${selectedProd.name}" from ${fromLoc} to ${toLoc}.`);
      setShowTransfer(false);
      setTransferQty('');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', 'Failed to transfer stock: ' + e.message);
    } finally {
      setSavingTransfer(false);
    }
  };

  // Metrics calculations
  const totalProducts = products.length;
  const inStock = products.filter(p => p.stock_qty > 5).length;
  const lowStock = products.filter(p => p.stock_qty > 0 && p.stock_qty <= 5).length;
  const outOfStock = products.filter(p => p.stock_qty <= 0).length;

  // Filtered lists for rendering
  const locationStats = useMemo(() => {
    return locations.map(loc => {
      let totalStockVal = 0;
      let itemsCount = 0;
      products.forEach(p => {
        const st = p.location_stocks[loc] || 0;
        if (st > 0) {
          totalStockVal += st;
          itemsCount++;
        }
      });
      return { name: loc, totalStock: totalStockVal, uniqueItems: itemsCount };
    });
  }, [locations, products]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appTheme.colors.background }}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
        <Text style={{ marginTop: 12, color: appTheme.colors.onSurfaceVariant, fontWeight: '600' }}>Loading Inventory Data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: appTheme.colors.background }}>
        <Card style={{ padding: 32, borderRadius: 16, width: '90%', maxWidth: 500, alignItems: 'center', borderWidth: 1, borderColor: appTheme.colors.outlineVariant, backgroundColor: 'white' }} elevation={1}>
          <Icon name="alert-circle-outline" size={48} color={appTheme.colors.error} style={{ marginBottom: 10 }} />
          <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: 'bold', color: appTheme.colors.onSurface, textAlign: 'center' }}>Unable to Load Inventory</Text>
          <Text style={{ marginTop: 8, color: 'gray', textAlign: 'center', fontSize: 13, lineHeight: 18, marginBottom: 24 }}>{error}</Text>
          <Button mode="contained" onPress={fetchData} style={{ borderRadius: 10, width: '100%', backgroundColor: appTheme.colors.primary }}>
            Retry Sync
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>Inventory & Godowns</Text>
            <Text style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>Multi-location stock allocations & transfer logs</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button 
              mode="outlined" 
              icon="plus" 
              onPress={() => setShowAddLoc(true)}
              style={{ borderColor: '#E2E8F0', borderRadius: 8 }}
              textColor="#475569"
            >
              Add Godown
            </Button>
            <Button 
              mode="contained" 
              icon="swap-horizontal" 
              onPress={() => setShowTransfer(true)}
              style={{ borderRadius: 8, backgroundColor: '#10B981' }}
            >
              Transfer Stock
            </Button>
          </View>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <MetricCard title="Total Products" value={totalProducts} icon="package-variant-closed" color="#10B981" bgColor="#ECFDF5" />
        <MetricCard title="In Stock" value={inStock} icon="check-circle-outline" color="#10B981" bgColor="#ECFDF5" />
        <MetricCard title="Low Stock" value={lowStock} icon="alert-outline" color="#F59E0B" bgColor="#FFFBEB" />
        <MetricCard title="Out of Stock" value={outOfStock} icon="close-circle-outline" color="#EF4444" bgColor="#FEF2F2" />
      </View>

      {/* Tabs */}
      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab as any}
        buttons={[
          { value: 'stock', label: 'Stock Overview', icon: 'format-list-bulleted' },
          { value: 'locations', label: 'Warehouse / Godowns', icon: 'storefront-outline' },
        ]}
        style={{ marginBottom: 24 }}
        theme={{ colors: { primary: '#10B981' } }}
      />

      {activeTab === 'stock' && (
        <View style={{ marginBottom: 32 }}>
          {/* Search & Stock Filter Toolbar */}
          <View style={styles.inventoryToolbar}>
            <View style={styles.searchBarBox}>
              <Icon name="magnify" size={20} color="#64748B" style={{ marginLeft: 12 }} />
              <TextInput
                placeholder="Search stock by product name or barcode..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchBarInput}
                placeholderTextColor="#94A3B8"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 6, marginRight: 6 }}>
                  <Icon name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.stockFilterTabs}>
              {[
                { id: 'all', label: `All (${totalProducts})` },
                { id: 'in_stock', label: `In Stock (${inStock})` },
                { id: 'low_stock', label: `Low Stock (${lowStock})` },
                { id: 'out_of_stock', label: `Out (${outOfStock})` },
              ].map(f => {
                const active = stockStatusFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    onPress={() => setStockStatusFilter(f.id as any)}
                    style={[styles.stockFilterPill, active && styles.stockFilterPillActive]}
                  >
                    <Text style={[styles.stockFilterPillText, active && styles.stockFilterPillTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Stock Table */}
          <Card style={styles.card} elevation={0}>
            <Card.Content style={{ padding: 0 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
                <DataTable style={{ minWidth: 840, width: '100%' }}>
                  <DataTable.Header style={styles.tableHead}>
                    <DataTable.Title style={{ minWidth: 240, flex: 2.5 }}><Text style={styles.colHeader}>PRODUCT & BARCODE</Text></DataTable.Title>
                    <DataTable.Title numeric style={{ minWidth: 120, flex: 1.2 }}><Text style={styles.colHeader}>STOCK UNITS</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 260, flex: 2.6 }}><Text style={styles.colHeader}>GODOWN ALLOCATION</Text></DataTable.Title>
                    <DataTable.Title style={{ minWidth: 130, flex: 1.3, justifyContent: 'center' }}><Text style={styles.colHeader}>STATUS</Text></DataTable.Title>
                    <DataTable.Title numeric style={{ minWidth: 110, flex: 1.1 }}><Text style={styles.colHeader}>ACTION</Text></DataTable.Title>
                  </DataTable.Header>

                  {products
                    .filter(p => {
                      const q = searchQuery.toLowerCase().trim();
                      const matchesSearch = !q ||
                        (p.name || '').toLowerCase().includes(q) ||
                        (p.barcode || '').toLowerCase().includes(q) ||
                        (p.category || '').toLowerCase().includes(q);

                      let matchesStatus = true;
                      if (stockStatusFilter === 'in_stock') matchesStatus = p.stock_qty > 5;
                      else if (stockStatusFilter === 'low_stock') matchesStatus = p.stock_qty > 0 && p.stock_qty <= 5;
                      else if (stockStatusFilter === 'out_of_stock') matchesStatus = p.stock_qty <= 0;

                      return matchesSearch && matchesStatus;
                    })
                    .map((item) => {
                      const isOut = item.stock_qty <= 0;
                      const isLow = item.stock_qty > 0 && item.stock_qty <= 5;
                      const statusColor = isOut ? '#DC2626' : (isLow ? '#D97706' : '#16A34A');
                      const statusBg = isOut ? '#FEF2F2' : (isLow ? '#FFFBEB' : '#F0FDF4');
                      const statusBorder = isOut ? '#FEE2E2' : (isLow ? '#FEF3C7' : '#DCFCE7');
                      const statusText = isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock');

                      const locEntries = Object.entries(item.location_stocks || {});

                      return (
                        <DataTable.Row key={item.id} style={{ minHeight: 68, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                          <DataTable.Cell style={{ minWidth: 240, flex: 2.5 }}>
                            <View style={{ paddingVertical: 8, width: '100%' }}>
                              <Text style={{ fontWeight: '700', fontSize: 13, color: '#0F172A' }} numberOfLines={1}>{item.name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <View style={styles.skuTag}>
                                  <Icon name="barcode" size={12} color="#64748B" />
                                  <Text style={styles.skuTagText}>{item.barcode || 'NO-SKU'}</Text>
                                </View>
                                {item.category ? (
                                  <Text style={{ fontSize: 11, color: '#64748B' }}>• {item.category}</Text>
                                ) : null}
                              </View>
                            </View>
                          </DataTable.Cell>

                          <DataTable.Cell numeric style={{ minWidth: 120, flex: 1.2 }}>
                            <View style={{ alignItems: 'flex-end', width: '100%' }}>
                              <Text style={{ fontWeight: '800', fontSize: 14, color: isOut ? '#DC2626' : '#0F172A' }}>
                                {item.stock_qty}
                              </Text>
                              {/* Stock Health Bar */}
                              <View style={styles.stockBarTrack}>
                                <View
                                  style={[
                                    styles.stockBarFill,
                                    {
                                      width: `${Math.min(100, Math.max(5, (item.stock_qty / 20) * 100))}%`,
                                      backgroundColor: statusColor,
                                    }
                                  ]}
                                />
                              </View>
                            </View>
                          </DataTable.Cell>

                          <DataTable.Cell style={{ minWidth: 260, flex: 2.6 }}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 6 }}>
                              {locEntries.length > 0 ? (
                                locEntries.map(([locName, qty]) => (
                                  <View key={locName} style={styles.godownPill}>
                                    <Icon name="storefront-outline" size={11} color="#475569" />
                                    <Text style={styles.godownPillText}>{locName}: <Text style={{ fontWeight: '800' }}>{qty}</Text></Text>
                                  </View>
                                ))
                              ) : (
                                <Text style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>Unallocated</Text>
                              )}
                            </View>
                          </DataTable.Cell>

                          <DataTable.Cell style={{ minWidth: 130, flex: 1.3, justifyContent: 'center' }}>
                            <View style={[styles.statusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
                              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
                            </View>
                          </DataTable.Cell>

                          <DataTable.Cell numeric style={{ minWidth: 110, flex: 1.1 }}>
                            <TouchableOpacity
                              style={styles.transferRowBtn}
                              onPress={() => {
                                setSelectedProd(item);
                                const availableLocs = Object.keys(item.location_stocks || {});
                                const defaultFrom = availableLocs.find(l => (item.location_stocks[l] || 0) > 0) || 'Main Shop';
                                setFromLoc(defaultFrom);
                                const defaultTo = locations.find(l => l !== defaultFrom) || '';
                                setToLoc(defaultTo);
                                setShowTransfer(true);
                              }}
                            >
                              <Icon name="swap-horizontal" size={14} color="#16A34A" />
                              <Text style={styles.transferRowBtnText}>Shift</Text>
                            </TouchableOpacity>
                          </DataTable.Cell>
                        </DataTable.Row>
                      );
                    })}

                  {products.length === 0 && (
                    <DataTable.Row>
                      <DataTable.Cell><Text style={{ fontStyle: 'italic', color: '#94A3B8' }}>No Products Registered in Catalog</Text></DataTable.Cell>
                    </DataTable.Row>
                  )}
                </DataTable>
              </ScrollView>
            </Card.Content>
          </Card>
        </View>
      )}

      {activeTab === 'locations' && (
        <View style={{ gap: 16, marginBottom: 40 }}>
          {locationStats.map((loc, idx) => (
            <Card key={idx} style={{ backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#EEF0F6' }} elevation={0}>
              <Card.Content style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="storefront" size={20} color="#10B981" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>{loc.name}</Text>
                    <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{loc.uniqueItems} distinct products currently stocked</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: '#10B981' }}>{loc.totalStock}</Text>
                  <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontWeight: '600' }}>Total Quantity</Text>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {/* Portal Dialogs */}
      <Portal>
        {/* Add Location Modal */}
        <Dialog visible={showAddLoc} onDismiss={() => setShowAddLoc(false)} style={{ backgroundColor: 'white', borderRadius: 16, maxWidth: 500, alignSelf: 'center', width: '90%' }}>
          <Dialog.Title><Text style={{ fontWeight: 'bold' }}>Register New Warehouse/Godown</Text></Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#64748B', marginBottom: 16, fontSize: 13 }}>Create a new storage location to track stock levels separately.</Text>
            <TextInput
              label="Location / Godown Name"
              value={newLocName}
              onChangeText={setNewLocName}
              mode="outlined"
              activeOutlineColor="#10B981"
              style={{ backgroundColor: 'white' }}
              placeholder="e.g. Godown Sector 5"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddLoc(false)} textColor="#64748B">Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleAddLocation} 
              loading={savingLoc} 
              buttonColor="#10B981"
              style={{ borderRadius: 8 }}
            >
              Add Location
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Transfer Stock Modal */}
        <Dialog visible={showTransfer} onDismiss={() => setShowTransfer(false)} style={{ backgroundColor: 'white', borderRadius: 16, maxWidth: 600, alignSelf: 'center', width: '90%' }}>
          <Dialog.Title><Text style={{ fontWeight: 'bold' }}>Stock Transfer Voucher</Text></Dialog.Title>
          <Dialog.Content style={{ gap: 16 }}>
            <Text style={{ color: '#64748B', fontSize: 13 }}>Move items between warehouses or transfer stock to the main billing counter.</Text>
            
            {/* Product Selector */}
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Select Product</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 8 }}>
                {products.map(p => (
                  <TouchableOpacity 
                    key={p.id}
                    onPress={() => {
                      setSelectedProd(p);
                      // Default fromLoc to first location with stock
                      const firstWithStock = Object.keys(p.location_stocks).find(k => p.location_stocks[k] > 0) || 'Main Shop';
                      setFromLoc(firstWithStock);
                    }}
                    style={[
                      styles.transferProductCard,
                      selectedProd?.id === p.id && { borderColor: '#10B981', backgroundColor: '#F0FDF4' }
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{p.name}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>Total: {p.stock_qty} qty</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {selectedProd && (
              <>
                {/* Locations Selectors */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Source (From)</Text>
                    <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 4 }}>
                      {locations.map(loc => {
                        const stockAmt = selectedProd.location_stocks[loc] || 0;
                        return (
                          <TouchableOpacity 
                            key={loc}
                            onPress={() => setFromLoc(loc)}
                            style={[
                              styles.locSelectItem,
                              fromLoc === loc && { backgroundColor: '#F1F5F9' }
                            ]}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600' }}>{loc}</Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>({stockAmt} in stock)</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Destination (To)</Text>
                    <ScrollView style={{ maxHeight: 120, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 4 }}>
                      {locations.map(loc => {
                        const stockAmt = selectedProd.location_stocks[loc] || 0;
                        return (
                          <TouchableOpacity 
                            key={loc}
                            onPress={() => setToLoc(loc)}
                            style={[
                              styles.locSelectItem,
                              toLoc === loc && { backgroundColor: '#F1F5F9' }
                            ]}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600' }}>{loc}</Text>
                            <Text style={{ fontSize: 11, color: '#64748B' }}>({stockAmt} in stock)</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>

                {/* Transfer Quantity */}
                <TextInput
                  label="Transfer Quantity"
                  value={transferQty}
                  onChangeText={setTransferQty}
                  keyboardType="numeric"
                  mode="outlined"
                  activeOutlineColor="#10B981"
                  style={{ backgroundColor: 'white' }}
                  placeholder={`Max: ${selectedProd.location_stocks[fromLoc] || 0}`}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTransfer(false)} textColor="#64748B">Cancel</Button>
            <Button 
              mode="contained" 
              onPress={handleTransferStock} 
              loading={savingTransfer} 
              disabled={!selectedProd}
              buttonColor="#10B981"
              style={{ borderRadius: 8 }}
            >
              Confirm Transfer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  container: { flex: 1, paddingHorizontal: DS.space.lg, backgroundColor: DS.colors.surfaceBg },
  header: { paddingVertical: DS.space.lg },
  title: { fontWeight: '800', fontSize: 22, color: DS.colors.text },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  metricCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: DS.colors.cardBg,
    borderRadius: DS.radius.lg,
    borderWidth: 0,
    ...DS.shadow.sm
  },
  metricCardContent: { padding: 16, minHeight: 120, justifyContent: 'space-between' },
  metricCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: DS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: DS.colors.text },
  metricLabel: { fontSize: 13, marginTop: 4, fontWeight: '600', color: DS.colors.textSecondary },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  tableHead: { backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  inventoryToolbar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  searchBarBox: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBarInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 13,
    height: 38,
  },
  stockFilterTabs: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  stockFilterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stockFilterPillActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  stockFilterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  stockFilterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skuTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skuTagText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748B',
    fontWeight: '600',
  },
  stockBarTrack: {
    width: 60,
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  godownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  godownPillText: {
    fontSize: 11,
    color: '#475569',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  transferRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  transferRowBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  colHeader: { fontWeight: 'bold', color: DS.colors.textSecondary },
  transferProductCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: DS.colors.border,
    borderRadius: DS.radius.md,
    width: 140,
    backgroundColor: DS.colors.cardBg
  },
  locSelectItem: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: DS.radius.sm,
    marginVertical: 2
  }
});
