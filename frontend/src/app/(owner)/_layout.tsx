import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Animated, useWindowDimensions, ActivityIndicator, TextInput as RNTextInput } from 'react-native';
import { Text, Divider, useTheme, IconButton, Avatar, Surface, Badge, Button, TextInput, Portal } from 'react-native-paper';
import { Slot, router, usePathname } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth, isFirebaseConfigured, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../providers/AuthProvider';
import { collection, query, onSnapshot } from '../../lib/firestore_adapter';
import { DS } from '../../constants/designTokens';

interface MenuItemDef {
  name: string;
  icon: string;
  path: string;
  isGstOnly?: boolean;
  badge?: string;
  badgeColor?: string;
  mode?: 'retail' | 'wholesale' | 'restaurant' | 'all';
}

interface MenuSection {
  title: string;
  items: MenuItemDef[];
}

const retailMenuItems: MenuItemDef[] = [
  { name: 'Dashboard', icon: 'view-dashboard-outline', path: '/(owner)', mode: 'all' },
  { name: 'Billing', icon: 'receipt-text-outline', path: '/(owner)/pos_billing', mode: 'retail' },
  { name: 'Products', icon: 'package-variant-closed', path: '/(owner)/products_management', mode: 'retail' },
  { name: 'Inventory', icon: 'clipboard-list-outline', path: '/(owner)/inventory', mode: 'retail' },
  { name: 'Purchases', icon: 'cart-arrow-down', path: '/(owner)/suppliers', mode: 'wholesale' },
  { name: 'Suppliers', icon: 'truck-delivery-outline', path: '/(owner)/suppliers', mode: 'wholesale' },
  { name: 'Customers', icon: 'account-group-outline', path: '/(owner)/wholesale', mode: 'wholesale' },
  { name: 'Sales Orders', icon: 'file-document-outline', path: '/(owner)/wholesale', mode: 'wholesale' },
  { name: 'Accounting', icon: 'book-open-page-variant-outline', path: '/(owner)/day_book', mode: 'all' },
  { name: 'GST', icon: 'file-percent-outline', path: '/(owner)/gst_management', isGstOnly: true, mode: 'all' },
  { name: 'Reports', icon: 'chart-box-outline', path: '/(owner)/reports', mode: 'all' },
  { name: 'Settings', icon: 'cog-outline', path: '/(owner)/settings', mode: 'all' },
];

const restaurantMenuItems: MenuItemDef[] = [
  { name: 'Dashboard', icon: 'view-dashboard-outline', path: '/(owner)', mode: 'all' },
  { name: 'Tables', icon: 'table-furniture', path: '/(owner)/tables_kot', mode: 'restaurant' },
  { name: 'Orders', icon: 'clipboard-text-clock-outline', path: '/(owner)/pos_billing', mode: 'restaurant' },
  { name: 'Menu', icon: 'silverware-clean', path: '/(owner)/products_management', mode: 'restaurant' },
  { name: 'Kitchen Display', icon: 'chef-hat', path: '/(owner)/kds', mode: 'restaurant' },
  { name: 'Inventory', icon: 'clipboard-list-outline', path: '/(owner)/inventory', mode: 'restaurant' },
  { name: 'Customers', icon: 'account-group-outline', path: '/(owner)/wholesale', mode: 'restaurant' },
  { name: 'Billing', icon: 'receipt-text-outline', path: '/(owner)/pos_billing', mode: 'restaurant' },
  { name: 'Reports', icon: 'chart-box-outline', path: '/(owner)/reports', mode: 'all' },
  { name: 'Settings', icon: 'cog-outline', path: '/(owner)/settings', mode: 'all' },
];

// ── Live Clock Hook ────────────────────────────────────────────────────
function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30000); // update every 30s
    return () => clearInterval(id);
  }, []);
  const dateStr = time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { dateStr, timeStr };
}

