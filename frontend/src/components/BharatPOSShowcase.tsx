import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform, useWindowDimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';

// ── Showcase Module Definition ─────────────────────────────────────
export interface ShowcaseModule {
  id: number;
  title: string;
  category: 'Retail' | 'Wholesale' | 'Cafe & Restaurant' | 'Accounting' | 'GST' | 'Tally Integration' | 'All';
  route: string;
}

export const SHOWCASE_MODULES: ShowcaseModule[] = [
  { id: 1, title: 'Dashboard (Business Overview)', category: 'Retail', route: '/(owner)' },
  { id: 2, title: 'Retail POS (Shop Mode)', category: 'Retail', route: '/(owner)/pos_billing' },
  { id: 3, title: 'Cafe & Restaurant POS', category: 'Cafe & Restaurant', route: '/(owner)/tables_kot' },
  { id: 4, title: 'Inventory Management', category: 'Retail', route: '/(owner)/inventory' },
  { id: 5, title: 'Purchase & Supplier Management', category: 'Wholesale', route: '/(owner)/purchase' },
  { id: 6, title: 'Wholesale / B2B Mode', category: 'Wholesale', route: '/(owner)/pos_billing' },
  { id: 7, title: 'Table Management (Restaurant)', category: 'Cafe & Restaurant', route: '/(owner)/tables_kot' },
  { id: 8, title: 'Kitchen Display System (KDS)', category: 'Cafe & Restaurant', route: '/(owner)/kds' },
  { id: 9, title: 'Accounting & Tally Integration', category: 'Tally Integration', route: '/(owner)/reports' },
  { id: 10, title: 'GST Management', category: 'GST', route: '/(owner)/reports' },
  { id: 11, title: 'Reports & Analytics', category: 'Accounting', route: '/(owner)/reports' },
  { id: 12, title: 'Customer & Loyalty', category: 'Retail', route: '/(owner)/customers' },
  { id: 13, title: 'Procurement & Expenses', category: 'Wholesale', route: '/(owner)/purchase' },
  { id: 14, title: 'Settings & Organization Setup', category: 'Retail', route: '/(owner)/settings' },
  { id: 15, title: 'Integrations (Tally/Payment/Other)', category: 'Tally Integration', route: '/(owner)/settings' },
  { id: 16, title: 'Mobile POS (Optional)', category: 'Retail', route: '/(owner)/pos_billing' },
];

interface Props {
  onModuleClick?: (route: string) => void;
  hideHeader?: boolean;
}

