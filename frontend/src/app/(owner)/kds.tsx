import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Text, Card, Button, Surface, Chip, Divider, IconButton, Badge } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface KOTOrder {
  id: string;
  kotNo: number;
  table: string;
  section: string;
  waiter: string;
  orderType: 'Dine-In' | 'Takeaway' | 'Delivery';
  minutesAgo: number;
  status: 'preparing' | 'ready' | 'served';
  items: { name: string; qty: number; done: boolean; note?: string }[];
}

const INITIAL_KOTS: KOTOrder[] = [
  {
    id: 'kot-1',
    kotNo: 13,
    table: 'AC 3',
    section: 'AC Hall',
    waiter: 'Sameer',
    orderType: 'Dine-In',
    minutesAgo: 8,
    status: 'preparing',
    items: [
      { name: 'Chicken Biryani Special', qty: 2, done: true, note: 'Extra raita' },
      { name: 'Mirchi Ka Salan', qty: 1, done: false },
      { name: 'Butter Tandoori Naan', qty: 4, done: false },
    ]
  },
  {
    id: 'kot-2',
    kotNo: 14,
    table: 'D 2',
    section: 'Main Dining',
    waiter: 'Amit',
    orderType: 'Dine-In',
    minutesAgo: 14,
    status: 'preparing',
    items: [
      { name: 'Dal Makhani Bukhara', qty: 1, done: false },
      { name: 'Jeera Rice', qty: 1, done: true },
      { name: 'Garlic Butter Naan', qty: 2, done: false },
    ]
  },
  {
    id: 'kot-3',
    kotNo: 16,
    table: 'Counter 2',
    section: 'Takeaway',
    waiter: 'Priya',
    orderType: 'Takeaway',
    minutesAgo: 4,
    status: 'preparing',
    items: [
      { name: 'Paneer Tikka Roll', qty: 2, done: false, note: 'Parcel pack foil' },
      { name: 'Masala Lemonade Soda', qty: 2, done: true },
    ]
  },
  {
    id: 'kot-4',
    kotNo: 15,
    table: 'G 2',
    section: 'Garden Patio',
    waiter: 'Sameer',
    orderType: 'Dine-In',
    minutesAgo: 18,
    status: 'preparing',
    items: [
      { name: 'Crispy Chilli Corn', qty: 1, done: true },
      { name: 'Cold Coffee with Ice Cream', qty: 2, done: true },
    ]
  },
];