// ── Sidebar Menu Item with hover ───────────────────────────────────────
const MenuItem = ({ item, isActive, onPress }: { item: MenuItemDef; isActive: boolean; onPress: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        isActive && styles.menuItemActive,
        isHovered && !isActive && styles.menuItemHover,
      ]}
      onPress={onPress}
      // @ts-ignore - web only
      onMouseEnter={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      // @ts-ignore
      onMouseLeave={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, isActive && styles.menuIconActiveContainer]}>
        <Icon name={item.icon} size={18} color={isActive ? '#FFFFFF' : isHovered ? '#FFFFFF' : '#94A3B8'} />
      </View>
      <Text style={[styles.menuText, isActive && styles.menuTextActive, isHovered && !isActive && { color: '#FFFFFF' }]}>
        {item.name}
      </Text>
      {item.badge && (
        <View style={[styles.menuBadgePill, { backgroundColor: item.badgeColor ? `${item.badgeColor}15` : '#1E293B' }]}>
          <Text style={[styles.menuBadgeText, { color: item.badgeColor || '#94A3B8' }]}>{item.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Main Layout ────────────────────────────────────────────────────────
export default function OwnerLayout() {
  const pathname = usePathname();
  const theme = useTheme();
  const { dateStr, timeStr } = useLiveClock();
  
  const { user, isTrialExpired, loading } = useAuth();
  let userName = user?.displayName || user?.email?.split('@')[0] || 'Store Owner';
  // Capitalize first letter if it's from email
  if (userName.length > 0 && user?.email && userName === user.email.split('@')[0]) {
    userName = userName.charAt(0).toUpperCase() + userName.slice(1);
  }
  const initial = (user?.email?.[0] || userName.charAt(0)).toUpperCase();
  
  const [storeName, setStoreName] = useState('BharatPOS');
  const [shopMode, setShopMode] = useState('Mobile Only');
  const { width: screenWidth } = useWindowDimensions();
  const [isGstRegistered, setIsGstRegistered] = useState(true);

  const [posBusinessMode, setPosBusinessMode] = useState<'retail' | 'wholesale' | 'restaurant' | 'hybrid'>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return (window.localStorage.getItem('posBusinessMode') as any) || 'retail';
    }
    return 'retail';
  });

  useEffect(() => {
    const handleModeUpdate = () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const m = (window.localStorage.getItem('posBusinessMode') as any) || 'retail';
        setPosBusinessMode(m);
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('posBusinessModeChanged', handleModeUpdate);
      return () => window.removeEventListener('posBusinessModeChanged', handleModeUpdate);
    }
  }, []);

  // Announcement/Notification state & synchronization
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const formatAlertTime = (createdAt: any) => {
    if (!createdAt) return '';
    let date: Date;
    if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else {
      date = new Date(createdAt);
    }
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    }) + ', ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setNotifications([]);
      setNotificationCount(0);
      return;
    }

    const q = query(collection(db, 'broadcast_alerts'));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const list: any[] = [];
      snapshot.docs.forEach((doc: any) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds : (typeof a.createdAt === 'number' ? a.createdAt / 1000 : 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds : (typeof b.createdAt === 'number' ? b.createdAt / 1000 : 0);
        return timeB - timeA;
      });
      setNotifications(list);
      setNotificationCount(list.length);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const mode = window.localStorage.getItem('shopMode');
      if (mode) setShopMode(mode);
    }
  }, []);

  useEffect(() => {
    const updateFromStorage = () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const gstReg = window.localStorage.getItem('isGstRegistered');
        if (gstReg !== null) {
          setIsGstRegistered(gstReg !== 'false');
        }
        const storedName = window.localStorage.getItem('storeName');
        setStoreName(storedName || 'BharatPOS');
      }
    };

    updateFromStorage();

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('storeNameUpdated', updateFromStorage);
      return () => {
        window.removeEventListener('storeNameUpdated', updateFromStorage);
      };
    }
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          router.push('/(owner)/products_management');
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  const isLaptopLocked = false;

  const [isSidebarOpen, setIsSidebarOpen] = useState(screenWidth > 800);
  const lastWidthRef = useRef(screenWidth);

  useEffect(() => {
    if (screenWidth > 800 && lastWidthRef.current <= 800) {
      setIsSidebarOpen(true);
    }
    if (screenWidth <= 800 && lastWidthRef.current > 800) {
      setIsSidebarOpen(false);
    }
    lastWidthRef.current = screenWidth;
  }, [screenWidth]);

  const sidebarAnim = useRef(new Animated.Value(screenWidth > 800 ? 260 : 0)).current;

  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: isSidebarOpen ? 260 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isSidebarOpen]);

  const handleLogout = async () => {
    try {
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.removeItem('ownerBypass');
        window.localStorage.removeItem('cachedUserUid');
        window.localStorage.removeItem('cachedUserRole');
        window.localStorage.removeItem('cachedUserPlan');
        window.localStorage.removeItem('cachedTenantId');
        window.localStorage.removeItem('cachedPermissions');
        window.localStorage.clear();
      }
    } catch (error) {
      console.error("Firebase logout error:", error);
    }
    router.replace('/');
  };

  const handleNav = (path: any) => {
    router.push(path);
    if (screenWidth <= 800) {
      setIsSidebarOpen(false);
    }
  };

  if (loading && Platform.OS !== 'web') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{ marginTop: 12, color: '#64748B', fontWeight: '600' }}>Loading BharatPOS...</Text>
      </View>
    );
  }

  const isUpgradePage = pathname?.includes('upgrade');
  if (isTrialExpired && !isUpgradePage) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Surface style={{ width: '100%', maxWidth: 500, padding: 40, borderRadius: 20, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#FECACA' }} elevation={4}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Icon name="clock-alert-outline" size={32} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#7F1D1D', textAlign: 'center', marginBottom: 12 }}>Subscription Expired</Text>
          <Text style={{ fontSize: 15, color: '#991B1B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
            Your subscription has expired. Please renew your plan to regain full access to your business dashboard, inventory, and accounting.
          </Text>
          <Button 
            mode="contained" 
            buttonColor="#16A34A" 
            labelStyle={{ fontWeight: 'bold' }} 
            style={{ width: '100%', borderRadius: 10, paddingVertical: 6 }} 
            onPress={() => router.push('/(owner)/upgrade' as any)}
          >
            Renew Subscription Now
          </Button>
          <Button 
            mode="text" 
            textColor="#EF4444" 
            style={{ marginTop: 12 }} 
            onPress={handleLogout}
          >
            Logout
          </Button>
        </Surface>
      </View>
    );
  }

  if (isLaptopLocked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Surface style={{ width: '100%', maxWidth: 500, padding: 40, borderRadius: 20, alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' }} elevation={4}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Icon name="laptop-off" size={32} color="#EF4444" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center', marginBottom: 12 }}> Laptop Terminal Locked</Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
            Your account is currently on the <Text style={{ fontWeight: 'bold', color: '#D81B60' }}>Small Vendor Plan (Mobile-Only)</Text>.<br/>
            Dashboard access on desktop web browsers is disabled. To unlock laptop access and synchronize worker phones, upgrade to the Growth plan.
          </Text>
          <Button 
            mode="contained" 
            buttonColor="#16A34A" 
            labelStyle={{ fontWeight: 'bold' }} 
            style={{ width: '100%', borderRadius: 10, paddingVertical: 6 }} 
            onPress={() => router.push('/(owner)/upgrade' as any)}
          >
            Upgrade Subscription Plan
          </Button>
          <TouchableOpacity 
            style={{ marginTop: 16 }} 
            onPress={() => {
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                window.localStorage.setItem('shopMode', 'Laptop + Mobile');
                window.location.reload();
              }
            }}
          >
            <Text style={{ color: '#16A34A', fontWeight: 'bold', fontSize: 13 }}>Simulate Medium Shop Plan</Text>
          </TouchableOpacity>
        </Surface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isSidebarOpen && screenWidth <= 800 && (
        <TouchableOpacity style={styles.overlay} onPress={() => setIsSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <Animated.View style={[
        styles.sidebar,
        { width: sidebarAnim },
        screenWidth <= 800 && isSidebarOpen && { position: 'absolute', zIndex: 100, width: 240 },
        !isSidebarOpen && { width: 0, overflow: 'hidden' },
      ]}>
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIconContainer}>
            <Icon name="fire" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.logoTextContainer}>
            <Text style={styles.logoText} numberOfLines={1}>BharatPOS</Text>
            <Text style={styles.logoSubtext}>Retail · Wholesale · Restaurant</Text>
          </View>
        </View>

        <Divider style={{ backgroundColor: '#1E293B', marginHorizontal: 12, marginBottom: 8 }} />

        {/* Menu */}
        <ScrollView style={styles.sidebarMenu} showsVerticalScrollIndicator={false}>
          {(posBusinessMode === 'restaurant' ? restaurantMenuItems : retailMenuItems).map((item, idx) => {
            const isActive = pathname === item.path || (item.path === '/(owner)' && (pathname === '/(owner)' || pathname === '/(owner)/'));
            return (
              <MenuItem key={idx} item={item} isActive={isActive} onPress={() => handleNav(item.path)} />
            );
          })}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Bottom Branch Card */}
        <View style={styles.branchBottomCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="storefront-outline" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
              <Text style={styles.branchNameText}>
                {posBusinessMode === 'restaurant' ? 'Sunrise Cafe' : 'Main Branch'}
              </Text>
            </View>
            <Icon name="chevron-down" size={14} color="#64748B" />
          </View>
          <Text style={styles.branchLocationText}>
            {posBusinessMode === 'restaurant' ? 'Main Outlet' : 'Gujarat, India'}
          </Text>
          <View style={styles.onlineStatusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        {/* Bottom Profile Card */}
        <View style={styles.profileBottomCard}>
          <Avatar.Text
            size={32}
            label={posBusinessMode === 'restaurant' ? 'CW' : 'RK'}
            style={{ backgroundColor: posBusinessMode === 'restaurant' ? '#EA580C' : '#2563EB' }}
            labelStyle={{ fontSize: 11, fontWeight: '700' }}
          />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={styles.profileBottomName} numberOfLines={1}>
              {posBusinessMode === 'restaurant' ? 'Chef/Walter' : 'Ramesh Kumar'}
            </Text>
            <Text style={styles.profileBottomRole}>
              {posBusinessMode === 'restaurant' ? 'Staff' : 'Owner'}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Main Content ────────────────────────────────────────── */}
      <View style={styles.main}>
        <Surface style={[styles.topBar, posBusinessMode === 'restaurant' && styles.topBarDark]} elevation={0}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity
              style={[styles.menuToggle, posBusinessMode === 'restaurant' && styles.menuToggleDark]}
              onPress={() => setIsSidebarOpen(!isSidebarOpen)}
              activeOpacity={0.7}
            >
              <Icon name={isSidebarOpen ? 'menu-open' : 'menu'} size={20} color={posBusinessMode === 'restaurant' ? '#94A3B8' : '#333'} />
            </TouchableOpacity>

            {/* Brand Mark in Top Bar */}
            {screenWidth > 850 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10, marginRight: 14 }}>
                <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="infinity" size={17} color="#FFFFFF" />
                </View>
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: posBusinessMode === 'restaurant' ? '#FFFFFF' : '#0F172A', letterSpacing: -0.3 }}>BharatPOS</Text>
                  <Text style={{ fontSize: 8.5, color: posBusinessMode === 'restaurant' ? '#94A3B8' : '#64748B', fontWeight: '500' }}>Smart POS for Every Business</Text>
                </View>
              </View>
            )}

            {/* Mode Switcher Pill */}
            <TouchableOpacity 
              style={[styles.modePillBtn, posBusinessMode === 'restaurant' && styles.modePillBtnDark]}
              activeOpacity={0.8}
              onPress={() => {
                const nextMode = posBusinessMode === 'restaurant' ? 'retail' : 'restaurant';
                setPosBusinessMode(nextMode);
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('posBusinessMode', nextMode);
                  window.dispatchEvent(new Event('posBusinessModeChanged'));
                }
                if (nextMode === 'restaurant') router.push('/(owner)/tables_kot' as any);
                else router.push('/(owner)/pos_billing' as any);
              }}
            >
              <Icon 
                name={posBusinessMode === 'restaurant' ? 'coffee' : 'barcode-scan'} 
                size={14} 
                color="#F97316" 
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.modePillBtnText, posBusinessMode === 'restaurant' && { color: '#F1F5F9' }]}>
                {posBusinessMode === 'restaurant' ? 'Cafe Mode' : 'Retail Mode'}
              </Text>
              <Icon name="chevron-down" size={13} color={posBusinessMode === 'restaurant' ? '#94A3B8' : '#64748B'} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </View>

          {/* Center Category & Mode Tabs (Image 2 Matching) */}
          {screenWidth > 1024 && (
            <View style={styles.topNavCenterTabs}>
              <TouchableOpacity onPress={() => router.push('/(owner)/pos_billing')} style={styles.topNavTabItem}>
                <Text style={[styles.topNavTabText, pathname.includes('pos_billing') && styles.topNavTabTextActive]}>Retail</Text>
              </TouchableOpacity>
              <Text style={styles.topNavTabDivider}>|</Text>
              <TouchableOpacity onPress={() => router.push('/(owner)/wholesale')} style={styles.topNavTabItem}>
                <Text style={[styles.topNavTabText, pathname.includes('wholesale') && styles.topNavTabTextActive]}>Wholesale</Text>
              </TouchableOpacity>
              <Text style={styles.topNavTabDivider}>|</Text>
              <TouchableOpacity onPress={() => router.push('/(owner)/tables_kot')} style={styles.topNavTabItem}>
                <Text style={[styles.topNavTabText, pathname.includes('tables_kot') && styles.topNavTabTextActive]}>Cafe & Restaurant</Text>
              </TouchableOpacity>
              <Text style={styles.topNavTabDivider}>|</Text>
              <TouchableOpacity onPress={() => router.push('/(owner)/cash_bank_book')} style={styles.topNavTabItem}>
                <Text style={[styles.topNavTabText, (pathname.includes('cash_bank') || pathname.includes('journal') || pathname.includes('day_book')) && styles.topNavTabTextActive]}>Accounting</Text>
              </TouchableOpacity>
              <Text style={styles.topNavTabDivider}>|</Text>
              <TouchableOpacity onPress={() => router.push('/(owner)/gst_management')} style={styles.topNavTabItem}>
                <Text style={[styles.topNavTabText, pathname.includes('gst') && styles.topNavTabTextActive]}>GST</Text>
              </TouchableOpacity>
              <Text style={styles.topNavTabDivider}>|</Text>
              <TouchableOpacity onPress={() => router.push('/(owner)/reports')} style={styles.topNavTabItem}>
                <Text style={[styles.topNavTabText, pathname.includes('reports') && styles.topNavTabTextActive]}>Tally Integration</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.topBarRight}>
            {screenWidth > 1280 && (
              <Text style={styles.topBarSloganBlue}>One Platform. Complete Business.</Text>
            )}

            {posBusinessMode === 'restaurant' && (
              <View style={styles.cafeLiveClockPill}>
                <Icon name="clock-outline" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                <Text style={styles.cafeDateText}>{dateStr}   {timeStr}</Text>
              </View>
            )}

            {/* Notification Bell */}
            <View style={styles.bellContainer}>
              <TouchableOpacity
                style={[styles.bellButton, posBusinessMode === 'restaurant' && styles.bellButtonDark]}
                activeOpacity={0.7}
                onPress={() => setShowNotifications(!showNotifications)}
              >
                <Icon name={showNotifications ? "bell" : "bell-outline"} size={20} color={posBusinessMode === 'restaurant' ? "#CBD5E1" : "#555"} />
                <Badge style={styles.bellBadge} size={15}>{posBusinessMode === 'restaurant' ? 3 : 1}</Badge>
              </TouchableOpacity>

              {showNotifications && (
                <View style={[styles.dropdownContainer, posBusinessMode === 'restaurant' && { backgroundColor: '#1E293B', borderColor: '#334155' }]}>
                  <View style={[styles.dropdownHeader, posBusinessMode === 'restaurant' && { backgroundColor: '#0F172A' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Icon name="bell-ring-outline" size={16} color={posBusinessMode === 'restaurant' ? "#F97316" : "#475569"} style={{ marginRight: 6 }} />
                      <Text style={[styles.dropdownTitle, posBusinessMode === 'restaurant' && { color: '#FFFFFF' }]}>Alerts</Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowNotifications(false)}>
                      <Icon name="close" size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  <Divider style={{ backgroundColor: posBusinessMode === 'restaurant' ? '#334155' : '#E2E8F0' }} />
                  <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={true}>
                    <View style={styles.notificationItem}>
                      <View style={styles.notifIconWrap}>
                        <Icon name="check-circle-outline" size={16} color="#16A34A" />
                      </View>
                      <View style={styles.notifContent}>
                        <Text style={[styles.notifTitle, posBusinessMode === 'restaurant' && { color: '#F1F5F9' }]}>
                          {posBusinessMode === 'restaurant' ? 'KOT-1025 Ready' : 'Low Stock Alert'}
                        </Text>
                        <Text style={[styles.notifText, posBusinessMode === 'restaurant' && { color: '#94A3B8' }]}>
                          {posBusinessMode === 'restaurant' ? 'Order for Table T5 is ready for service.' : '12 products running low in Inventory.'}
                        </Text>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {screenWidth > 600 && <View style={[styles.topBarDivider, posBusinessMode === 'restaurant' && { backgroundColor: '#1E293B' }]} />}

            {/* User Avatar Menu Anchor */}
            <View style={{ position: 'relative' }}>
              <TouchableOpacity 
                style={styles.userContainer} 
                onPress={() => setShowProfileMenu(!showProfileMenu)}
                activeOpacity={0.7}
              >
                {screenWidth > 600 && (
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, posBusinessMode === 'restaurant' && { color: '#F1F5F9' }]}>
                      {posBusinessMode === 'restaurant' ? 'Chef/Walter' : 'Ramesh Kumar'}
                    </Text>
                    <Text style={[styles.userRole, posBusinessMode === 'restaurant' && { color: '#94A3B8' }]}>
                      {posBusinessMode === 'restaurant' ? 'Staff' : 'Owner'}
                    </Text>
                  </View>
                )}
                <Avatar.Text
                  size={32}
                  label={posBusinessMode === 'restaurant' ? 'CW' : 'RK'}
                  style={{ backgroundColor: posBusinessMode === 'restaurant' ? '#EA580C' : '#2563EB' }}
                  labelStyle={{ fontSize: 12, fontWeight: '700' }}
                />
                <Icon name={showProfileMenu ? "chevron-up" : "chevron-down"} size={16} color="#64748B" style={{ marginLeft: 4 }} />
              </TouchableOpacity>

              {/* Shop Management Profile Dropdown Menu */}
              {showProfileMenu && (
                <Portal>
                  {/* Invisible full-screen backdrop to dismiss menu */}
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={() => setShowProfileMenu(false)}
                    activeOpacity={1}
                  />
                  <View style={[styles.profileDropdown, { top: 60, right: 20 }]}>
                    <View style={styles.profileDropdownHeader}>
                      <Text style={styles.dropdownUser}>{userName}</Text>
                      <Text style={styles.dropdownRole}>Store Owner</Text>
                    </View>
                    <Divider style={{ backgroundColor: '#F1F5F9' }} />
                    
                    <TouchableOpacity style={[styles.dropdownItem, { backgroundColor: '#F0FDF4' }]} onPress={() => { setShowProfileMenu(false); router.push('/'); }}>
                      <Icon name="home-outline" size={18} color="#16A34A" />
                      <Text style={[styles.dropdownText, { color: '#16A34A', fontWeight: 'bold' }]}>Back to Homepage</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); router.push('/(owner)/vendors' as any); }}>
                      <Icon name="account-group" size={18} color="#64748B" />
                      <Text style={styles.dropdownText}>Worker Mgmt</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); router.push('/(owner)/reports' as any); }}>
                      <Icon name="file-chart" size={18} color="#64748B" />
                      <Text style={styles.dropdownText}>Reports Center</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); router.push('/(owner)/upgrade' as any); }}>
                      <Icon name="arrow-up-bold-circle" size={18} color="#64748B" />
                      <Text style={styles.dropdownText}>Subscription</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); router.push('/(owner)/settings' as any); }}>
                      <Icon name="cog" size={18} color="#64748B" />
                      <Text style={styles.dropdownText}>Settings</Text>
                    </TouchableOpacity>
                    
                    <Divider style={{ backgroundColor: '#F1F5F9' }} />
                    
                    <TouchableOpacity style={[styles.dropdownItem, { paddingVertical: 12 }]} onPress={async () => { setShowProfileMenu(false); await handleLogout(); }}>
                      <Icon name="logout" size={18} color="#EF4444" />
                      <Text style={[styles.dropdownText, { color: '#EF4444', fontWeight: 'bold' }]}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                </Portal>
              )}
            </View>
          </View>
        </Surface>

        <View style={styles.contentArea}>
          <Slot />
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#F8FAFC' },
  main: { flex: 1, flexDirection: 'column' },

  // Sidebar
  sidebar: {
    width: 240,
    height: '100%',
    backgroundColor: '#0B132B',
    borderRightWidth: 1,
    borderRightColor: '#1E293B',
    paddingTop: 0,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99,
  },

  // Logo
  logoContainer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  logoIconContainer: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center',
  },
  logoTextContainer: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  logoText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: -0.2 },
  logoSubtext: { color: '#94A3B8', fontSize: 10, fontWeight: '500', marginTop: 1 },

  // Menu
  sidebarMenu: { flex: 1, marginTop: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginHorizontal: 10,
    marginBottom: 3,
    borderRadius: 8,
  },
  menuItemActive: {
    backgroundColor: '#F97316',
  },
  menuItemHover: {
    backgroundColor: '#1E293B',
  },
  menuIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconActiveContainer: {
    backgroundColor: 'transparent',
  },
  menuText: {
    color: '#94A3B8',
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  menuTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  menuBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  menuBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // Bottom Branch Card
  branchBottomCard: {
    backgroundColor: '#111C38',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  branchNameText: { color: '#F1F5F9', fontWeight: '700', fontSize: 12 },
  branchLocationText: { color: '#64748B', fontSize: 11, marginTop: 2 },
  onlineStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 5 },
  onlineText: { color: '#10B981', fontSize: 10, fontWeight: '600' },

  // Bottom Profile Card
  profileBottomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  profileBottomName: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  profileBottomRole: { color: '#94A3B8', fontSize: 10, marginTop: 1 },

  // Top Bar
  topBar: {
    height: 52, backgroundColor: '#FFFFFF', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    zIndex: 1000,
  },
  topBarDark: {
    backgroundColor: '#0B1120',
    borderBottomColor: '#1E293B',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center' },
  topBarRight: { flexDirection: 'row', alignItems: 'center' },
  menuToggle: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  menuToggleDark: {
    backgroundColor: '#1E293B',
  },
  topSearchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
    width: 280,
    marginLeft: 12,
    marginRight: 12,
  },
  topSearchRawInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
  },
  fKeyBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  fKeyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  modePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
  },
  modePillBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  modePillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  cafeLiveClockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  cafeDateText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  topNavCenterTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 8,
  },
  topNavTabItem: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  topNavTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  topNavTabTextActive: {
    color: '#16A34A',
    fontWeight: '700',
  },
  topNavTabDivider: {
    color: '#CBD5E1',
    marginHorizontal: 3,
    fontSize: 11,
  },
  topBarSloganBlue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2563EB',
    fontStyle: 'italic',
    marginRight: 10,
  },
  bellButtonDark: {
    backgroundColor: '#1E293B',
  },
  userTopBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  userTopBarPillDark: {
    backgroundColor: '#1E293B',
  },
  topUserName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  topUserRole: {
    fontSize: 10,
    color: '#64748B',
  },
  topBarDivider: {
    width: 1, height: 28, backgroundColor: '#ECECEC', marginHorizontal: 16,
  },
  storeName: { fontWeight: '700', fontSize: 15, color: '#333', marginLeft: 8 },

  // Date Time
  dateTimeContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9F9F9', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
  },
  dateTimeText: { fontSize: 13, color: '#666', marginLeft: 6, fontWeight: '500' },
  timeDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: '#CCC', marginHorizontal: 10,
  },

  // Notification Bell
  bellContainer: { position: 'relative' },
  bellButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -2, right: -4,
    backgroundColor: '#DC2626', fontWeight: '700',
  },

  // Premium Notifications Dropdown
  dropdownContainer: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 340,
    maxHeight: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  dropdownList: {
    maxHeight: 340,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 14,
  },
  notifIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 3,
  },
  notifText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },

  // Mode Pill Top Bar
  modePillTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modePillTopBarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },

  // User
  backHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  backHomeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#16A34A',
  },
  userContainer: { flexDirection: 'row', alignItems: 'center' },
  userInfo: { marginRight: 12, alignItems: 'flex-end' },
  userName: { fontSize: 13, fontWeight: '700', color: '#333' },
  userRole: { fontSize: 11, color: '#999', marginTop: 1 },
  profileDropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 4,
    zIndex: 9999,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileDropdownHeader: {
    padding: 12,
  },
  dropdownUser: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  dropdownRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  dropdownText: {
    fontSize: 13,
    color: '#334155',
  },

  // Content
  contentArea: { flex: 1, overflow: 'hidden' },

  // Search Bar Navbar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    width: 280,
    justifyContent: 'space-between',
  },
  searchPlaceholder: {
    color: '#6B7280',
    fontSize: 13,
    flex: 1,
  },
  shortcutBadge: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shortcutText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
});