export default function BharatPOSShowcase({ onModuleClick, hideHeader = false }: Props) {
  const { width } = useWindowDimensions();
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const filterTabs = [
    'Retail',
    'Wholesale',
    'Cafe & Restaurant',
    'Accounting',
    'GST',
    'Tally Integration',
  ];

  const handleCardPress = (route: string) => {
    if (onModuleClick) {
      onModuleClick(route);
    } else {
      router.push(route as any);
    }
  };

  // Responsive column width calculation with zero overlapping guarantee
  const getCardWidth = () => {
    if (width >= 1320) return '23.8%'; // 4 columns
    if (width >= 960) return '31.8%';  // 3 columns
    if (width >= 640) return '48.5%';  // 2 columns
    return '100%';                     // 1 column
  };

  const cardWidth = getCardWidth();

  return (
    <View style={styles.container}>
      {/* ── TOP HEADER (Image Matching) ── */}
      {!hideHeader && (
        <View style={styles.headerBar}>
          {/* Left: Brand Logo & Subtitle */}
          <View style={styles.headerLeft}>
            <View style={styles.brandIconBg}>
              <Icon name="infinity" size={20} color="#FFFFFF" />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.brandTitle}>BharatPOS</Text>
              <Text style={styles.brandSubtitle}>Smart POS for Every Business</Text>
            </View>
          </View>

          {/* Center Category Filters with Clean Dividers */}
          {width > 900 && (
            <View style={styles.headerCenter}>
              <TouchableOpacity
                onPress={() => setSelectedFilter('All')}
                style={[styles.filterTab, selectedFilter === 'All' && styles.filterTabActive]}
              >
                <Text style={[styles.filterTabText, selectedFilter === 'All' && styles.filterTabTextActive]}>All Modules</Text>
              </TouchableOpacity>
              <Text style={styles.filterDivider}>|</Text>

              {filterTabs.map((tab, idx) => (
                <React.Fragment key={tab}>
                  <TouchableOpacity
                    onPress={() => setSelectedFilter(selectedFilter === tab ? 'All' : tab)}
                    style={[styles.filterTab, selectedFilter === tab && styles.filterTabActive]}
                  >
                    <Text style={[styles.filterTabText, selectedFilter === tab && styles.filterTabTextActive]}>
                      {tab}
                    </Text>
                  </TouchableOpacity>
                  {idx < filterTabs.length - 1 && <Text style={styles.filterDivider}>|</Text>}
                </React.Fragment>
              ))}
            </View>
          )}

          {/* Right Status & User Profile */}
          <View style={styles.headerRight}>
            <Text style={styles.headerSlogan}>One Platform. Complete Business.</Text>
            <View style={styles.notificationBell}>
              <Icon name="bell-outline" size={16} color="#475569" />
              <View style={styles.bellBadge} />
            </View>
            <View style={styles.userProfilePill}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>RK</Text>
              </View>
              <View style={{ marginLeft: 6 }}>
                <Text style={styles.userName}>Ramesh Kumar</Text>
                <Text style={styles.userRole}>Owner</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── 16 CARDS SEQUENTIAL GRID ── */}
      <View style={styles.gridContainer}>
        {SHOWCASE_MODULES.map((item) => {
          const isDimmed = selectedFilter !== 'All' && item.category !== selectedFilter;
          const isHovered = hoveredCard === item.id;

          return (
            <View
              key={item.id}
              style={[
                styles.cardWrapper,
                { width: cardWidth },
                isDimmed && { opacity: 0.35 },
                isHovered && styles.cardWrapperHovered,
              ]}
              // @ts-ignore for web mouse events
              onMouseEnter={() => setHoveredCard(item.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Outer Header: Number + Title */}
              <TouchableOpacity
                style={styles.cardHeader}
                activeOpacity={0.85}
                onPress={() => handleCardPress(item.route)}
              >
                <Text style={styles.cardHeaderTitle} numberOfLines={1}>
                  <Text style={styles.cardHeaderNum}>{item.id}. </Text>
                  {item.title}
                </Text>
                <Icon name="arrow-top-right" size={14} color="#94A3B8" />
              </TouchableOpacity>

              {/* Screen Mockup Interior */}
              <TouchableOpacity
                style={styles.cardInterior}
                activeOpacity={0.9}
                onPress={() => handleCardPress(item.route)}
              >
                {renderScreenContent(item.id)}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* ── BOTTOM FOOTER (Image Matching) ── */}
      <View style={styles.footerBar}>
        <View style={styles.footerLeft}>
          <View style={styles.footerTrustItem}>
            <Icon name="shield-check" size={14} color="#16A34A" />
            <Text style={styles.footerTrustText}>Secure</Text>
          </View>
          <Text style={styles.footerDivider}>|</Text>
          <View style={styles.footerTrustItem}>
            <Icon name="lightning-bolt" size={14} color="#2563EB" />
            <Text style={styles.footerTrustText}>Fast</Text>
          </View>
          <Text style={styles.footerDivider}>|</Text>
          <View style={styles.footerTrustItem}>
            <Icon name="lock-check" size={14} color="#059669" />
            <Text style={styles.footerTrustText}>Reliable</Text>
          </View>
          <Text style={styles.footerDivider}>|</Text>
          <View style={styles.footerTrustItem}>
            <Icon name="flag" size={14} color="#EA580C" />
            <Text style={styles.footerTrustText}>Built for India</Text>
          </View>
        </View>

        <View style={styles.footerRight}>
          <Text style={styles.footerBrandText}>
            <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>BharatPOS</Text> — Your Business, Our Technology
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Screen Content Renderer ──────────────────────────────────────────
function renderScreenContent(id: number) {
  switch (id) {
    case 1:
      return <DashboardMockup />;
    case 2:
      return <RetailPosMockup />;
    case 3:
      return <CafeRestaurantMockup />;
    case 4:
      return <InventoryMockup />;
    case 5:
      return <PurchaseMockup />;
    case 6:
      return <WholesaleMockup />;
    case 7:
      return <TableManagementMockup />;
    case 8:
      return <KDSMockup />;
    case 9:
      return <AccountingMockup />;
    case 10:
      return <GSTMockup />;
    case 11:
      return <ReportsMockup />;
    case 12:
      return <CustomerLoyaltyMockup />;
    case 13:
      return <ExpensesMockup />;
    case 14:
      return <SettingsMockup />;
    case 15:
      return <IntegrationsMockup />;
    case 16:
      return <MobilePosMockup />;
    default:
      return null;
  }
}

// ── 1. Dashboard (Business Overview) ─────────────────────────────────
function DashboardMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      {/* Mini App Header */}
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={mockStyles.miniAvatarDot} />
          <View style={{ marginLeft: 6 }}>
            <Text style={mockStyles.greetingBold}>Good Morning, Ramesh Kumar!</Text>
            <Text style={mockStyles.greetingSub}>Here's what's happening today</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={mockStyles.miniPill}>
            <Text style={mockStyles.miniPillText}>Main Outlet ▼</Text>
          </View>
          <View style={[mockStyles.miniPill, { backgroundColor: '#F1F5F9' }]}>
            <Text style={mockStyles.miniPillText}>07 Apr 2026</Text>
          </View>
        </View>
      </View>

      {/* 4 Metric KPI Cards */}
      <View style={mockStyles.kpiGrid}>
        <View style={mockStyles.kpiBox}>
          <Text style={mockStyles.kpiLabel}>Net Sales</Text>
          <Text style={mockStyles.kpiVal}>₹48,250</Text>
          <Text style={mockStyles.kpiTrendGreen}>▲ 12.5%</Text>
        </View>
        <View style={mockStyles.kpiBox}>
          <Text style={mockStyles.kpiLabel}>Total Orders</Text>
          <Text style={mockStyles.kpiVal}>28</Text>
          <Text style={mockStyles.kpiTrendGreen}>▲ 8.2%</Text>
        </View>
        <View style={mockStyles.kpiBox}>
          <Text style={mockStyles.kpiLabel}>Customers</Text>
          <Text style={mockStyles.kpiVal}>42</Text>
          <Text style={mockStyles.kpiTrendGreen}>▲ 15.2%</Text>
        </View>
        <View style={mockStyles.kpiBox}>
          <Text style={mockStyles.kpiLabel}>Net Profit</Text>
          <Text style={mockStyles.kpiVal}>₹12,840</Text>
          <Text style={mockStyles.kpiTrendGreen}>▲ 10.2%</Text>
        </View>
      </View>

      {/* Charts & Split Overview */}
      <View style={mockStyles.splitRow}>
        {/* Sales Overview Area Wave */}
        <View style={mockStyles.chartBox}>
          <View style={mockStyles.boxHeader}>
            <Text style={mockStyles.boxTitle}>Sales Overview</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>Today</Text>
              <Text style={mockStyles.microTab}>7D</Text>
              <Text style={mockStyles.microTab}>30D</Text>
            </View>
          </View>
          {/* Simulated Wave SVG / Chart Bars */}
          <View style={mockStyles.waveChartWrap}>
            <View style={mockStyles.waveBarContainer}>
              <View style={[mockStyles.chartBar, { height: '35%' }]} />
              <View style={[mockStyles.chartBar, { height: '55%' }]} />
              <View style={[mockStyles.chartBar, { height: '80%' }]} />
              <View style={[mockStyles.chartBar, { height: '60%' }]} />
              <View style={[mockStyles.chartBar, { height: '90%' }]} />
              <View style={[mockStyles.chartBar, { height: '70%' }]} />
              <View style={[mockStyles.chartBar, { height: '100%' }]} />
            </View>
            <Text style={mockStyles.microAxis}>10:00  •  12:00  •  14:00  •  16:00  •  18:00  •  20:00</Text>
          </View>
        </View>

        {/* Payment Methods Donut & Shortcuts */}
        <View style={mockStyles.donutBox}>
          <Text style={mockStyles.boxTitle}>Payment Methods</Text>
          <View style={mockStyles.donutMock}>
            <View style={mockStyles.donutCircle}>
              <Text style={mockStyles.donutCenterVal}>₹48k</Text>
            </View>
            <View style={{ marginLeft: 8 }}>
              <Text style={mockStyles.legendItem}><Text style={{ color: '#16A34A' }}>●</Text> UPI: 48%</Text>
              <Text style={mockStyles.legendItem}><Text style={{ color: '#2563EB' }}>●</Text> Cash: 28%</Text>
              <Text style={mockStyles.legendItem}><Text style={{ color: '#EA580C' }}>●</Text> Card: 17%</Text>
              <Text style={mockStyles.legendItem}><Text style={{ color: '#8B5CF6' }}>●</Text> Wallet: 7%</Text>
            </View>
          </View>
          <View style={mockStyles.quickActionsRow}>
            <View style={mockStyles.miniActionBtn}><Text style={mockStyles.miniActionText}>+ New Bill</Text></View>
            <View style={[mockStyles.miniActionBtn, { backgroundColor: '#F1F5F9' }]}><Text style={[mockStyles.miniActionText, { color: '#0F172A' }]}>Sync Tally</Text></View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── 2. Retail POS (Shop Mode) ────────────────────────────────────────
function RetailPosMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      {/* Top Search + Walk-in */}
      <View style={mockStyles.miniTopBar}>
        <View style={mockStyles.searchMock}>
          <Icon name="magnify" size={12} color="#94A3B8" />
          <Text style={mockStyles.searchMockText}>Search SKU, Name...</Text>
        </View>
        <View style={mockStyles.miniPill}>
          <Text style={mockStyles.miniPillText}>Customer: Walk-in ▼</Text>
        </View>
      </View>

      {/* Category Chips */}
      <View style={mockStyles.chipRow}>
        <Text style={[mockStyles.microChip, mockStyles.microChipActive]}>All</Text>
        <Text style={mockStyles.microChip}>Groceries</Text>
        <Text style={mockStyles.microChip}>Snacks</Text>
        <Text style={mockStyles.microChip}>Beverages</Text>
        <Text style={mockStyles.microChip}>Personal Care</Text>
      </View>

      {/* Split: Product Grid (Left) + Cart Summary (Right) */}
      <View style={mockStyles.splitRow}>
        {/* Products 2x3 Grid */}
        <View style={{ flex: 1.2, gap: 4 }}>
          <View style={mockStyles.prodGridRow}>
            <View style={mockStyles.prodMiniCard}>
              <Icon name="food-croissant" size={16} color="#EA580C" />
              <Text style={mockStyles.prodMiniName} numberOfLines={1}>Amul Butter</Text>
              <Text style={mockStyles.prodMiniPrice}>₹52.00</Text>
            </View>
            <View style={mockStyles.prodMiniCard}>
              <Icon name="cookie" size={16} color="#D97706" />
              <Text style={mockStyles.prodMiniName} numberOfLines={1}>Britannia Marie</Text>
              <Text style={mockStyles.prodMiniPrice}>₹30.00</Text>
            </View>
            <View style={mockStyles.prodMiniCard}>
              <Icon name="tea" size={16} color="#16A34A" />
              <Text style={mockStyles.prodMiniName} numberOfLines={1}>Tata Tea 250g</Text>
              <Text style={mockStyles.prodMiniPrice}>₹120.00</Text>
            </View>
          </View>
          <View style={mockStyles.prodGridRow}>
            <View style={mockStyles.prodMiniCard}>
              <Icon name="noodles" size={16} color="#DC2626" />
              <Text style={mockStyles.prodMiniName} numberOfLines={1}>Maggi Noodles</Text>
              <Text style={mockStyles.prodMiniPrice}>₹14.00</Text>
            </View>
            <View style={mockStyles.prodMiniCard}>
              <Icon name="bottle-soda-classic" size={16} color="#2563EB" />
              <Text style={mockStyles.prodMiniName} numberOfLines={1}>Coca Cola 750ml</Text>
              <Text style={mockStyles.prodMiniPrice}>₹45.00</Text>
            </View>
            <View style={mockStyles.prodMiniCard}>
              <Icon name="shampoo" size={16} color="#0284C7" />
              <Text style={mockStyles.prodMiniName} numberOfLines={1}>Dove Soap</Text>
              <Text style={mockStyles.prodMiniPrice}>₹55.00</Text>
            </View>
          </View>
        </View>

        {/* Cart Drawer */}
        <View style={mockStyles.cartPane}>
          <Text style={mockStyles.cartTitle}>Cart (3 items)</Text>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Amul Butter 100g</Text><Text style={mockStyles.cartItemPrice}>₹52.00</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Maggi Noodles 70g (3x)</Text><Text style={mockStyles.cartItemPrice}>₹42.00</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Coca Cola 750ml</Text><Text style={mockStyles.cartItemPrice}>₹45.00</Text></View>
          
          <View style={mockStyles.cartTotalsWrap}>
            <View style={mockStyles.totalRow}><Text style={mockStyles.subText}>Subtotal</Text><Text style={mockStyles.subVal}>₹139.00</Text></View>
            <View style={mockStyles.totalRow}><Text style={mockStyles.subText}>GST (18%)</Text><Text style={mockStyles.subVal}>₹18.40</Text></View>
            <View style={[mockStyles.totalRow, { marginTop: 4 }]}><Text style={mockStyles.finalTotalText}>Total</Text><Text style={mockStyles.finalTotalVal}>₹157.40</Text></View>
          </View>

          <View style={mockStyles.cartBtnsRow}>
            <View style={mockStyles.btnOutline}><Text style={mockStyles.btnOutlineText}>Hold</Text></View>
            <View style={mockStyles.btnSolidGreen}><Text style={mockStyles.btnSolidGreenText}>Pay  →</Text></View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── 3. Cafe & Restaurant POS ─────────────────────────────────────────
function CafeRestaurantMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      {/* Top Bar Tabs */}
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>Dine-In</Text>
          <Text style={mockStyles.microTab}>Takeaway</Text>
          <Text style={mockStyles.microTab}>Delivery</Text>
        </View>
        <View style={mockStyles.chefBadge}>
          <Icon name="chef-hat" size={12} color="#16A34A" />
          <Text style={mockStyles.chefBadgeText}>Chef Online</Text>
        </View>
      </View>

      {/* Floor Table Map & Cart */}
      <View style={mockStyles.splitRow}>
        {/* 8 Tables Grid */}
        <View style={{ flex: 1.2, gap: 6 }}>
          <View style={mockStyles.tableGridRow}>
            <View style={[mockStyles.tablePill, mockStyles.tableVacant]}><Text style={mockStyles.tableNum}>T1</Text><Text style={mockStyles.tableStatus}>2/4</Text></View>
            <View style={[mockStyles.tablePill, mockStyles.tableOccupied]}><Text style={mockStyles.tableNum}>T2</Text><Text style={mockStyles.tableStatus}>4/4 Billed</Text></View>
            <View style={mockStyles.tablePill}><Text style={mockStyles.tableNum}>T3</Text><Text style={mockStyles.tableStatus}>0/4</Text></View>
            <View style={mockStyles.tablePill}><Text style={mockStyles.tableNum}>T4</Text><Text style={mockStyles.tableStatus}>0/4</Text></View>
          </View>
          <View style={mockStyles.tableGridRow}>
            <View style={[mockStyles.tablePill, mockStyles.tableVacant]}><Text style={mockStyles.tableNum}>T5</Text><Text style={mockStyles.tableStatus}>2/4</Text></View>
            <View style={mockStyles.tablePill}><Text style={mockStyles.tableNum}>T6</Text><Text style={mockStyles.tableStatus}>0/4</Text></View>
            <View style={[mockStyles.tablePill, mockStyles.tableVacant]}><Text style={mockStyles.tableNum}>T7</Text><Text style={mockStyles.tableStatus}>2/6</Text></View>
            <View style={mockStyles.tablePill}><Text style={mockStyles.tableNum}>T8</Text><Text style={mockStyles.tableStatus}>0/4</Text></View>
          </View>
        </View>

        {/* Right Bill Drawer */}
        <View style={mockStyles.cartPane}>
          <Text style={mockStyles.cartTitle}>Cart (2 items)</Text>
          <Text style={mockStyles.subText}>Table 2 • 4 Guests</Text>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Margherita Pizza</Text><Text style={mockStyles.cartItemPrice}>₹220.00</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Coke 500ml</Text><Text style={mockStyles.cartItemPrice}>₹45.00</Text></View>

          <View style={[mockStyles.cartTotalsWrap, { marginTop: 'auto' }]}>
            <View style={mockStyles.totalRow}><Text style={mockStyles.finalTotalText}>Total</Text><Text style={mockStyles.finalTotalVal}>₹265.00</Text></View>
          </View>
          <View style={mockStyles.btnSolidOrange}><Text style={mockStyles.btnSolidGreenText}>View Bill / KOT</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 4. Inventory Management ──────────────────────────────────────────
function InventoryMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      {/* Sub-tabs */}
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>Stock List</Text>
          <Text style={mockStyles.microTab}>Stock Movement</Text>
          <Text style={mockStyles.microTab}>Low Stock</Text>
        </View>
        <View style={mockStyles.searchMock}>
          <Icon name="magnify" size={11} color="#94A3B8" />
          <Text style={mockStyles.searchMockText}>Filter stock...</Text>
        </View>
      </View>

      {/* Table */}
      <View style={mockStyles.tableWrap}>
        <View style={mockStyles.tableHeaderRow}>
          <Text style={[mockStyles.thText, { flex: 2 }]}>Product</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>SKU</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Stock</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Status</Text>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Amul Butter 100g</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>AB102</Text>
          <Text style={[mockStyles.tdText, { flex: 1 }]}>12 PCS</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>In Stock</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Maggi Noodles 70g</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>MN70</Text>
          <Text style={[mockStyles.tdText, { flex: 1 }]}>8 PCS</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[mockStyles.statusText, { color: '#D97706' }]}>Low Stock</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Tata Tea 250g</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>TT250</Text>
          <Text style={[mockStyles.tdText, { flex: 1 }]}>25 PCS</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>In Stock</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Biscuit Pack</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>BP200</Text>
          <Text style={[mockStyles.tdText, { flex: 1 }]}>2 PCS</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#FEE2E2' }]}><Text style={[mockStyles.statusText, { color: '#DC2626' }]}>Reorder</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 5. Purchase & Supplier Management ────────────────────────────────
function PurchaseMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>Purchase Orders</Text>
          <Text style={mockStyles.microTab}>Goods Receipt</Text>
          <Text style={mockStyles.microTab}>Suppliers</Text>
        </View>
        <View style={mockStyles.btnSolidBlue}><Text style={mockStyles.btnSolidBlueText}>+ New Purchase</Text></View>
      </View>

      <View style={mockStyles.tableWrap}>
        <View style={mockStyles.tableHeaderRow}>
          <Text style={[mockStyles.thText, { flex: 2 }]}>Supplier</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>PO No</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Amount</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Status</Text>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Vijay Traders</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>PO-001</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹12,300</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>Received</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Sharma Distributors</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>PO-002</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹8,750</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[mockStyles.statusText, { color: '#D97706' }]}>Pending</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Ravi Foods</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>PO-003</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹15,200</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>Received</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>ABC Suppliers</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>PO-004</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹22,400</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[mockStyles.statusText, { color: '#D97706' }]}>Pending</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 6. Wholesale / B2B Mode ──────────────────────────────────────────
function WholesaleMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <View style={mockStyles.searchMock}>
          <Icon name="office-building" size={12} color="#94A3B8" />
          <Text style={mockStyles.searchMockText}>Search B2B Client / GSTIN...</Text>
        </View>
        <View style={mockStyles.miniPill}>
          <Text style={mockStyles.miniPillText}>Credit: ₹50,000</Text>
        </View>
      </View>

      <View style={mockStyles.splitRow}>
        {/* B2B Clients */}
        <View style={{ flex: 1.1, gap: 5 }}>
          <View style={mockStyles.b2bCard}>
            <Text style={mockStyles.b2bName}>Apex Retailers</Text>
            <Text style={mockStyles.b2bGst}>GSTIN: 27AABCA8340M1ZS</Text>
          </View>
          <View style={mockStyles.b2bCard}>
            <Text style={mockStyles.b2bName}>Sunrise Traders</Text>
            <Text style={mockStyles.b2bGst}>GSTIN: 27BXYZA9012N2ZX</Text>
          </View>
          <View style={mockStyles.b2bCard}>
            <Text style={mockStyles.b2bName}>Metro Wholesale</Text>
            <Text style={mockStyles.b2bGst}>GSTIN: 27XYZAB3456M2ZS</Text>
          </View>
        </View>

        {/* Wholesale Bulk Cart */}
        <View style={mockStyles.cartPane}>
          <Text style={mockStyles.cartTitle}>Cart (3 bulk items)</Text>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Amul Butter (10 cartons)</Text><Text style={mockStyles.cartItemPrice}>₹2,500</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Maggi Noodles (5 boxes)</Text><Text style={mockStyles.cartItemPrice}>₹1,400</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Coca Cola (8 crates)</Text><Text style={mockStyles.cartItemPrice}>₹3,600</Text></View>

          <View style={[mockStyles.cartTotalsWrap, { marginTop: 'auto' }]}>
            <View style={mockStyles.totalRow}><Text style={mockStyles.finalTotalText}>Total</Text><Text style={mockStyles.finalTotalVal}>₹7,500.00</Text></View>
          </View>
          <View style={mockStyles.btnSolidGreen}><Text style={mockStyles.btnSolidGreenText}>Create B2B Invoice</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 7. Table Management (Restaurant) ─────────────────────────────────
function TableManagementMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>Floor 1</Text>
          <Text style={mockStyles.microTab}>Floor 2</Text>
          <Text style={mockStyles.microTab}>Garden Patio</Text>
        </View>
      </View>

      <View style={mockStyles.splitRow}>
        <View style={{ flex: 1.2, gap: 6 }}>
          <View style={mockStyles.tableGridRow}>
            <View style={[mockStyles.tablePill, mockStyles.tableVacant]}><Text style={mockStyles.tableNum}>T1</Text><Text style={mockStyles.tableStatus}>2/4</Text></View>
            <View style={[mockStyles.tablePill, mockStyles.tableOccupied]}><Text style={mockStyles.tableNum}>T2</Text><Text style={mockStyles.tableStatus}>4/4 Billed</Text></View>
            <View style={[mockStyles.tablePill, mockStyles.tableVacant]}><Text style={mockStyles.tableNum}>T3</Text><Text style={mockStyles.tableStatus}>2/4</Text></View>
          </View>
          <View style={mockStyles.tableGridRow}>
            <View style={[mockStyles.tablePill, mockStyles.tableVacant]}><Text style={mockStyles.tableNum}>T5</Text><Text style={mockStyles.tableStatus}>4/4</Text></View>
            <View style={mockStyles.tablePill}><Text style={mockStyles.tableNum}>T6</Text><Text style={mockStyles.tableStatus}>0/4</Text></View>
            <View style={[mockStyles.tablePill, mockStyles.tableVacant]}><Text style={mockStyles.tableNum}>T7</Text><Text style={mockStyles.tableStatus}>2/4</Text></View>
          </View>
        </View>

        <View style={mockStyles.cartPane}>
          <Text style={mockStyles.cartTitle}>Table 2 Order</Text>
          <Text style={mockStyles.subText}>4 Guests • Dine-In</Text>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Pasta Alfredo</Text><Text style={mockStyles.cartItemPrice}>₹180.00</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Garlic Bread</Text><Text style={mockStyles.cartItemPrice}>₹90.00</Text></View>
          
          <View style={[mockStyles.cartTotalsWrap, { marginTop: 'auto' }]}>
            <View style={mockStyles.totalRow}><Text style={mockStyles.finalTotalText}>Total</Text><Text style={mockStyles.finalTotalVal}>₹270.00</Text></View>
          </View>
          <View style={mockStyles.btnSolidOrange}><Text style={mockStyles.btnSolidGreenText}>Send to Kitchen</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 8. Kitchen Display System (KDS) ──────────────────────────────────
function KDSMockup() {
  return (
    <View style={[mockStyles.screenWrap, { backgroundColor: '#0B1120' }]}>
      <View style={[mockStyles.miniTopBar, { borderBottomColor: '#1E293B' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={mockStyles.livePulseDot} />
          <Text style={[mockStyles.greetingBold, { color: '#F8FAFC' }]}>Kitchen Display</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Text style={[mockStyles.microTab, { backgroundColor: '#16A34A', color: '#FFFFFF' }]}>All (3)</Text>
          <Text style={[mockStyles.microTab, { backgroundColor: '#1E293B', color: '#94A3B8' }]}>Dine-In</Text>
          <Text style={[mockStyles.microTab, { backgroundColor: '#1E293B', color: '#94A3B8' }]}>Takeaway</Text>
        </View>
      </View>

      {/* 3 Live Tickets */}
      <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
        <View style={mockStyles.kdsTicket}>
          <View style={mockStyles.kdsTicketHeader}>
            <Text style={mockStyles.kdsTicketNum}>#1024</Text>
            <Text style={mockStyles.kdsTicketTime}>12:15 PM</Text>
          </View>
          <Text style={mockStyles.kdsMeta}>Table 5</Text>
          <Text style={mockStyles.kdsItem}>• Margherita Pizza x1</Text>
          <Text style={mockStyles.kdsItem}>• Garlic Bread x1</Text>
          <View style={[mockStyles.kdsStatusBtn, { backgroundColor: '#EA580C' }]}>
            <Text style={mockStyles.kdsStatusText}>Preparing</Text>
          </View>
        </View>

        <View style={mockStyles.kdsTicket}>
          <View style={mockStyles.kdsTicketHeader}>
            <Text style={mockStyles.kdsTicketNum}>#1025</Text>
            <Text style={mockStyles.kdsTicketTime}>12:20 PM</Text>
          </View>
          <Text style={mockStyles.kdsMeta}>Online Order</Text>
          <Text style={mockStyles.kdsItem}>• Pasta Alfredo x1</Text>
          <Text style={mockStyles.kdsItem}>• Caesar Salad x1</Text>
          <View style={[mockStyles.kdsStatusBtn, { backgroundColor: '#2563EB' }]}>
            <Text style={mockStyles.kdsStatusText}>Ready</Text>
          </View>
        </View>

        <View style={mockStyles.kdsTicket}>
          <View style={mockStyles.kdsTicketHeader}>
            <Text style={mockStyles.kdsTicketNum}>#1026</Text>
            <Text style={mockStyles.kdsTicketTime}>12:25 PM</Text>
          </View>
          <Text style={mockStyles.kdsMeta}>Table 8</Text>
          <Text style={mockStyles.kdsItem}>• Burger x1</Text>
          <Text style={mockStyles.kdsItem}>• Fries x1</Text>
          <View style={[mockStyles.kdsStatusBtn, { backgroundColor: '#D97706' }]}>
            <Text style={mockStyles.kdsStatusText}>In Progress</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── 9. Accounting & Tally Integration ────────────────────────────────
function AccountingMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>Journal Entries</Text>
          <Text style={mockStyles.microTab}>Ledger</Text>
          <Text style={mockStyles.microTab}>Tally Sync</Text>
        </View>
        <View style={mockStyles.chefBadge}>
          <Icon name="check-circle" size={12} color="#16A34A" />
          <Text style={mockStyles.chefBadgeText}>Tally Connected</Text>
        </View>
      </View>

      <View style={mockStyles.tableWrap}>
        <View style={mockStyles.tableHeaderRow}>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Date</Text>
          <Text style={[mockStyles.thText, { flex: 2 }]}>Particulars</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Debit</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Credit</Text>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>07 Apr</Text>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Sales Revenue</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>-</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹12,500</Text>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>07 Apr</Text>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>CGST Output</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>-</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹1,125</Text>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>07 Apr</Text>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>SGST Output</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>-</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹1,125</Text>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>07 Apr</Text>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Cash Account</Text>
          <Text style={[mockStyles.tdBold, { flex: 1, color: '#16A34A' }]}>₹14,750</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>-</Text>
        </View>
      </View>
      
      <View style={mockStyles.btnSolidBlue}><Text style={mockStyles.btnSolidBlueText}>Sync with Tally ERP</Text></View>
    </View>
  );
}

// ── 10. GST Management ───────────────────────────────────────────────
function GSTMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>GST Summary</Text>
          <Text style={mockStyles.microTab}>GSTR-1</Text>
          <Text style={mockStyles.microTab}>GSTR-3B</Text>
        </View>
        <Text style={mockStyles.subText}>Apr 2026</Text>
      </View>

      <View style={mockStyles.kpiGrid}>
        <View style={mockStyles.kpiBox}>
          <Text style={mockStyles.kpiLabel}>Total Sales</Text>
          <Text style={mockStyles.kpiVal}>₹1,26,000</Text>
        </View>
        <View style={mockStyles.kpiBox}>
          <Text style={mockStyles.kpiLabel}>GST Collected</Text>
          <Text style={[mockStyles.kpiVal, { color: '#16A34A' }]}>₹18,750</Text>
        </View>
        <View style={mockStyles.kpiBox}>
          <Text style={mockStyles.kpiLabel}>Purchases</Text>
          <Text style={mockStyles.kpiVal}>₹85,000</Text>
        </View>
        <View style={mockStyles.kpiBox}>
          <Text style={mockStyles.kpiLabel}>GST Paid</Text>
          <Text style={[mockStyles.kpiVal, { color: '#2563EB' }]}>₹12,750</Text>
        </View>
      </View>

      <View style={mockStyles.splitRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={mockStyles.gstActionBtn}><Icon name="download" size={12} color="#2563EB" /><Text style={mockStyles.gstActionText}>Download GSTR-1 (JSON)</Text></View>
          <View style={mockStyles.gstActionBtn}><Icon name="download" size={12} color="#2563EB" /><Text style={mockStyles.gstActionText}>Download GSTR-3B (JSON)</Text></View>
        </View>
        <View style={mockStyles.taxBox}>
          <Text style={mockStyles.boxTitle}>Tax Breakdown</Text>
          <View style={mockStyles.totalRow}><Text style={mockStyles.subText}>GST 5%</Text><Text style={mockStyles.subVal}>₹6,250</Text></View>
          <View style={mockStyles.totalRow}><Text style={mockStyles.subText}>GST 12%</Text><Text style={mockStyles.subVal}>₹8,400</Text></View>
          <View style={mockStyles.totalRow}><Text style={mockStyles.subText}>GST 18%</Text><Text style={mockStyles.subVal}>₹4,100</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 11. Reports & Analytics ──────────────────────────────────────────
function ReportsMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <Text style={mockStyles.greetingBold}>Sales Trend & Analytics</Text>
        <Text style={mockStyles.subText}>01 Apr - 07 Apr 2026</Text>
      </View>

      <View style={mockStyles.splitRow}>
        {/* Sales Trend Bars */}
        <View style={mockStyles.chartBox}>
          <Text style={mockStyles.boxTitle}>Weekly Revenue Trend</Text>
          <View style={mockStyles.waveBarContainer}>
            <View style={[mockStyles.chartBar, { height: '40%', backgroundColor: '#3B82F6' }]} />
            <View style={[mockStyles.chartBar, { height: '65%', backgroundColor: '#3B82F6' }]} />
            <View style={[mockStyles.chartBar, { height: '50%', backgroundColor: '#3B82F6' }]} />
            <View style={[mockStyles.chartBar, { height: '85%', backgroundColor: '#3B82F6' }]} />
            <View style={[mockStyles.chartBar, { height: '70%', backgroundColor: '#3B82F6' }]} />
            <View style={[mockStyles.chartBar, { height: '95%', backgroundColor: '#2563EB' }]} />
            <View style={[mockStyles.chartBar, { height: '60%', backgroundColor: '#3B82F6' }]} />
          </View>
        </View>

        {/* Top Selling Products */}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={mockStyles.boxTitle}>Top Selling Items</Text>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Maggi Noodles 70g</Text><Text style={mockStyles.tdBold}>120</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Amul Butter 100g</Text><Text style={mockStyles.tdBold}>85</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Coca Cola 750ml</Text><Text style={mockStyles.tdBold}>74</Text></View>
          <View style={mockStyles.cartLine}><Text style={mockStyles.cartItemName}>Tata Tea 250g</Text><Text style={mockStyles.tdBold}>68</Text></View>
        </View>
      </View>

      <View style={mockStyles.kpiGrid}>
        <View style={mockStyles.kpiBox}><Text style={mockStyles.kpiLabel}>Total Sales</Text><Text style={mockStyles.kpiVal}>₹48,250</Text></View>
        <View style={mockStyles.kpiBox}><Text style={mockStyles.kpiLabel}>Total Orders</Text><Text style={mockStyles.kpiVal}>28</Text></View>
        <View style={mockStyles.kpiBox}><Text style={mockStyles.kpiLabel}>Avg Order</Text><Text style={mockStyles.kpiVal}>₹1,723</Text></View>
      </View>
    </View>
  );
}

// ── 12. Customer & Loyalty ───────────────────────────────────────────
function CustomerLoyaltyMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>All Customers</Text>
          <Text style={mockStyles.microTab}>Retail</Text>
          <Text style={mockStyles.microTab}>Wholesale</Text>
        </View>
        <View style={mockStyles.btnSolidBlue}><Text style={mockStyles.btnSolidBlueText}>+ Add Customer</Text></View>
      </View>

      <View style={mockStyles.tableWrap}>
        <View style={mockStyles.tableHeaderRow}>
          <Text style={[mockStyles.thText, { flex: 2 }]}>Customer</Text>
          <Text style={[mockStyles.thText, { flex: 1.5 }]}>Phone</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Spent</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Points</Text>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Rohit Sharma</Text>
          <Text style={[mockStyles.tdSub, { flex: 1.5 }]}>9876543210</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹12,450</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#EFF6FF' }]}><Text style={[mockStyles.statusText, { color: '#2563EB' }]}>120 pts</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Priya Patel</Text>
          <Text style={[mockStyles.tdSub, { flex: 1.5 }]}>9988776655</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹8,900</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#EFF6FF' }]}><Text style={[mockStyles.statusText, { color: '#2563EB' }]}>89 pts</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Vikas Retailers</Text>
          <Text style={[mockStyles.tdSub, { flex: 1.5 }]}>9888112233</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹1,25,000</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>VIP B2B</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Sunrise Traders</Text>
          <Text style={[mockStyles.tdSub, { flex: 1.5 }]}>9777001122</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹84,500</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>VIP B2B</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 13. Procurement & Expenses ───────────────────────────────────────
function ExpensesMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Text style={[mockStyles.microTab, mockStyles.microTabActive]}>Expenses</Text>
          <Text style={mockStyles.microTab}>Supplier Bills</Text>
        </View>
        <View style={mockStyles.btnSolidBlue}><Text style={mockStyles.btnSolidBlueText}>+ Record Expense</Text></View>
      </View>

      <View style={mockStyles.tableWrap}>
        <View style={mockStyles.tableHeaderRow}>
          <Text style={[mockStyles.thText, { flex: 2 }]}>Expense / Vendor</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Category</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Amount</Text>
          <Text style={[mockStyles.thText, { flex: 1 }]}>Status</Text>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Vijay Traders</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>Raw Stock</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹12,300</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>Paid</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Store Electricity</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>Utilities</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹4,250</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>Paid</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Sharma Distributors</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>Dairy Supply</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹8,750</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[mockStyles.statusText, { color: '#D97706' }]}>Pending</Text></View>
        </View>
        <View style={mockStyles.tableRow}>
          <Text style={[mockStyles.tdText, { flex: 2 }]} numberOfLines={1}>Staff Advance</Text>
          <Text style={[mockStyles.tdSub, { flex: 1 }]}>Salary</Text>
          <Text style={[mockStyles.tdBold, { flex: 1 }]}>₹5,000</Text>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>Paid</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 14. Settings & Organization Setup ────────────────────────────────
function SettingsMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.splitRow}>
        {/* Left Settings Menu */}
        <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingRight: 8 }}>
          <Text style={[mockStyles.settingNav, mockStyles.settingNavActive]}>Business Details</Text>
          <Text style={mockStyles.settingNav}>Outlets & Stores</Text>
          <Text style={mockStyles.settingNav}>Users & Roles</Text>
          <Text style={mockStyles.settingNav}>Payment Methods</Text>
          <Text style={mockStyles.settingNav}>Tax & GST</Text>
          <Text style={mockStyles.settingNav}>Printers & Devices</Text>
        </View>

        {/* Right Form */}
        <View style={{ flex: 2, paddingLeft: 8, gap: 6 }}>
          <Text style={mockStyles.boxTitle}>Business Details</Text>
          <View style={mockStyles.inputMock}>
            <Text style={mockStyles.inputMockLabel}>Store Name</Text>
            <Text style={mockStyles.inputMockVal}>Ramesh Kirana & Cafe</Text>
          </View>
          <View style={mockStyles.inputMock}>
            <Text style={mockStyles.inputMockLabel}>GSTIN</Text>
            <Text style={mockStyles.inputMockVal}>27AABCR1234M1Z5</Text>
          </View>

          <View style={{ marginTop: 4 }}>
            <Text style={mockStyles.boxTitle}>Operating Modes</Text>
            <View style={mockStyles.switchRow}>
              <Text style={mockStyles.subText}>Retail POS</Text>
              <View style={mockStyles.switchActive}><View style={mockStyles.switchKnob} /></View>
            </View>
            <View style={mockStyles.switchRow}>
              <Text style={mockStyles.subText}>Cafe & Restaurant POS</Text>
              <View style={mockStyles.switchActive}><View style={mockStyles.switchKnob} /></View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── 15. Integrations (Tally/Payment/Other) ────────────────────────────
function IntegrationsMockup() {
  return (
    <View style={mockStyles.screenWrap}>
      <View style={mockStyles.miniTopBar}>
        <Text style={mockStyles.greetingBold}>Connected Integrations</Text>
        <Text style={mockStyles.subText}>4 Active Services</Text>
      </View>

      <View style={{ gap: 6, flex: 1 }}>
        <View style={mockStyles.integrationRow}>
          <View style={mockStyles.integrationIconBg}><Icon name="book-open-outline" size={16} color="#059669" /></View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={mockStyles.tdBold}>Tally ERP 9 / Prime</Text>
            <Text style={mockStyles.subText}>Automated Ledger & Voucher Sync</Text>
          </View>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>Connected</Text></View>
        </View>

        <View style={mockStyles.integrationRow}>
          <View style={[mockStyles.integrationIconBg, { backgroundColor: '#EFF6FF' }]}><Icon name="credit-card-outline" size={16} color="#2563EB" /></View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={mockStyles.tdBold}>Razorpay (UPI / QR / Cards)</Text>
            <Text style={mockStyles.subText}>Instant Payment Verification</Text>
          </View>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>Connected</Text></View>
        </View>

        <View style={mockStyles.integrationRow}>
          <View style={[mockStyles.integrationIconBg, { backgroundColor: '#FEF3C7' }]}><Icon name="whatsapp" size={16} color="#D97706" /></View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={mockStyles.tdBold}>SMS / WhatsApp Receipts</Text>
            <Text style={mockStyles.subText}>Digital Invoicing to Customer Phone</Text>
          </View>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[mockStyles.statusText, { color: '#D97706' }]}>Configure</Text></View>
        </View>

        <View style={mockStyles.integrationRow}>
          <View style={[mockStyles.integrationIconBg, { backgroundColor: '#F1F5F9' }]}><Icon name="barcode-scan" size={16} color="#0F172A" /></View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={mockStyles.tdBold}>Barcode Scanner & Thermal Printer</Text>
            <Text style={mockStyles.subText}>USB / Bluetooth ESC/POS Protocol</Text>
          </View>
          <View style={[mockStyles.statusBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[mockStyles.statusText, { color: '#16A34A' }]}>Connected</Text></View>
        </View>
      </View>
    </View>
  );
}

// ── 16. Mobile POS (Optional) ────────────────────────────────────────
function MobilePosMockup() {
  return (
    <View style={mockStyles.mobileFrameContainer}>
      {/* Smartphone Outer Bezel */}
      <View style={mockStyles.phoneBezel}>
        <View style={mockStyles.phoneNotch} />

        {/* Mobile Top App Bar */}
        <View style={mockStyles.mobileTopBar}>
          <Text style={mockStyles.mobileBrand}>BharatPOS Mobile</Text>
          <Icon name="barcode-scan" size={14} color="#16A34A" />
        </View>

        {/* Category Chips */}
        <View style={mockStyles.mobileChipRow}>
          <Text style={[mockStyles.mobileChip, mockStyles.mobileChipActive]}>All</Text>
          <Text style={mockStyles.mobileChip}>Grocery</Text>
          <Text style={mockStyles.mobileChip}>Snacks</Text>
          <Text style={mockStyles.mobileChip}>Drinks</Text>
        </View>

        {/* 2-Column Product Grid */}
        <View style={mockStyles.mobileProdGrid}>
          <View style={mockStyles.mobileProdBox}>
            <Text style={mockStyles.mobileProdName} numberOfLines={1}>Amul Butter</Text>
            <Text style={mockStyles.mobileProdPrice}>₹52.00</Text>
          </View>
          <View style={mockStyles.mobileProdBox}>
            <Text style={mockStyles.mobileProdName} numberOfLines={1}>Maggi 70g</Text>
            <Text style={mockStyles.mobileProdPrice}>₹14.00</Text>
          </View>
          <View style={mockStyles.mobileProdBox}>
            <Text style={mockStyles.mobileProdName} numberOfLines={1}>Tata Tea</Text>
            <Text style={mockStyles.mobileProdPrice}>₹120.00</Text>
          </View>
          <View style={mockStyles.mobileProdBox}>
            <Text style={mockStyles.mobileProdName} numberOfLines={1}>Coca Cola</Text>
            <Text style={mockStyles.mobileProdPrice}>₹45.00</Text>
          </View>
        </View>

        {/* Bottom Cart Drawer */}
        <View style={mockStyles.mobileBottomCart}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={mockStyles.mobileCartQty}>Cart (3)</Text>
            <Text style={mockStyles.mobileCartTotal}>Total: ₹94.00</Text>
          </View>
          <View style={mockStyles.mobilePayBtn}>
            <Text style={mockStyles.mobilePayBtnText}>Proceed to Pay  →</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── STYLES ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
  },

  // Header Bar (Image Matching)
  headerBar: {
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  filterTabActive: {
    backgroundColor: '#16A34A',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterDivider: {
    color: '#CBD5E1',
    marginHorizontal: 4,
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSlogan: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    fontStyle: 'italic',
  },
  notificationBell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  userProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 9,
    color: '#64748B',
  },

  // 16 Grid Container (Strict Zero Overlapping)
  gridContainer: {
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 16,
  },
  cardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    height: 380,
    marginBottom: 8,
    // @ts-ignore
    boxSizing: 'border-box',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardWrapperHovered: {
    borderColor: '#94A3B8',
    shadowOpacity: 0.1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
  },
  cardHeaderNum: {
    fontWeight: '800',
    color: '#2563EB',
  },
  cardInterior: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 10,
    overflow: 'hidden',
  },

  // Footer Bar (Image Matching)
  footerBar: {
    width: '100%',
    maxWidth: 1440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerTrustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerTrustText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  footerDivider: {
    color: '#334155',
    fontSize: 12,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerBrandText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

// ── MOCKUPS STYLES ───────────────────────────────────────────────────
const mockStyles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    gap: 8,
  },
  miniTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  miniAvatarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  greetingBold: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  greetingSub: {
    fontSize: 9,
    color: '#64748B',
  },
  miniPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniPillText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiLabel: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: '500',
  },
  kpiVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 1,
  },
  kpiTrendGreen: {
    fontSize: 8,
    color: '#16A34A',
    fontWeight: '700',
  },

  // Split Row
  splitRow: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  chartBox: {
    flex: 1.2,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'space-between',
  },
  boxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boxTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  microTab: {
    fontSize: 8,
    fontWeight: '600',
    color: '#64748B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  microTabActive: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
  },
  waveChartWrap: {
    height: 70,
    justifyContent: 'flex-end',
    gap: 4,
  },
  waveBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: 4,
  },
  chartBar: {
    width: 8,
    borderRadius: 2,
    backgroundColor: '#16A34A',
  },
  microAxis: {
    fontSize: 7,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Donut & Legend
  donutBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'space-between',
  },
  donutMock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  donutCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 5,
    borderColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterVal: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F172A',
  },
  legendItem: {
    fontSize: 8,
    color: '#475569',
    fontWeight: '500',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  miniActionBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
  },
  miniActionText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Search & Chips
  searchMock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flex: 1,
    marginRight: 6,
  },
  searchMockText: {
    fontSize: 9,
    color: '#94A3B8',
    marginLeft: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 4,
  },
  microChip: {
    fontSize: 8,
    fontWeight: '600',
    color: '#475569',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  microChipActive: {
    backgroundColor: '#2563EB',
    color: '#FFFFFF',
  },

  // Retail Product Grid
  prodGridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  prodMiniCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  prodMiniName: {
    fontSize: 8,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  prodMiniPrice: {
    fontSize: 8,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Cart Pane
  cartPane: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
  },
  cartTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cartLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  cartItemName: {
    fontSize: 8,
    color: '#334155',
    flex: 1,
  },
  cartItemPrice: {
    fontSize: 8,
    fontWeight: '600',
    color: '#0F172A',
  },
  cartTotalsWrap: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 4,
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subText: {
    fontSize: 8,
    color: '#64748B',
  },
  subVal: {
    fontSize: 8,
    color: '#0F172A',
    fontWeight: '600',
  },
  finalTotalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
  finalTotalVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  cartBtnsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingVertical: 3,
    alignItems: 'center',
  },
  btnOutlineText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#475569',
  },
  btnSolidGreen: {
    flex: 1.5,
    backgroundColor: '#16A34A',
    borderRadius: 4,
    paddingVertical: 3,
    alignItems: 'center',
  },
  btnSolidGreenText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSolidOrange: {
    backgroundColor: '#EA580C',
    borderRadius: 4,
    paddingVertical: 4,
    alignItems: 'center',
    marginTop: 4,
  },
  btnSolidBlue: {
    backgroundColor: '#2563EB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  btnSolidBlueText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Tables
  tableGridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  tablePill: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableVacant: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  tableOccupied: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  tableNum: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0F172A',
  },
  tableStatus: {
    fontSize: 7,
    fontWeight: '600',
    color: '#475569',
  },
  chefBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  chefBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Table Component
  tableWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#0F172A',
  },
  tdSub: {
    fontSize: 8,
    color: '#64748B',
  },
  tdBold: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 7,
    fontWeight: '700',
  },

  // B2B Wholesale
  b2bCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  b2bName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  b2bGst: {
    fontSize: 7,
    color: '#64748B',
  },

  // KDS Dark Tickets
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  kdsTicket: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 6,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  kdsTicketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kdsTicketNum: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  kdsTicketTime: {
    fontSize: 7,
    color: '#94A3B8',
  },
  kdsMeta: {
    fontSize: 8,
    fontWeight: '700',
    color: '#38BDF8',
  },
  kdsItem: {
    fontSize: 8,
    color: '#CBD5E1',
  },
  kdsStatusBtn: {
    borderRadius: 4,
    paddingVertical: 3,
    alignItems: 'center',
    marginTop: 4,
  },
  kdsStatusText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // GST Actions
  gstActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  gstActionText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#2563EB',
  },
  taxBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // Settings
  settingNav: {
    fontSize: 8,
    color: '#64748B',
    paddingVertical: 2,
    fontWeight: '500',
  },
  settingNavActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  inputMock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputMockLabel: {
    fontSize: 7,
    color: '#64748B',
  },
  inputMockVal: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0F172A',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  switchActive: {
    width: 24,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchKnob: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },

  // Integrations
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  integrationIconBg: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mobile POS Phone Frame
  mobileFrameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneBezel: {
    width: 170,
    height: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: '#334155',
    justifyContent: 'space-between',
  },
  phoneNotch: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  mobileTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 4,
    padding: 4,
  },
  mobileBrand: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mobileChipRow: {
    flexDirection: 'row',
    gap: 3,
    marginVertical: 4,
  },
  mobileChip: {
    fontSize: 7,
    color: '#94A3B8',
    backgroundColor: '#1E293B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  mobileChipActive: {
    backgroundColor: '#16A34A',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  mobileProdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
  },
  mobileProdBox: {
    width: '48%',
    backgroundColor: '#1E293B',
    borderRadius: 4,
    padding: 4,
  },
  mobileProdName: {
    fontSize: 7,
    color: '#F8FAFC',
    fontWeight: '600',
  },
  mobileProdPrice: {
    fontSize: 7,
    color: '#16A34A',
    fontWeight: '700',
  },
  mobileBottomCart: {
    backgroundColor: '#1E293B',
    borderRadius: 6,
    padding: 4,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  mobileCartQty: {
    fontSize: 7,
    color: '#94A3B8',
  },
  mobileCartTotal: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mobilePayBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 4,
    paddingVertical: 3,
    alignItems: 'center',
  },
  mobilePayBtnText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