export default function KitchenDisplayScreen() {
  const [kots, setKots] = useState<KOTOrder[]>(INITIAL_KOTS);
  const [filterType, setFilterType] = useState<string>('All');

  // Elapsed timer tick simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setKots(prev => prev.map(k => ({ ...k, minutesAgo: k.minutesAgo + 1 })));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleItemDone = (kotId: string, itemIdx: number) => {
    setKots(prev => prev.map(kot => {
      if (kot.id === kotId) {
        const items = [...kot.items];
        items[itemIdx].done = !items[itemIdx].done;
        const allDone = items.every(i => i.done);
        return { ...kot, items, status: allDone ? 'ready' : 'preparing' };
      }
      return kot;
    }));
  };

  const markKotReady = (kotId: string) => {
    setKots(prev => prev.map(kot => {
      if (kot.id === kotId) {
        const items = kot.items.map(i => ({ ...i, done: true }));
        return { ...kot, items, status: 'ready' };
      }
      return kot;
    }));
  };

  const dismissKot = (kotId: string) => {
    setKots(prev => prev.filter(k => k.id !== kotId));
  };

  const filteredKots = kots.filter(k => {
    if (filterType === 'All') return true;
    return k.orderType === filterType;
  });

  const getTimerColor = (mins: number) => {
    if (mins < 10) return { bg: '#DCFCE7', text: '#16A34A', border: '#86EFAC' };
    if (mins < 15) return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
    return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Toolbar */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.headerIcon}>
            <Icon name="chef-hat" size={24} color="#7C3AED" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Kitchen Display System (KDS)</Text>
            <Text style={styles.headerSubtitle}>Real-time ticket routing, prep timers & order fulfillment station</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['All', 'Dine-In', 'Takeaway', 'Delivery'].map(t => (
            <Chip
              key={t}
              selected={filterType === t}
              onPress={() => setFilterType(t)}
              style={{ backgroundColor: filterType === t ? '#7C3AED' : '#FFFFFF' }}
              textStyle={{ color: filterType === t ? '#FFFFFF' : '#475569', fontWeight: '700' }}
            >
              {t}
            </Chip>
          ))}
        </View>
      </View>

      {/* 2. Live Tickets Board */}
      <ScrollView contentContainerStyle={styles.board} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsGrid}>
          {filteredKots.map(kot => {
            const timerStyle = getTimerColor(kot.minutesAgo);
            const allDone = kot.items.every(i => i.done);

            return (
              <Surface
                key={kot.id}
                style={[
                  styles.ticketCard,
                  kot.status === 'ready' && styles.ticketCardReady,
                  kot.minutesAgo >= 15 && styles.ticketCardOverdue,
                ]}
                elevation={2}
              >
                {/* Ticket Top Header */}
                <View style={styles.ticketHeader}>
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.ticketTable}>Table: {kot.table}</Text>
                      <Chip compact style={{ height: 20, backgroundColor: '#F1F5F9' }} textStyle={{ fontSize: 9 }}>
                        {kot.orderType}
                      </Chip>
                    </View>
                    <Text style={styles.ticketSub}>KOT #{kot.kotNo} • Waiter: {kot.waiter}</Text>
                  </View>

                  <View style={[styles.timerBadge, { backgroundColor: timerStyle.bg, borderColor: timerStyle.border }]}>
                    <Icon name="timer-outline" size={13} color={timerStyle.text} />
                    <Text style={[styles.timerText, { color: timerStyle.text }]}>{kot.minutesAgo}m</Text>
                  </View>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                {/* Items Checklist */}
                <View style={styles.itemsList}>
                  {kot.items.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.itemRow, item.done && styles.itemRowDone]}
                      onPress={() => toggleItemDone(kot.id, idx)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={[styles.itemCheck, item.done && styles.itemCheckDone]}>
                          {item.done && <Icon name="check" size={12} color="#FFFFFF" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemName, item.done && styles.itemNameDone]}>
                            {item.name}
                          </Text>
                          {item.note && (
                            <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '600' }}>
                              ⚠️ {item.note}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.qtyBadge}>
                        <Text style={styles.qtyText}>x{item.qty}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <Divider style={{ marginVertical: 10 }} />

                {/* Bottom Action */}
                <View style={styles.ticketFooter}>
                  {allDone || kot.status === 'ready' ? (
                    <Button
                      mode="contained"
                      buttonColor="#16A34A"
                      icon="bell-ring"
                      labelStyle={{ fontSize: 12, fontWeight: '700' }}
                      style={{ flex: 1 }}
                      onPress={() => dismissKot(kot.id)}
                    >
                      Served & Clear Ticket
                    </Button>
                  ) : (
                    <Button
                      mode="contained"
                      buttonColor="#7C3AED"
                      icon="check-all"
                      labelStyle={{ fontSize: 12, fontWeight: '700' }}
                      style={{ flex: 1 }}
                      onPress={() => markKotReady(kot.id)}
                    >
                      Mark All Prepared
                    </Button>
                  )}
                </View>
              </Surface>
            );
          })}
        </View>
      </ScrollView>
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
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
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
  board: {
    paddingBottom: 40,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  ticketCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketCardReady: {
    borderColor: '#86EFAC',
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  ticketCardOverdue: {
    borderColor: '#FCA5A5',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketTable: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  ticketSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemsList: {
    gap: 8,
    minHeight: 120,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemRowDone: {
    opacity: 0.5,
  },
  itemCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemCheckDone: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemNameDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  qtyBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  ticketFooter: {
    flexDirection: 'row',
    gap: 6,
  },
});
