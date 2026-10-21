import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, FlatList, Dimensions, Platform, Alert } from 'react-native';
import { Text, Card, Button, Surface, Chip, TextInput, Divider, Portal, Dialog, IconButton, Badge } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Print from 'expo-print';
import { useAuth } from '../../providers/AuthProvider';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc } from '../../lib/firestore_adapter';
import { DS } from '../../constants/designTokens';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

interface TableData {
  id: string;
  name: string;
  section: 'AC Hall' | 'Main Dining' | 'Garden Patio' | 'Takeaway';
  capacity: number;
  status: 'vacant' | 'occupied' | 'kot_fired' | 'billed';
  orderId?: string;
  kotNo?: number;
  waiter?: string;
  startTime?: string;
  items: OrderItem[];
  total: number;
}

const INITIAL_TABLES: TableData[] = [
  { id: 'T1', name: 'AC 1', section: 'AC Hall', capacity: 4, status: 'occupied', orderId: 'ORD-101', kotNo: 12, waiter: 'Rahul', startTime: '24 mins ago', items: [{ id: 'p1', name: 'Paneer Butter Masala', price: 280, qty: 1 }, { id: 'p2', name: 'Butter Naan', price: 45, qty: 3 }], total: 415 },
  { id: 'T2', name: 'AC 2', section: 'AC Hall', capacity: 2, status: 'vacant', items: [], total: 0 },
  { id: 'T3', name: 'AC 3', section: 'AC Hall', capacity: 6, status: 'kot_fired', orderId: 'ORD-102', kotNo: 13, waiter: 'Sameer', startTime: '8 mins ago', items: [{ id: 'p3', name: 'Chicken Biryani', price: 320, qty: 2, notes: 'Spicy' }, { id: 'p4', name: 'Mirchi Ka Salan', price: 120, qty: 1 }], total: 760 },
  { id: 'T4', name: 'AC 4', section: 'AC Hall', capacity: 4, status: 'billed', orderId: 'ORD-099', kotNo: 11, waiter: 'Rahul', startTime: '45 mins ago', items: [{ id: 'p5', name: 'Veg Hakka Noodles', price: 210, qty: 2 }], total: 420 },
  { id: 'T5', name: 'D 1', section: 'Main Dining', capacity: 4, status: 'vacant', items: [], total: 0 },
  { id: 'T6', name: 'D 2', section: 'Main Dining', capacity: 4, status: 'occupied', orderId: 'ORD-104', kotNo: 14, waiter: 'Amit', startTime: '15 mins ago', items: [{ id: 'p6', name: 'Dal Makhani', price: 240, qty: 1 }, { id: 'p7', name: 'Jeera Rice', price: 160, qty: 1 }], total: 400 },
  { id: 'T7', name: 'D 3', section: 'Main Dining', capacity: 8, status: 'vacant', items: [], total: 0 },
  { id: 'T8', name: 'D 4', section: 'Main Dining', capacity: 2, status: 'vacant', items: [], total: 0 },
  { id: 'T9', name: 'G 1', section: 'Garden Patio', capacity: 4, status: 'vacant', items: [], total: 0 },
  { id: 'T10', name: 'G 2', section: 'Garden Patio', capacity: 6, status: 'occupied', orderId: 'ORD-105', kotNo: 15, waiter: 'Sameer', startTime: '30 mins ago', items: [{ id: 'p8', name: 'Cold Coffee with Ice Cream', price: 150, qty: 2 }, { id: 'p9', name: 'Crispy Corn', price: 190, qty: 1 }], total: 490 },
  { id: 'TK1', name: 'Counter 1', section: 'Takeaway', capacity: 1, status: 'vacant', items: [], total: 0 },
  { id: 'TK2', name: 'Counter 2', section: 'Takeaway', capacity: 1, status: 'kot_fired', orderId: 'ORD-106', kotNo: 16, waiter: 'Priya', startTime: '5 mins ago', items: [{ id: 'p10', name: 'Paneer Tikka Roll', price: 180, qty: 2, notes: 'Parcel pack' }], total: 360 },
];

