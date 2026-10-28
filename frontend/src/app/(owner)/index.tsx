import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Animated, Platform, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Text, Card, useTheme, Surface, TextInput, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { db, isFirebaseConfigured, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from '../../lib/firestore_adapter';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { router } from 'expo-router';
import { DS } from '../../constants/designTokens';
import POSAssistantModal from '../../components/POSAssistantModal';

// ── Animated Counter Hook ──────────────────────────────────────────────
function useAnimatedCounter(target: number, duration: number = 1200) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef<any>(null);

  useEffect(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const startTime = Date.now();
    const startVal = 0;
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    tick();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [target, duration]);

  return display;
}

// ── Greeting Helper ────────────────────────────────────────────────────
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ── Formatted Date Helper ──────────────────────────────────────────────
function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Metric Card Config ─────────────────────────────────────────────────
interface MetricConfig {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: string;
  color: string;
  bgColor: string;
  changeText?: string;
  changeColor?: string;
}

// ── Animated Section Wrapper ───────────────────────────────────────────
const FadeInSection = ({ delay = 0, children }: { delay?: number; children: React.ReactNode }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, delay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 600, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const appTheme = useTheme();

  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { tenantId, loading: authLoading, subscriptionPlan } = useAuth();

  const [todaySales, setTodaySales] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = parseFloat(window.localStorage.getItem('cachedTodaySales') || '0');
      if (val > 0) return val;
    }
    return 0;
  });
  const [yesterdaySales, setYesterdaySales] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = parseFloat(window.localStorage.getItem('cachedYesterdaySales') || '0');
      if (val > 0) return val;
    }
    return 0;
  });
  const [monthlySales, setMonthlySales] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = parseFloat(window.localStorage.getItem('cachedMonthlySales') || '0');
      if (val > 0) return val;
    }
    return 0;
  });
  const [totalProfit, setTotalProfit] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return parseFloat(window.localStorage.getItem('cachedTotalProfit') || '0');
    }
    return 0;
  });
  const [totalOrders, setTotalOrders] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = parseFloat(window.localStorage.getItem('cachedTotalOrders') || '0');
      if (val > 0) return val;
    }
    return 0;
  });
  const [lowStockAlertCount, setLowStockAlertCount] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = parseFloat(window.localStorage.getItem('cachedLowStock') || '0');
      if (val > 0) return val;
    }
    return 0;
  });
  const [recentActivity, setRecentActivity] = useState<any[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = window.localStorage.getItem('cachedRecentActivity');
      if (val) return JSON.parse(val);
    }
    return [];
  });
  const [topSellingProducts, setTopSellingProducts] = useState<any[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = window.localStorage.getItem('cachedTopSelling');
      if (val) return JSON.parse(val);
    }
    return [];
  });
  const [chartLabels, setChartLabels] = useState<string[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = window.localStorage.getItem('cachedChartLabels');
      if (val) return JSON.parse(val);
    }
    return ['1 Oct', '2 Oct', '3 Oct', '4 Oct', '5 Oct', '6 Oct', '7 Oct'];
  });
  const [chartData, setChartData] = useState<number[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const val = window.localStorage.getItem('cachedChartData');
      if (val) return JSON.parse(val);
    }
    return [0, 0, 0, 0, 0, 0, 0];
  });
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [shopSyncCode, setShopSyncCode] = useState('');
  
  const [shopMode, setShopMode] = useState('Mobile Only');
  const [isGstRegistered, setIsGstRegistered] = useState(true);
  const [showAssistantModal, setShowAssistantModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [posBusinessMode, setPosBusinessMode] = useState<'retail' | 'wholesale' | 'restaurant' | 'hybrid'>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('posBusinessMode') as any;
      if (saved) return saved;
    }
    return 'retail';
  });

  const [liveTableStats, setLiveTableStats] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('bharatpos_tables_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          const occupied = parsed.filter((t: any) => t.status && t.status !== 'vacant').length;
          const openAmount = parsed.reduce((acc: number, t: any) => acc + (t.total || 0), 0);
          return { occupied, total: parsed.length || 12, openAmount };
        }
      } catch (_) {}
    }
    return { occupied: 0, total: 12, openAmount: 0 };
  });

  const [liveKdsStats, setLiveKdsStats] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('bharatpos_live_kots');
        if (saved) {
          const parsed = JSON.parse(saved);
          const pendingKots = parsed.filter((k: any) => k.status !== 'ready').length;
          return { pendingKots, avgPrepMins: pendingKots > 0 ? 8 : 0 };
        }
      } catch (_) {}
    }
    return { pendingKots: 0, avgPrepMins: 0 };
  });

  const [liveStaffStats, setLiveStaffStats] = useState({ clockedIn: 1, total: 1 });
  const [liveTaskStats, setLiveTaskStats] = useState({ completed: 0, total: 0 });

  const handleSwitchBusinessMode = (mode: 'retail' | 'restaurant' | 'hybrid') => {
    setPosBusinessMode(mode);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem('posBusinessMode', mode);
      window.dispatchEvent(new Event('posBusinessModeChanged'));
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    fetchMetrics();
    let unsubscribe: any = null;
    if (isFirebaseConfigured && tenantId) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startDate = sevenDaysAgo < firstOfMonth ? sevenDaysAgo : firstOfMonth;
      const startDateISO = startDate.toISOString();

      const q = query(
        collection(db, 'sales'),
        where('tenant_id', '==', tenantId),
        where('created_at', '>=', startDateISO)
      );

      unsubscribe = onSnapshot(q, (snapshot: any) => {
        try {
          processSalesData(snapshot.docs);
        } catch (err) {
          console.error("Real-time sales update process failed:", err);
        }
      });
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const mode = window.localStorage.getItem('shopMode');
      if (mode) setShopMode(mode);

      const gstReg = window.localStorage.getItem('isGstRegistered');
      if (gstReg !== null) {
        setIsGstRegistered(gstReg !== 'false');
      }
    }

    return () => { if (unsubscribe) unsubscribe(); };
  }, [authLoading, tenantId]);

  const processSalesData = (docs: any[]) => {
    const now = new Date();
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStr = todayStr - 86400000;
    const firstOfMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let tSales = 0, ySales = 0, mSales = 0, profit = 0, tOrders = 0;
    const productStats: Record<string, any> = {};
    const activities: any[] = [];
    
    const labels: string[] = [];
    const dataPoints = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStr);
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
    }

    docs.forEach((doc: any) => {
      const data = doc.data();
      const amt = parseFloat(data.total_amount || 0);
      const date = new Date(data.created_at || new Date()).getTime();

      if (date >= todayStr) { tSales += amt; tOrders++; }
      else if (date >= yesterdayStr && date < todayStr) { ySales += amt; }
      if (date >= firstOfMonthStr) { mSales += amt; }
      
      const saleDateObj = new Date(date);
      const dateStr = saleDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const idx = labels.indexOf(dateStr);
      if (idx !== -1) {
        dataPoints[idx] += amt;
      }

      // Calculate real profit
      let cost = 0;
      let hasCostPrice = false;
      (data.items || []).forEach((item: any) => {
        if (item.cost_price !== undefined && item.cost_price > 0) {
           hasCostPrice = true;
           cost += (parseFloat(item.cost_price) * item.qty);
        } else {
           // fallback logic if needed, but we will just rely on actual cost_price
        }
        if (!productStats[item.id]) productStats[item.id] = { name: item.name, qty: 0, revenue: 0 };
        productStats[item.id].qty += item.qty;
        productStats[item.id].revenue += (item.qty * parseFloat(item.price || 0));
      });
      
      // If no cost price available, don't add to profit to avoid fake numbers. 
      // If we want to show 0 when no cost price is available.
      if (hasCostPrice) {
         profit += (amt - cost);
      }

      activities.push({
        id: doc.id,
        date: date,
        icon: 'cart-check',
        color: appTheme.colors.onSurface,
        text: `Sale by ${data.served_by || 'Staff'} — ₹${amt.toLocaleString()}`,
        time: new Date(date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      });
    });

    setTodaySales(tSales);
    setYesterdaySales(ySales);
    setMonthlySales(mSales);
    setTotalProfit(Math.round(profit));
    setTotalOrders(tOrders);
    setChartLabels(labels);
    setChartData(dataPoints);

    // Sort Top Products
    const topProdList = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p, idx) => ({ ...p, rank: idx + 1 }));
    setTopSellingProducts(topProdList);

    // Sort Recent Activity
    activities.sort((a, b) => b.date - a.date);
    const recentActList = activities.slice(0, 5);
    setRecentActivity(recentActList);

    // Cache metrics in localStorage
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem('cachedTodaySales', String(tSales));
      window.localStorage.setItem('cachedYesterdaySales', String(ySales));
      window.localStorage.setItem('cachedMonthlySales', String(mSales));
      window.localStorage.setItem('cachedTotalProfit', String(Math.round(profit)));
      window.localStorage.setItem('cachedTotalOrders', String(tOrders));
      window.localStorage.setItem('cachedRecentActivity', JSON.stringify(recentActList));
      window.localStorage.setItem('cachedTopSelling', JSON.stringify(topProdList));
      window.localStorage.setItem('cachedChartLabels', JSON.stringify(labels));
      window.localStorage.setItem('cachedChartData', JSON.stringify(dataPoints));
    }
  };

  const fetchMetrics = async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!tenantId) return;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startDate = sevenDaysAgo < firstOfMonth ? sevenDaysAgo : firstOfMonth;
      const startDateISO = startDate.toISOString();

      // Fire all 4 queries concurrently in parallel
      const workersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'salesperson'),
        where('tenant_id', '==', tenantId)
      );
      const shopDocRef = doc(db, 'shops', tenantId);
      const productsQuery = query(collection(db, 'products'), where('tenant_id', '==', tenantId));
      const salesQuery = query(
        collection(db, 'sales'),
        where('tenant_id', '==', tenantId),
        where('created_at', '>=', startDateISO)
      );

      const [workersRes, shopRes, prodsRes, salesRes] = await Promise.allSettled([
        getDocs(workersQuery),
        getDoc(shopDocRef),
        getDocs(productsQuery),
        getDocs(salesQuery),
      ]);

      // Process Workers
      if (workersRes.status === 'fulfilled') {
        const wList: any[] = [];
        workersRes.value.forEach((d: any) => {
          wList.push({ id: d.id, ...d.data() });
        });
        setWorkersList(wList);
      }

      // Process Shop Metadata
      let sCode = '';
      if (shopRes.status === 'fulfilled' && shopRes.value.exists && shopRes.value.exists()) {
        const shopData = shopRes.value.data();
        sCode = shopData.syncCode || shopData.sync_code;
      }
      if (!sCode) {
        sCode = `POS-${tenantId.substring(0, 6).toUpperCase()}`;
      }
      setShopSyncCode(sCode);

      // Process Products for Low Stock & AI Copilot
      if (prodsRes.status === 'fulfilled') {
        let lowStock = 0;
        const pList: any[] = [];
        prodsRes.value.forEach((d: any) => {
          const pData = d.data();
          const pObj = { id: d.id, ...pData, price: pData.selling_price || pData.price || 0 };
          pList.push(pObj);
          if ((pData.stock_qty || pData.stock_quantity || 0) < 5) lowStock++;
        });
        setProducts(pList);
        setLowStockAlertCount(lowStock);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.localStorage.setItem('cachedLowStock', String(lowStock));
        }
      }

      // Process Sales
      if (salesRes.status === 'fulfilled') {
        processSalesData(salesRes.value.docs);
      }

    } catch (error: any) {
      console.error("Error fetching metrics:", error);
      setError(error.message || "Unable to sync dashboard stats from Firebase database.");
    } finally {
      setLoading(false);
    }
  };

  // Use real data
  const salesValue = todaySales;
  const ordersValue = totalOrders;

  // Comparison Calculations
  const salesDiff = yesterdaySales > 0 ? ((todaySales - yesterdaySales) / yesterdaySales) * 100 : 0;
  const salesDiffText = salesDiff >= 0 ? `+${salesDiff.toFixed(0)}% vs yesterday` : `${salesDiff.toFixed(0)}% vs yesterday`;
  const salesDiffColor = salesDiff >= 0 ? '#16A34A' : '#DC2626';

  const profitMarginText = todaySales > 0 ? `${((totalProfit / todaySales) * 100).toFixed(0)}% net margin` : '0% net margin';
  const lowStockAlertText = lowStockAlertCount > 0 ? `${lowStockAlertCount} items need attention` : 'All items in stock';

  const metrics: MetricConfig[] = [
    { title: "Today's Revenue", value: salesValue, prefix: '₹', icon: 'currency-inr', color: '#0F172A', bgColor: '#F8FAFC', changeText: salesDiffText, changeColor: salesDiffColor },
    { title: "Total Bills / Orders", value: ordersValue, prefix: '', icon: 'receipt-text-outline', color: '#0F172A', bgColor: '#F8FAFC', changeText: ordersValue > 0 ? 'Active terminal' : 'No bills yet today', changeColor: '#64748B' },
    { title: "Net Profit", value: totalProfit, prefix: '₹', icon: 'trending-up', color: '#16A34A', bgColor: '#F0FDF4', changeText: profitMarginText, changeColor: '#16A34A' },
    { title: "Stock Replenishment", value: lowStockAlertCount, icon: 'alert-circle-outline', color: lowStockAlertCount > 0 ? '#DC2626' : '#64748B', bgColor: lowStockAlertCount > 0 ? '#FEF2F2' : '#F8FAFC', changeText: lowStockAlertText, changeColor: lowStockAlertCount > 0 ? '#DC2626' : '#64748B' },
  ];

  const renderShopModeWidget = () => {
    if (shopMode === 'Mobile Only') {
      return (
        <Card style={styles.modeCard} elevation={0}>
          <Card.Content>
            <View style={styles.modeCardHeader}>
              <View style={[styles.modeIconCircle, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name="cellphone" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.modeCardTitle}>Mobile Shop Console</Text>
                <Text style={styles.modeCardSubtitle}>Mode: Mobile Only Shop (Optimized for Phones)</Text>
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Everything is optimized for your mobile camera terminal. Quick billing, stock tracking, and barcode scanner are fully operational directly on phone.
            </Text>
            <View style={styles.modeActionsRow}>
              <TouchableOpacity style={styles.modeActionBtn} onPress={() => router.push('/(owner)/pos_billing' as any)}>
                <Icon name="barcode-scan" size={16} color="#10B981" />
                <Text style={styles.modeActionText}>Billing Terminal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modeActionBtn} onPress={() => router.push('/(owner)/products_management' as any)}>
                <Icon name="package-variant-plus" size={16} color="#10B981" />
                <Text style={styles.modeActionText}>Add Products</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modeActionBtn} onPress={() => router.push('/(owner)/barcode_generator' as any)}>
                <Icon name="barcode" size={16} color="#2E7D32" />
                <Text style={styles.modeActionText}>Create Barcode</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modeActionBtn} onPress={() => router.push('/(owner)/inventory' as any)}>
                <Icon name="clipboard-list" size={16} color="#10B981" />
                <Text style={styles.modeActionText}>Stock Management</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modeActionBtn} onPress={() => router.push('/(owner)/upgrade' as any)}>
                <Icon name="star-outline" size={16} color="#10B981" />
                <Text style={styles.modeActionText}>Subscriptions</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      );
    } else if (shopMode === 'Laptop + Mobile') {
      return (
        <Card style={styles.modeCard} elevation={0}>
          <Card.Content>
            <View style={styles.modeCardHeader}>
              <View style={[styles.modeIconCircle, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name="laptop" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.modeCardTitle}>Medium Shop Sync Console</Text>
                <Text style={styles.modeCardSubtitle}>Mode: Laptop POS + Worker Phone Sync</Text>
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Your laptop serves as the main checkout counter while salesperson phones perform fast barcode scans and quick register checkout.
            </Text>
            <View style={styles.syncRow}>
              <Icon name="cellphone-link-variant" size={20} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.syncText}>
                  Staff Phone Sync Code: <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>{shopSyncCode || 'Loading...'}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: appTheme.colors.onSurface, marginTop: 2 }}>
                  Instruct cashiers to enter this code on the worker sign-in screen to connect their devices.
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: 'gray' }}>Worker</Text>
            </View>
          </Card.Content>
        </Card>
      );
    } else {
      return (
        <Card style={styles.modeCard} elevation={0}>
          <Card.Content>
            <View style={styles.modeCardHeader}>
              <View style={[styles.modeIconCircle, { backgroundColor: appTheme.colors.surface }]}>
                <Icon name="domain" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.modeCardTitle}>Large Store Central Dashboard</Text>
                <Text style={styles.modeCardSubtitle}>Mode: Multi-Device Sync & Separate Permissions</Text>
              </View>
            </View>
            <Text style={styles.modeCardDesc}>
              Central inventory synced automatically across all workers. Manage roles and set terminal session permissions manually.
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
              <View style={{ flex: 1, minWidth: 200, backgroundColor: appTheme.colors.surface, borderWidth: 1, borderColor: appTheme.colors.outline, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: appTheme.colors.onSurface, marginBottom: 6, textTransform: 'uppercase' }}>Worker Status</Text>
                {workersList.length > 0 ? (
                  workersList.map((w, idx) => (
                    <View key={w.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: appTheme.colors.onSurface }}>{w.full_name || w.name || 'Staff'}</Text>
                      <Text style={{ fontSize: 12, color: appTheme.colors.onSurface, fontWeight: 'bold' }}>Active</Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ fontSize: 12, color: appTheme.colors.onSurface, fontStyle: 'italic' }}>No Data Available</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 200, backgroundColor: appTheme.colors.surface, borderWidth: 1, borderColor: appTheme.colors.outline, borderRadius: 10, padding: 12, justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: appTheme.colors.primary }}>{workersList.length} Registered Workers</Text>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: appTheme.colors.onSurface, textTransform: 'uppercase' }}>Terminal Permissions</Text>
                <Text style={{ fontSize: 12, color: appTheme.colors.onSurface, marginTop: 4 }}>Staff are restricted from accessing reports or inventory settings.</Text>
                <TouchableOpacity onPress={() => router.push('/(owner)/vendors' as any)} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: appTheme.colors.onSurface, fontWeight: 'bold' }}>Edit Worker Permissions →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card.Content>
        </Card>
      );
    }
  };

  const user = auth.currentUser;
  let userName = user?.displayName || user?.email?.split('@')[0] || 'Ramesh Kumar';
  if (userName.length > 0 && user?.email && userName === user.email.split('@')[0]) {
    userName = userName.charAt(0).toUpperCase() + userName.slice(1);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appTheme.colors.background }}>
        <ActivityIndicator size="large" color={appTheme.colors.primary} />
        <Text style={{ marginTop: 12, color: appTheme.colors.onSurfaceVariant, fontWeight: '600' }}>Loading BharatPOS Dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: appTheme.colors.background }}>
        <Card style={{ padding: 32, borderRadius: 16, width: '90%', maxWidth: 500, alignItems: 'center', borderWidth: 1, borderColor: appTheme.colors.outlineVariant, backgroundColor: 'white' }} elevation={1}>
          <Icon name="alert-circle-outline" size={48} color={appTheme.colors.error} style={{ marginBottom: 10 }} />
          <Text variant="titleMedium" style={{ marginTop: 8, fontWeight: 'bold', color: appTheme.colors.onSurface, textAlign: 'center' }}>Unable to Load Dashboard</Text>
          <Text style={{ marginTop: 8, color: 'gray', textAlign: 'center', fontSize: 13, lineHeight: 18, marginBottom: 24 }}>{error}</Text>
          <Button mode="contained" onPress={fetchMetrics} style={{ borderRadius: 10, width: '100%', backgroundColor: appTheme.colors.primary }}>
            Retry Sync
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { padding: screenWidth <= 600 ? 12 : 24 }]}>
 
        {/* ── Greeting Header ─────────────────────────────────────── */}
        <FadeInSection delay={0}>
          <View style={[styles.greetingContainer, screenWidth <= 600 && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
            <View>
              <Text style={styles.greetingText}>{getGreeting()}, {userName}</Text>
              <Text style={styles.greetingSubtext}>Here's what's happening with your store today.</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={styles.headerActionOutline}
                onPress={() => router.push('/')}
                activeOpacity={0.8}
              >
                <Icon name="home-outline" size={15} color="#475569" />
                <Text style={styles.headerActionOutlineText}>Website</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionSolid}
                onPress={() => router.push(posBusinessMode === 'restaurant' ? '/(owner)/tables_kot' as any : '/(owner)/pos_billing' as any)}
                activeOpacity={0.85}
              >
                <Icon name="plus-circle" size={15} color="#FFFFFF" />
                <Text style={styles.headerActionSolidText}>{posBusinessMode === 'restaurant' ? 'New Table KOT' : 'New Bill [F2]'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </FadeInSection>

        
 
        {/* ── Store Mode Identity Banner (Tailored to Shop Persona) ── */}
        <FadeInSection delay={60}>
          <View style={styles.businessModeBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' }}>
              <View style={styles.modeIndicatorPillMinimal}>
                <Icon 
                  name={
                    posBusinessMode === 'retail' 
                      ? 'barcode-scan' 
                      : posBusinessMode === 'wholesale' 
                      ? 'warehouse' 
                      : posBusinessMode === 'restaurant' 
                      ? 'silverware-fork-knife' 
                      : 'storefront'
                  } 
                  size={15} 
                  color="#0F172A"
                />
                <Text style={styles.modeIndicatorTextMinimal}>
                  {posBusinessMode === 'retail' 
                    ? 'Retail POS' 
                    : posBusinessMode === 'wholesale' 
                    ? 'Wholesale ERP' 
                    : posBusinessMode === 'restaurant' 
                    ? 'Café & Restaurant' 
                    : 'Multi-Mode POS'}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: '#64748B' }}>
                {posBusinessMode === 'retail' 
                  ? 'Showing retail counter checkout, barcode catalog & GST invoices.' 
                  : posBusinessMode === 'wholesale' 
                  ? 'Showing B2B sales orders, customer credit limits, supplier POs & godowns.' 
                  : posBusinessMode === 'restaurant' 
                  ? 'Showing dining table floor, kitchen KDS queue & food menu.' 
                  : 'Showing unified retail, wholesale and restaurant tools.'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.switchModeLink}
              onPress={() => router.push('/(owner)/settings' as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.switchModeLinkText}>Change in Settings</Text>
            </TouchableOpacity>
          </View>
        </FadeInSection>

        {/* ── Dynamic Live Operations Radar Strip ────────────────── */}
        <FadeInSection delay={75}>
          <View style={styles.liveOpsContainer}>
            <View style={styles.liveOpsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveOpsHeading}>
                  {posBusinessMode === 'retail' 
                    ? 'RETAIL COUNTER & STOCK RADAR' 
                    : posBusinessMode === 'wholesale' 
                    ? 'WHOLESALE B2B & PROCUREMENT RADAR' 
                    : posBusinessMode === 'restaurant' 
                    ? 'RESTAURANT & KITCHEN RADAR' 
                    : 'ENTERPRISE UNIFIED RADAR'}
                </Text>
                <View style={styles.liveTagPill}>
                  <Text style={styles.liveTagText}>REAL-TIME</Text>
                </View>
              </View>
              <Text style={styles.liveOpsSubtitle}>
                {posBusinessMode === 'retail' 
                  ? 'High-speed counter checkout, catalog SKUs & inventory refills' 
                  : posBusinessMode === 'wholesale' 
                  ? 'B2B orders fulfillment, customer credit khata & supplier goods receipt' 
                  : posBusinessMode === 'restaurant' 
                  ? 'Live table floor occupancy, chef prep queue & steward shifts' 
                  : 'Unified synchronization across barcode billing, wholesale orders & dining'}
              </Text>
            </View>

            <View style={styles.liveOpsGrid}>
              {/* RETAIL MODE CARDS */}
              {posBusinessMode === 'retail' && (
                <>
                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/pos_billing' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#DCFCE7' }]}>
                        <Icon name="barcode-scan" size={20} color="#16A34A" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.microBadgeText, { color: '#16A34A' }]}>BILLING POS</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>₹{todaySales.toLocaleString('en-IN')}</Text>
                    <Text style={styles.liveOpsLabel}>Today's Sales</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>{totalOrders} bills processed today →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/products_management' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#E0F2FE' }]}>
                        <Icon name="package-variant-closed" size={20} color="#0284C7" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.microBadgeText, { color: '#0284C7' }]}>CATALOG</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{products.length} SKUs</Text>
                    <Text style={styles.liveOpsLabel}>Products Listed</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>Manage barcodes & MRP →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/reorder_list' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.liveOpsCardTop]}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: lowStockAlertCount > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                        <Icon name="alert-outline" size={20} color={lowStockAlertCount > 0 ? '#DC2626' : '#16A34A'} />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: lowStockAlertCount > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                        <Text style={[styles.microBadgeText, { color: lowStockAlertCount > 0 ? '#DC2626' : '#16A34A' }]}>STOCK</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{lowStockAlertCount} Items</Text>
                    <Text style={styles.liveOpsLabel}>Need Reorder</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>{lowStockAlertCount > 0 ? 'Refill inventory now →' : 'All items in healthy stock →'}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/attendance' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#EEF2FF' }]}>
                        <Icon name="badge-account-horizontal-outline" size={20} color="#4F46E5" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={[styles.microBadgeText, { color: '#4F46E5' }]}>CASHIER</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{liveStaffStats.clockedIn} Active</Text>
                    <Text style={styles.liveOpsLabel}>Staff On Counter</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>Biometric attendance active →</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* WHOLESALE MODE CARDS */}
              {posBusinessMode === 'wholesale' && (
                <>
                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/wholesale' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#DBEAFE' }]}>
                        <Icon name="warehouse" size={20} color="#2563EB" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#DBEAFE' }]}>
                        <Text style={[styles.microBadgeText, { color: '#2563EB' }]}>B2B ORDERS</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>Wholesale ERP</Text>
                    <Text style={styles.liveOpsLabel}>Sales Orders & MOQs</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>Manage bulk B2B orders →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/wholesale' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#FEE2E2' }]}>
                        <Icon name="account-cash-outline" size={20} color="#DC2626" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.microBadgeText, { color: '#DC2626' }]}>CREDIT KHATA</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>Customer Udhar</Text>
                    <Text style={styles.liveOpsLabel}>Receivables & Terms</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>Track credit & collect payments →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/suppliers' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#DCFCE7' }]}>
                        <Icon name="truck-delivery-outline" size={20} color="#16A34A" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.microBadgeText, { color: '#16A34A' }]}>PROCUREMENT</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>Purchase Orders</Text>
                    <Text style={styles.liveOpsLabel}>Supplier Goods Receipt</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>Vendor POs & GRN updates →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/inventory' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#EDE9FE' }]}>
                        <Icon name="domain" size={20} color="#7C3AED" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#EDE9FE' }]}>
                        <Text style={[styles.microBadgeText, { color: '#7C3AED' }]}>GODOWNS</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>Stock Transfers</Text>
                    <Text style={styles.liveOpsLabel}>Multi-Warehouse Stock</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>Manage stock locations & transfers →</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* RESTAURANT MODE CARDS */}
              {posBusinessMode === 'restaurant' && (
                <>
                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/tables_kot' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#FEE2E2' }]}>
                        <Icon name="silverware-fork-knife" size={20} color="#DC2626" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.microBadgeText, { color: '#DC2626' }]}>DINE-IN</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{liveTableStats.occupied} / {liveTableStats.total}</Text>
                    <Text style={styles.liveOpsLabel}>Tables Occupied</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>₹{liveTableStats.openAmount.toLocaleString('en-IN')} active KOTs →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/kds' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#FEF3C7' }]}>
                        <Icon name="chef-hat" size={20} color="#D97706" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.microBadgeText, { color: '#D97706' }]}>KDS LIVE</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{liveKdsStats.pendingKots} Tickets</Text>
                    <Text style={styles.liveOpsLabel}>Kitchen Queue</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>{liveKdsStats.pendingKots > 0 ? `~${liveKdsStats.avgPrepMins} min avg prep time →` : 'Kitchen queue is clear →'}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/attendance' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#EEF2FF' }]}>
                        <Icon name="badge-account-horizontal-outline" size={20} color="#4F46E5" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={[styles.microBadgeText, { color: '#4F46E5' }]}>STEWARDS</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{liveStaffStats.clockedIn} On-Duty</Text>
                    <Text style={styles.liveOpsLabel}>Floor Captains</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>Floor shifts active →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/tasks' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#E0F2FE' }]}>
                        <Icon name="clipboard-check-outline" size={20} color="#0284C7" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.microBadgeText, { color: '#0284C7' }]}>STORE SOP</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{liveTaskStats.completed} / {liveTaskStats.total || 0}</Text>
                    <Text style={styles.liveOpsLabel}>Checklist Done</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>Shift compliance tracker →</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* HYBRID ALL-IN-ONE MODE */}
              {posBusinessMode === 'hybrid' && (
                <>
                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/pos_billing' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#DCFCE7' }]}>
                        <Icon name="barcode-scan" size={20} color="#16A34A" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.microBadgeText, { color: '#16A34A' }]}>COUNTER</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>₹{todaySales.toLocaleString('en-IN')}</Text>
                    <Text style={styles.liveOpsLabel}>Retail Sales</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>{totalOrders} bills processed →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/tables_kot' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#FEE2E2' }]}>
                        <Icon name="silverware-fork-knife" size={20} color="#DC2626" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={[styles.microBadgeText, { color: '#DC2626' }]}>DINE-IN</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{liveTableStats.occupied} / {liveTableStats.total}</Text>
                    <Text style={styles.liveOpsLabel}>Tables Active</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>₹{liveTableStats.openAmount.toLocaleString('en-IN')} open KOTs →</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/kds' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.liveOpsCardTop}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: '#FEF3C7' }]}>
                        <Icon name="chef-hat" size={20} color="#D97706" />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.microBadgeText, { color: '#D97706' }]}>KDS</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{liveKdsStats.pendingKots} Tickets</Text>
                    <Text style={styles.liveOpsLabel}>Kitchen Queue</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>{liveKdsStats.pendingKots > 0 ? `~${liveKdsStats.avgPrepMins}m prep →` : 'Kitchen clear →'}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.liveOpsCard}
                    onPress={() => router.push('/(owner)/reorder_list' as any)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.liveOpsCardTop]}>
                      <View style={[styles.liveOpsIconBox, { backgroundColor: lowStockAlertCount > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                        <Icon name="alert-outline" size={20} color={lowStockAlertCount > 0 ? '#DC2626' : '#16A34A'} />
                      </View>
                      <View style={[styles.microBadge, { backgroundColor: lowStockAlertCount > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                        <Text style={[styles.microBadgeText, { color: lowStockAlertCount > 0 ? '#DC2626' : '#16A34A' }]}>STOCK</Text>
                      </View>
                    </View>
                    <Text style={styles.liveOpsVal}>{lowStockAlertCount} Items</Text>
                    <Text style={styles.liveOpsLabel}>Reorder Alert</Text>
                    <View style={styles.liveOpsFoot}>
                      <Text style={styles.liveOpsFootText}>{lowStockAlertCount > 0 ? 'Refill inventory →' : 'Healthy inventory →'}</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </FadeInSection>

        {/* ── Metric Cards ────────────────────────────────────────── */}
        <FadeInSection delay={100}>
          <View style={styles.metricsGrid}>
            {metrics.map((m, idx) => (
              <GradientMetricCard key={idx} config={m} />
            ))}
          </View>
        </FadeInSection>
 
        {/* ── Shop Mode Adaptive Console Widget ──────────────────── */}
        <FadeInSection delay={150}>
          {renderShopModeWidget()}
        </FadeInSection>

        {/* ── Store Persona Quick Launch (Tailored Retail vs Restaurant Operations) ── */}
        <FadeInSection delay={175}>
          <View style={styles.quickLaunchContainer}>
            <View style={styles.quickLaunchHeader}>
              <View>
                <Text style={styles.quickLaunchTitle}>
                  {posBusinessMode === 'retail' 
                    ? 'Retail POS Operations' 
                    : posBusinessMode === 'wholesale' 
                    ? 'Wholesale & B2B Operations' 
                    : posBusinessMode === 'restaurant' 
                    ? 'Café & Restaurant Operations' 
                    : 'BharatPOS Enterprise Suite'}
                </Text>
                <Text style={styles.quickLaunchSubtitle}>
                  {posBusinessMode === 'retail' 
                    ? 'One-touch access to barcode billing, product catalog, barcode studio & GST' 
                    : posBusinessMode === 'wholesale' 
                    ? 'One-touch access to B2B orders, credit limits, suppliers & multi-godowns' 
                    : posBusinessMode === 'restaurant' 
                    ? 'One-touch access to table floor, kitchen KDS, food menu & floor captains' 
                    : 'Unified access to billing, kitchen, wholesale & reports'}
                </Text>
              </View>
              <View style={[styles.proPill, { 
                backgroundColor: posBusinessMode === 'restaurant' 
                  ? '#F3E8FF' 
                  : posBusinessMode === 'wholesale' 
                  ? '#DBEAFE' 
                  : '#DCFCE7' 
              }]}>
                <Icon 
                  name="lightning-bolt" 
                  size={14} 
                  color={
                    posBusinessMode === 'restaurant' 
                      ? '#7C3AED' 
                      : posBusinessMode === 'wholesale' 
                      ? '#2563EB' 
                      : '#16A34A'
                  } 
                />
                <Text style={[styles.proPillText, { 
                  color: posBusinessMode === 'restaurant' 
                    ? '#7C3AED' 
                    : posBusinessMode === 'wholesale' 
                    ? '#2563EB' 
                    : '#16A34A' 
                }]}>SHORTCUTS</Text>
              </View>
            </View>

            <View style={styles.quickLaunchGrid}>
              {(posBusinessMode === 'restaurant' ? [
                { title: 'Tables & KOT', desc: 'Dine-in floor plan', icon: 'silverware-fork-knife', color: '#7C3AED', bg: '#F3E8FF', route: '/(owner)/tables_kot' },
                { title: 'Kitchen KDS', desc: 'Live chef prep station', icon: 'chef-hat', color: '#D97706', bg: '#FEF3C7', route: '/(owner)/kds' },
                { title: 'Food Menu', desc: 'Add dishes & pricing', icon: 'silverware-clean', color: '#059669', bg: '#D1FAE5', route: '/(owner)/products_management' },
                { title: 'Floor Captains', desc: 'Staff shifts & payroll', icon: 'badge-account-horizontal-outline', color: '#4F46E5', bg: '#EEF2FF', route: '/(owner)/attendance' },
                { title: 'Restaurant Day Book', desc: 'Daily cash & UPI register', icon: 'book-open-page-variant-outline', color: '#0284C7', bg: '#E0F2FE', route: '/(owner)/day_book' },
                { title: 'Dining Sales & P&L', desc: 'Food profit & margins', icon: 'chart-line', color: '#16A34A', bg: '#DCFCE7', route: '/(owner)/profit_loss' },
                { title: 'Kitchen SOPs', desc: 'Opening / closing checklist', icon: 'clipboard-check-outline', color: '#D97706', bg: '#FEF3C7', route: '/(owner)/tasks' },
                { title: 'Shop Settings', desc: 'Configure store & profile', icon: 'cog-outline', color: '#64748B', bg: '#F1F5F9', route: '/(owner)/settings' },
              ] : posBusinessMode === 'wholesale' ? [
                { title: 'Wholesale B2B Orders', desc: 'Sales orders & quotations', icon: 'warehouse', color: '#2563EB', bg: '#DBEAFE', route: '/(owner)/wholesale' },
                { title: 'B2B Customers & Khata', desc: 'Credit limits & payments', icon: 'account-group', color: '#16A34A', bg: '#DCFCE7', route: '/(owner)/wholesale' },
                { title: 'Suppliers & POs', desc: 'Procurement & GRN stock', icon: 'truck-delivery-outline', color: '#059669', bg: '#D1FAE5', route: '/(owner)/suppliers' },
                { title: 'B2B Price Lists & SKUs', desc: 'Tiered wholesale rates', icon: 'tag-multiple', color: '#7C3AED', bg: '#EDE9FE', route: '/(owner)/products_management' },
                { title: 'Warehouse Stock', desc: 'Multi-godown breakdown', icon: 'domain', color: '#0284C7', bg: '#E0F2FE', route: '/(owner)/inventory' },
                { title: 'Double-Entry Day Book', desc: 'Daily voucher transactions', icon: 'book-open-page-variant-outline', color: '#4F46E5', bg: '#EEF2FF', route: '/(owner)/day_book' },
                { title: 'GST Tax Invoices', desc: 'B2B tax invoices & GSTR', icon: 'file-percent-outline', color: '#D97706', bg: '#FEF3C7', route: '/(owner)/gst_management' },
                { title: 'Wholesale Settings', desc: 'Store profile & policies', icon: 'cog-outline', color: '#64748B', bg: '#F1F5F9', route: '/(owner)/settings' },
              ] : posBusinessMode === 'retail' ? [
                { title: 'Barcode Billing POS', desc: 'Fast scanner checkout', icon: 'barcode-scan', color: '#16A34A', bg: '#DCFCE7', route: '/(owner)/pos_billing' },
                { title: 'Product Catalog', desc: 'Add & price SKU items', icon: 'package-variant-closed', color: '#059669', bg: '#D1FAE5', route: '/(owner)/products_management' },
                { title: 'Inventory & Godowns', desc: 'Multi-location stock', icon: 'clipboard-list-outline', color: '#7C3AED', bg: '#EDE9FE', route: '/(owner)/inventory' },
                { title: 'Barcode Studio', desc: 'Print custom labels & tags', icon: 'barcode', color: '#2563EB', bg: '#DBEAFE', route: '/(owner)/barcode_generator' },
                { title: 'Low Stock Reorders', desc: 'Inventory replenishment alerts', icon: 'alert-circle-outline', color: '#DC2626', bg: '#FEE2E2', route: '/(owner)/reorder_list' },
                { title: 'Cashier Shifts', desc: 'Counter staff & payroll', icon: 'badge-account-horizontal-outline', color: '#4F46E5', bg: '#EEF2FF', route: '/(owner)/attendance' },
                { title: 'Day Book Register', desc: 'Daily cash & UPI register', icon: 'book-open-page-variant-outline', color: '#0284C7', bg: '#E0F2FE', route: '/(owner)/day_book' },
                { title: 'GST Returns (GSTR)', desc: 'GSTR-1 & tax compliance', icon: 'file-percent-outline', color: '#D97706', bg: '#FEF3C7', route: '/(owner)/gst_management' },
              ] : [
                { title: 'POS Billing', desc: 'Fast barcode register', icon: 'barcode-scan', color: '#16A34A', bg: '#DCFCE7', route: '/(owner)/pos_billing' },
                { title: 'Wholesale B2B', desc: 'Bulk sales & credit orders', icon: 'warehouse', color: '#2563EB', bg: '#DBEAFE', route: '/(owner)/wholesale' },
                { title: 'Tables & KOT', desc: 'Dine-in floor plan', icon: 'silverware-fork-knife', color: '#7C3AED', bg: '#F3E8FF', route: '/(owner)/tables_kot' },
                { title: 'Kitchen KDS', desc: 'Live prep station', icon: 'chef-hat', color: '#D97706', bg: '#FEF3C7', route: '/(owner)/kds' },
                { title: 'Suppliers & POs', desc: 'Procurement & GRN stock', icon: 'truck-delivery-outline', color: '#059669', bg: '#D1FAE5', route: '/(owner)/suppliers' },
                { title: 'Product Catalog', desc: 'Add & price items', icon: 'package-variant-plus', color: '#059669', bg: '#D1FAE5', route: '/(owner)/products_management' },
                { title: 'Inventory & Godowns', desc: 'Multi-location stock', icon: 'domain', color: '#7C3AED', bg: '#EDE9FE', route: '/(owner)/inventory' },
                { title: 'Barcode Studio', desc: 'Print custom labels', icon: 'barcode', color: '#2563EB', bg: '#DBEAFE', route: '/(owner)/barcode_generator' },
              ]).map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickLaunchItem}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.quickLaunchIcon, { backgroundColor: item.bg }]}>
                    <Icon name={item.icon} size={22} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quickLaunchItemTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.quickLaunchItemDesc} numberOfLines={1}>{item.desc}</Text>
                  </View>
                  <Icon name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </FadeInSection>
 
        {/* ── Chart + Recent Activity Row ─────────────────────────── */}
        <View style={styles.bottomRow}>
          {/* Sales Chart */}
          <FadeInSection delay={200}>
            <Card style={[styles.chartCard, { minWidth: screenWidth <= 600 ? '100%' : 500 }]} elevation={0}>
              <Card.Content>
                <View style={styles.chartHeader}>
                  <View>
                    <Text style={styles.chartTitle}>Sales Overview</Text>
                    <Text style={styles.chartSubtitle}>Last 7 days performance</Text>
                  </View>
                  <View style={styles.chartLegend}>
                    <View style={styles.legendDot} />
                    <Text style={styles.legendText}>Revenue (₹)</Text>
                  </View>
                </View>
                {(!chartData.length || chartData.every(val => val === 0)) ? (
                  <View style={{ height: 240, justifyContent: 'center', alignItems: 'center', backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderRadius: 16, marginVertical: 8 }}>
                    <Icon name="chart-line-variant" size={48} color="#94a3b8" style={{ marginBottom: 8 }} />
                    <Text style={{ color: appTheme.colors.onSurfaceVariant, fontWeight: '600' }}>No Data Available</Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <LineChart
                      data={{
                        labels: chartLabels.length ? chartLabels : ["No Data"],
                        datasets: [{ data: chartData.length ? chartData : [0] }]
                      }}
                      width={Math.max(screenWidth - 380, 720)}
                      height={240}
                      withDots={true}
                      withInnerLines={false}
                      withOuterLines={false}
                      withVerticalLines={false}
                      withHorizontalLines={false}
                      withShadow={true}
                      fromZero={false}
                      yAxisLabel="₹"
                      yAxisSuffix=""
                      chartConfig={{
                        backgroundColor: "#ffffff",
                        backgroundGradientFrom: "#ffffff",
                        backgroundGradientTo: "#ffffff",
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                        style: { borderRadius: 12 },
                        propsForDots: { r: "4", strokeWidth: "2", stroke: "#16A34A", fill: "#fff" },
                        propsForBackgroundLines: { stroke: '#F3F4F6', strokeDasharray: '' },
                        fillShadowGradientFrom: '#16A34A',
                        fillShadowGradientTo: '#ffffff',
                        fillShadowGradientFromOpacity: 0.1,
                        fillShadowGradientToOpacity: 0,
                      }}
                      bezier
                      style={{ marginVertical: 8, borderRadius: 16 }}
                    />
                  </ScrollView>
                )}
              </Card.Content>
            </Card>
          </FadeInSection>
 
          {/* Recent Activity + Top Selling Column */}
          <View style={[styles.rightColumn, { minWidth: screenWidth <= 600 ? '100%' : 320 }]}>
            {/* Recent Activity Feed */}
            <FadeInSection delay={300}>
              <Card style={styles.activityCard} elevation={0}>
                <Card.Content>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <Icon name="history" size={18} color="#999" />
                  </View>
                  {recentActivity.length > 0 ? (
                    recentActivity.map((item) => (
                      <View key={item.id} style={styles.activityItem}>
                        <View style={[styles.activityIcon, { backgroundColor: item.color + '18' }]}>
                          <Icon name={item.icon} size={16} color={item.color} />
                        </View>
                        <View style={styles.activityContent}>
                          <Text style={styles.activityText} numberOfLines={2}>{item.text}</Text>
                          <Text style={styles.activityTime}>{item.time}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <Text style={{ color: appTheme.colors.onSurfaceVariant, fontSize: 13, fontStyle: 'italic' }}>No Data Available</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            </FadeInSection>

            {/* Top Selling Products */}
            <FadeInSection delay={400}>
              <Card style={styles.topSellingCard} elevation={0}>
                <Card.Content>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Top Selling Products</Text>
                  </View>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, { flex: 0.3 }]}>#</Text>
                    <Text style={[styles.tableHeaderText, { flex: 2 }]}>Product</Text>
                    <Text style={[styles.tableHeaderText, { flex: 0.6, textAlign: 'center' }]}>Qty</Text>
                    <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                  </View>
                  {topSellingProducts.length > 0 ? (
                    topSellingProducts.map((p) => (
                      <View key={p.rank} style={styles.tableRow}>
                        <View style={[styles.rankBadge, p.rank <= 3 && { backgroundColor: p.rank === 1 ? '#FFF8E1' : p.rank === 2 ? '#F3E5F5' : '#E8F5E9' }]}>
                          <Text style={[styles.rankText, p.rank <= 3 && { color: p.rank === 1 ? '#F57F17' : p.rank === 2 ? '#7B1FA2' : '#2E7D32' }]}>{p.rank}</Text>
                        </View>
                        <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{p.name}</Text>
                        <Text style={[styles.tableCell, { flex: 0.6, textAlign: 'center', fontWeight: '600' }]}>{p.qty}</Text>
                        <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700', color: appTheme.colors.onSurface }]}>₹{p.revenue.toLocaleString('en-IN')}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <Text style={{ color: appTheme.colors.onSurfaceVariant, fontSize: 13, fontStyle: 'italic' }}>No Data Available</Text>
                    </View>
                  )}
                </Card.Content>
              </Card>
            </FadeInSection>
          </View>
        </View>

      </View>

      {/* Floating AI Voice Assistant Button */}
      <TouchableOpacity
        style={styles.floatingAiFab}
        onPress={() => setShowAssistantModal(true)}
        activeOpacity={0.85}
      >
        <Icon name="robot-happy" size={24} color="#FFFFFF" />
        <View style={styles.floatingAiPulse} />
      </TouchableOpacity>

      {/* POS Conversational AI Assistant Modal */}
      <POSAssistantModal
        visible={showAssistantModal}
        onClose={() => setShowAssistantModal(false)}
        products={products}
        contextData={{
          todaySales: salesValue,
          todayBills: ordersValue,
        }}
      />
    </ScrollView>
  );
}

// ── Premium Metric Card Component ──────────────────────────────────────
const GradientMetricCard = ({ config }: { config: MetricConfig }) => {
  const displayValue = useAnimatedCounter(config.value, 1400);
  const formatted = config.prefix
    ? `${config.prefix}${displayValue.toLocaleString('en-IN')}`
    : displayValue.toLocaleString('en-IN');

  return (
    <View style={styles.metricCardWrapper}>
      <Card style={styles.metricCard} elevation={0}>
        <Card.Content style={styles.metricCardContent}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricTitle}>{config.title}</Text>
            <View style={[styles.metricIconCircle, { backgroundColor: config.bgColor }]}>
              <Icon name={config.icon} size={16} color={config.color} />
            </View>
          </View>
          <View style={styles.metricBody}>
            <Text style={styles.metricValue}>{formatted}</Text>
            {config.changeText && (
              <Text style={[styles.metricChangeText, { color: config.changeColor || '#6B7280' }]}>
                {config.changeText}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.colors.surfaceBg },
  content: { padding: DS.space.lg },

  // Greeting
  greetingContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: DS.space.xl },
  greetingText: { fontSize: DS.font.h1.fontSize, fontWeight: DS.font.h1.fontWeight, letterSpacing: DS.font.h1.letterSpacing, color: DS.colors.text },
  greetingSubtext: { fontSize: DS.font.body.fontSize, marginTop: DS.space.xs, color: DS.colors.textSecondary },
  greetingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: DS.radius.full, backgroundColor: '#F0FDF4' },
  greetingBadgeText: { marginLeft: 6, fontSize: DS.font.caption.fontSize, fontWeight: DS.font.caption.fontWeight, color: DS.colors.brand },

  // Metrics Grid
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: DS.space.md, marginBottom: DS.space.lg },
  metricCardWrapper: { flexGrow: 1, flexBasis: '22%', minWidth: 220, maxWidth: 320 },
  metricCard: { borderRadius: 12, backgroundColor: DS.colors.cardBg, borderWidth: 1, borderColor: DS.colors.border },
  metricCardContent: { padding: 16, minHeight: 110, justifyContent: 'space-between' },
  metricCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  metricIconCircle: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricBody: { gap: 2 },
  metricValue: { fontSize: 24, fontWeight: '700', color: DS.colors.text },
  metricTitle: { fontSize: 13, fontWeight: '500', color: DS.colors.textSecondary },
  metricChangeText: { fontSize: 12, fontWeight: '600' },

  // Bottom Row
  bottomRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  rightColumn: { flex: 1, minWidth: 320, gap: 20 },

  // Chart
  chartCard: { flex: 2, minWidth: 500, borderRadius: 12, backgroundColor: DS.colors.cardBg, borderWidth: 1, borderColor: DS.colors.border },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  chartTitle: { fontSize: DS.font.h3.fontSize, fontWeight: DS.font.h3.fontWeight, color: DS.colors.text },
  chartSubtitle: { fontSize: DS.font.caption.fontSize, marginTop: 2, color: DS.colors.textSecondary },
  chartLegend: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6, backgroundColor: DS.colors.brand },
  legendText: { fontSize: DS.font.caption.fontSize, color: DS.colors.textSecondary },

  // Section Headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: DS.font.h3.fontSize, fontWeight: DS.font.h3.fontWeight, color: DS.colors.text },

  // Activity Feed
  activityCard: { borderRadius: 12, backgroundColor: DS.colors.cardBg, borderWidth: 1, borderColor: DS.colors.border },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  activityIcon: { width: 34, height: 34, borderRadius: DS.radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, lineHeight: 18, color: DS.colors.text },
  activityTime: { fontSize: DS.font.caption.fontSize, marginTop: 3, color: DS.colors.textMuted },

  // Top Selling
  topSellingCard: { borderRadius: 12, backgroundColor: DS.colors.cardBg, borderWidth: 1, borderColor: DS.colors.border },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: DS.colors.border, marginBottom: 4 },
  tableHeaderText: { fontSize: DS.font.label.fontSize, fontWeight: DS.font.label.fontWeight, textTransform: 'uppercase', letterSpacing: DS.font.label.letterSpacing, color: DS.colors.textSecondary },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DS.colors.borderLight },
  rankBadge: { width: 26, height: 26, borderRadius: DS.radius.sm, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankText: { fontSize: DS.font.caption.fontSize, fontWeight: '700' },
  tableCell: { fontSize: 13, color: DS.colors.text },

  // Shop Mode Card styles
  modeCard: { borderRadius: 12, backgroundColor: DS.colors.cardBg, borderWidth: 1, borderColor: DS.colors.border, padding: 20, marginBottom: 24 },
  modeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  modeCardTitle: { fontSize: 16, fontWeight: '800', color: DS.colors.text },
  modeCardSubtitle: { fontSize: DS.font.label.fontSize, fontWeight: '600', marginTop: 2, color: DS.colors.textSecondary },
  modeCardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 16, color: DS.colors.textSecondary },
  modeActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: DS.radius.sm, borderWidth: 1, borderColor: DS.colors.border, backgroundColor: DS.colors.cardBg },
  modeActionText: { fontSize: DS.font.label.fontSize, fontWeight: '700', color: DS.colors.textSecondary },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: DS.radius.md, borderLeftWidth: 4, borderLeftColor: DS.colors.brand, backgroundColor: DS.colors.brandLight },
  syncText: { fontSize: 12, fontWeight: '700', color: DS.colors.brand },
  modeIconCircle: { width: 42, height: 42, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center' },

  // AI Copilot Banner & Floating Button
  aiCopilotBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  aiCopilotLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  aiCopilotIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCopilotTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  aiNewPill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiNewPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  aiCopilotSub: {
    fontSize: 12,
    marginTop: 2,
  },
  aiMicBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  floatingAiFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  floatingAiPulse: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  // Store POS Business Mode Engine
  businessModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  modeIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  switchModeLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  switchModeLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  businessModeWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  businessModeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  businessModeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  businessModeSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  businessModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  engineCard: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  engineCardActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  engineIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  engineDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  activePill: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ── Dynamic Live Operations Radar Styles ──
  liveOpsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  liveOpsHeader: {
    marginBottom: 16,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveOpsHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  liveTagPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  liveTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  liveOpsSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 4,
  },
  liveOpsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  liveOpsCard: {
    flexGrow: 1,
    flexBasis: '23%',
    minWidth: 220,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  liveOpsCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveOpsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  microBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveOpsVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  liveOpsLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  liveOpsFoot: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  liveOpsFootText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },

  // ── Quick Launch Operations Styles ──
  quickLaunchContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  quickLaunchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  quickLaunchTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  quickLaunchSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 3,
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  proPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  quickLaunchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickLaunchItem: {
    flexGrow: 1,
    flexBasis: '23%',
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickLaunchIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLaunchItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickLaunchItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  headerActionOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  headerActionOutlineText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  headerActionSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#16A34A',
  },
  headerActionSolidText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modeIndicatorPillMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeIndicatorTextMinimal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
});
