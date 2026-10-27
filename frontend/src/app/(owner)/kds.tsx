import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
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
  status: 'preparing' | 'ready';
  items: {
    name: string;
    qty: number;
    done: boolean;
    note?: string;
  }[];
}

export default function KitchenDisplayScreen() {
  const [kots, setKots] = useState<KOTOrder[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('bharatpos_live_kots');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [];
  });

  const [filterType, setFilterType] = useState<string>('All');

  // Elapsed timer tick simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setKots(prev => prev.map(k => ({ ...k, minutesAgo: k.minutesAgo + 1 })));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Save changes locally
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('bharatpos_live_kots', JSON.stringify(kots));
      } catch (_) {}
    }
  }, [kots]);

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

  const handleLoadSampleKot = () => {
    const sample: KOTOrder = {
      id: `sample-${Date.now()}`,
      kotNo: 101,
      table: 'AC 1',
      section: 'AC Hall',
      waiter: 'Captain 1',
      orderType: 'Dine-In',
      minutesAgo: 2,
      status: 'preparing',
      items: [
        { name: 'Chicken Biryani Special', qty: 2, done: false, note: 'Extra raita' },
        { name: 'Butter Tandoori Naan', qty: 3, done: true },
      ]
    };
    setKots(prev => [sample, ...prev]);
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

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
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
          {kots.length === 0 && (
            <Button mode="text" compact onPress={handleLoadSampleKot} textColor="#7C3AED">
              + Sample Ticket
            </Button>
          )}
        </View>
      </View>

      {/* 2. Live Tickets Board */}
      <ScrollView contentContainerStyle={styles.board} showsVerticalScrollIndicator={false}>
        {filteredKots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="chef-hat" size={48} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>Kitchen Queue is All Clear!</Text>
            <Text style={styles.emptySubtitle}>
              No active KOT tickets to prepare right now. When servers fire tickets from "Tables & KOT", they will appear here with live prep timers.
            </Text>
            <Button 
              mode="contained" 
              buttonColor="#7C3AED" 
              style={{ marginTop: 16, borderRadius: 10 }}
              onPress={handleLoadSampleKot}
            >
              Load Sample Test Ticket
            </Button>
          </View>
        ) : (
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
                      <Text style={styles.ticketSub}>KOT #{kot.kotNo} • Server: {kot.waiter}</Text>
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
                                {item.note}
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
                        Mark All Ready
                      </Button>
                    )}
                  </View>
                </Surface>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#312E81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  board: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    maxWidth: 600,
    marginHorizontal: 'auto',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  ticketCard: {
    width: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  ticketCardReady: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  ticketCardOverdue: {
    borderColor: '#FCA5A5',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ticketTable: {
    fontSize: 16,
    fontWeight: '900',
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
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800',
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemRowDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  itemCheck: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCheckDone: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemNameDone: {
    textDecorationLine: 'line-through',
    color: '#64748B',
  },
  qtyBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  ticketFooter: {
    flexDirection: 'row',
    gap: 8,
  },
});
