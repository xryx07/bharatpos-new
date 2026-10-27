import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Platform, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Divider, useTheme, Avatar, Portal, Dialog, TextInput, SegmentedButtons, Surface, Chip } from 'react-native-paper';
import { useAppTheme } from '../providers/ThemeProvider';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../providers/AuthProvider';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from '../lib/firestore_adapter';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Add Plus Jakarta Sans font link on Web platforms dynamically
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
  document.head.appendChild(fontLink);
}

function FeatureCard({ title, icon, desc }: any) {
  return (
    <Card style={styles.featureCard} elevation={0}>
      <Card.Content>
        <View style={styles.featureIconWrap}>
          <Icon name={icon} size={22} color="#16A34A" />
        </View>
        <Text style={styles.featureHeader}>{title}</Text>
        <Text style={styles.featureText}>{desc}</Text>
      </Card.Content>
    </Card>
  );
}

function StepItem({ num, title, desc }: any) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepBadge}><Text style={styles.stepNumText}>{num}</Text></View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{desc}</Text>
    </View>
  );
}

export default function Index() {
  const { isDarkMode } = useAppTheme();
  const appTheme = useTheme();

  const { user, loading, role } = useAuth();
  const { signup } = useLocalSearchParams();
  const { width: screenWidth } = useWindowDimensions();

  // Local state
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoVideoPlaying, setDemoVideoPlaying] = useState(false);
  
  // Interactive Demo Tab selection (Screenshot 1 tab tour)
  const [activeDemoTab, setActiveDemoTab] = useState('billing');
  
  // Screenshots filter tab (Screenshot 2 tabs: All Screens, Billing, Inventory, Reports, Analytics, Mobile)
  const [activeScreenTab, setActiveScreenTab] = useState('all');
  
  // FAQs expanded state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  
  // Pricing toggle (monthly/yearly)
  const [billingCycle, setBillingCycle] = useState('yearly');

  const scrollRef = React.useRef<ScrollView>(null);
  const [offsets, setOffsets] = useState<Record<string, number>>({});

  const handleLayout = (section: string, e: any) => {
    const y = e.nativeEvent.layout.y;
    setOffsets(prev => ({ ...prev, [section]: y }));
  };

  const scrollToSection = (section: string) => {
    const y = offsets[section];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y, animated: true });
    }
  };

  useEffect(() => {
    if (signup === 'true') {
      setShowSignupModal(true);
    }
  }, [signup]);

  useEffect(() => {
    // Only redirect if specifically loaded on an admin portal domain
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname.includes('pos-admin') && !user) {
        router.replace('/login' as any);
      }
    }
  }, [user]);

  const toggleFaq = (idx: number) => {
    setExpandedFaq(expandedFaq === idx ? null : idx);
  };

  // Signup form fields
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [gstType, setGstType] = useState('GST'); 
  const [operationMode, setOperationMode] = useState('Mobile Only'); 

  // Contact form fields
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  // Demo Booking states
  const [demoName, setDemoName] = useState('');
  const [demoMobile, setDemoMobile] = useState('');
  const [demoBusinessType, setDemoBusinessType] = useState('');
  const [demoDate, setDemoDate] = useState('');
  const [demoTime, setDemoTime] = useState('');
  const [demoNotes, setDemoNotes] = useState('');

  const handleCTA = () => {
    if (user) {
      if (role === 'vendor') router.push('/(vendor)/(tabs)' as any);
      else router.push('/(owner)' as any);
    } else {
      setShowSignupModal(true);
    }
  };

  const handleSignUpSubmit = async () => {
    if (!fullName || !shopName || !mobileNumber || !email || !password) {
      alert('Please fill in all the required fields.');
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        role: 'owner',
        subscription_plan: 'free_trial',
        subscription_start_date: new Date(),
        subscription_end_date: new Date(new Date().setDate(new Date().getDate() + 30)),
        storeName: shopName,
        isGstRegistered: gstType === 'GST',
        shopMode: operationMode,
        businessCategory: businessType,
        fullName,
        mobileNumber,
        email,
        permissions: {
          pos_access: true,
          stock_management: true,
          barcode_generation: true,
          reporting: true
        }
      });

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem('storeName', shopName);
        window.localStorage.setItem('isGstRegistered', String(gstType === 'GST'));
        window.localStorage.setItem('shopMode', operationMode);
        window.localStorage.setItem('businessCategory', businessType);
      }
      
      alert(`Thank you, ${fullName}! Your 30-Day Free Trial for "${shopName}" is now active. Redirecting to your dashboard...`);
      setShowSignupModal(false);
      router.replace('/(owner)' as any);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use' || error.message?.includes('email-already-in-use')) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.localStorage.setItem('storeName', shopName);
            window.localStorage.setItem('isGstRegistered', String(gstType === 'GST'));
            window.localStorage.setItem('shopMode', operationMode);
            window.localStorage.setItem('businessCategory', businessType);
          }
          alert(`Welcome back, ${fullName}! Logging you in...`);
          setShowSignupModal(false);
          router.replace('/(owner)' as any);
        } catch (signInError: any) {
          alert(`Email is already registered. Login failed: ${signInError.message}`);
        }
      } else {
        alert(`Signup Failed: ${error.message}`);
      }
    }
  };

  const handleDemoBooking = () => {
    if (!demoName || !demoMobile || !demoBusinessType || !demoDate || !demoTime) {
      alert('Please fill out all the fields to schedule your demo.');
      return;
    }
    try {
      const isWeb = Platform.OS === 'web';
      const apiHost = isWeb ? '' : 'https://bharatpos-new.vercel.app';
      fetch(`${apiHost}/api/send-support-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'support@bharatpos.systems',
          message: `Requesting product walkthrough demo.\nName: ${demoName}\nMobile: ${demoMobile}\nBusiness: ${demoBusinessType}\nDate: ${demoDate}\nTime: ${demoTime}\nNotes: ${demoNotes || 'None'}`,
          type: 'demo'
        })
      });
    } catch (e) {
      console.warn("Mail dispatch error:", e);
    }
    alert(`Thank you ${demoName}! Our retail product experts will reach out to you at ${demoMobile} to confirm your walkthrough for ${demoDate} at ${demoTime}.`);
    setShowDemoModal(false);
    setDemoName(''); setDemoMobile(''); setDemoBusinessType(''); setDemoDate(''); setDemoTime(''); setDemoNotes('');
  };

  const faqs = [
    { q: "How does the barcode scanner work with the software?", a: "Our POS is plug-and-play with any standard USB or Bluetooth barcode scanner. Simply plug it into your laptop or tablet, click the scanning input, and items are scanned and added to the cart instantly. On mobile, you can use the built-in device camera as a high-speed scanner." },
    { q: "Can cashiers/workers use the mobile app while I use the laptop?", a: "Yes, absolutely! Our system supports real-time multi-device concurrent sync. Your workers can check out customers on their mobile phones while you oversee analytics and ledgers live on your laptop." },
    { q: "Can I run this on my laptop as well?", a: "Yes, our POS is fully web-responsive and optimized for desktops, laptops, tablets, and mobile viewports. You can open it in any web browser." },
    { q: "Is GST calculation included in bills?", a: "Yes, the POS auto-computes SGST, CGST, and IGST according to your custom default rates. Tax is itemized on prints, and you can export audit CSVs for easy GSTR filing." },
    { q: "Can I download PDF reports?", a: "Yes. Day Books, Ledgers, GST Returns summaries, P&L reports, and invoice logs can all be exported as formatted PDF tables or downloaded in CSV spreadsheet formats." },
    { q: "What happens after my subscription expires?", a: "Your billing terminal locks temporarily but your data is preserved safely on our Firestore servers. You can renew your subscription plan at any time to resume terminal access." },
    { q: "Can I upgrade or renew my plan anytime?", a: "Yes. You can upgrade, renew, or add devices to your active plan from the 'Upgrade' screen in your Owner Settings menu instantly." }
  ];



  return (
      <View style={styles.container}>
            {/* ── 1. TOP NAVBAR (Image 1 Matching) ────────────────── */}
      <View style={styles.header}>
        {/* Brand Logo with Subtitle */}
        <TouchableOpacity 
          style={styles.logoRow} 
          activeOpacity={0.8}
          onPress={() => scrollToSection('home')}
        >
          <View style={styles.logoIconBg}>
            <Icon name="fire" size={22} color="#FFFFFF" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.logoText}>BharatPOS</Text>
            <Text style={styles.logoSubtitle}>Simple. Smart. For Every Business.</Text>
          </View>
        </TouchableOpacity>

        {/* Center Nav Links */}
        {screenWidth > 1080 && (
          <View style={styles.navLinks}>
            <TouchableOpacity onPress={() => scrollToSection('home')} style={styles.navLinkItemActive}>
              <Text style={styles.navLinkTextActive}>Home</Text>
              <View style={styles.navActiveDot} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => scrollToSection('features')} style={styles.navLinkItem}>
              <Text style={styles.navLinkText}>Features</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => scrollToSection('pricing')} style={styles.navLinkItem}>
              <Text style={styles.navLinkText}>Pricing</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => scrollToSection('solutions')} style={styles.navLinkItem}>
              <Text style={styles.navLinkText}>Solutions</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => scrollToSection('demo')} style={[styles.navLinkItem, { flexDirection: 'row', alignItems: 'center' }]}>
              <Text style={styles.navLinkText}>Resources</Text>
              <Icon name="chevron-down" size={14} color="#64748B" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => scrollToSection('contact')} style={styles.navLinkItem}>
              <Text style={styles.navLinkText}>About</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Right Search + Auth Buttons */}
        <View style={styles.headerRight}>
          {screenWidth > 850 && (
            <View style={styles.navSearchPill}>
              <Icon name="magnify" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
              <TextInput
                placeholder="Search anything..."
                placeholderTextColor="#94A3B8"
                style={styles.navSearchInput}
                dense
              />
            </View>
          )}

          {user ? (
            <>
              <TouchableOpacity
                style={styles.headerBtnSolid}
                onPress={() => {
                  if (role === 'vendor') router.push('/(vendor)/(tabs)' as any);
                  else router.push('/(owner)' as any);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.btnLabelSolid}>Go to Dashboard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtnOutline}
                onPress={async () => {
                  await auth.signOut();
                  if (typeof window !== 'undefined') window.localStorage.clear();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.btnLabelOutline}>Logout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.headerBtnOutline}
                onPress={() => router.push('/(auth)/login' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnLabelOutline}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtnSolid}
                onPress={() => router.push('/(auth)/signup' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnLabelSolid}>Get Started Free</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* ── 2. HERO SECTION WITH DUAL OPERATING CARDS (Image 1) ── */}
        <View style={styles.heroSectionWrap} onLayout={(e) => handleLayout('home', e)}>
          {/* Top Indian SaaS Platform Pill Badge */}
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroFlagBadge}>
              <Text style={styles.heroFlagEmoji}>🇮🇳</Text>
              <Text style={styles.heroFlagText}>India's All-in-One POS & Business Management Platform</Text>
            </View>
          </View>

          {/* Main Hero Heading */}
          <View style={styles.heroHeadingWrap}>
            <Text style={styles.heroMainTitle}>
              {"The All-in-One POS Solution\n"}
              <Text style={{ color: "#0F172A" }}>for </Text>
              <Text style={{ color: "#2563EB" }}>Retail </Text>
              <Text style={{ color: "#0F172A" }}>& </Text>
              <Text style={{ color: "#16A34A" }}>Restaurant</Text>
            </Text>
            
            {/* Playful Handwritten Annotation (Top Right) */}
            {screenWidth > 860 && (
              <View style={styles.heroDoodleBadge}>
                <Text style={styles.heroDoodleText}>One Platform</Text>
                <Text style={styles.heroDoodleSub}>Two Powerful POS</Text>
                <Text style={styles.heroDoodleSub}>Solutions ⤷</Text>
              </View>
            )}
          </View>

          {/* Subtitle Description */}
          <Text style={styles.heroSubHeadingGreen}>Simple. Powerful. Built for India.</Text>
          <Text style={styles.heroSubDescription}>
            Manage your sales, inventory, billing, customers and more — with BharatPOS. Choose your business type and get started in minutes.
          </Text>

          {/* ── THE TWO HERO OPERATING MODE CARDS ── */}
          <View style={[styles.dualModeCardsGrid, { flexDirection: screenWidth > 960 ? 'row' : 'column' }]}>
            
            {/* 1. Shop POS Card (Retail & Wholesale) */}
            <View style={[styles.modeCardWrapper, styles.shopModeCard, { width: screenWidth > 960 ? '49%' : '100%' }]}>
              <View style={styles.modeCardContent}>
                {/* Header Icon + Title */}
                <View style={styles.modeCardTopHeader}>
                  <View style={styles.modeIconCircleBlue}>
                    <Icon name="cart-outline" size={24} color="#FFFFFF" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.modeCardTitle}>Shop POS</Text>
                    <Text style={styles.modeCardSubtitle}>Retail & Wholesale</Text>
                  </View>
                </View>

                <Text style={styles.modeCardDesc}>
                  Perfect for kirana stores, supermarkets, wholesalers and distributors.
                </Text>

                {/* Primary CTA Launcher */}
                <TouchableOpacity
                  style={styles.modeBtnBlue}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.localStorage.setItem('posBusinessMode', 'retail');
                      window.dispatchEvent(new Event('posBusinessModeChanged'));
                    }
                    router.push('/(owner)/pos_billing' as any);
                  }}
                >
                  <Text style={styles.modeBtnText}>Get Started  →</Text>
                </TouchableOpacity>

                {/* 4 Feature Badges */}
                <View style={styles.modeChecklistWrap}>
                  <Text style={styles.modeCheckItem}><Text style={styles.checkBlue}>✓</Text> Fast Billing</Text>
                  <Text style={styles.modeCheckItem}><Text style={styles.checkBlue}>✓</Text> Inventory</Text>
                  <Text style={styles.modeCheckItem}><Text style={styles.checkBlue}>✓</Text> GST Invoicing</Text>
                  <Text style={styles.modeCheckItem}><Text style={styles.checkBlue}>✓</Text> Purchase Orders</Text>
                </View>
              </View>

              {/* Realistic Hardware Terminal Mockup */}
              <View style={styles.terminalVisualWrap}>
                <View style={styles.posMachineMock}>
                  <View style={styles.posScreenBezel}>
                    <View style={styles.posScreenHeader}>
                      <View style={{ flexDirection: 'row', gap: 3 }}>
                        <View style={[styles.screenDot, { backgroundColor: '#EF4444' }]} />
                        <View style={[styles.screenDot, { backgroundColor: '#F59E0B' }]} />
                        <View style={[styles.screenDot, { backgroundColor: '#10B981' }]} />
                      </View>
                      <Text style={styles.screenStoreName}>Store Terminal · Retail [F2]</Text>
                    </View>
                    <View style={styles.posScreenBody}>
                      <View style={styles.posMockGrid}>
                        <View style={styles.posGridItem}><Icon name="shaker-outline" size={14} color="#0284C7" /><Text style={styles.posGridPrice}>₹28</Text></View>
                        <View style={styles.posGridItem}><Icon name="bottle-tonic-outline" size={14} color="#0284C7" /><Text style={styles.posGridPrice}>₹145</Text></View>
                        <View style={styles.posGridItem}><Icon name="cup-water" size={14} color="#0284C7" /><Text style={styles.posGridPrice}>₹64</Text></View>
                        <View style={styles.posGridItem}><Icon name="cookie" size={14} color="#0284C7" /><Text style={styles.posGridPrice}>₹30</Text></View>
                      </View>
                      <View style={styles.posMockBill}>
                        <Text style={styles.posBillRow}>Items: 4 · Total</Text>
                        <Text style={styles.posBillTotal}>₹267.00</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.posMachineStand} />
                  <View style={styles.posMachineBase} />
                </View>
                {/* Accompanying Scanner & Printer */}
                <View style={styles.printerScannerRow}>
                  <View style={styles.miniThermalPrinter}>
                    <View style={styles.printerSlot} />
                    <Icon name="receipt" size={12} color="#94A3B8" />
                  </View>
                  <View style={styles.miniBarcodeGun}>
                    <Icon name="barcode-scan" size={14} color="#0284C7" />
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Café & Restaurant POS Card */}
            <View style={[styles.modeCardWrapper, styles.cafeModeCard, { width: screenWidth > 960 ? '49%' : '100%' }]}>
              <View style={styles.modeCardContent}>
                {/* Header Icon + Title */}
                <View style={styles.modeCardTopHeader}>
                  <View style={styles.modeIconCircleOrange}>
                    <Icon name="silverware-fork-knife" size={24} color="#FFFFFF" />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.modeCardTitle}>Café & Restaurant POS</Text>
                    <Text style={styles.modeCardSubtitle}>Dine-In | Takeaway | Delivery</Text>
                  </View>
                </View>

                <Text style={styles.modeCardDesc}>
                  Manage tables, orders, kitchen, menu, and customer experience — all in one place.
                </Text>

                {/* Primary CTA Launcher */}
                <TouchableOpacity
                  style={styles.modeBtnOrange}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.localStorage.setItem('posBusinessMode', 'restaurant');
                      window.dispatchEvent(new Event('posBusinessModeChanged'));
                    }
                    router.push('/(owner)/tables_kot' as any);
                  }}
                >
                  <Text style={styles.modeBtnText}>Get Started  →</Text>
                </TouchableOpacity>

                {/* 4 Feature Badges */}
                <View style={styles.modeChecklistWrap}>
                  <Text style={styles.modeCheckItem}><Text style={styles.checkOrange}>✓</Text> Table Management</Text>
                  <Text style={styles.modeCheckItem}><Text style={styles.checkOrange}>✓</Text> KOT & Kitchen Display</Text>
                  <Text style={styles.modeCheckItem}><Text style={styles.checkOrange}>✓</Text> Online Orders</Text>
                  <Text style={styles.modeCheckItem}><Text style={styles.checkOrange}>✓</Text> Food Costing</Text>
                </View>
              </View>

              {/* Realistic Hardware Terminal Mockup */}
              <View style={styles.terminalVisualWrap}>
                <View style={styles.posMachineMockDark}>
                  <View style={styles.posScreenBezelDark}>
                    <View style={styles.posScreenHeaderDark}>
                      <View style={{ flexDirection: 'row', gap: 3 }}>
                        <View style={[styles.screenDot, { backgroundColor: '#EF4444' }]} />
                        <View style={[styles.screenDot, { backgroundColor: '#F59E0B' }]} />
                        <View style={[styles.screenDot, { backgroundColor: '#10B981' }]} />
                      </View>
                      <Text style={styles.screenStoreNameDark}>Sunrise Cafe · Dine In [T3]</Text>
                    </View>
                    <View style={styles.posScreenBodyDark}>
                      <View style={styles.tableMiniGrid}>
                        <View style={[styles.tablePillMini, { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)' }]}><Text style={[styles.tablePillTextMini, { color: '#EF4444' }]}>T1 (Occ)</Text></View>
                        <View style={[styles.tablePillMini, { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' }]}><Text style={[styles.tablePillTextMini, { color: '#10B981' }]}>T2 (Free)</Text></View>
                        <View style={[styles.tablePillMini, { borderColor: '#10B981', backgroundColor: '#10B981' }]}><Text style={[styles.tablePillTextMini, { color: '#FFFFFF' }]}>T3 (Active)</Text></View>
                        <View style={[styles.tablePillMini, { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)' }]}><Text style={[styles.tablePillTextMini, { color: '#F59E0B' }]}>T4 (Res)</Text></View>
                      </View>
                      <View style={styles.posMockKotTicket}>
                        <Text style={styles.posKotText}>#KOT-1025 · Paneer Tikka (2)</Text>
                        <Text style={styles.posKotStatus}>Ready in 4 min</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.posMachineStandDark} />
                  <View style={styles.posMachineBaseDark} />
                </View>
                {/* Table Stand Marker + Gourmet Dish */}
                <View style={styles.printerScannerRow}>
                  <View style={styles.tableNumberStand}>
                    <Text style={styles.tableStandNumber}>12</Text>
                  </View>
                  <View style={styles.miniFoodDish}>
                    <Icon name="silverware" size={14} color="#EA580C" />
                  </View>
                </View>
              </View>
            </View>

          </View>

          {/* ── 3. TRUST & VALUE PILL STRIP (5 items from Image 1) ── */}
          <View style={styles.trustPillStripRow}>
            <View style={styles.trustPillItem}>
              <View style={styles.trustIconWrap}><Icon name="shield-check" size={16} color="#0284C7" /></View>
              <View>
                <Text style={styles.trustPillTitle}>Secure & Reliable</Text>
                <Text style={styles.trustPillSub}>Your data is always protected</Text>
              </View>
            </View>

            <View style={styles.trustPillItem}>
              <View style={styles.trustIconWrap}><Icon name="cloud" size={16} color="#0284C7" /></View>
              <View>
                <Text style={styles.trustPillTitle}>Cloud Based</Text>
                <Text style={styles.trustPillSub}>Access from anywhere</Text>
              </View>
            </View>

            <View style={styles.trustPillItem}>
              <View style={styles.trustIconWrap}><Icon name="headphones" size={16} color="#0284C7" /></View>
              <View>
                <Text style={styles.trustPillTitle}>24/7 Support</Text>
                <Text style={styles.trustPillSub}>We're here when you need us</Text>
              </View>
            </View>

            <View style={styles.trustPillItem}>
              <View style={styles.trustIconWrap}><Icon name="file-percent" size={16} color="#0284C7" /></View>
              <View>
                <Text style={styles.trustPillTitle}>GST Ready</Text>
                <Text style={styles.trustPillSub}>Simplify your tax compliance</Text>
              </View>
            </View>

            <View style={styles.trustPillItem}>
              <View style={styles.trustIconWrap}><Text style={{ fontSize: 13 }}>🇮🇳</Text></View>
              <View>
                <Text style={styles.trustPillTitle}>Made for India</Text>
                <Text style={styles.trustPillSub}>Local support & compliance</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 4. "WHY BHARATPOS?" + 8 FEATURE TILES (Image 1) ── */}
        <View style={styles.whySectionContainer} onLayout={(e) => handleLayout('features', e)}>
          <View style={[styles.whySectionSplit, { flexDirection: screenWidth > 960 ? 'row' : 'column' }]}>
            
            {/* Left Column: Heading + Description + Explore CTA */}
            <View style={[styles.whyLeftCol, { width: screenWidth > 960 ? '38%' : '100%' }]}>
              <View style={styles.whyTagPill}>
                <Text style={styles.whyTagText}>Why BharatPOS?</Text>
              </View>
              <Text style={styles.whyMainHeading}>
                {"Everything You Need\nTo Grow, In One Place"}
              </Text>
              <Text style={styles.whySubDesc}>
                From sales to stock, from kitchen to accounts — BharatPOS brings all your business operations together, so you can focus on what matters most.
              </Text>

              <TouchableOpacity
                style={styles.exploreAllFeaturesBtn}
                activeOpacity={0.8}
                onPress={() => scrollToSection('solutions')}
              >
                <Text style={styles.exploreAllBtnText}>Explore All Features  →</Text>
              </TouchableOpacity>
            </View>

            {/* Right Column: 4x2 Grid of 8 Modular Tiles */}
            <View style={[styles.whyRightGrid, { width: screenWidth > 960 ? '60%' : '100%' }]}>
              {/* Tile 1 */}
              <View style={styles.featureTileItem}>
                <View style={[styles.tileIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="cart" size={18} color="#2563EB" />
                </View>
                <Text style={styles.tileTitle}>Sales & Billing</Text>
                <Text style={styles.tileDesc}>Fast and accurate billing with multiple payment options.</Text>
              </View>

              {/* Tile 2 */}
              <View style={styles.featureTileItem}>
                <View style={[styles.tileIconBox, { backgroundColor: '#ECFEFF' }]}>
                  <Icon name="package-variant-closed" size={18} color="#0891B2" />
                </View>
                <Text style={styles.tileTitle}>Inventory Management</Text>
                <Text style={styles.tileDesc}>Track stock, manage godowns, set reorder alerts.</Text>
              </View>

              {/* Tile 3 */}
              <View style={styles.featureTileItem}>
                <View style={[styles.tileIconBox, { backgroundColor: '#F5F3FF' }]}>
                  <Icon name="file-document-outline" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.tileTitle}>GST & Compliance</Text>
                <Text style={styles.tileDesc}>Generate invoices, GSTR reports and stay tax ready.</Text>
              </View>

              {/* Tile 4 */}
              <View style={styles.featureTileItem}>
                <View style={[styles.tileIconBox, { backgroundColor: '#EEF2FF' }]}>
                  <Icon name="calculator" size={18} color="#4F46E5" />
                </View>
                <Text style={styles.tileTitle}>Accounting</Text>
                <Text style={styles.tileDesc}>Cash book, ledgers, P&L, balance sheet and more.</Text>
              </View>

              {/* Tile 5 */}
              <View style={styles.featureTileItem}>
                <View style={[styles.tileIconBox, { backgroundColor: '#F0FDFA' }]}>
                  <Icon name="account-group-outline" size={18} color="#0D9488" />
                </View>
                <Text style={styles.tileTitle}>Customer & Supplier</Text>
                <Text style={styles.tileDesc}>Manage customers, credit limits, suppliers and purchases.</Text>
              </View>

              {/* Tile 6 */}
              <View style={styles.featureTileItem}>
                <View style={[styles.tileIconBox, { backgroundColor: '#F0F9FF' }]}>
                  <Icon name="chart-bar" size={18} color="#0284C7" />
                </View>
                <Text style={styles.tileTitle}>Reports & Analytics</Text>
                <Text style={styles.tileDesc}>Get real-time insights and business reports.</Text>
              </View>

              {/* Tile 7 */}
              <View style={styles.featureTileItem}>
                <View style={[styles.tileIconBox, { backgroundColor: '#FAF5FF' }]}>
                  <Icon name="map-marker-radius-outline" size={18} color="#9333EA" />
                </View>
                <Text style={styles.tileTitle}>Multi-Branch</Text>
                <Text style={styles.tileDesc}>Run multiple branches from a single dashboard.</Text>
              </View>

              {/* Tile 8 */}
              <View style={styles.featureTileItem}>
                <View style={[styles.tileIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="link-variant" size={18} color="#059669" />
                </View>
                <Text style={styles.tileTitle}>Integrations</Text>
                <Text style={styles.tileDesc}>Connect with payment gateways, printers, KDS and more.</Text>
              </View>
            </View>

          </View>
        </View>

        {/* 4. HOW IT WORKS SECTION */}
        <View style={[styles.section, { backgroundColor: '#F8FAFC' }]} onLayout={(e) => handleLayout('solutions', e)}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <Text style={styles.sectionSubtitle}>Start in minutes, grow your business faster. No complex setups needed.</Text>

          <View style={styles.stepsFlowContainer}>
            <StepItem num="1" title="Create Account" desc="Sign up and create your shop account in seconds with basic business details." />
            <View style={styles.stepConnector} />
            <StepItem num="2" title="Choose Plan" desc="Select the best subscription plan that suits your team size and terminal seats." />
            <View style={styles.stepConnector} />
            <StepItem num="3" title="Add Products" desc="Add your products, set pricing, scan UPCs, or import stock lists via CSV." />
            <View style={styles.stepConnector} />
            <StepItem num="4" title="Start Billing" desc="Your workers start billing immediately from mobile, tablet, or laptop terminals." />
            <View style={styles.stepConnector} />
            <StepItem num="5" title="Track & Grow" desc="Track sales, stock movements, cashier performance, and PDF tax reports live." />
          </View>
        </View>

        {/* 5. SEE SMARTPOS IN ACTION (INTERACTIVE SHOWCASE) */}
        <View style={styles.section} onLayout={(e) => handleLayout('demo', e)}>
          <Text style={styles.sectionTitle}>See BharatPOS in Action</Text>
          <Text style={styles.sectionSubtitle}>Explore the premium terminal interfaces tailored for maximum speed.</Text>

          <View style={styles.showcaseTabsRow}>
            <TouchableOpacity onPress={() => setActiveDemoTab('billing')} style={[styles.showcaseTab, activeDemoTab === 'billing' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeDemoTab === 'billing' && styles.showcaseTabTextActive]}>Billing Screen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveDemoTab('inventory')} style={[styles.showcaseTab, activeDemoTab === 'inventory' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeDemoTab === 'inventory' && styles.showcaseTabTextActive]}>Inventory Management</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveDemoTab('dashboard')} style={[styles.showcaseTab, activeDemoTab === 'dashboard' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeDemoTab === 'dashboard' && styles.showcaseTabTextActive]}>Sales Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveDemoTab('reports')} style={[styles.showcaseTab, activeDemoTab === 'reports' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeDemoTab === 'reports' && styles.showcaseTabTextActive]}>Reports & Analytics</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Screen Container */}
          <Card style={styles.interactiveCard} elevation={0}>
            {activeDemoTab === 'billing' && (
              <View style={styles.billingShowcaseWrapper}>
                <View style={styles.billingShowcaseLeft}>
                  {/* Table Header */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableCol, { flex: 2, fontWeight: 'bold' }]}>Product</Text>
                    <Text style={[styles.tableCol, { textAlign: 'center', fontWeight: 'bold' }]}>Qty</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right', fontWeight: 'bold' }]}>Price</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right', fontWeight: 'bold' }]}>Total</Text>
                  </View>
                  <Divider />
                  
                  {/* Table Rows */}
                  <View style={styles.tableRowItem}>
                    <Text style={[styles.tableCol, { flex: 2, color: '#1E293B' }]}>Amul Butter 100g</Text>
                    <Text style={[styles.tableCol, { textAlign: 'center' }]}>1</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right' }]}>₹52.00</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right', color: '#1E293B', fontWeight: '500' }]}>₹52.00</Text>
                  </View>
                  <Divider />
                  
                  <View style={styles.tableRowItem}>
                    <Text style={[styles.tableCol, { flex: 2, color: '#1E293B' }]}>Britannia Marie Gold 250g</Text>
                    <Text style={[styles.tableCol, { textAlign: 'center' }]}>2</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right' }]}>₹54.00</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right', color: '#1E293B', fontWeight: '500' }]}>₹108.00</Text>
                  </View>
                  <Divider />

                  <View style={styles.tableRowItem}>
                    <Text style={[styles.tableCol, { flex: 2, color: '#1E293B' }]}>Surf Excel 1kg</Text>
                    <Text style={[styles.tableCol, { textAlign: 'center' }]}>1</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right' }]}>₹240.00</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right', color: '#1E293B', fontWeight: '500' }]}>₹240.00</Text>
                  </View>
                  <Divider />

                  <View style={styles.tableRowItem}>
                    <Text style={[styles.tableCol, { flex: 2, color: '#1E293B' }]}>Tata Tea Premium 250g</Text>
                    <Text style={[styles.tableCol, { textAlign: 'center' }]}>1</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right' }]}>₹156.00</Text>
                    <Text style={[styles.tableCol, { textAlign: 'right', color: '#1E293B', fontWeight: '500' }]}>₹156.00</Text>
                  </View>
                </View>

                {/* Billing Summary Sidebar */}
                <View style={styles.billingShowcaseRight}>
                  <View style={styles.scanBarcodeBox}>
                    <Text style={styles.scanBarcodeLabel}>Scan Barcode</Text>
                    <View style={styles.scanBarcodeField}>
                      <Text style={styles.scanBarcodePlaceholder}>Add product...</Text>
                      <Icon name="barcode" size={20} color="#64748B" />
                    </View>
                  </View>

                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryText}>Total Items</Text>
                    <Text style={[styles.summaryVal, { fontWeight: '700' }]}>5</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryText}>Sub Total</Text>
                    <Text style={styles.summaryVal}>₹556.00</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryText}>Discount</Text>
                    <Text style={[styles.summaryVal, { color: '#EF4444' }]}>- ₹6.00</Text>
                  </View>
                  <Divider style={{ marginVertical: 12 }} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryText, { fontSize: 16, fontWeight: '700', color: '#0F172A' }]}>Grand Total</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#16A34A' }}>₹550.00</Text>
                  </View>

                  <View style={styles.summaryActions}>
                    <TouchableOpacity style={styles.heldBillBtn}>
                      <Text style={styles.heldBillText}>Held Bill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.printBillBtn} onPress={() => alert('Printing receipt standard dispatch layout...')}>
                      <Text style={styles.printBillText}>Print Bill</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {activeDemoTab === 'inventory' && (
              <View style={[styles.billingShowcaseWrapper, { flexDirection: 'column', padding: 20 }]}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableCol, { flex: 2, fontWeight: 'bold' }]}>Product</Text>
                  <Text style={[styles.tableCol, { fontWeight: 'bold' }]}>SKU</Text>
                  <Text style={[styles.tableCol, { fontWeight: 'bold' }]}>Category</Text>
                  <Text style={[styles.tableCol, { textAlign: 'center', fontWeight: 'bold' }]}>Stock</Text>
                  <Text style={[styles.tableCol, { textAlign: 'right', fontWeight: 'bold' }]}>Price</Text>
                  <Text style={[styles.tableCol, { textAlign: 'center', fontWeight: 'bold' }]}>Status</Text>
                </View>
                <Divider />

                <View style={styles.tableRowItem}>
                  <Text style={[styles.tableCol, { flex: 2, color: '#1E293B', fontWeight: '500' }]}>Amul Butter 100g</Text>
                  <Text style={styles.tableCol}>AMUL001</Text>
                  <Text style={styles.tableCol}>Dairy</Text>
                  <Text style={[styles.tableCol, { textAlign: 'center' }]}>89</Text>
                  <Text style={[styles.tableCol, { textAlign: 'right' }]}>₹52.00</Text>
                  <View style={[styles.statusBadgeBg, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.statusBadgeText, { color: '#16A34A' }]}>🟢 In Stock</Text></View>
                </View>
                <Divider />

                <View style={styles.tableRowItem}>
                  <Text style={[styles.tableCol, { flex: 2, color: '#1E293B', fontWeight: '500' }]}>Britannia Marie Gold 250g</Text>
                  <Text style={styles.tableCol}>BRIT002</Text>
                  <Text style={styles.tableCol}>Biscuits</Text>
                  <Text style={[styles.tableCol, { textAlign: 'center' }]}>125</Text>
                  <Text style={[styles.tableCol, { textAlign: 'right' }]}>₹34.00</Text>
                  <View style={[styles.statusBadgeBg, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.statusBadgeText, { color: '#16A34A' }]}>🟢 In Stock</Text></View>
                </View>
                <Divider />

                <View style={styles.tableRowItem}>
                  <Text style={[styles.tableCol, { flex: 2, color: '#1E293B', fontWeight: '500' }]}>Surf Excel 1kg</Text>
                  <Text style={styles.tableCol}>SURF003</Text>
                  <Text style={styles.tableCol}>Detergent</Text>
                  <Text style={[styles.tableCol, { textAlign: 'center' }]}>3</Text>
                  <Text style={[styles.tableCol, { textAlign: 'right' }]}>₹240.00</Text>
                  <View style={[styles.statusBadgeBg, { backgroundColor: '#FEF9C3' }]}><Text style={[styles.statusBadgeText, { color: '#CA8A04' }]}>🟠 Low Stock</Text></View>
                </View>
                <Divider />

                <View style={styles.tableRowItem}>
                  <Text style={[styles.tableCol, { flex: 2, color: '#1E293B', fontWeight: '500' }]}>Maggi Noodles 70g</Text>
                  <Text style={styles.tableCol}>MAGG005</Text>
                  <Text style={styles.tableCol}>Noodles</Text>
                  <Text style={[styles.tableCol, { textAlign: 'center' }]}>0</Text>
                  <Text style={[styles.tableCol, { textAlign: 'right' }]}>₹12.00</Text>
                  <View style={[styles.statusBadgeBg, { backgroundColor: '#FEE2E2' }]}><Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>🔴 Out of Stock</Text></View>
                </View>
              </View>
            )}

            {activeDemoTab === 'dashboard' && (
              <View style={[styles.billingShowcaseWrapper, { flexDirection: 'column', padding: 24 }]}>
                <View style={[styles.mockCardsRow, { marginBottom: 20 }]}>
                  <View style={[styles.mockMiniCard, { padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }]}>
                    <Text style={styles.mockMiniLabel}>Sales Today</Text>
                    <Text style={[styles.mockMiniVal, { fontSize: 16 }]}>₹48,250.00</Text>
                    <Text style={[styles.mockMiniSub, { color: '#16A34A' }]}>▲ +12.5% vs yesterday</Text>
                  </View>
                  <View style={[styles.mockMiniCard, { padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }]}>
                    <Text style={styles.mockMiniLabel}>Stock Alerts</Text>
                    <Text style={[styles.mockMiniVal, { fontSize: 16 }]}>2 Items</Text>
                    <Text style={[styles.mockMiniSub, { color: '#EAB308' }]}>⚠ Low Stock Alert</Text>
                  </View>
                  <View style={[styles.mockMiniCard, { padding: 12, borderWidth: 1, borderColor: '#E2E8F0' }]}>
                    <Text style={styles.mockMiniLabel}>Total Profit</Text>
                    <Text style={[styles.mockMiniVal, { fontSize: 16 }]}>₹12,840.00</Text>
                    <Text style={[styles.mockMiniSub, { color: '#16A34A' }]}>▲ +10.8% vs yesterday</Text>
                  </View>
                </View>
                <View style={[styles.mockGraphPanel, { borderLeftWidth: 0, paddingLeft: 0 }]}>
                  <Text style={[styles.mockBlockTitle, { fontSize: 14 }]}>Monthly Sales Trend</Text>
                  <View style={[styles.mockGraphContainer, { height: 110 }]}>
                    <View style={styles.graphYAxis}>
                      <Text style={styles.graphYLabel}>75K</Text>
                      <Text style={styles.graphYLabel}>50K</Text>
                      <Text style={styles.graphYLabel}>25K</Text>
                      <Text style={styles.graphYLabel}>0</Text>
                    </View>
                    <View style={styles.graphArea}>
                      <View style={styles.gridLine} />
                      <View style={styles.gridLine} />
                      <View style={styles.gridLine} />
                      <View style={styles.chartLineWrapper}>
                        <View style={[styles.chartNode, { left: '10%', bottom: '25%' }]} />
                        <View style={[styles.chartNode, { left: '35%', bottom: '60%' }]} />
                        <View style={[styles.chartNode, { left: '60%', bottom: '40%' }]} />
                        <View style={[styles.chartNode, { left: '85%', bottom: '80%' }]} />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {activeDemoTab === 'reports' && (
              <View style={[styles.billingShowcaseWrapper, { padding: 24, gap: 16 }]}>
                <Card style={styles.reportTile} elevation={0}>
                  <View style={styles.reportIconBg}><Icon name="file-chart" size={24} color="#16A34A" /></View>
                  <Text style={styles.reportTileTitle}>GST Tax Reports</Text>
                  <Text style={styles.reportTileDesc}>Auto-generate GSTR-1, GSTR-3B filings data and HSN summaries formatted for immediate upload.</Text>
                  <TouchableOpacity style={styles.reportTileLink} onPress={() => alert('Downloading simulated GST report...')}>
                    <Text style={styles.reportLinkText}>Download PDF Report</Text>
                    <Icon name="download" size={14} color="#16A34A" />
                  </TouchableOpacity>
                </Card>

                <Card style={styles.reportTile} elevation={0}>
                  <View style={[styles.reportIconBg, { backgroundColor: '#EFF6FF' }]}><Icon name="book-open" size={24} color="#3B82F6" /></View>
                  <Text style={styles.reportTileTitle}>Store Day Book</Text>
                  <Text style={styles.reportTileDesc}>Track every cashier check-in, transaction logs, cash drops, bank transfers, and payment modes hourly.</Text>
                  <TouchableOpacity style={styles.reportTileLink} onPress={() => alert('Downloading simulated Day Book...')}>
                    <Text style={[styles.reportLinkText, { color: '#3B82F6' }]}>Export Spreadsheet</Text>
                    <Icon name="download" size={14} color="#3B82F6" />
                  </TouchableOpacity>
                </Card>

                <Card style={styles.reportTile} elevation={0}>
                  <View style={[styles.reportIconBg, { backgroundColor: '#FEF3C7' }]}><Icon name="cash-multiple" size={24} color="#D97706" /></View>
                  <Text style={styles.reportTileTitle}>Profit & Loss Ledger</Text>
                  <Text style={styles.reportTileDesc}>Automated accounting ledger recording wholesale inventory cost vs final checkout margins.</Text>
                  <TouchableOpacity style={styles.reportTileLink} onPress={() => alert('Downloading simulated P&L sheet...')}>
                    <Text style={[styles.reportLinkText, { color: '#D97706' }]}>View Balance Sheet</Text>
                    <Icon name="download" size={14} color="#D97706" />
                  </TouchableOpacity>
                </Card>
              </View>
            )}
          </Card>
        </View>

        {/* 6. SEE SMARTPOS IN ACTION - LIVE PREVIEWS GRID (Screenshot 2) */}
        <View style={[styles.section, { backgroundColor: '#F8FAFC' }]}>
          <Text style={styles.liveHeadingMini}>LIVE PREVIEW</Text>
          <Text style={styles.sectionTitle}>See BharatPOS in Action</Text>
          <Text style={styles.sectionSubtitle}>Explore the powerful features through our live demos and screenshots.</Text>

          <View style={styles.showcaseTabsRow}>
            <TouchableOpacity onPress={() => setActiveScreenTab('all')} style={[styles.showcaseTab, activeScreenTab === 'all' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeScreenTab === 'all' && styles.showcaseTabTextActive]}>All Screens</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveScreenTab('billing')} style={[styles.showcaseTab, activeScreenTab === 'billing' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeScreenTab === 'billing' && styles.showcaseTabTextActive]}>Billing</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveScreenTab('inventory')} style={[styles.showcaseTab, activeScreenTab === 'inventory' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeScreenTab === 'inventory' && styles.showcaseTabTextActive]}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveScreenTab('reports')} style={[styles.showcaseTab, activeScreenTab === 'reports' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeScreenTab === 'reports' && styles.showcaseTabTextActive]}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveScreenTab('analytics')} style={[styles.showcaseTab, activeScreenTab === 'analytics' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeScreenTab === 'analytics' && styles.showcaseTabTextActive]}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveScreenTab('mobile')} style={[styles.showcaseTab, activeScreenTab === 'mobile' && styles.showcaseTabActive]}>
              <Text style={[styles.showcaseTabText, activeScreenTab === 'mobile' && styles.showcaseTabTextActive]}>Mobile</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.screenshotGrid}>
            {(activeScreenTab === 'all' || activeScreenTab === 'billing') && (
              <Card style={styles.screenshotCard} elevation={0}>
                <View style={styles.screenshotContent}>
                  {/* Top Header Mock */}
                  <View style={styles.innerMockHeader}>
                    <Text style={styles.innerMockTitle}>BharatPOS</Text>
                    <Text style={styles.innerMockWalk}>Walk-in Customer</Text>
                  </View>
                  <View style={styles.innerBillingMockLayout}>
                    <View style={styles.innerBillingTable}>
                      <Text style={styles.innerMockTableHeader}>Product  |  Price  |  Stock</Text>
                      <Text style={styles.innerMockTableRow}>Britannia Marie Gold 250g | ₹34.00 | 125</Text>
                      <Text style={styles.innerMockTableRow}>Amul Butter 100g | ₹52.00 | 89</Text>
                      <Text style={styles.innerMockTableRow}>Tata Tea Premium 250g | ₹156.00 | 45</Text>
                    </View>
                    <View style={styles.innerBillingSidebar}>
                      <Text style={styles.innerSummaryLabel}>Cart (3 items)</Text>
                      <Text style={styles.innerSummaryText}>Subtotal: ₹262.00</Text>
                      <Text style={styles.innerSummaryText}>Discount: -₹12.00</Text>
                      <Text style={styles.innerSummaryText}>GST (6%): ₹12.50</Text>
                      <Text style={styles.innerSummaryTotal}>Total: ₹262.50</Text>
                    </View>
                  </View>
                </View>
                <Card.Content style={styles.screenshotCardText}>
                  <Text style={styles.screenshotCardTitle}>Billing Screen</Text>
                  <Text style={styles.screenshotCardDesc}>Fast and intuitive billing with barcode scanning, discounts, and multiple payment options.</Text>
                </Card.Content>
              </Card>
            )}

            {(activeScreenTab === 'all' || activeScreenTab === 'inventory') && (
              <Card style={styles.screenshotCard} elevation={0}>
                <View style={styles.screenshotContent}>
                  <View style={styles.innerMockHeader}>
                    <Text style={styles.innerMockTitle}>Inventory Management</Text>
                    <Text style={styles.innerMockWalk}>+ Add Product</Text>
                  </View>
                  <View style={[styles.innerBillingMockLayout, { flexDirection: 'column', padding: 8 }]}>
                    <Text style={styles.innerMockTableHeader}>Product | SKU | Stock | Status</Text>
                    <Text style={styles.innerMockTableRow}>Amul Butter 100g | AMUL001 | 89 | In Stock</Text>
                    <Text style={styles.innerMockTableRow}>Britannia Gold 250g | BRIT002 | 125 | In Stock</Text>
                    <Text style={styles.innerMockTableRow}>Surf Excel 1kg | SURF003 | 34 | In Stock</Text>
                    <Text style={styles.innerMockTableRow}>Tata Tea Premium 250g | TATA004 | 45 | In Stock</Text>
                  </View>
                </View>
                <Card.Content style={styles.screenshotCardText}>
                  <Text style={styles.screenshotCardTitle}>Inventory Management</Text>
                  <Text style={styles.screenshotCardDesc}>Real-time stock tracking, low stock alerts, and inventory control across all outlets.</Text>
                </Card.Content>
              </Card>
            )}

            {(activeScreenTab === 'all' || activeScreenTab === 'reports' || activeScreenTab === 'analytics') && (
              <Card style={styles.screenshotCard} elevation={0}>
                <View style={styles.screenshotContent}>
                  <View style={styles.innerMockHeader}>
                    <Text style={styles.innerMockTitle}>Reports & Analytics</Text>
                    <Text style={styles.innerMockWalk}>Export</Text>
                  </View>
                  <View style={[styles.innerBillingMockLayout, { padding: 8, gap: 4 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.miniOverviewLabel}>Total Sales</Text>
                      <Text style={styles.miniOverviewVal}>₹48,250.00</Text>
                      <Text style={styles.miniOverviewSub}>▲ +12.5% vs last 3 days</Text>
                      
                      <Text style={styles.miniOverviewLabel}>Total Orders</Text>
                      <Text style={styles.miniOverviewVal}>156</Text>
                      <Text style={styles.miniOverviewSub}>▲ +8.2% vs last 3 days</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.miniOverviewLabel}>Avg Order Value</Text>
                      <Text style={styles.miniOverviewVal}>₹309.29</Text>
                      <Text style={styles.miniOverviewSub}>▲ +4.1% vs last 3 days</Text>

                      <Text style={styles.miniOverviewLabel}>Total Profit</Text>
                      <Text style={styles.miniOverviewVal}>₹12,840.00</Text>
                      <Text style={styles.miniOverviewSub}>▲ +10.0% vs last 3 days</Text>
                    </View>
                  </View>
                </View>
                <Card.Content style={styles.screenshotCardText}>
                  <Text style={styles.screenshotCardTitle}>Reports & Analytics</Text>
                  <Text style={styles.screenshotCardDesc}>Detailed reports, charts, and insights to help grow your business.</Text>
                </Card.Content>
              </Card>
            )}

            {(activeScreenTab === 'all' || activeScreenTab === 'mobile') && (
              <Card style={styles.screenshotCard} elevation={0}>
                <View style={[styles.screenshotContent, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
                  {/* Phone frame */}
                  <View style={styles.miniPhoneFrame}>
                    <View style={styles.miniPhoneNotch} />
                    <Text style={styles.miniPhoneHeader}>BharatPOS</Text>
                    <Text style={styles.miniPhoneText}>Grand Total</Text>
                    <Text style={styles.miniPhonePrice}>₹262.50</Text>
                    <View style={styles.miniPhoneList}>
                      <Text style={styles.miniPhoneItem}>- Britannia Gold (x1)</Text>
                      <Text style={styles.miniPhoneItem}>- Amul Butter (x2)</Text>
                    </View>
                    <View style={styles.miniPhoneBtn}><Text style={styles.miniPhoneBtnText}>Pay Now</Text></View>
                  </View>
                  <Icon name="barcode-scan" size={48} color="#D1D5DB" />
                </View>
                <Card.Content style={styles.screenshotCardText}>
                  <Text style={styles.screenshotCardTitle}>Mobile Billing</Text>
                  <Text style={styles.screenshotCardDesc}>Bill from anywhere with our mobile app. Works offline and syncs automatically.</Text>
                </Card.Content>
              </Card>
            )}

            {(activeScreenTab === 'all' || activeScreenTab === 'reports') && (
              <Card style={styles.screenshotCard} elevation={0}>
                <View style={styles.screenshotContent}>
                  <View style={styles.innerMockHeader}>
                    <Text style={styles.innerMockTitle}>GST Reports</Text>
                    <Text style={styles.innerMockWalk}>GSTR-1</Text>
                  </View>
                  <View style={[styles.innerBillingMockLayout, { flexDirection: 'column', padding: 8, gap: 6 }]}>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      <View style={styles.miniGstCard}><Text style={styles.miniGstCardLabel}>Total Taxable Value</Text><Text style={styles.miniGstCardVal}>₹4,85,000.00</Text></View>
                      <View style={styles.miniGstCard}><Text style={styles.miniGstCardLabel}>CGST</Text><Text style={styles.miniGstCardVal}>₹21,825.00</Text></View>
                      <View style={styles.miniGstCard}><Text style={styles.miniGstCardLabel}>SGST</Text><Text style={styles.miniGstCardVal}>₹21,825.00</Text></View>
                    </View>
                    <Text style={styles.innerMockTableHeader}>HSN Code | Description | Taxable Value</Text>
                    <Text style={styles.innerMockTableRow}>1905 | Bread, biscuits, cakes | ₹1,25,000.00</Text>
                  </View>
                </View>
                <Card.Content style={styles.screenshotCardText}>
                  <Text style={styles.screenshotCardTitle}>GST & Tax Management</Text>
                  <Text style={styles.screenshotCardDesc}>Automated GST calculation, returns, and compliance made simple.</Text>
                </Card.Content>
              </Card>
            )}

            {(activeScreenTab === 'all' || activeScreenTab === 'analytics') && (
              <Card style={styles.screenshotCard} elevation={0}>
                <View style={styles.screenshotContent}>
                  <View style={styles.innerMockHeader}>
                    <Text style={styles.innerMockTitle}>Customer Management</Text>
                    <Text style={styles.innerMockWalk}>+ Add Customer</Text>
                  </View>
                  <View style={[styles.innerBillingMockLayout, { flexDirection: 'column', padding: 8 }]}>
                    <Text style={styles.innerMockTableHeader}>Customer Name | Phone | Total Due | Status</Text>
                    <Text style={styles.innerMockTableRow}>Rahul Sharma | 9876543210 | ₹1,250.00 | Active</Text>
                    <Text style={styles.innerMockTableRow}>Priya Patel | 9876543211 | ₹0.00 | Active</Text>
                    <Text style={styles.innerMockTableRow}>Amit Kumar | 9876543212 | ₹750.00 | Active</Text>
                    <Text style={styles.innerMockTableRow}>Neha Singh | 9876543213 | ₹0.00 | Inactive</Text>
                  </View>
                </View>
                <Card.Content style={styles.screenshotCardText}>
                  <Text style={styles.screenshotCardTitle}>Customer Management</Text>
                  <Text style={styles.screenshotCardDesc}>Manage customer details, purchase history, and outstanding dues.</Text>
                </Card.Content>
              </Card>
            )}
          </View>
        </View>

        
        {/* ── ABOUT BHARATPOS SECTION (Image 11) ── */}
        <View style={[styles.section, { backgroundColor: '#FFFFFF' }]} onLayout={(e) => handleLayout('about', e)}>
          <View style={[styles.aboutContainer, { flexDirection: screenWidth > 960 ? 'row' : 'column' }]}>
            {/* Left Story & Mission Column */}
            <View style={[styles.aboutLeftCol, { width: screenWidth > 960 ? '56%' : '100%' }]}>
              <Text style={styles.aboutMainTitle}>About BharatPOS</Text>
              <Text style={styles.aboutSubTitle}>Building the Future of Business Operations</Text>
              
              <Text style={styles.aboutStoryText}>
                BharatPOS is a next-generation cloud-based POS and inventory management platform designed for Indian businesses. We help retailers, wholesalers, and restaurants simplify their operations, increase efficiency and grow faster — with powerful, easy-to-use solutions.
              </Text>

              <Text style={styles.aboutMissionTitle}>Our Mission</Text>
              <View style={styles.aboutMissionList}>
                <View style={styles.missionItem}>
                  <Icon name="check-circle" size={18} color="#16A34A" />
                  <Text style={styles.missionText}>Empower small & medium businesses</Text>
                </View>
                <View style={styles.missionItem}>
                  <Icon name="check-circle" size={18} color="#16A34A" />
                  <Text style={styles.missionText}>Make operations simple & efficient</Text>
                </View>
                <View style={styles.missionItem}>
                  <Icon name="check-circle" size={18} color="#16A34A" />
                  <Text style={styles.missionText}>Provide reliable support and innovation</Text>
                </View>
              </View>
            </View>

            {/* Right Terminal Graphic / Trust Card */}
            <View style={[styles.aboutRightCol, { width: screenWidth > 960 ? '40%' : '100%' }]}>
              <View style={styles.aboutHardwareCard}>
                <View style={styles.terminalVisualMock}>
                  <View style={styles.aboutMockScreen}>
                    <View style={styles.mockTerminalTop}>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <View style={[styles.screenDot, { backgroundColor: '#EF4444' }]} />
                        <View style={[styles.screenDot, { backgroundColor: '#F59E0B' }]} />
                        <View style={[styles.screenDot, { backgroundColor: '#10B981' }]} />
                      </View>
                      <Text style={styles.mockTerminalHeader}>BharatPOS Cloud Station</Text>
                    </View>
                    <View style={styles.mockTerminalContent}>
                      <Icon name="cash-register" size={32} color="#16A34A" />
                      <Text style={styles.mockTerminalTitle}>Smart Billing Terminal</Text>
                      <Text style={styles.mockTerminalSub}>Fast Barcode • Dual Display • GST Ready</Text>
                    </View>
                  </View>
                  <View style={styles.posMachineStand} />
                  <View style={styles.posMachineBase} />
                </View>

                {/* Trusted Badge */}
                <View style={styles.trustedBusinessesBadge}>
                  <Icon name="star" size={20} color="#F59E0B" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={styles.trustedBadgeBold}>5,000+</Text>
                    <Text style={styles.trustedBadgeSub}>Happy Businesses</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 7. PRICING SECTION */}
        <View style={styles.section} onLayout={(e) => handleLayout('pricing', e)}>
          <Text style={styles.sectionTitle}>Simple, Transparent Pricing</Text>
          <Text style={styles.sectionSubtitle}>Choose the plan that fits your business needs. No hidden charges.</Text>

          <View style={styles.pricingCycleToggle}>
            <TouchableOpacity onPress={() => setBillingCycle('monthly')} style={[styles.toggleBtn, billingCycle === 'monthly' && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, billingCycle === 'monthly' && styles.toggleBtnTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setBillingCycle('yearly')} style={[styles.toggleBtn, billingCycle === 'yearly' && styles.toggleBtnActive]}>
              <Text style={[styles.toggleBtnText, billingCycle === 'yearly' && styles.toggleBtnTextActive]}>Yearly (Save 20%)</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pricingGrid}>
            {/* Free Trial */}
            <Card style={styles.priceCard} elevation={0}>
              <Card.Content style={{ alignItems: 'center', paddingHorizontal: 16 }}>
                <Text style={styles.priceTier}>Free Trial</Text>
                <Text style={styles.priceAmount}>₹0</Text>
                <Text style={styles.priceDesc}>30 Days Free trial access</Text>
                <Divider style={styles.priceDivider} />
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>All Basic Features</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Up to 100 Products</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Basic Reports</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Email Support</Text></View>
                <Button mode="outlined" style={styles.priceBtnOutline} labelStyle={{ fontWeight: 'bold', color: '#16A34A' }} onPress={() => router.push('/signup' as any)}>
                  Start Free Trial
                </Button>
              </Card.Content>
            </Card>

            {/* Basic Plan */}
            <Card style={styles.priceCard} elevation={0}>
              <Card.Content style={{ alignItems: 'center', paddingHorizontal: 16 }}>
                <Text style={styles.priceTier}>Basic Plan</Text>
                <Text style={styles.priceAmount}>
                  {billingCycle === 'yearly' ? '₹4,999' : '₹499'}
                  <Text style={{ fontSize: 12, color: '#64748B' }}>/{billingCycle === 'yearly' ? 'Year' : 'Month'}</Text>
                </Text>
                <Text style={styles.priceDesc}>1 Year Plan duration</Text>
                <Divider style={styles.priceDivider} />
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>All Basic Features</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Unlimited Products</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>PDF Reports</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Priority Support</Text></View>
                <Button mode="contained" style={styles.priceBtnSolid} labelStyle={{ fontWeight: 'bold' }} onPress={handleCTA}>
                  Buy Now
                </Button>
              </Card.Content>
            </Card>

            {/* Professional Plan */}
            <Card style={[styles.priceCard, { borderColor: '#16A34A', borderWidth: 2 }]} elevation={0}>
              <View style={styles.pricePopular}><Text style={styles.pricePopularText}>POPULAR</Text></View>
              <Card.Content style={{ alignItems: 'center', paddingHorizontal: 16 }}>
                <Text style={[styles.priceTier, { color: '#0F172A' }]}>Professional Plan</Text>
                <Text style={styles.priceAmount}>
                  {billingCycle === 'yearly' ? '₹8,999' : '₹899'}
                  <Text style={{ fontSize: 12, color: '#64748B' }}>/{billingCycle === 'yearly' ? '2 Yrs' : 'Month'}</Text>
                </Text>
                <Text style={styles.priceDesc}>2 Years Plan duration</Text>
                <Divider style={styles.priceDivider} />
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>All Basic + Premium Features</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Advanced Reports</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Multi-worker Support</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Automated Cloud Backup</Text></View>
                <Button mode="contained" style={styles.priceBtnSolid} labelStyle={{ fontWeight: 'bold' }} onPress={handleCTA}>
                  Buy Now
                </Button>
              </Card.Content>
            </Card>

            {/* Enterprise Plan */}
            <Card style={styles.priceCard} elevation={0}>
              <Card.Content style={{ alignItems: 'center', paddingHorizontal: 16 }}>
                <Text style={styles.priceTier}>Enterprise Plan</Text>
                <Text style={styles.priceAmount}>
                  {billingCycle === 'yearly' ? '₹12,999' : '₹1,299'}
                  <Text style={{ fontSize: 12, color: '#64748B' }}>/{billingCycle === 'yearly' ? '3 Yrs' : 'Month'}</Text>
                </Text>
                <Text style={styles.priceDesc}>3 Years Plan duration</Text>
                <Divider style={styles.priceDivider} />
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>All Premium Features</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Dedicated Support Agent</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Custom Permissions Editor</Text></View>
                <View style={styles.priceInc}><Icon name="check" color="#16A34A" size={14} /><Text style={styles.priceIncText}>Advanced Analytics Engine</Text></View>
                <Button mode="contained" style={styles.priceBtnSolid} labelStyle={{ fontWeight: 'bold' }} onPress={handleCTA}>
                  Buy Now
                </Button>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* 8. FAQ ACCORDION SECTION */}
        <View style={[styles.section, { backgroundColor: '#FFFFFF' }]} onLayout={(e) => handleLayout('faq', e)}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionSubtitle}>Answers to common questions about setting up your terminal.</Text>

          <View style={styles.faqList}>
            {faqs.map((faq, idx) => (
              <TouchableOpacity key={idx} style={styles.faqItem} onPress={() => toggleFaq(idx)} activeOpacity={0.7}>
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <Icon name={expandedFaq === idx ? "chevron-up" : "chevron-down"} size={18} color="#16A34A" />
                </View>
                {expandedFaq === idx && (
                  <Text style={styles.faqAnswer}>{faq.a}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 9. GET IN TOUCH WITH US & CONTACT FORM */}
        <View style={[styles.section, { backgroundColor: '#F8FAFC' }]} onLayout={(e) => handleLayout('contact', e)}>
          <Text style={styles.sectionTitle}>Get in Touch With Us</Text>
          <Text style={styles.sectionSubtitle}>Need assistance with barcode scanner integrations or custom GST setups? Contact our desk.</Text>

          <View style={styles.contactContainer}>
            {/* Details Column */}
            <View style={{ flex: 1, minWidth: 280, gap: 20 }}>
              <Text style={styles.contactColumnTitle}>Support Desk Contacts</Text>
              
              <TouchableOpacity style={styles.contactRow} onPress={() => alert('Launching WhatsApp Support chat...')} activeOpacity={0.8}>
                <View style={styles.contactIconBg}><Icon name="whatsapp" size={20} color="#25D366" /></View>
                <View>
                  <Text style={styles.contactRowLabel}>WhatsApp Support</Text>
                  <Text style={styles.contactRowVal}>+91 98765 43210 (Mon-Sat, 9AM-8PM)</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.contactRow}>
                <View style={[styles.contactIconBg, { backgroundColor: '#EFF6FF' }]}><Icon name="phone" size={18} color="#3B82F6" /></View>
                <View>
                  <Text style={styles.contactRowLabel}>Phone Hotlines</Text>
                  <Text style={styles.contactRowVal}>1800 208 4050 (Toll Free)</Text>
                </View>
              </View>

              <View style={styles.contactRow}>
                <View style={[styles.contactIconBg, { backgroundColor: '#F0FDF4' }]}><Icon name="email-outline" size={18} color="#16A34A" /></View>
                <View>
                  <Text style={styles.contactRowLabel}>Technical Support</Text>
                  <Text style={styles.contactRowVal}>support@bharatpos.in</Text>
                </View>
              </View>
            </View>

            {/* Form Column */}
            <Card style={styles.contactCard} elevation={0}>
              <Card.Content style={{ padding: 12 }}>
                <Text style={styles.contactCardTitle}>Send a Quick Message</Text>
                <TextInput label="Your Full Name" value={contactName} onChangeText={setContactName} mode="outlined" style={styles.contactInput} activeOutlineColor="#16A34A" outlineColor="#E5E7EB" />
                <TextInput label="Email Address" value={contactEmail} onChangeText={setContactEmail} mode="outlined" style={styles.contactInput} keyboardType="email-address" activeOutlineColor="#16A34A" outlineColor="#E5E7EB" />
                <TextInput label="Message Details" value={contactMsg} onChangeText={setContactMsg} mode="outlined" multiline numberOfLines={3} style={styles.contactInput} activeOutlineColor="#16A34A" outlineColor="#E5E7EB" />
                <Button 
                  mode="contained" 
                  style={styles.contactSubmitBtn}
                  labelStyle={{ fontWeight: 'bold' }}
                  onPress={() => {
                    if (!contactName || !contactEmail) { alert('Please enter your name and email.'); return; }
                    try {
                      const isWeb = Platform.OS === 'web';
                      const apiHost = isWeb ? '' : 'https://bharatpos-new.vercel.app';
                      fetch(`${apiHost}/api/send-support-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: contactName,
                          email: contactEmail,
                          message: contactMsg || 'No message provided',
                          type: 'support'
                        })
                      });
                    } catch (e) {
                      console.warn("Mail dispatch error:", e);
                    }
                    alert('Message received! Our customer success team will email you at ' + contactEmail + ' shortly.');
                    setContactName(''); setContactEmail(''); setContactMsg('');
                  }}
                >
                  Send Message
                </Button>
              </Card.Content>
            </Card>
          </View>
        </View>

                {/* ── DARK METRIC FOOTER BAR (Image 1 Bottom) ── */}
        <View style={styles.darkMetricBarWrap}>
          <View style={styles.darkMetricBarContainer}>
            {/* Left Brand */}
            <View style={styles.darkMetricBrand}>
              <View style={styles.darkLogoCircle}>
                <Icon name="fire" size={18} color="#FFFFFF" />
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.darkBrandTitle}>BharatPOS</Text>
                <Text style={styles.darkBrandSub}>Simple. Smart. For Every Business.</Text>
              </View>
            </View>

            {/* Middle 4 Live Stats */}
            <View style={styles.darkStatsRow}>
              <View style={styles.darkStatItem}>
                <Icon name="store-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                <View>
                  <Text style={styles.darkStatVal}>5,000+</Text>
                  <Text style={styles.darkStatLabel}>Happy Businesses</Text>
                </View>
              </View>

              <View style={styles.darkStatItem}>
                <Icon name="credit-card-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                <View>
                  <Text style={styles.darkStatVal}>2,50,000+</Text>
                  <Text style={styles.darkStatLabel}>Monthly Transactions</Text>
                </View>
              </View>

              <View style={styles.darkStatItem}>
                <Icon name="shield-check-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                <View>
                  <Text style={styles.darkStatVal}>99.9%</Text>
                  <Text style={styles.darkStatLabel}>System Uptime</Text>
                </View>
              </View>

              <View style={styles.darkStatItem}>
                <Icon name="star-outline" size={16} color="#FBBF24" style={{ marginRight: 6 }} />
                <View>
                  <Text style={styles.darkStatVal}>4.8/5</Text>
                  <Text style={styles.darkStatLabel}>Customer Satisfaction</Text>
                </View>
              </View>
            </View>

            {/* Right Free Trial CTA */}
            <TouchableOpacity
              style={styles.darkTrialBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/(auth)/signup' as any)}
            >
              <Text style={styles.darkTrialBtnText}>Start Your Free Trial  →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 10. FOOTER */}
        <View style={styles.footer}>
          <View style={styles.footerContainer}>
            <View style={styles.footerColLeft}>
              <View style={styles.footerLogo}>
                <View style={styles.footerLogoIcon}>
                  <Icon name="store" size={16} color="#16A34A" />
                </View>
                <Text style={styles.footerLogoText}>BharatPOS</Text>
              </View>
              <Text style={styles.footerLogoSub}>Billing Simplified</Text>
              <Text style={styles.footerDesc}>High-speed retail billing terminal and live cloud inventory control system tailored for Indian shopkeepers.</Text>
              <View style={styles.socialRow}>
                <Icon name="facebook" size={18} color="#94A3B8" style={{ marginRight: 16 }} />
                <Icon name="twitter" size={18} color="#94A3B8" style={{ marginRight: 16 }} />
                <Icon name="instagram" size={18} color="#94A3B8" style={{ marginRight: 16 }} />
                <Icon name="youtube" size={18} color="#94A3B8" />
              </View>
            </View>

            <View style={styles.footerCol}>
              <Text style={styles.footerColTitle}>Product</Text>
              <TouchableOpacity onPress={() => router.push('/(owner)/pos_billing' as any)}>
                <Text style={[styles.footerLink, { color: '#16A34A' }]}>POS Billing Terminal</Text>
              </TouchableOpacity>
              <Text style={styles.footerLink}>Features</Text>
              <Text style={styles.footerLink}>Pricing</Text>
              <Text style={styles.footerLink}>Demo Tour</Text>
              <Text style={styles.footerLink}>Mobile App</Text>
            </View>

            <View style={styles.footerCol}>
              <Text style={styles.footerColTitle}>Company</Text>
              <Text style={styles.footerLink}>About Us</Text>
              <Text style={styles.footerLink}>Careers</Text>
              <Text style={styles.footerLink}>Blog</Text>
              <Text style={styles.footerLink}>Privacy Policy</Text>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </View>

            <View style={styles.footerCol}>
              <Text style={styles.footerColTitle}>Support</Text>
              <Text style={styles.footerLink}>Help Center</Text>
              <Text style={styles.footerLink}>Contact Us</Text>
              <Text style={styles.footerLink}>WhatsApp Desk</Text>
              <Text style={styles.footerLink}>System Status</Text>
              <Text style={styles.footerLink}>Docs & Guides</Text>
            </View>
          </View>
          
          <Divider style={{ backgroundColor: '#1E293B', width: '100%', marginVertical: 24 }} />
          
          <Text style={styles.footerCopy}>© 2026 BharatPOS. All rights reserved. Designed for Indian Businesses. Made with ❤ in India</Text>
        </View>

      </ScrollView>

      {/* ---------------------------------------------------------
          MODALS & DIALOGS
          --------------------------------------------------------- */}

      {/* 1. SIGNUP DIALOG */}
      <Portal>
        <Dialog visible={showSignupModal} onDismiss={() => setShowSignupModal(false)} style={styles.dialogStyle}>
          <Dialog.Title style={{ color: '#0F172A', fontWeight: '800', fontSize: 18, fontFamily: 'Plus Jakarta Sans' }}>Start Your 30-Day Free Trial</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 12, color: '#475569', marginBottom: 16, lineHeight: 18, fontFamily: 'Plus Jakarta Sans' }}>
                Get instant access to POS billing, stock management, double-entry accounting ledgers, and barcode generation. No credit card required.
              </Text>
              <TextInput label="Full Name" value={fullName} onChangeText={setFullName} mode="outlined" style={styles.formInput} activeOutlineColor="#16A34A" outlineColor="#E5E7EB" />
              <TextInput label="Shop Name" value={shopName} onChangeText={setShopName} mode="outlined" style={styles.formInput} activeOutlineColor="#16A34A" outlineColor="#E5E7EB" />
              <TextInput label="Mobile Number" value={mobileNumber} onChangeText={setMobileNumber} mode="outlined" style={styles.formInput} keyboardType="phone-pad" activeOutlineColor="#16A34A" outlineColor="#E5E7EB" />
              <TextInput label="Email Address" value={email} onChangeText={setEmail} mode="outlined" style={styles.formInput} keyboardType="email-address" activeOutlineColor="#16A34A" outlineColor="#E5E7EB" />
              <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" style={styles.formInput} activeOutlineColor="#16A34A" outlineColor="#E5E7EB" />
              
              <TextInput 
                label="Business Category" 
                value={businessType} 
                onChangeText={setBusinessType} 
                mode="outlined" 
                style={styles.formInput} 
                placeholder="e.g. Grocery, Garments, Electronics" 
                activeOutlineColor="#16A34A" 
                outlineColor="#E5E7EB"
              />

              <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13, marginTop: 12, marginBottom: 6, fontFamily: 'Plus Jakarta Sans' }}>Tax Setup</Text>
              <SegmentedButtons
                value={gstType}
                onValueChange={setGstType}
                buttons={[
                  { value: 'GST', label: 'GST Registered' },
                  { value: 'NON-GST', label: 'Non-GST Business' }
                ]}
                style={{ marginBottom: 12 }}
              />

              <Text style={{ fontWeight: '700', color: '#0F172A', fontSize: 13, marginTop: 6, marginBottom: 6, fontFamily: 'Plus Jakarta Sans' }}>Shop Operation Mode</Text>
              <SegmentedButtons
                value={operationMode}
                onValueChange={setOperationMode}
                buttons={[
                  { value: 'Mobile Only', label: 'Mobile Only' },
                  { value: 'Laptop + Mobile', label: 'Laptop + Mobile' },
                  { value: 'Large Shop', label: 'Large Shop' }
                ]}
                style={{ marginBottom: 8 }}
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions style={{ justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 }}>
            <Button 
              mode="outlined" 
              style={{ borderColor: '#E5E7EB', marginRight: 'auto', backgroundColor: '#F9FAFB' }} 
              labelStyle={{ color: '#374151', fontSize: 11 }}
              onPress={() => {
                setFullName('Rohan Sharma');
                setShopName('Sharma Supermart');
                setMobileNumber('9876543210');
                const randSuffix = Math.floor(100 + Math.random() * 900);
                setEmail(`rohan.${randSuffix}@sharmamart.com`);
                setPassword('sharma123');
                setBusinessType('Grocery');
                setGstType('GST');
                setOperationMode('Laptop + Mobile');
              }}
            >
              Autofill Demo
            </Button>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button onPress={() => setShowSignupModal(false)} labelStyle={{ color: '#475569' }}>Cancel</Button>
              <Button mode="contained" buttonColor="#16A34A" onPress={handleSignUpSubmit} labelStyle={{ fontWeight: 'bold' }}>
                Create Trial Account
              </Button>
            </View>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 2. DEMO DIALOG */}
      <Portal>
        <Dialog 
          visible={showDemoModal} 
          onDismiss={() => setShowDemoModal(false)} 
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            overflow: 'hidden',
            width: screenWidth > 900 ? 820 : '95%',
            maxWidth: 820,
            alignSelf: 'center',
            maxHeight: '90%',
          }}
        >
          <View style={{ flexDirection: screenWidth > 768 ? 'row' : 'column', minHeight: 460 }}>
            {/* Left Side: Testimonial & Badges */}
            {screenWidth > 768 && (
              <View style={{
                flex: 1.1,
                backgroundColor: '#F8FAFC',
                padding: 30,
                justifyContent: 'space-between',
                borderRightWidth: 1,
                borderRightColor: '#F1F5F9'
              }}>
                {/* Illustration Simulator */}
                <View style={{ position: 'relative', alignItems: 'center', marginTop: 10 }}>
                  {/* Laptop Mock */}
                  <View style={{
                    width: 190,
                    height: 120,
                    backgroundColor: '#E2E8F0',
                    borderRadius: 8,
                    borderWidth: 4,
                    borderColor: '#475569',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                  }}>
                    {/* Screen Agent inside call */}
                    <Icon name="account-video" size={32} color="#1E293B" />
                    <View style={{ position: 'absolute', bottom: 4, right: 4, width: 40, height: 30, backgroundColor: '#CBD5E1', borderRadius: 2, justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="account" size={14} color="#475569" />
                    </View>
                  </View>
                  <View style={{ width: 220, height: 8, backgroundColor: '#334155', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
                  {/* Floating elements representing schedule */}
                  <View style={{ position: 'absolute', top: -10, left: 10, backgroundColor: '#FFFFFF', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="calendar-check" size={12} color="#16A34A" />
                    <Text style={{ fontSize: 7, fontWeight: '700', color: '#0F172A', fontFamily: 'Plus Jakarta Sans' }}>Demo Scheduled</Text>
                  </View>
                  <View style={{ position: 'absolute', bottom: 10, left: -10, backgroundColor: '#FFFFFF', padding: 6, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="clock-outline" size={12} color="#2563EB" />
                    <Text style={{ fontSize: 7, fontWeight: '700', color: '#0F172A', fontFamily: 'Plus Jakarta Sans' }}>30 mins call</Text>
                  </View>
                </View>

                {/* Quote block */}
                <View style={{ marginVertical: 20 }}>
                  <Text style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', lineHeight: 20, textAlign: 'center', fontFamily: 'Plus Jakarta Sans' }}>
                    “See how BharatPOS can simplify your billing and grow your business. Our experts will walk you through everything.”
                  </Text>
                </View>

                {/* Badges footer */}
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="check" size={11} color="#16A34A" />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', fontFamily: 'Plus Jakarta Sans' }}>Live Product Demo</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="check" size={11} color="#16A34A" />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', fontFamily: 'Plus Jakarta Sans' }}>All Your Questions</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}>
                      <Icon name="check" size={11} color="#16A34A" />
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', fontFamily: 'Plus Jakarta Sans' }}>No Commitment</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Right Side: Booking Form */}
            <View style={{ flex: 1.3, padding: 30, justifyContent: 'space-between' }}>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', fontFamily: 'Plus Jakarta Sans' }}>Book A Personal Demo</Text>
                  <TouchableOpacity onPress={() => setShowDemoModal(false)}>
                    <Icon name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 20, fontFamily: 'Plus Jakarta Sans' }}>Schedule a 1-on-1 demo with our POS experts.</Text>

                <ScrollView style={{ maxHeight: screenWidth > 768 ? 320 : 400 }} showsVerticalScrollIndicator={false}>
                  {/* Name & Mobile row */}
                  <View style={{ flexDirection: screenWidth > 768 ? 'row' : 'column', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' }}>Full Name</Text>
                      <TextInput 
                        value={demoName} 
                        onChangeText={setDemoName} 
                        placeholder="Enter your name" 
                        mode="outlined" 
                        style={{ height: 38, backgroundColor: '#FFFFFF' }} 
                        activeOutlineColor="#16A34A" 
                        outlineColor="#CBD5E1" 
                        dense 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' }}>Mobile Number</Text>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <View style={{ width: 44, height: 38, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', marginTop: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#334155', fontFamily: 'Plus Jakarta Sans' }}>+91</Text>
                        </View>
                        <TextInput 
                          value={demoMobile} 
                          onChangeText={setDemoMobile} 
                          placeholder="Enter mobile number" 
                          keyboardType="phone-pad" 
                          mode="outlined" 
                          style={{ flex: 1, height: 38, backgroundColor: '#FFFFFF' }} 
                          activeOutlineColor="#16A34A" 
                          outlineColor="#CBD5E1" 
                          dense 
                        />
                      </View>
                    </View>
                  </View>

                  {/* Business Type */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' }}>Business Type</Text>
                    <TextInput 
                      value={demoBusinessType} 
                      onChangeText={setDemoBusinessType} 
                      placeholder="Grocery, Retail store, Restaurant..." 
                      mode="outlined" 
                      style={{ height: 38, backgroundColor: '#FFFFFF' }} 
                      activeOutlineColor="#16A34A" 
                      outlineColor="#CBD5E1" 
                      dense 
                    />
                  </View>

                  {/* Preferred Date & Time row */}
                  <View style={{ flexDirection: screenWidth > 768 ? 'row' : 'column', gap: 10, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' }}>Preferred Date</Text>
                      <TextInput 
                        value={demoDate} 
                        onChangeText={setDemoDate} 
                        placeholder="e.g. 05 Jul 2026" 
                        mode="outlined" 
                        style={{ height: 38, backgroundColor: '#FFFFFF' }} 
                        activeOutlineColor="#16A34A" 
                        outlineColor="#CBD5E1" 
                        dense 
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' }}>Preferred Time</Text>
                      <TextInput 
                        value={demoTime} 
                        onChangeText={setDemoTime} 
                        placeholder="e.g. 2:30 PM" 
                        mode="outlined" 
                        style={{ height: 38, backgroundColor: '#FFFFFF' }} 
                        activeOutlineColor="#16A34A" 
                        outlineColor="#CBD5E1" 
                        dense 
                      />
                    </View>
                  </View>

                  {/* Notes */}
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#374151', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' }}>Additional Notes (Optional)</Text>
                    <TextInput 
                      value={demoNotes} 
                      onChangeText={setDemoNotes} 
                      placeholder="Write anything you'd like us to know..." 
                      mode="outlined" 
                      multiline 
                      numberOfLines={3} 
                      style={{ backgroundColor: '#FFFFFF' }} 
                      activeOutlineColor="#16A34A" 
                      outlineColor="#CBD5E1" 
                    />
                  </View>
                </ScrollView>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                <Button 
                  onPress={() => setShowDemoModal(false)} 
                  labelStyle={{ color: '#475569', fontSize: 12, fontWeight: '600' }}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  buttonColor="#0B192C" 
                  onPress={handleDemoBooking} 
                  labelStyle={{ fontWeight: 'bold', fontSize: 12 }}
                  icon="calendar-blank"
                  style={{ borderRadius: 6 }}
                >
                  Schedule Live Demo
                </Button>
              </View>
            </View>
          </View>
        </Dialog>
      </Portal>

      {/* 3. VIDEO DIALOG */}
      <Portal>
        <Dialog visible={demoVideoPlaying} onDismiss={() => setDemoVideoPlaying(false)} style={styles.dialogStyle}>
          <Dialog.Title style={{ color: '#0F172A', fontWeight: '800', fontSize: 18, fontFamily: 'Plus Jakarta Sans' }}>BharatPOS Walkthrough Video</Dialog.Title>
          <Dialog.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Icon name="play-circle-outline" size={72} color="#16A34A" />
            <Text style={{ fontWeight: 'bold', marginTop: 16, color: '#0F172A', fontFamily: 'Plus Jakarta Sans' }}>Simulated Product Demonstration</Text>
            <Text style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 8, maxWidth: 340, lineHeight: 18, fontFamily: 'Plus Jakarta Sans' }}>
              Playing overview video... barcode integrations, invoice scanning, cashier shift logs setup, and financial Day Book walkthroughs.
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <Button onPress={() => setDemoVideoPlaying(false)} labelStyle={{ color: '#16A34A', fontWeight: 'bold' }}>Close Player</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );

}

// Sub-components hoisted above

// STYLES
const styles = StyleSheet.create({

  aboutContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 36,
  },
  aboutLeftCol: {
    paddingRight: 16,
  },
  aboutMainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  aboutSubTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
    marginBottom: 20,
  },
  aboutStoryText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 26,
    marginBottom: 28,
  },
  aboutMissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  aboutMissionList: {
    gap: 12,
  },
  missionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  missionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  aboutRightCol: {
    alignItems: 'center',
  },
  aboutHardwareCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    position: 'relative',
  },
  terminalVisualMock: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
  },
  aboutMockScreen: {
    width: 280,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  mockTerminalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  mockTerminalHeader: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  mockTerminalContent: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  mockTerminalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  mockTerminalSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  trustedBusinessesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  trustedBadgeBold: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  trustedBadgeSub: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  header: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { position: 'sticky', top: 0, zIndex: 1000 } as any,
      default: {}
    })
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoIconBg: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  logoText: { fontWeight: '800', fontSize: 15, color: '#0F172A', fontFamily: 'Plus Jakarta Sans' },
  logoSubtitle: { fontSize: 8, fontWeight: '600', color: '#64748B', marginTop: -2, fontFamily: 'Plus Jakarta Sans' },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  navLink: { fontSize: 13, fontWeight: '600', color: '#475569', fontFamily: 'Plus Jakarta Sans' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtnOutline: { borderRadius: 6, borderColor: '#D1D5DB', height: 36, justifyContent: 'center' },
  btnLabelOutline: { fontSize: 12, color: '#374151', fontFamily: 'Plus Jakarta Sans' },
  headerBtnSolid: { borderRadius: 6, backgroundColor: '#16A34A', height: 36, justifyContent: 'center' },
  btnLabelSolid: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Plus Jakarta Sans' },

  // Hero Section
  heroWrapper: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#FFFFFF'
  },
  heroContainer: {
    width: '100%',
    maxWidth: 1200,
    alignItems: 'center'
  },
  heroLeft: {
    alignItems: 'flex-start'
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginBottom: 20
  },
  trustBadgeText: { fontSize: 11, fontWeight: '600', color: '#374151', fontFamily: 'Plus Jakarta Sans' },
  heroTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 50,
    marginBottom: 16,
    fontFamily: 'Plus Jakarta Sans'
  },
  heroDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 520,
    fontFamily: 'Plus Jakarta Sans'
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 32
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0FDF4'
  },
  heroPillText: { fontSize: 11, fontWeight: '700', color: '#16A34A', fontFamily: 'Plus Jakarta Sans' },
  heroActionsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  heroBtnSolid: { borderRadius: 6, backgroundColor: '#16A34A' },
  heroBtnOutline: { borderRadius: 6, borderColor: '#D1D5DB' },
  heroBtnText: { minWidth: 100 },

  // Mock Laptop Framework
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  laptopFrame: {
    width: '100%',
    maxWidth: 560,
    height: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    overflow: 'hidden',
    // Clean shadow
    ...Platform.select({
      web: { boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' } as any,
      default: {}
    })
  },
  mockSidebar: {
    width: 48,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    paddingTop: 16
  },
  mockMain: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  mockTopbar: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  mockTitle: { fontSize: 12, fontWeight: '700', color: '#0F172A', fontFamily: 'Plus Jakarta Sans' },
  mockDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    backgroundColor: '#F9FAFB'
  },
  mockDateText: { fontSize: 9, color: '#64748B', fontWeight: '500', fontFamily: 'Plus Jakarta Sans' },
  mockCardsRow: {
    flexDirection: 'row',
    padding: 10,
    gap: 6
  },
  mockMiniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 6
  },
  mockMiniLabel: { fontSize: 8, color: '#64748B', fontWeight: '600', fontFamily: 'Plus Jakarta Sans' },
  mockMiniVal: { fontSize: 11, fontWeight: '800', color: '#0F172A', marginVertical: 2, fontFamily: 'Plus Jakarta Sans' },
  mockMiniSub: { fontSize: 7, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },

  mockContentSplit: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 10,
    gap: 8
  },
  mockGraphPanel: {
    flex: 1.3,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10
  },
  mockBlockTitle: { fontSize: 9, fontWeight: '700', color: '#0F172A', marginBottom: 8, fontFamily: 'Plus Jakarta Sans' },
  mockGraphContainer: {
    flexDirection: 'row',
    height: 70
  },
  graphYAxis: {
    width: 20,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 4
  },
  graphYLabel: { fontSize: 7, color: '#94A3B8', fontWeight: '600', fontFamily: 'Plus Jakarta Sans' },
  graphArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between'
  },
  gridLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%'
  },
  chartLineWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  },
  customBezierSvg: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '30%',
    bottom: '30%',
    borderTopWidth: 2,
    borderTopColor: '#16A34A',
    opacity: 0.8
  },
  chartNode: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
    borderWidth: 1,
    borderColor: '#FFFFFF'
  },
  graphXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 20,
    marginTop: 4
  },
  graphXLabel: { fontSize: 7, color: '#94A3B8', fontWeight: '600', fontFamily: 'Plus Jakarta Sans' },

  mockProductsPanel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10
  },
  mockProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  mockProductLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  prodDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5
  },
  mockProductName: { fontSize: 8, fontWeight: '500', color: '#334155', fontFamily: 'Plus Jakarta Sans' },
  mockProductPrice: { fontSize: 8, fontWeight: '700', color: '#0F172A', fontFamily: 'Plus Jakarta Sans' },
  viewAllProductsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 8,
    alignSelf: 'flex-start'
  },
  viewAllProductsText: { fontSize: 8, fontWeight: '700', color: '#16A34A', fontFamily: 'Plus Jakarta Sans' },

  // Sections General
  section: {
    paddingVertical: 64,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%'
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Plus Jakarta Sans'
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 20,
    marginBottom: 44,
    fontFamily: 'Plus Jakarta Sans'
  },

  // 8 Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1100
  },
  featureCard: {
    width: 260,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF'
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  featureHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    fontFamily: 'Plus Jakarta Sans'
  },
  featureText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    fontFamily: 'Plus Jakarta Sans'
  },

  // How It Works Steps
  stepsFlowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    maxWidth: 1100
  },
  stepItem: {
    width: 180,
    alignItems: 'center'
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  stepNumText: { fontSize: 13, fontWeight: '800', color: '#16A34A', fontFamily: 'Plus Jakarta Sans' },
  stepTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' },
  stepDesc: { fontSize: 11, color: '#64748B', textAlign: 'center', lineHeight: 16, fontFamily: 'Plus Jakarta Sans' },
  stepConnector: {
    width: 24,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginHorizontal: 4,
    ...Platform.select({
      web: { display: 'flex' },
      default: { display: 'none' }
    })
  },

  // Showcase Tabs
  showcaseTabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
    justifyContent: 'center'
  },
  showcaseTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF'
  },
  showcaseTabActive: {
    borderColor: '#16A34A',
    backgroundColor: '#16A34A'
  },
  showcaseTabText: { fontSize: 12, fontWeight: '600', color: '#475569', fontFamily: 'Plus Jakarta Sans' },
  showcaseTabTextActive: { color: '#FFFFFF' },

  // Interactive Showcase Card
  interactiveCard: {
    width: '100%',
    maxWidth: 820,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' } as any,
      default: {}
    })
  },
  billingShowcaseWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%'
  },
  billingShowcaseLeft: {
    flex: 1.4,
    minWidth: 320,
    padding: 20
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8
  },
  tableCol: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Plus Jakarta Sans'
  },
  tableRowItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center'
  },
  billingShowcaseRight: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    padding: 20
  },
  scanBarcodeBox: {
    marginBottom: 20
  },
  scanBarcodeLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, fontFamily: 'Plus Jakarta Sans' },
  scanBarcodeField: {
    height: 38,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF'
  },
  scanBarcodePlaceholder: { fontSize: 12, color: '#94A3B8', fontFamily: 'Plus Jakarta Sans' },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  summaryText: { fontSize: 12, color: '#475569', fontFamily: 'Plus Jakarta Sans' },
  summaryVal: { fontSize: 13, color: '#0F172A', fontWeight: '600', fontFamily: 'Plus Jakarta Sans' },
  summaryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18
  },
  heldBillBtn: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  heldBillText: { fontSize: 12, fontWeight: '700', color: '#475569', fontFamily: 'Plus Jakarta Sans' },
  printBillBtn: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  printBillText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Plus Jakarta Sans' },

  // Inventory & Reports sub showcase elements
  statusBadgeBg: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700', fontFamily: 'Plus Jakarta Sans' },
  reportTile: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#FFFFFF'
  },
  reportIconBg: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  reportTileTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 6, fontFamily: 'Plus Jakarta Sans' },
  reportTileDesc: { fontSize: 11, color: '#64748B', lineHeight: 16, marginBottom: 16, fontFamily: 'Plus Jakarta Sans' },
  reportTileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto'
  },
  reportLinkText: { fontSize: 11, fontWeight: '700', color: '#16A34A', fontFamily: 'Plus Jakarta Sans' },

  // Screenshots Live Preview Grid (Screenshot 2)
  liveHeadingMini: { fontSize: 11, fontWeight: '800', color: '#16A34A', letterSpacing: 1, marginBottom: 4, fontFamily: 'Plus Jakarta Sans' },
  screenshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 1150
  },
  screenshotCard: {
    width: 350,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' } as any,
      default: {}
    })
  },
  screenshotContent: {
    height: 180,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    overflow: 'hidden'
  },
  innerMockHeader: {
    height: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12
  },
  innerMockTitle: { fontSize: 10, fontWeight: '800', color: '#16A34A', fontFamily: 'Plus Jakarta Sans' },
  innerMockWalk: { fontSize: 8, fontWeight: '600', color: '#64748B', fontFamily: 'Plus Jakarta Sans' },
  innerBillingMockLayout: {
    flexDirection: 'row',
    flex: 1
  },
  innerBillingTable: {
    flex: 1.4,
    padding: 8
  },
  innerMockTableHeader: { fontSize: 8, color: '#94A3B8', fontWeight: '700', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' },
  innerMockTableRow: { fontSize: 8, color: '#475569', paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', fontFamily: 'Plus Jakarta Sans' },
  innerBillingSidebar: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    padding: 8,
    justifyContent: 'center'
  },
  innerSummaryLabel: { fontSize: 8, fontWeight: '700', color: '#334155', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' },
  innerSummaryText: { fontSize: 7, color: '#64748B', marginVertical: 1, fontFamily: 'Plus Jakarta Sans' },
  innerSummaryTotal: { fontSize: 8, fontWeight: '800', color: '#16A34A', marginTop: 4, fontFamily: 'Plus Jakarta Sans' },
  screenshotCardText: {
    padding: 16
  },
  screenshotCardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' },
  screenshotCardDesc: { fontSize: 11, color: '#475569', lineHeight: 16, fontFamily: 'Plus Jakarta Sans' },

  // Mini Phone Frame representation inside card
  miniPhoneFrame: {
    width: 90,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
    padding: 4
  },
  miniPhoneNotch: {
    width: 32,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4
  },
  miniPhoneHeader: { fontSize: 7, fontWeight: '800', color: '#16A34A', textAlign: 'center', fontFamily: 'Plus Jakarta Sans' },
  miniPhoneText: { fontSize: 6, color: '#64748B', textAlign: 'center', marginTop: 8, fontFamily: 'Plus Jakarta Sans' },
  miniPhonePrice: { fontSize: 9, fontWeight: '800', color: '#0F172A', textAlign: 'center', fontFamily: 'Plus Jakarta Sans' },
  miniPhoneList: { marginVertical: 6 },
  miniPhoneItem: { fontSize: 5, color: '#475569', fontFamily: 'Plus Jakarta Sans' },
  miniPhoneBtn: { height: 14, borderRadius: 3, backgroundColor: '#16A34A', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  miniPhoneBtnText: { fontSize: 6, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Plus Jakarta Sans' },

  // Mini GST cards representational style
  miniGstCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 4, borderRadius: 3, borderWidth: 1, borderColor: '#E5E7EB' },
  miniGstCardLabel: { fontSize: 6, color: '#94A3B8', fontWeight: '600', fontFamily: 'Plus Jakarta Sans' },
  miniGstCardVal: { fontSize: 8, fontWeight: '700', color: '#0F172A', fontFamily: 'Plus Jakarta Sans' },

  // Mini overview panel representational style
  miniOverviewLabel: { fontSize: 7, color: '#94A3B8', fontWeight: '600', fontFamily: 'Plus Jakarta Sans' },
  miniOverviewVal: { fontSize: 9, fontWeight: '800', color: '#0F172A', fontFamily: 'Plus Jakarta Sans' },
  miniOverviewSub: { fontSize: 6, color: '#16A34A', fontWeight: '600', marginBottom: 4, fontFamily: 'Plus Jakarta Sans' },

  // Pricing Toggle & Cycles
  pricingCycleToggle: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 3,
    marginBottom: 36,
    width: 220,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center'
  },
  toggleBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 20 },
  toggleBtnActive: { backgroundColor: '#FFFFFF' },
  toggleBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B', fontFamily: 'Plus Jakarta Sans' },
  toggleBtnTextActive: { color: '#0F172A', fontWeight: '700' },

  pricingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center', width: '100%', maxWidth: 1050 },
  priceCard: { width: 245, borderRadius: 10, paddingVertical: 20, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  pricePopular: { position: 'absolute', top: 12, right: -30, paddingVertical: 3, paddingHorizontal: 30, transform: [{ rotate: '45deg' }], backgroundColor: '#16A34A' },
  pricePopularText: { fontWeight: '800', fontSize: 8, letterSpacing: 0.5, color: '#FFFFFF', fontFamily: 'Plus Jakarta Sans' },
  priceTier: { fontSize: 14, fontWeight: '700', color: '#475569', fontFamily: 'Plus Jakarta Sans' },
  priceAmount: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginVertical: 8, fontFamily: 'Plus Jakarta Sans' },
  priceDesc: { fontSize: 11, color: '#64748B', fontFamily: 'Plus Jakarta Sans' },
  priceDivider: { width: '90%', marginVertical: 16, backgroundColor: '#E5E7EB' },
  priceInc: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, marginBottom: 8 },
  priceIncText: { fontSize: 11, flex: 1, color: '#475569', fontFamily: 'Plus Jakarta Sans' },
  priceBtnSolid: { width: '90%', marginTop: 14, borderRadius: 6, backgroundColor: '#16A34A' },
  priceBtnOutline: { width: '90%', marginTop: 14, borderRadius: 6, borderColor: '#16A34A', borderWidth: 1 },

  // FAQs
  faqList: { width: '100%', maxWidth: 740, gap: 4 },
  faqItem: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 16 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontWeight: '700', fontSize: 14, color: '#0F172A', flex: 0.95, fontFamily: 'Plus Jakarta Sans' },
  faqAnswer: { fontSize: 12, color: '#475569', marginTop: 10, lineHeight: 18, fontFamily: 'Plus Jakarta Sans' },

  // Contact section
  contactContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 32, width: '100%', maxWidth: 900, marginTop: 12 },
  contactColumnTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12, fontFamily: 'Plus Jakarta Sans' },
  contactRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  contactIconBg: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  contactRowLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A', fontFamily: 'Plus Jakarta Sans' },
  contactRowVal: { fontSize: 12, color: '#475569', fontFamily: 'Plus Jakarta Sans' },
  contactCard: { flex: 1.4, minWidth: 320, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8 },
  contactCardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 12, fontFamily: 'Plus Jakarta Sans' },
  contactInput: { marginBottom: 10, backgroundColor: '#FFFFFF', height: 44 },
  contactSubmitBtn: { borderRadius: 6, backgroundColor: '#16A34A', marginTop: 8 },

  // Footer styling matching the screenshots (Dark Blue layout)
  footer: { paddingVertical: 56, paddingHorizontal: 24, alignItems: 'center', width: '100%', backgroundColor: '#0F172A' },
  footerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 32, justifyContent: 'space-between', width: '100%', maxWidth: 1100 },
  footerColLeft: { width: 320, gap: 4 },
  footerLogo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerLogoIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center'
  },
  footerLogoText: { fontWeight: '800', fontSize: 16, color: '#FFFFFF', fontFamily: 'Plus Jakarta Sans' },
  footerLogoSub: { fontSize: 9, fontWeight: '600', color: '#94A3B8', marginTop: -2, paddingLeft: 30, fontFamily: 'Plus Jakarta Sans' },
  footerDesc: { fontSize: 12, color: '#94A3B8', lineHeight: 18, marginTop: 12, fontFamily: 'Plus Jakarta Sans' },
  socialRow: { flexDirection: 'row', marginTop: 16 },
  footerCol: { width: 150, gap: 8 },
  footerColTitle: { fontWeight: '700', fontSize: 13, color: '#FFFFFF', marginBottom: 6, fontFamily: 'Plus Jakarta Sans' },
  footerLink: { fontSize: 12, color: '#94A3B8', fontFamily: 'Plus Jakarta Sans' },
  footerCopy: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 12, fontFamily: 'Plus Jakarta Sans' },

  // Dialog styles
  formInput: { marginBottom: 10, backgroundColor: '#FFFFFF' },
  dialogStyle: { borderRadius: 10, backgroundColor: '#FFFFFF' },

  // Petpooja-inspired 4-in-1 Ecosystem Styles
  ecosystemSection: {
    paddingVertical: 70,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    width: '100%'
  },
  ecosystemContainer: {
    width: '100%',
    maxWidth: 1200
  },
  ecosystemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 16
  },
  ecosystemPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
    fontFamily: 'Plus Jakarta Sans',
    letterSpacing: 0.5
  },
  ecosystemTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 12,
    fontFamily: 'Plus Jakarta Sans'
  },
  ecosystemSubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 720,
    lineHeight: 22,
    fontFamily: 'Plus Jakarta Sans'
  },
  ecosystemGrid: {
    justifyContent: 'space-between',
    width: '100%',
    gap: 24
  },
  ecoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
  },
  ecoCardTop: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 20
  },
  ecoIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ecoCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'Plus Jakarta Sans',
    marginBottom: 4
  },
  ecoCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontFamily: 'Plus Jakarta Sans'
  },
  ecoVisualArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 270,
    justifyContent: 'center'
  },
  posMasterNode: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    shadowColor: '#DC2626',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12
  },
  kotCardsWrapper: {
    gap: 10
  },
  floatingKotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  kotTableLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A'
  },
  kotNoLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7E22CE',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  kotItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B'
  },
  kotOrderId: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2
  },
  miniBtnOutline: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF'
  },
  miniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569'
  },
  ecoActionBtn: {
    marginTop: 18,
    borderRadius: 10,
    borderWidth: 1.5
  },
  stepwisePhoneFrame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  phoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  taskMetricRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10
  },
  taskStatPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  miniDeptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  miniDeptText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500'
  },
  taskActiveCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD'
  },
  finishTaskBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start'
  },
  shiftsWrapper: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12
  },
  shiftPillCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  attendoMatrixCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  matrixRowHeader: {
    flexDirection: 'row',
    paddingVertical: 6
  },
  matrixRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    alignItems: 'center'
  },
  matrixCell: {
    fontSize: 11,
    color: '#334155'
  },
  gstrSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10
  },
  gstrCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  gstrRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  gstrReportsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  reportPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  viewReportBtn: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  // ── Image 1 Match Styles: Navbar, Hero, Dual Mode Cards, Trust Bar, Why Section, Dark Metric Bar ──
  navLinkItemActive: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
    alignItems: 'center',
  },
  navLinkTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  navActiveDot: {
    position: 'absolute',
    bottom: 0,
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#F97316',
  },
  navLinkItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
    width: 160,
    marginRight: 8,
  },
  navSearchInput: {
    fontSize: 12,
    color: '#0F172A',
    padding: 0,
    backgroundColor: 'transparent',
    height: 32,
    width: 110,
  },

  // Hero Section
  heroSectionWrap: {
    paddingTop: 48,
    paddingBottom: 40,
    paddingHorizontal: 32,
    maxWidth: 1260,
    alignSelf: 'center',
    width: '100%',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroFlagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  heroFlagEmoji: {
    fontSize: 14,
    marginRight: 8,
  },
  heroFlagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  heroHeadingWrap: {
    position: 'relative',
    marginBottom: 16,
  },
  heroMainTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroOrangeTitle: {
    color: '#F97316',
  },
  heroDoodleBadge: {
    position: 'absolute',
    right: 20,
    top: 0,
    alignItems: 'flex-end',
    transform: [{ rotate: '3deg' }],
  },
  heroDoodleText: {
    fontFamily: Platform.OS === 'web' ? 'cursive, sans-serif' : 'System',
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  heroDoodleSub: {
    fontFamily: Platform.OS === 'web' ? 'cursive, sans-serif' : 'System',
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  heroSubHeadingGreen: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  heroSubDescription: {
    fontSize: 16,
    color: '#475569',
    lineHeight: 24,
    maxWidth: 720,
    marginBottom: 36,
  },

  // Dual Operating Mode Cards Grid
  dualModeCardsGrid: {
    justifyContent: 'space-between',
    gap: 24,
    marginBottom: 36,
  },
  modeCardWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
    elevation: 3,
  },
  shopModeCard: {
    borderColor: '#DBEAFE',
  },
  cafeModeCard: {
    borderColor: '#FFEDD5',
  },
  modeCardContent: {
    flex: 1.1,
    paddingRight: 16,
  },
  modeCardTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modeIconCircleBlue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconCircleOrange: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  modeCardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  modeCardDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginVertical: 10,
  },
  modeBtnBlue: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  modeBtnOrange: {
    backgroundColor: '#F97316',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  modeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  modeChecklistWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeCheckItem: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginRight: 6,
  },
  checkBlue: {
    color: '#2563EB',
    fontWeight: '800',
  },
  checkOrange: {
    color: '#F97316',
    fontWeight: '800',
  },

  // Terminal Visual Mockups
  terminalVisualWrap: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posMachineMock: {
    alignItems: 'center',
  },
  posScreenBezel: {
    width: 170,
    height: 118,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 6,
    borderWidth: 2,
    borderColor: '#334155',
    boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
  },
  posScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginBottom: 4,
  },
  screenDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  screenStoreName: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94A3B8',
  },
  posScreenBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 4,
    justifyContent: 'space-between',
  },
  posMockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  posGridItem: {
    width: '46%',
    backgroundColor: '#F8FAFC',
    borderRadius: 3,
    padding: 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  posGridPrice: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0F172A',
  },
  posMockBill: {
    backgroundColor: '#EFF6FF',
    padding: 3,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  posBillRow: {
    fontSize: 8,
    color: '#475569',
  },
  posBillTotal: {
    fontSize: 8,
    fontWeight: '800',
    color: '#2563EB',
  },
  posMachineStand: {
    width: 20,
    height: 18,
    backgroundColor: '#475569',
    marginTop: -2,
  },
  posMachineBase: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  printerScannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  miniThermalPrinter: {
    width: 32,
    height: 24,
    backgroundColor: '#334155',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  printerSlot: {
    width: 18,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 3,
  },
  miniBarcodeGun: {
    width: 26,
    height: 24,
    backgroundColor: '#E0F2FE',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },

  // Dark Cafe Terminal Mockup
  posMachineMockDark: {
    alignItems: 'center',
  },
  posScreenBezelDark: {
    width: 170,
    height: 118,
    backgroundColor: '#090E17',
    borderRadius: 10,
    padding: 6,
    borderWidth: 2,
    borderColor: '#1E293B',
    boxShadow: '0 8px 16px rgba(0,0,0,0.25)',
  },
  posScreenHeaderDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginBottom: 4,
  },
  screenStoreNameDark: {
    fontSize: 8,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  posScreenBodyDark: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    padding: 4,
    justifyContent: 'space-between',
  },
  tableMiniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  tablePillMini: {
    width: '47%',
    borderRadius: 3,
    borderWidth: 1,
    paddingVertical: 2,
    alignItems: 'center',
  },
  tablePillTextMini: {
    fontSize: 7,
    fontWeight: '700',
  },
  posMockKotTicket: {
    backgroundColor: '#1E293B',
    borderRadius: 3,
    padding: 3,
    borderLeftWidth: 2,
    borderLeftColor: '#F97316',
  },
  posKotText: {
    fontSize: 7,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  posKotStatus: {
    fontSize: 7,
    color: '#10B981',
    fontWeight: '700',
  },
  posMachineStandDark: {
    width: 20,
    height: 18,
    backgroundColor: '#1E293B',
    marginTop: -2,
  },
  posMachineBaseDark: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#111827',
  },
  tableNumberStand: {
    width: 22,
    height: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  tableStandNumber: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
  },
  miniFoodDish: {
    width: 28,
    height: 24,
    backgroundColor: '#FFEDD5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },

  // Trust & Value Pill Strip (5 items)
  trustPillStripRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
  },
  trustPillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 180,
  },
  trustIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustPillTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  trustPillSub: {
    fontSize: 10,
    color: '#64748B',
  },

  // "Why BharatPOS?" Section
  whySectionContainer: {
    paddingVertical: 64,
    paddingHorizontal: 32,
    maxWidth: 1260,
    alignSelf: 'center',
    width: '100%',
  },
  whySectionSplit: {
    justifyContent: 'space-between',
    gap: 36,
  },
  whyLeftCol: {
    paddingRight: 16,
  },
  whyTagPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  whyTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA580C',
  },
  whyMainHeading: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 42,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  whySubDesc: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 24,
    marginBottom: 24,
  },
  exploreAllFeaturesBtn: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
  },
  exploreAllBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  whyRightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureTileItem: {
    width: '47%',
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
  },
  tileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  tileDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },

  // Dark Metric Footer Bar (Image 1 Bottom)
  darkMetricBarWrap: {
    backgroundColor: '#0B132B',
    paddingVertical: 20,
    paddingHorizontal: 32,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  darkMetricBarContainer: {
    maxWidth: 1260,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 20,
  },
  darkMetricBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBrandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  darkBrandSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  darkStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 24,
  },
  darkStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  darkStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  darkTrialBtn: {
    backgroundColor: '#F97316',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  darkTrialBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

});