const MENU_CATALOG = [
  { id: 'm1', name: 'Chicken Biryani Special', price: 320, category: 'Main Course' },
  { id: 'm2', name: 'Italian Farmhouse Pizza', price: 350, category: 'Pizza' },
  { id: 'm3', name: 'Paneer Butter Masala', price: 280, category: 'Curries' },
  { id: 'm4', name: 'Dal Makhani Bukhara', price: 240, category: 'Curries' },
  { id: 'm5', name: 'Butter Tandoori Naan', price: 45, category: 'Breads' },
  { id: 'm6', name: 'Veg Hakka Noodles', price: 210, category: 'Chinese' },
  { id: 'm7', name: 'Crispy Chilli Corn', price: 190, category: 'Starters' },
  { id: 'm8', name: 'Cold Coffee with Ice Cream', price: 150, category: 'Beverages' },
  { id: 'm9', name: 'Masala Lemonade Soda', price: 70, category: 'Beverages' },
  { id: 'm10', name: 'Gulab Jamun (2 pcs)', price: 90, category: 'Desserts' },
];

export default function TablesKOTScreen() {
  const { tenantId } = useAuth();
  const [tables, setTables] = useState<TableData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('bharatpos_tables_data');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return INITIAL_TABLES;
  });

  const [activeSection, setActiveSection] = useState<string>('All');
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchMenu, setSearchMenu] = useState('');
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [waiterName, setWaiterName] = useState('Rahul');
  const [specialNote, setSpecialNote] = useState('');

  // Save changes locally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('bharatpos_tables_data', JSON.stringify(tables));
      } catch (_) {}
    }
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (activeSection === 'All') return tables;
    return tables.filter(t => t.section === activeSection);
  }, [tables, activeSection]);

  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter(t => t.status === 'occupied').length;
    const kotFired = tables.filter(t => t.status === 'kot_fired').length;
    const billed = tables.filter(t => t.status === 'billed').length;
    const vacant = tables.filter(t => t.status === 'vacant').length;
    const totalLiveSales = tables.reduce((acc, t) => acc + (t.total || 0), 0);
    return { total, occupied, kotFired, billed, vacant, totalLiveSales };
  }, [tables]);

  const handleOpenTable = (table: TableData) => {
    setSelectedTable(table);
    setCurrentOrderItems(table.items || []);
    setWaiterName(table.waiter || 'Rahul');
    setShowOrderModal(true);
  };

  const addItemToOrder = (menuItem: typeof MENU_CATALOG[0]) => {
    setCurrentOrderItems(prev => {
      const idx = prev.findIndex(i => i.id === menuItem.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
        return copy;
      }
      return [...prev, { id: menuItem.id, name: menuItem.name, price: menuItem.price, qty: 1, notes: specialNote }];
    });
    setSpecialNote('');
  };

  const updateItemQty = (id: string, delta: number) => {
    setCurrentOrderItems(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      }).filter(Boolean) as OrderItem[];
    });
  };

  const calculateOrderTotal = () => {
    return currentOrderItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
  };

  // ── Dispatch to Kitchen & Print KOT ────────────────────────────
  const handleFireKOT = async () => {
    if (!selectedTable || currentOrderItems.length === 0) return;

    const newKotNo = (selectedTable.kotNo || Math.floor(10 + Math.random() * 90));
    const total = calculateOrderTotal();

    const updatedTable: TableData = {
      ...selectedTable,
      status: 'kot_fired',
      items: currentOrderItems,
      total,
      kotNo: newKotNo,
      waiter: waiterName,
      startTime: selectedTable.startTime || 'Just now',
    };

    setTables(prev => prev.map(t => t.id === selectedTable.id ? updatedTable : t));
    setSelectedTable(updatedTable);

    // KOT Print Layout (Standard 80mm Kitchen Slip)
    const kotHtml = `
      <html>
        <body style="font-family: monospace; padding: 16px; width: 280px; margin: auto;">
          <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px;">
            <h2 style="margin: 0; font-size: 20px;">*** KITCHEN ORDER TICKET ***</h2>
            <h3 style="margin: 4px 0; font-size: 16px;">TABLE: ${selectedTable.name} (${selectedTable.section})</h3>
            <p style="margin: 0; font-size: 12px;">KOT No: <b>#${newKotNo}</b> | Waiter: ${waiterName}</p>
            <p style="margin: 0; font-size: 11px;">Time: ${new Date().toLocaleTimeString('en-IN')}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left; padding: 4px 0;">Item</th>
                <th style="text-align: right; padding: 4px 0;">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${currentOrderItems.map(i => `
                <tr style="border-bottom: 1px dotted #ccc;">
                  <td style="padding: 6px 0;">
                    <b>${i.name}</b>
                    ${i.notes ? `<div style="font-size: 10px; color: red;">Note: ${i.notes}</div>` : ''}
                  </td>
                  <td style="text-align: right; font-size: 16px; font-weight: bold;">x${i.qty}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="border-top: 2px dashed #000; margin-top: 12px; padding-top: 8px; text-align: center; font-size: 11px;">
            Total Items: ${currentOrderItems.reduce((acc, i) => acc + i.qty, 0)}
            <br/>Send to Chef Station
          </div>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html: kotHtml });
    } catch (e) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(kotHtml);
          printWindow.document.close();
          printWindow.print();
        }
      }
    }

    Alert.alert('KOT Fired!', `KOT #${newKotNo} dispatched to kitchen for Table ${selectedTable.name}.`);
    setShowOrderModal(false);
  };

  // ── Print Final Customer Bill & Settle Table ───────────────────
  const handleSettleTable = () => {
    if (!selectedTable) return;
    const total = calculateOrderTotal();
    Alert.alert(
      'Settle & Vacate Table',
      `Generate final bill for Table ${selectedTable.name} (Amount: ₹${total})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle & Free Table',
          onPress: () => {
            const vacated: TableData = {
              ...selectedTable,
              status: 'vacant',
              items: [],
              total: 0,
              kotNo: undefined,
              orderId: undefined,
              startTime: undefined,
            };
            setTables(prev => prev.map(t => t.id === selectedTable.id ? vacated : t));
            setShowOrderModal(false);
            Alert.alert('Table Settled', `Table ${selectedTable.name} is now vacant and ready for new guests.`);
          }
        }
      ]
    );
  };

  const getStatusBadge = (status: TableData['status']) => {
    switch (status) {
      case 'vacant':
        return { label: 'Vacant', bg: '#DCFCE7', color: '#16A34A', icon: 'check-circle' };
      case 'occupied':
        return { label: 'Occupied', bg: '#FEF3C7', color: '#D97706', icon: 'account-group' };
      case 'kot_fired':
        return { label: 'KOT Fired', bg: '#F3E8FF', color: '#7E22CE', icon: 'chef-hat' };
      case 'billed':
        return { label: 'Bill Printed', bg: '#DBEAFE', color: '#2563EB', icon: 'receipt' };
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Toolbar */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.headerIcon}>
              <Icon name="silverware-fork-knife" size={22} color="#16A34A" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Tables & KOT Management</Text>
              <Text style={styles.headerSubtitle}>Petpooja-style Table Tabs, Live KOT Dispatch, and Kitchen Routing</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerStatsRow}>
          <Surface style={styles.statPill} elevation={1}>
            <Icon name="table-chair" size={16} color="#475569" />
            <Text style={styles.statPillText}>Total: <b>{stats.total}</b></Text>
          </Surface>
          <Surface style={[styles.statPill, { backgroundColor: '#DCFCE7' }]} elevation={1}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' }} />
            <Text style={[styles.statPillText, { color: '#16A34A' }]}>Vacant: <b>{stats.vacant}</b></Text>
          </Surface>
          <Surface style={[styles.statPill, { backgroundColor: '#F3E8FF' }]} elevation={1}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7E22CE' }} />
            <Text style={[styles.statPillText, { color: '#7E22CE' }]}>In Prep: <b>{stats.kotFired}</b></Text>
          </Surface>
          <Surface style={[styles.statPill, { backgroundColor: '#FEF3C7' }]} elevation={1}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#D97706' }} />
            <Text style={[styles.statPillText, { color: '#D97706' }]}>Live: <b>₹{stats.totalLiveSales.toLocaleString('en-IN')}</b></Text>
          </Surface>
        </View>
      </View>

      {/* 2. Section Tabs */}
      <View style={styles.sectionTabsRow}>
        {['All', 'AC Hall', 'Main Dining', 'Garden Patio', 'Takeaway'].map((sec) => (
          <TouchableOpacity
            key={sec}
            style={[styles.sectionTab, activeSection === sec && styles.sectionTabActive]}
            onPress={() => setActiveSection(sec)}
          >
            <Text style={[styles.sectionTabText, activeSection === sec && styles.sectionTabTextActive]}>{sec}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 3. Table Cards Grid */}
      <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {filteredTables.map((table) => {
            const badge = getStatusBadge(table.status);
            return (
              <TouchableOpacity
                key={table.id}
                style={[
                  styles.tableCard,
                  table.status === 'occupied' && styles.tableCardOccupied,
                  table.status === 'kot_fired' && styles.tableCardKotFired,
                  table.status === 'billed' && styles.tableCardBilled,
                ]}
                onPress={() => handleOpenTable(table)}
                activeOpacity={0.8}
              >
                <View style={styles.tableCardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.tableName}>{table.name}</Text>
                    <Chip compact textStyle={{ fontSize: 10, color: '#64748B' }} style={{ height: 22, backgroundColor: '#F1F5F9' }}>
                      {table.capacity}p
                    </Chip>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Icon name={badge.icon} size={12} color={badge.color} />
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>
                </View>

                <View style={styles.tableCardMiddle}>
                  {table.status === 'vacant' ? (
                    <View style={styles.vacantState}>
                      <Icon name="plus-circle-outline" size={24} color="#94A3B8" />
                      <Text style={styles.vacantText}>Tap to Start Order</Text>
                    </View>
                  ) : (
                    <View style={{ width: '100%' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.kotLabel}>KOT #{table.kotNo || '--'}</Text>
                        <Text style={styles.timeLabel}>{table.startTime}</Text>
                      </View>
                      <Text style={styles.itemsSummaryText} numberOfLines={2}>
                        {table.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </Text>
                    </View>
                  )}
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <View style={styles.tableCardBottom}>
                  <View>
                    <Text style={styles.totalLabel}>Running Total</Text>
                    <Text style={styles.totalVal}>₹{(table.total || 0).toLocaleString('en-IN')}</Text>
                  </View>
                  <Button
                    mode={table.status === 'vacant' ? 'outlined' : 'contained'}
                    buttonColor={table.status === 'vacant' ? undefined : '#16A34A'}
                    compact
                    labelStyle={{ fontSize: 11, fontWeight: '700' }}
                    style={{ borderRadius: 8 }}
                  >
                    {table.status === 'vacant' ? 'Seat Table' : 'Manage KOT'}
                  </Button>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 4. Table KOT Order Dialog */}
      <Portal>
        <Dialog visible={showOrderModal} onDismiss={() => setShowOrderModal(false)} style={styles.orderDialog}>
          <Dialog.Title style={styles.dialogHeader}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  {selectedTable?.name} ({selectedTable?.section})
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Waiter: <b>{waiterName}</b> • Status: <b style={{ textTransform: 'capitalize' }}>{selectedTable?.status.replace('_', ' ')}</b>
                </Text>
              </View>
              <IconButton icon="close" size={20} onPress={() => setShowOrderModal(false)} />
            </View>
          </Dialog.Title>

          <Dialog.Content style={styles.dialogBody}>
            <View style={styles.splitOrderView}>
              {/* Left: Menu Catalog Picker */}
              <View style={styles.catalogColumn}>
                <TextInput
                  mode="outlined"
                  placeholder="Search dishes, drinks, combos..."
                  value={searchMenu}
                  onChangeText={setSearchMenu}
                  left={<TextInput.Icon icon="magnify" />}
                  dense
                  style={{ marginBottom: 12, backgroundColor: '#FFFFFF' }}
                />
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {MENU_CATALOG.filter(m => m.name.toLowerCase().includes(searchMenu.toLowerCase())).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.menuRow}
                      onPress={() => addItemToOrder(item)}
                    >
                      <View>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        <Text style={styles.menuItemCategory}>{item.category}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                        <IconButton icon="plus" size={16} containerColor="#DCFCE7" iconColor="#16A34A" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Right: Current KOT Items */}
              <View style={styles.activeOrderColumn}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 }}>
                  KOT Ticket Items ({currentOrderItems.reduce((a, b) => a + b.qty, 0)})
                </Text>

                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  {currentOrderItems.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <Icon name="food-off" size={32} color="#CBD5E1" />
                      <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>No items added to ticket yet</Text>
                    </View>
                  ) : (
                    currentOrderItems.map((item) => (
                      <View key={item.id} style={styles.orderItemCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>{item.name}</Text>
                          <Text style={{ fontSize: 11, color: '#64748B' }}>₹{item.price} each</Text>
                          {item.notes ? <Text style={{ fontSize: 10, color: '#DC2626' }}>Note: {item.notes}</Text> : null}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <IconButton icon="minus" size={14} onPress={() => updateItemQty(item.id, -1)} />
                          <Text style={{ fontSize: 13, fontWeight: '800' }}>{item.qty}</Text>
                          <IconButton icon="plus" size={14} onPress={() => updateItemQty(item.id, 1)} />
                          <Text style={{ fontSize: 13, fontWeight: '800', width: 60, textAlign: 'right' }}>
                            ₹{item.price * item.qty}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                <TextInput
                  mode="outlined"
                  placeholder="Special instructions for kitchen (e.g. less oil, spicy)"
                  value={specialNote}
                  onChangeText={setSpecialNote}
                  dense
                  style={{ marginTop: 8, backgroundColor: '#FFFFFF', fontSize: 12 }}
                />

                <Divider style={{ marginVertical: 12 }} />

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#64748B' }}>Total Ticket Value:</Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A' }}>
                    ₹{calculateOrderTotal().toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          </Dialog.Content>

          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            {selectedTable?.status !== 'vacant' && (
              <Button
                mode="outlined"
                textColor="#DC2626"
                style={{ borderColor: '#FCA5A5', marginRight: 'auto' }}
                onPress={handleSettleTable}
              >
                Settle & Vacate Table
              </Button>
            )}
            <Button
              mode="contained"
              buttonColor="#7E22CE"
              icon="printer"
              onPress={handleFireKOT}
              disabled={currentOrderItems.length === 0}
            >
              Print & Fire KOT to Kitchen
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Plus Jakarta Sans',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  headerStatsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statPillText: {
    fontSize: 12,
    color: '#334155',
  },
  sectionTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  sectionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  sectionTabActive: {
    backgroundColor: '#16A34A',
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
  },
  gridContainer: {
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  tableCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tableCardOccupied: {
    borderColor: '#FCD34D',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tableCardKotFired: {
    borderColor: '#D8B4FE',
    borderLeftWidth: 4,
    borderLeftColor: '#7E22CE',
  },
  tableCardBilled: {
    borderColor: '#93C5FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  tableCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tableCardMiddle: {
    minHeight: 52,
    justifyContent: 'center',
  },
  vacantState: {
    alignItems: 'center',
    gap: 4,
  },
  vacantText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  kotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
  },
  timeLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  itemsSummaryText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  tableCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
  },
  orderDialog: {
    width: '90%',
    maxWidth: 900,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  dialogHeader: {
    paddingBottom: 0,
  },
  dialogBody: {
    paddingTop: 12,
  },
  splitOrderView: {
    flexDirection: Platform.OS === 'web' && Dimensions.get('window').width > 700 ? 'row' : 'column',
    gap: 20,
  },
  catalogColumn: {
    flex: 1.1,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    paddingRight: 16,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  menuItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuItemCategory: {
    fontSize: 10,
    color: '#64748B',
  },
  menuItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  activeOrderColumn: {
    flex: 1,
  },
  orderItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
});
