import { useAppTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated, TextInput as RNTextInput, Platform, Linking, Modal } from 'react-native';
import { Text, Button, Divider, Surface, Chip, Portal, Dialog, SegmentedButtons, TextInput, useTheme, IconButton } from 'react-native-paper';
import { CameraView, Camera } from 'expo-camera';
import * as Print from 'expo-print';
import { useCart } from '../../providers/CartProvider';
import { db, isFirebaseConfigured, auth } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, increment, setDoc, getDoc } from '../../lib/firestore_adapter';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cleanAndMapCategory } from '../../lib/ui_helpers';
import { useLocalSearchParams, router } from 'expo-router';
import { DS } from '../../constants/designTokens';
import POSAssistantModal from '../../components/POSAssistantModal';

// ── Category colors ────────────────────────────────────────────────────
const categoryColors: Record<string, string> = {
  Beverages: '#10B981', Staples: '#2E7D32', Oils: '#E65100', Dairy: '#1565C0',
  Snacks: '#10B981', Detergent: '#00838F', 'Personal Care': '#AD1457', Cleaning: '#00695C',
};

// ── FadeIn Wrapper ─────────────────────────────────────────────────────
const FadeIn = ({ delay = 0, style, children }: { delay?: number; style?: any; children: React.ReactNode }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }).start();
  }, []);
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>;
};

const DEFAULT_STORE_PRODUCTS = [
  { id: 'p1', name: 'Tata Salt 1kg', price: 28, mrp: 28, barcode: '8901052000017', category: 'Groceries', gst_pct: 0, stock_qty: 5, icon: 'shaker-outline' },
  { id: 'p2', name: 'Fortune Oil 1L', price: 145, mrp: 165, barcode: '8906007281013', category: 'Groceries', gst_pct: 5, stock_qty: 3, icon: 'bottle-tonic-outline' },
  { id: 'p3', name: 'Amul Milk 1L', price: 64, mrp: 64, barcode: '8901262010053', category: 'Dairy', gst_pct: 0, stock_qty: 8, icon: 'cup-water' },
  { id: 'p4', name: 'Maggi Noodles', price: 12, mrp: 14, barcode: '8901058852276', category: 'Snacks', gst_pct: 12, stock_qty: 4, icon: 'noodles' },
  { id: 'p5', name: 'Surf Excel 1kg', price: 120, mrp: 140, barcode: '8901030704405', category: 'Household', gst_pct: 18, stock_qty: 24, icon: 'washing-machine' },
  { id: 'p6', name: 'Dove Soap', price: 45, mrp: 50, barcode: '8901396112203', category: 'Personal Care', gst_pct: 18, stock_qty: 32, icon: 'shower-head' },
  { id: 'p7', name: 'Colgate 200g', price: 78, mrp: 85, barcode: '8901314010118', category: 'Personal Care', gst_pct: 18, stock_qty: 18, icon: 'toothbrush-paste' },
  { id: 'p8', name: 'Biscuits Pack', price: 30, mrp: 30, barcode: '8901063012016', category: 'Snacks', gst_pct: 12, stock_qty: 40, icon: 'cookie' },
];

const RETAIL_CATEGORIES = ['All', 'Groceries', 'Dairy', 'Beverages', 'Snacks', 'Personal Care', 'Household'];

const FREQUENTLY_SOLD_ITEMS = [
  { id: 'f1', name: 'Rice 5kg', price: 320, mrp: 350, icon: 'sack', category: 'Groceries' },
  { id: 'f2', name: 'Cooking Oil 1L', price: 145, mrp: 165, icon: 'bottle-tonic-outline', category: 'Groceries' },
  { id: 'f3', name: 'Milk 1L', price: 64, mrp: 64, icon: 'cup-water', category: 'Dairy' },
  { id: 'f4', name: 'Sugar 1kg', price: 42, mrp: 48, icon: 'shaker-outline', category: 'Groceries' },
];

// ── Main POS Billing Screen ────────────────────────────────────────────
export default function POSBillingScreen() {
  const { isDarkMode, toggleTheme } = useAppTheme();
  const appTheme = useTheme();
  const { tenantId, loading: authLoading } = useAuth();

  const { cart, addToCart, removeFromCart, updateQty, getSubtotal, clearCart } = useCart();
  const [search, setSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<RNTextInput>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (cart.length === 0) {
      addToCart({ id: 'p1', name: 'Tata Salt 1kg', price: 28, mrp: 28, qty: 2, gst_pct: 0 });
      addToCart({ id: 'p2', name: 'Fortune Oil 1L', price: 145, mrp: 165, qty: 1, gst_pct: 5 });
      addToCart({ id: 'p3', name: 'Amul Milk 1L', price: 64, mrp: 64, qty: 1, gst_pct: 0 });
    }
  }, []);
  
  const [products, setProducts] = useState<any[]>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const cached = window.localStorage.getItem('cachedProductsList');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (_) {}
    }
    return DEFAULT_STORE_PRODUCTS;
  });
  // Weighing Scale Calculator States
  const [weighProduct, setWeighProduct] = useState<any>(null);
  const [weighWeight, setWeighWeight] = useState('1000');
  const [showWeighModal, setShowWeighModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedBillData, setSavedBillData] = useState<any>(null);
  const [savedDraftList, setSavedDraftList] = useState<any[]>([]);
  const [showAssistantModal, setShowAssistantModal] = useState(false);

  // Discount Modal States
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat');
  const [discountInput, setDiscountInput] = useState('');

  // Phone Prompt Modal States
  const [showPhonePromptModal, setShowPhonePromptModal] = useState(false);
  const [phonePromptTarget, setPhonePromptTarget] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [phonePromptInput, setPhonePromptInput] = useState('');
  const [phonePromptBill, setPhonePromptBill] = useState<any>(null);

  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraScanned, setCameraScanned] = useState(false);

  const handleOpenScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
    if (status === 'granted') {
      setShowCameraScanner(true);
      setCameraScanned(false);
    } else {
      Alert.alert('Permission Denied', 'Camera permission is required to scan barcodes.');
    }
  };
  
  const params = useLocalSearchParams();
  const scanBarcodeParam = params.scanBarcode;
  
  useEffect(() => {
    if (!authLoading && tenantId) {
      fetchProducts();
    }
  }, [authLoading, tenantId]);

  // Handle incoming deep link barcode scans on mount / parameter changes
  useEffect(() => {
    if (products.length > 0 && scanBarcodeParam) {
      const barcodeStr = Array.isArray(scanBarcodeParam) ? scanBarcodeParam[0] : scanBarcodeParam;
      if (barcodeStr) {
        const cleanBarcode = barcodeStr.trim().replace(/[\r\n]/g, '');
        const matchingProduct = products.find(p => p.barcode === cleanBarcode);
        if (matchingProduct) {
          handleAddProduct(matchingProduct);
          // Clear query parameters
          router.setParams({ scanBarcode: undefined });
        } else {
          Alert.alert('Not Found', `Product with barcode: ${cleanBarcode} not found in inventory.`);
          router.setParams({ scanBarcode: undefined });
        }
      }
    }
  }, [scanBarcodeParam, products]);

  const fetchProducts = async () => {
    if (isFirebaseConfigured) {
      try {
        if (!tenantId) return;
        const q = query(
          collection(db, 'products'),
          where('tenant_id', '==', tenantId)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (data.length > 0) {
          const formatted = data.map((p: any) => {
            const pPrice = Number(p.price !== undefined ? p.price : (p.selling_price !== undefined ? p.selling_price : (p.mrp !== undefined ? p.mrp : 0))) || 0;
            const pMrp = Number(p.mrp !== undefined ? p.mrp : pPrice) || pPrice;
            return {
              id: p.id,
              name: p.name || 'Product',
              price: pPrice,
              mrp: pMrp,
              barcode: p.barcode || '',
              category: p.category || '',
              gst_pct: Number(p.gst_pct) || 0,
              hsn: p.hsn || '',
              stock_qty: p.stock_qty !== undefined ? Number(p.stock_qty) : (Number(p.stock) || 0),
              image_url: p.image_url
            };
          });
          setProducts(formatted);
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            try {
              window.localStorage.setItem('cachedProductsList', JSON.stringify(formatted));
            } catch (_) {}
          }
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return [];
    return products.filter(p => 
      (p.name || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.barcode || '').includes(search)
    );
  }, [search, products]);

  const handleAddProduct = (product: any) => {
    const safePrice = Number(product.price !== undefined ? product.price : (product.selling_price !== undefined ? product.selling_price : (product.mrp !== undefined ? product.mrp : 0))) || 0;
    const safeMrp = Number(product.mrp !== undefined ? product.mrp : safePrice) || safePrice;
    addToCart({
      id: product.id, 
      name: product.name,
      price: safePrice, 
      mrp: safeMrp,
      qty: 1,
      gst_pct: isGstRegistered ? (Number(product.gst_pct) || 0) : 0, 
      hsn: product.hsn || '',
      image_url: product.image_url,
    });
    setSearch('');
    setShowSuggestions(false);
  };

  const getProductStock = (id: string) => {
    const p = products.find(p => p.id === id);
    return p ? p.stock_qty : 0;
  };
  // Dynamic GST vs Non-GST shop configurations
  const [isGstRegistered, setIsGstRegistered] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const gstVal = window.localStorage.getItem('isGstRegistered');
      return gstVal !== 'false';
    }
    return true;
  });
  const [storeName, setStoreName] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem('storeName') || 'BharatPOS';
    }
    return 'BharatPOS';
  });
  const [gstNum, setGstNum] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem('gstNumber') || '';
    }
    return '';
  });
  const [storeAddress, setStoreAddress] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.localStorage.getItem('storeAddress') || '';
    }
    return '';
  });

  // Checkout & sharing states
  const [showCheckout, setShowCheckout] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [payMethod, setPayMethod] = useState('UPI'); // 'Cash' | 'UPI' | 'Card'
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeBillNo, setActiveBillNo] = useState('');
  const [lastCompletedBill, setLastCompletedBill] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const gstVal = window.localStorage.getItem('isGstRegistered');
      setIsGstRegistered(gstVal !== 'false');
      
      const nameVal = window.localStorage.getItem('storeName');
      if (nameVal) setStoreName(nameVal);
      
      const numVal = window.localStorage.getItem('gstNumber');
      if (numVal) setGstNum(numVal);

      const addrVal = window.localStorage.getItem('storeAddress');
      if (addrVal) setStoreAddress(addrVal);
    }
  }, []);

  const subtotal = getSubtotal();

  // Calculate GST breakdown per item (only if GST registered business)
  const gstBreakdown = useMemo(() => {
    let cgst = 0; let sgst = 0; let totalGst = 0;
    if (!isGstRegistered) return { cgst, sgst, totalGst };
    cart.forEach(item => {
      const itemPrice = Number(item.price !== undefined ? item.price : (item.selling_price !== undefined ? item.selling_price : 0)) || 0;
      const itemQty = Number(item.qty) || 1;
      const itemTotal = itemPrice * itemQty;
      const gstPct = item.gst_pct !== undefined ? (Number(item.gst_pct) || 0) : 5;
      const gstAmount = itemTotal * (gstPct / 100);
      totalGst += gstAmount;
      cgst += gstAmount / 2;
      sgst += gstAmount / 2;
    });
    return { cgst, sgst, totalGst };
  }, [cart, isGstRegistered]);

  const [discount, setDiscount] = useState(0);
  const finalTotal = isGstRegistered
    ? Math.max(0, subtotal - discount + gstBreakdown.totalGst)
    : Math.max(0, subtotal - discount);

  const handleSearchSubmitWithText = async (barcodeText: string) => {
    if (!barcodeText.trim()) return;
    
    if (!isFirebaseConfigured) {
      Alert.alert('Configuration Error', 'Firebase must be configured to fetch products.');
      return;
    }

    try {
      // 1. If scanned text is a deep link URL, parse the barcode out of it
      let barcode = barcodeText;
      if (barcodeText.includes('scanBarcode=')) {
        const match = barcodeText.match(/[?&]scanBarcode=([^&]+)/);
        if (match) {
          barcode = match[1];
        }
      }
      
      const cleanBarcode = barcode.trim().replace(/[\r\n]/g, '');
      if (!cleanBarcode) return;

      // 1. Instant in-memory check (0ms response)
      const inMemoryMatch = products.find(p => 
        (p.barcode && p.barcode.trim() === cleanBarcode) || 
        (p.name && p.name.toLowerCase() === cleanBarcode.toLowerCase())
      );
      if (inMemoryMatch) {
        handleAddProduct(inMemoryMatch);
        setSearch('');
        setShowSuggestions(false);
        return;
      }

      if (!tenantId) return;
      const q = query(
        collection(db, 'products'), 
        where('tenant_id', '==', tenantId), 
        where('barcode', '==', cleanBarcode)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        const pPrice = Number(data.price !== undefined ? data.price : (data.selling_price !== undefined ? data.selling_price : (data.mrp !== undefined ? data.mrp : 0))) || 0;
        const pMrp = Number(data.mrp !== undefined ? data.mrp : pPrice) || pPrice;
        addToCart({
          id: docSnap.id, 
          name: data.name || 'Product',
          price: pPrice, 
          mrp: pMrp,
          qty: 1,
          gst_pct: isGstRegistered ? (Number(data.gst_pct) || 0) : 0, 
          hsn: data.hsn || '',
          image_url: data.image_url,
        });
        setSearch('');
        setShowSuggestions(false);
      } else {
        Alert.alert('Not Found', `Product not found with barcode: ${cleanBarcode}`);
      }
    } catch (error) {
      console.error("Error searching product:", error);
    }
  };

  const handleSearchSubmit = async () => {
    await handleSearchSubmitWithText(search);
  };

  const handlePay = () => {
    if (cart.length === 0) return;
    setActiveBillNo('INV-' + Date.now());
    setShowCheckout(true);
  };

  const deductStockForCart = async (itemsToDeduct: any[]) => {
    if (!itemsToDeduct || itemsToDeduct.length === 0) return;

    // 1. Immediately update in-memory products list in state so UI updates in real time
    setProducts((prevProducts: any[]) => {
      return prevProducts.map(p => {
        const matched = itemsToDeduct.find((i: any) => i.id === p.id);
        if (matched) {
          const currentQty = Number(p.stock_qty !== undefined ? p.stock_qty : (p.stock_quantity ?? p.stock ?? 0));
          const newQty = Math.max(0, currentQty - Number(matched.qty || 1));
          return { ...p, stock_qty: newQty, stock_quantity: newQty };
        }
        return p;
      });
    });

    // 2. Persist stock deduction in Firebase Realtime Database
    if (isFirebaseConfigured) {
      await Promise.all(itemsToDeduct.map(async (item: any) => {
        try {
          if (!item.id) return;
          const productRef = doc(db, 'products', item.id);
          const prodSnap = await getDoc(productRef);
          if (prodSnap.exists && prodSnap.exists()) {
            const currentData = prodSnap.data();
            const currentQty = Number(currentData?.stock_qty ?? currentData?.stock_quantity ?? currentData?.stock ?? 0);
            const newQty = Math.max(0, currentQty - Number(item.qty || 1));
            await updateDoc(productRef, {
              stock_qty: newQty,
              stock_quantity: newQty,
              stock: newQty,
              updated_at: new Date().toISOString()
            });
            console.log(`[STOCK DEDUCTED] ${item.name} (${item.id}): ${currentQty} -> ${newQty}`);
          } else {
            await updateDoc(productRef, {
              stock_qty: increment(-Number(item.qty || 1)),
              stock_quantity: increment(-Number(item.qty || 1)),
            });
          }
        } catch (error) {
          console.error("Failed to deduct stock for product", item.id, error);
        }
      }));
    }
  };

  const handleCompleteSale = async (sendInvoice: boolean) => {
    const dateObj = new Date();
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);


    // 3. Save to Firebase Firestore if enabled
    if (isFirebaseConfigured) {
      if (!tenantId) {
        Alert.alert('Error', 'Tenant ID is missing. Please log in again.');
        return;
      }
      try {
        // Run sales logging, ledger transaction & stock deduction in parallel for maximum speed
        await Promise.all([
          addDoc(collection(db, 'sales'), {
            tenant_id: tenantId,
            vendor_id: auth.currentUser?.uid || 'owner',
            bill_no: activeBillNo,
            created_at: dateObj.toISOString(),
            customer_name: custName || 'Walk-in Customer',
            customer_phone: custPhone || '',
            customer_gstin: custGstin || '',
            payment_method: payMethod,
            subtotal: subtotal,
            discount: discount,
            gst_collected: gstBreakdown.totalGst,
            total_amount: finalTotal,
            items: cart.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              qty: item.qty,
              gst_pct: item.gst_pct || 0,
              hsn: (item as any).hsn || ''
            }))
          }),
          addDoc(collection(db, 'transactions'), {
            tenant_id: tenantId,
            dateTime: `${dateStr} ${timeStr}`,
            created_at: dateObj.toISOString(),
            voucherType: 'Sales',
            voucherNo: activeBillNo,
            partyName: custName || 'Walk-in Customer',
            debit: finalTotal,
            credit: 0,
            paymentMethod: payMethod,
            gstAmount: gstBreakdown.totalGst,
            taxableValue: subtotal - discount,
          }),
          deductStockForCart(cart)
        ]);

        // Webhook Trigger
        const savedWebhookUrl = Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage.getItem('webhookUrl') : '';
        if (savedWebhookUrl) {
          fetch(savedWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'sale_completed',
              tenant_id: tenantId,
              bill_no: activeBillNo,
              total_amount: finalTotal,
              payment_method: payMethod,
              timestamp: dateObj.toISOString(),
              items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                qty: item.qty
              }))
            })
          }).catch(err => console.warn("Webhook delivery failed:", err));
        }

        // Low Stock Alert
        const checkLowStockSetting = Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage.getItem('lowStockEmailNotif') !== 'false' : true;
        if (checkLowStockSetting) {
          const lowStockItems = cart.filter(item => {
            const currentProduct = products.find(p => p.id === item.id);
            if (currentProduct) {
              const remainingStock = currentProduct.stock_qty - item.qty;
              return remainingStock < 5;
            }
            return false;
          });
          if (lowStockItems.length > 0) {
            const itemNames = lowStockItems.map(item => `${item.name} (drops below 5)`).join(', ');
            setTimeout(() => {
              Alert.alert('Low Stock Automation Alert', `Stock is running low for: ${itemNames}. Reorder suggested.`);
            }, 800);
          }
        }
      } catch (err) {
        console.error("Firestore sale write error:", err);
        Alert.alert("Error", "Failed to complete sale. Please try again.");
        return; // Don't proceed to success screen
      }
    }

    // Create complete invoice object
    const finalBillNo = activeBillNo || ('INV-' + Date.now().toString().slice(-6));
    const invoicePayload = {
      billNo: finalBillNo,
      tenantId: tenantId || 'default',
      storeName: storeName || 'BharatPOS',
      storeAddress: storeAddress || '',
      gstNum: gstNum || '',
      isGst: isGstRegistered,
      date: dateStr,
      time: timeStr,
      payMethod: payMethod,
      custName: custName || 'Walk-in Customer',
      custPhone: custPhone || '',
      custGstin: custGstin || '',
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        gst_pct: item.gst_pct || 0,
        hsn: (item as any).hsn || ''
      })),
      subtotal: subtotal,
      discount: discount,
      gstAmount: gstBreakdown.totalGst,
      finalTotal: finalTotal,
      createdAt: dateObj.toISOString()
    };

    setLastCompletedBill(invoicePayload);

    // Save in LocalStorage for instant access by /invoice page & local thermal receipts
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const storedInvoices = JSON.parse(window.localStorage.getItem('bharatpos_invoices') || '{}');
        storedInvoices[finalBillNo] = invoicePayload;
        window.localStorage.setItem('bharatpos_invoices', JSON.stringify(storedInvoices));
        window.localStorage.setItem('bharatpos_last_bill', JSON.stringify(invoicePayload));
      } catch (e) {
        console.warn('LocalStorage invoice write error:', e);
      }
    }

    // Save to Cloud Invoices
    if (isFirebaseConfigured) {
      saveInvoiceToCloud(invoicePayload);
    }

    setShowCheckout(false);
    if (sendInvoice) {
      setShowReceipt(true);
    } else {
      Alert.alert('Payment Successful', `Sale completed successfully.\nBill No: ${finalBillNo}`);
      clearCart();
      setCustName('');
      setCustPhone('');
      setCustGstin('');
    }
  };

  const handleResetCheckout = () => {
    setShowReceipt(false);
    clearCart();
    setCustName('');
    setCustPhone('');
    setCustGstin('');
  };

  const loadDrafts = () => {
    if (typeof window !== 'undefined') {
      try {
        const key = `saved_draft_bills_${tenantId || 'default'}`;
        const stored = window.localStorage.getItem(key);
        if (stored) {
          setSavedDraftList(JSON.parse(stored));
        } else {
          setSavedDraftList([]);
        }
      } catch (e) {
        setSavedDraftList([]);
      }
    }
  };

  useEffect(() => {
    loadDrafts();
  }, [tenantId]);

  const handlePrintPdf = async (customBill?: any) => {
    const items = (customBill && customBill.items && customBill.items.length > 0) ? customBill.items : cart;
    const bNo = (customBill && customBill.billNo) ? customBill.billNo : (activeBillNo || 'INV-' + Date.now().toString().slice(-6));
    const bSubtotal = (customBill && customBill.subtotal !== undefined) ? customBill.subtotal : subtotal;
    const bDiscount = (customBill && customBill.discount !== undefined) ? customBill.discount : discount;
    const bFinalTotal = (customBill && customBill.finalTotal !== undefined) ? customBill.finalTotal : finalTotal;
    const bCustName = (customBill && customBill.custName) ? customBill.custName : custName;
    const bCustPhone = (customBill && customBill.custPhone) ? customBill.custPhone : custPhone;
    const bCustGstin = (customBill && customBill.custGstin) ? customBill.custGstin : custGstin;
    const bPayMethod = (customBill && customBill.payMethod) ? customBill.payMethod : payMethod;

    if (!items || items.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to the cart before printing.');
      return;
    }

    try {
      const itemsRows = items.map((item: any) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${item.name}</td>
          <td style="text-align: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">${item.qty}</td>
          <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">₹${Number(item.price).toFixed(2)}</td>
          <td style="text-align: right; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">₹${(Number(item.price) * Number(item.qty)).toFixed(2)}</td>
        </tr>
      `).join('');

      const gstRows = isGstRegistered ? `
        <div class="total-row"><span>CGST:</span> <span>₹${(Number(bFinalTotal) * 0.025).toFixed(2)}</span></div>
        <div class="total-row"><span>SGST:</span> <span>₹${(Number(bFinalTotal) * 0.025).toFixed(2)}</span></div>
      ` : '';

      const htmlString = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${bNo}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #334155; background-color: #f8fafc; margin: 0; }
              .receipt-box { max-width: 450px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
              .header { text-align: center; margin-bottom: 24px; }
              .store-name { font-size: 24px; font-weight: 800; margin: 0; color: #0f172a; letter-spacing: -0.5px; }
              .store-subtitle { font-size: 13px; color: #64748b; margin: 4px 0 0 0; }
              .gstin { font-size: 11px; color: #94a3b8; font-weight: 600; margin-top: 6px; }
              .invoice-details { margin: 20px 0; border-top: 1px dashed #e2e8f0; border-bottom: 1px dashed #e2e8f0; padding: 12px 0; font-size: 13px; color: #475569; }
              .details-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
              .items-table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
              .items-table th { border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
              .totals-section { margin-top: 24px; border-top: 2px solid #f1f5f9; padding-top: 12px; font-size: 13px; color: #475569; }
              .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
              .grand-total { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 1px dashed #e2e8f0; padding-top: 10px; margin-top: 10px; }
              .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #94a3b8; font-weight: 500; }
              @media print {
                body { padding: 0; background-color: #ffffff; }
                .receipt-box { border: none; box-shadow: none; padding: 0; max-width: 100%; }
              }
            </style>
          </head>
          <body>
            <div class="receipt-box">
              <div class="header">
                <h1 class="store-name">${storeName}</h1>
                <p class="store-subtitle">${storeAddress || 'BharatPOS Merchant Store'}</p>
                ${isGstRegistered && gstNum ? `<div class="gstin">GSTIN: ${gstNum}</div>` : ''}
              </div>
              <div class="invoice-details">
                <div class="details-row"><span>Invoice No:</span> <strong>${bNo}</strong></div>
                <div class="details-row"><span>Date:</span> <span>${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span></div>
                <div class="details-row"><span>Customer Name:</span> <span>${bCustName || 'Walk-in Customer'}</span></div>
                ${bCustPhone ? `<div class="details-row"><span>Mobile No:</span> <span>+91 ${bCustPhone}</span></div>` : ''}
                ${bCustGstin ? `<div class="details-row"><span>Customer GSTIN:</span> <span>${bCustGstin}</span></div>` : ''}
                <div class="details-row"><span>Payment Mode:</span> <span>${bPayMethod || 'Cash'}</span></div>
              </div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="text-align: left; width: 45%;">Item Description</th>
                    <th style="text-align: center; width: 10%;">Qty</th>
                    <th style="text-align: right; width: 20%;">Rate</th>
                    <th style="text-align: right; width: 25%;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
              <div class="totals-section">
                <div class="total-row"><span>Subtotal:</span> <span>₹${Number(bSubtotal).toFixed(2)}</span></div>
                ${Number(bDiscount) > 0 ? `<div class="total-row"><span>Discount:</span> <span>-₹${Number(bDiscount).toFixed(2)}</span></div>` : ''}
                ${gstRows}
                <div class="total-row grand-total"><span>GRAND TOTAL:</span> <span>₹${Number(bFinalTotal).toFixed(2)}</span></div>
              </div>
              <div class="footer">
                <p>Thank you for shopping with us!</p>
                <p style="font-size: 9px; color: #cbd5e1; margin-top: 8px;">Powered by BharatPOS</p>
              </div>
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        let printFrame = document.getElementById('receipt-print-iframe') as HTMLIFrameElement;
        if (!printFrame) {
          printFrame = document.createElement('iframe');
          printFrame.id = 'receipt-print-iframe';
          printFrame.style.position = 'fixed';
          printFrame.style.right = '0';
          printFrame.style.bottom = '0';
          printFrame.style.width = '0';
          printFrame.style.height = '0';
          printFrame.style.border = '0';
          document.body.appendChild(printFrame);
        }
        const doc = printFrame.contentDocument || (printFrame.contentWindow ? printFrame.contentWindow.document : null);
        if (doc) {
          doc.open();
          doc.write(htmlString);
          doc.close();
          setTimeout(() => {
            if (printFrame.contentWindow) {
              printFrame.contentWindow.focus();
              printFrame.contentWindow.print();
            }
          }, 250);
          return;
        }
      }

      await Print.printAsync({ html: htmlString });
    } catch (e) {
      console.error(e);
      Alert.alert('Printing Error', 'Failed to generate invoice PDF.');
    }
  };

  const saveInvoiceToCloud = async (billObj: any) => {
    try {
      await setDoc(doc(db, 'invoices', billObj.billNo), billObj);
    } catch (e) {
      console.warn('Cloud invoice save error:', e);
    }
  };

  const buildCleanInvoiceUrl = (billNo: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://bharatpos-new.vercel.app';
    return `${base}/invoice?id=${billNo}`;
  };

  const handleWhatsAppShare = async (customBill?: any) => {
    const items = (customBill && customBill.items && customBill.items.length > 0) ? customBill.items : cart;
    const bNo = (customBill && customBill.billNo) ? customBill.billNo : (activeBillNo || 'INV-' + Date.now().toString().slice(-6));
    const bSubtotal = (customBill && customBill.subtotal !== undefined) ? customBill.subtotal : subtotal;
    const bDiscount = (customBill && customBill.discount !== undefined) ? customBill.discount : discount;
    const bFinalTotal = (customBill && customBill.finalTotal !== undefined) ? customBill.finalTotal : finalTotal;
    const bPhone = (customBill && customBill.custPhone) ? customBill.custPhone : (custPhone || phonePromptInput);
    const bPayMethod = (customBill && customBill.payMethod) ? customBill.payMethod : payMethod;
    const bCustName = (customBill && customBill.custName) ? customBill.custName : custName;
    const bCustGstin = (customBill && customBill.custGstin) ? customBill.custGstin : custGstin;

    if (!items || items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before sharing via WhatsApp.');
      return;
    }

    if (!bPhone || !bPhone.trim()) {
      setPhonePromptBill(customBill || {
        items: cart,
        subtotal,
        discount,
        finalTotal,
        payMethod,
        custName,
        custGstin,
        billNo: bNo
      });
      setPhonePromptTarget('whatsapp');
      setPhonePromptInput('');
      setShowPhonePromptModal(true);
      return;
    }

    const cleanPhone = bPhone.replace(/[^0-9]/g, '');
    const invoicePayload = {
      storeName,
      storeAddress,
      gstNum,
      isGst: isGstRegistered,
      billNo: bNo,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      payMethod: bPayMethod || 'UPI',
      custName: bCustName || 'Valued Customer',
      custPhone: cleanPhone,
      custGstin: bCustGstin || '',
      items: items.map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal: Number(bSubtotal),
      discount: Number(bDiscount),
      finalTotal: Number(bFinalTotal),
      createdAt: Date.now()
    };

    saveInvoiceToCloud(invoicePayload);
    await deductStockForCart(items);

    const invoiceUrl = buildCleanInvoiceUrl(bNo);
    const message = `Thank you for shopping at *${storeName}*!\n\n*Invoice No:* ${bNo}\n*Date:* ${new Date().toLocaleDateString('en-IN')}\n*Payment Mode:* ${bPayMethod || 'UPI'}\n*Grand Total:* *₹${Number(bFinalTotal).toFixed(2)}*\n\n📄 *View & Download Official Tax Invoice / PDF Bill:*\n${invoiceUrl}\n\nWe look forward to serving you again!`;

    // 1. Dispatch via WhatsApp Cloud API
    if (Platform.OS === 'web' && typeof fetch !== 'undefined') {
      try {
        fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            message,
            billNo: bNo,
            amount: Number(bFinalTotal),
            storeName,
            invoiceUrl
          })
        }).catch(() => {});
      } catch (_) {}
    }

    // 2. Direct Open WhatsApp
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    } else {
      Linking.openURL(waUrl).catch(() => {});
    }
  };

  const handleSmsShare = async (customBill?: any) => {
    const items = customBill ? customBill.items : cart;
    const bNo = customBill ? customBill.billNo : (activeBillNo || 'INV-' + Date.now().toString().slice(-6));
    const bSubtotal = customBill ? customBill.subtotal : subtotal;
    const bDiscount = customBill ? customBill.discount : discount;
    const bFinalTotal = customBill ? customBill.finalTotal : finalTotal;
    const bPhone = customBill ? customBill.custPhone : custPhone;
    const bCustName = customBill ? customBill.custName : custName;
    const bCustGstin = customBill ? customBill.custGstin : custGstin;
    const bPayMethod = customBill ? customBill.payMethod : payMethod;

    if (!items || items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items before sending SMS.');
      return;
    }

    if (!bPhone || !bPhone.trim()) {
      setPhonePromptBill(customBill || null);
      setPhonePromptTarget('sms');
      setPhonePromptInput('');
      setShowPhonePromptModal(true);
      return;
    }

    const cleanPhone = bPhone.replace(/[^0-9]/g, '');
    const invoicePayload = {
      storeName,
      storeAddress,
      gstNum,
      isGst: isGstRegistered,
      billNo: bNo,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      payMethod: bPayMethod || 'UPI',
      custName: bCustName || 'Valued Customer',
      custPhone: cleanPhone,
      custGstin: bCustGstin || '',
      items: items.map((i: any) => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal: Number(bSubtotal),
      discount: Number(bDiscount),
      finalTotal: Number(bFinalTotal),
      createdAt: Date.now()
    };

    saveInvoiceToCloud(invoicePayload);

    const invoiceUrl = buildCleanInvoiceUrl(bNo);
    const smsMessage = `Dear Customer, thank you for shopping at ${storeName}! Bill No: ${bNo}, Amount: Rs.${Number(bFinalTotal).toFixed(2)}, Payment: ${bPayMethod || 'UPI'}. View Bill: ${invoiceUrl}`;

    // Direct Background SMS Gateway API Call via Fast2SMS
    if (Platform.OS === 'web' && typeof fetch !== 'undefined') {
      try {
        const smsRes = await fetch('/api/send-sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: cleanPhone,
            message: smsMessage,
            billNo: bNo,
            amount: Number(bFinalTotal),
            storeName,
            invoiceUrl
          })
        });
        const smsData = await smsRes.json();
        if (smsData.success) {
          Alert.alert('✅ SMS Delivered', `Invoice #${bNo} sent to +91 ${cleanPhone} successfully via Fast2SMS.`);
        } else {
          // If carrier needs wallet recharge or returned error, provide instant fallback
          const errorMsg = smsData.error || 'Fast2SMS carrier delivery pending.';
          Alert.alert(
            'SMS Notification',
            `${errorMsg}\n\nOpening device SMS to send invoice directly to +91 ${cleanPhone}...`,
            [
              {
                text: 'Send via Device SMS',
                onPress: () => {
                  const smsUri = `sms:+91${cleanPhone}?body=${encodeURIComponent(smsMessage)}`;
                  if (typeof window !== 'undefined') {
                    window.open(smsUri, '_blank');
                  } else {
                    Linking.openURL(smsUri).catch(() => {});
                  }
                }
              },
              { text: 'OK', style: 'cancel' }
            ]
          );
        }
      } catch (err) {
        Alert.alert('⚠️ SMS Error', 'Network error while sending SMS. Please try again.');
      }
    } else {
      // Mobile native fallback
      const smsUri = `sms:+91${cleanPhone}?body=${encodeURIComponent(smsMessage)}`;
      Linking.openURL(smsUri).catch(() => {});
    }
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val <= 0) {
      setDiscount(0);
      setShowDiscountModal(false);
      return;
    }
    if (discountType === 'percent') {
      const discAmt = (subtotal * val) / 100;
      setDiscount(Math.min(subtotal, Math.round(discAmt * 100) / 100));
    } else {
      setDiscount(Math.min(subtotal, val));
    }
    setShowDiscountModal(false);
  };

  const handlePrint = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to the cart before printing.');
      return;
    }
    handlePrintPdf();
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to the cart before saving.');
      return;
    }

    const draft = {
      id: 'draft_' + Date.now(),
      billNo: activeBillNo,
      date: new Date().toISOString(),
      displayDate: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      items: [...cart],
      subtotal,
      discount,
      finalTotal,
      custName,
      custPhone,
      custGstin,
      payMethod
    };

    setSavedBillData(draft);

    if (typeof window !== 'undefined') {
      try {
        const key = `saved_draft_bills_${tenantId || 'default'}`;
        const stored = window.localStorage.getItem(key);
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(draft);
        window.localStorage.setItem(key, JSON.stringify(list));
        setSavedDraftList(list);
      } catch (e) {}
    }

    if (isFirebaseConfigured && tenantId) {
      try {
        await addDoc(collection(db, 'saved_drafts'), {
          ...draft,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Firebase draft save skipped:', e);
      }
    }

    setShowSavedModal(true);
  };

  const handleHoldBill = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Add items to the cart before putting a bill on hold.');
      return;
    }

    const draft = {
      id: 'draft_' + Date.now(),
      billNo: activeBillNo,
      date: new Date().toISOString(),
      displayDate: new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      items: [...cart],
      subtotal,
      discount,
      finalTotal,
      custName,
      custPhone,
      custGstin,
      payMethod
    };

    if (typeof window !== 'undefined') {
      try {
        const key = `saved_draft_bills_${tenantId || 'default'}`;
        const stored = window.localStorage.getItem(key);
        const list = stored ? JSON.parse(stored) : [];
        list.unshift(draft);
        window.localStorage.setItem(key, JSON.stringify(list));
        setSavedDraftList(list);
      } catch (e) {}
    }

    if (isFirebaseConfigured && tenantId) {
      try {
        await addDoc(collection(db, 'saved_drafts'), {
          ...draft,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        });
      } catch (e) {}
    }

    clearCart();
    Alert.alert('Bill on Hold', `Bill #${activeBillNo} (₹${finalTotal.toFixed(2)}) has been put on hold. You can resume it anytime from 'Active Session'.`);
  };

  const handleResumeDraft = (draft: any) => {
    clearCart();
    draft.items.forEach((item: any) => {
      addToCart(item);
    });
    setDiscount(draft.discount || 0);
    setCustName(draft.custName || '');
    setCustPhone(draft.custPhone || '');
    setCustGstin(draft.custGstin || '');
    if (draft.payMethod) setPayMethod(draft.payMethod);
    setShowSessionModal(false);
    Alert.alert('Bill Resumed', `Draft bill #${draft.billNo} has been restored to your cart.`);
  };

  const handleDeleteDraft = (draftId: string) => {
    if (typeof window !== 'undefined') {
      try {
        const key = `saved_draft_bills_${tenantId || 'default'}`;
        const updated = savedDraftList.filter(d => d.id !== draftId);
        window.localStorage.setItem(key, JSON.stringify(updated));
        setSavedDraftList(updated);
      } catch (e) {}
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── 1. Top Header Row: "New Sale" + 4 Action Buttons ── */}
      <View style={styles.newSaleHeaderRow}>
        <Text style={styles.newSaleTitle}>New Sale</Text>
        <View style={styles.newSaleActionsWrap}>
          <TouchableOpacity 
            style={styles.actionPillBtn} 
            activeOpacity={0.7}
            onPress={handleOpenScanner}
          >
            <Icon name="barcode-scan" size={16} color="#0284C7" style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.actionPillLabel}>Scan</Text>
              <Text style={styles.actionPillSub}>Barcode</Text>
            </View>
            <View style={styles.actionFBadge}>
              <Text style={styles.actionFBadgeText}>F1</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionPillBtn} 
            activeOpacity={0.7}
            onPress={() => searchInputRef.current?.focus()}
          >
            <Icon name="magnify" size={16} color="#0284C7" style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.actionPillLabel}>Search</Text>
              <Text style={styles.actionPillSub}>Product</Text>
            </View>
            <View style={styles.actionFBadge}>
              <Text style={styles.actionFBadgeText}>F2</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionPillBtn} 
            activeOpacity={0.7}
            onPress={() => setShowPhonePromptModal(true)}
          >
            <Icon name="account-plus-outline" size={16} color="#0284C7" style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.actionPillLabel}>Add</Text>
              <Text style={styles.actionPillSub}>Customer</Text>
            </View>
            <View style={styles.actionFBadge}>
              <Text style={styles.actionFBadgeText}>F4</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionPillBtn} 
            activeOpacity={0.7}
            onPress={() => setShowAssistantModal(true)}
          >
            <Icon name="microphone" size={16} color="#0284C7" style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.actionPillLabel}>Voice AI</Text>
              <Text style={styles.actionPillSub}>Copilot</Text>
            </View>
            <View style={styles.actionFBadge}>
              <Text style={styles.actionFBadgeText}>F5</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. Category Filter Pills Row ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollRow} contentContainerStyle={{ paddingVertical: 6, gap: 8 }}>
        {RETAIL_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.7}
              style={[
                styles.categoryFilterPill,
                isSelected && styles.categoryFilterPillActive
              ]}
            >
              <Text style={[
                styles.categoryFilterText,
                isSelected && styles.categoryFilterTextActive
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── 3. Main 2-Column POS Layout ── */}
      <View style={styles.posColumnsRow}>
        {/* Left Column: Product Grid + Frequently Sold */}
        <View style={styles.posLeftCatalog}>
          {/* 4-column Product Grid */}
          <View style={styles.productGrid}>
            {(selectedCategory === 'All' ? products : products.filter(p => (p.category || '').toLowerCase() === selectedCategory.toLowerCase())).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.productCard}
                activeOpacity={0.8}
                onPress={() => handleAddProduct(item)}
              >
                <View style={styles.productCardImgWrap}>
                  <Icon name={item.icon || 'package-variant-closed'} size={28} color="#EA580C" />
                </View>
                <Text style={styles.productCardName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.productCardBottom}>
                  <Text style={styles.productCardPrice}>₹{item.price}</Text>
                  <TouchableOpacity
                    style={styles.productCardPlusBtn}
                    onPress={() => handleAddProduct(item)}
                    activeOpacity={0.7}
                  >
                    <Icon name="plus" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Frequently Sold Section */}
          <View style={styles.frequentlySoldSection}>
            <View style={styles.frequentlySoldHeader}>
              <Text style={styles.frequentlySoldTitle}>Frequently Sold</Text>
              <TouchableOpacity onPress={() => setSelectedCategory('All')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.frequentlySoldGrid}>
              {FREQUENTLY_SOLD_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.freqCard}
                  activeOpacity={0.8}
                  onPress={() => handleAddProduct(item)}
                >
                  <View style={styles.freqImgWrap}>
                    <Icon name={item.icon} size={22} color="#F97316" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.freqName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.freqPrice}>₹{item.price}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.freqPlusBtn}
                    onPress={() => handleAddProduct(item)}
                  >
                    <Icon name="plus" size={14} color="#F97316" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Right Column: Current Bill */}
        <View style={styles.posRightBill}>
          <Surface style={styles.billCardSurface} elevation={0}>
            <View style={styles.billCardHeader}>
              <Text style={styles.billCardTitle}>Current Bill</Text>
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearBillBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {/* Customer Selector Dropdown Pill */}
            <TouchableOpacity
              style={styles.custSelectorPill}
              activeOpacity={0.8}
              onPress={() => setShowPhonePromptModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="account-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.custSelectorText}>{custName || 'Walk-In Customer'}</Text>
              </View>
              <Icon name="chevron-down" size={14} color="#64748B" />
            </TouchableOpacity>

            {/* Bill Line Items */}
            <ScrollView style={styles.billItemsScroll} showsVerticalScrollIndicator={false}>
              {cart.map((item) => (
                <View key={item.id} style={styles.billItemRow}>
                  <View style={styles.billItemImgWrap}>
                    <Icon name={item.icon || 'package-variant-closed'} size={18} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.billItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.billItemQtyPrice}>{item.qty} x ₹{item.price}</Text>
                  </View>
                  <Text style={styles.billItemLineTotal}>₹{(item.qty * item.price).toFixed(2)}</Text>
                  <TouchableOpacity
                    style={{ marginLeft: 8, padding: 2 }}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Icon name="trash-can-outline" size={15} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              ))}
              {cart.length === 0 && (
                <View style={styles.emptyBillBox}>
                  <Icon name="cart-outline" size={28} color="#CBD5E1" />
                  <Text style={styles.emptyBillText}>No items added yet</Text>
                </View>
              )}
            </ScrollView>

            {/* Calculations Breakdown */}
            <View style={styles.billCalculationsArea}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal</Text>
                <Text style={styles.calcVal}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>GST (5%)</Text>
                <Text style={styles.calcVal}>₹{gstBreakdown.totalGst.toFixed(2)}</Text>
              </View>
              <Divider style={{ marginVertical: 8, backgroundColor: '#E2E8F0' }} />
              <View style={[styles.calcRow, { marginBottom: 12 }]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalVal}>₹{finalTotal.toFixed(2)}</Text>
              </View>

              {/* Take Payment CTA Button */}
              <TouchableOpacity
                style={[styles.takePaymentOrangeBtn, cart.length === 0 && { opacity: 0.5 }]}
                disabled={cart.length === 0}
                onPress={() => setShowCheckout(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.takePaymentBtnText}>Take Payment  →</Text>
                <View style={styles.f8Badge}>
                  <Text style={styles.f8BadgeText}>F8</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Surface>
        </View>
      </View>

      {/* ── 4. Bottom 3 Summary Metric Cards ── */}
      <View style={styles.bottomCardsGrid}>
        {/* Today's Sales Card */}
        <Surface style={styles.bottomStatCard} elevation={0}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statHeading}>Today's Sales</Text>
            <Text style={styles.statSubdate}>7 Oct 2025</Text>
          </View>
          <Text style={styles.statBigNumber}>₹42,840</Text>
          <View style={styles.trendRow}>
            <Icon name="arrow-up" size={13} color="#16A34A" />
            <Text style={styles.trendText}>12.4% vs yesterday</Text>
          </View>
          {/* Mini Bar Chart */}
          <View style={styles.miniChartBarRow}>
            {[14, 22, 28, 18, 35, 26, 42, 50, 38, 46, 30, 48].map((h, i) => (
              <View key={i} style={[styles.chartBar, { height: h }]} />
            ))}
          </View>
          <Divider style={{ marginVertical: 8, backgroundColor: '#F1F5F9' }} />
          <View style={styles.threeMetricsRow}>
            <View>
              <Text style={styles.metricLabelSmall}>Bills</Text>
              <Text style={styles.metricValBold}>184</Text>
            </View>
            <View>
              <Text style={styles.metricLabelSmall}>Avg. Bill</Text>
              <Text style={styles.metricValBold}>₹233</Text>
            </View>
            <View>
              <Text style={styles.metricLabelSmall}>Customers</Text>
              <Text style={styles.metricValBold}>142</Text>
            </View>
          </View>
        </Surface>

        {/* Low Stock Alerts Card */}
        <Surface style={styles.bottomStatCard} elevation={0}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statHeading}>Low Stock Alerts</Text>
            <TouchableOpacity onPress={() => router.push('/(owner)/inventory')}>
              <Text style={styles.viewAllSmall}>View All</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statAlertSubtitle}>12 products running low</Text>
          <View style={styles.alertListContainer}>
            {[
              { name: 'Tata Salt 1kg', left: 5, icon: 'shaker-outline' },
              { name: 'Cooking Oil 1L', left: 3, icon: 'bottle-tonic-outline' },
              { name: 'Amul Milk 1L', left: 8, icon: 'cup-water' },
              { name: 'Maggi Noodles', left: 4, icon: 'noodles' },
            ].map((item, idx) => (
              <View key={idx} style={styles.alertItemLine}>
                <View style={styles.alertItemImg}>
                  <Icon name={item.icon} size={15} color="#F97316" />
                </View>
                <Text style={styles.alertItemTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.alertItemBadge}>Only {item.left} left</Text>
              </View>
            ))}
          </View>
        </Surface>

        {/* Recent Transactions Card */}
        <Surface style={styles.bottomStatCard} elevation={0}>
          <View style={styles.statHeaderRow}>
            <Text style={styles.statHeading}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/(owner)/day_book')}>
              <Text style={styles.viewAllSmall}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.txListContainer}>
            {[
              { id: '#INV-10482', amount: '₹278.25', time: '10:24 AM' },
              { id: '#INV-10481', amount: '₹512.00', time: '09:47 AM' },
              { id: '#INV-10480', amount: '₹342.00', time: '09:12 AM' },
              { id: '#INV-10479', amount: '₹198.00', time: '08:45 AM' },
              { id: '#INV-10478', amount: '₹620.00', time: '08:20 AM' },
            ].map((tx, idx) => (
              <View key={idx} style={styles.txRowLine}>
                <Text style={styles.txIdText}>{tx.id}</Text>
                <Text style={styles.txAmountText}>{tx.amount}</Text>
                <Text style={styles.txTimeText}>{tx.time}</Text>
              </View>
            ))}
          </View>
        </Surface>
      </View>

      {/* ── 5. Bottom Key Features Strip ── */}
      <Surface style={styles.keyFeaturesFooterStrip} elevation={0}>
        <Text style={styles.footerFeaturesTitle}>Retail / Wholesale POS – Key Features</Text>
        <View style={styles.featuresRowStrip}>
          {[
            { title: 'Fast Billing', sub: '(Barcode + Search)', icon: 'barcode-scan' },
            { title: 'Inventory &', sub: 'Godowns', icon: 'clipboard-list-outline' },
            { title: 'Purchase Orders', sub: '& Suppliers', icon: 'cart-arrow-down' },
            { title: 'GST Invoicing', sub: '& Reports', icon: 'file-percent-outline' },
            { title: 'Customer Credit', sub: '& Price Lists', icon: 'account-cash-outline' },
            { title: 'Multi-Location', sub: 'Support', icon: 'domain' },
          ].map((feat, idx) => (
            <View key={idx} style={styles.featureStripItem}>
              <View style={styles.featureStripIconWrap}>
                <Icon name={feat.icon} size={16} color="#0284C7" />
              </View>
              <Text style={styles.featureStripTitle}>{feat.title}</Text>
              <Text style={styles.featureStripSub}>{feat.sub}</Text>
            </View>
          ))}
        </View>
      </Surface>
      {/* ── 1. CHECKOUT PAYMENT DETAILS DIALOG ──────────────── */}
      <Portal>
        <Dialog visible={showCheckout} onDismiss={() => setShowCheckout(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            <Icon name="credit-card-plus-outline" size={22} color="#10B981" style={{ marginRight: 8 }} />
            Checkout Payment Details
          </Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Payment Method</Text>
            <SegmentedButtons
              value={payMethod}
              onValueChange={setPayMethod}
              buttons={[
                { value: 'Cash', label: 'Cash Payment' },
                { value: 'UPI', label: 'UPI / Scan QR' },
                { value: 'Card', label: 'Card Swipe' }
              ]}
              style={{ marginBottom: 16 }}
            />

            <Text style={styles.dialogLabel}>Customer Details (Optional)</Text>
            <TextInput
              label="Customer Mobile Number"
              value={custPhone}
              onChangeText={setCustPhone}
              keyboardType="phone-pad"
              mode="outlined"
              outlineColor="#EEF0F6"
              activeOutlineColor="#10B981"
              style={{ marginBottom: 12 }}
              left={<TextInput.Icon icon="phone" color="#999" />}
            />
            <TextInput
              label="Customer Name"
              value={custName}
              onChangeText={setCustName}
              mode="outlined"
              outlineColor="#EEF0F6"
              activeOutlineColor="#10B981"
              left={<TextInput.Icon icon="account" color="#999" />}
            />
            <TextInput
              label="Customer GSTIN (Optional)"
              value={custGstin}
              onChangeText={setCustGstin}
              mode="outlined"
              outlineColor="#EEF0F6"
              activeOutlineColor="#10B981"
              left={<TextInput.Icon icon="bank" color="#999" />}
              style={{ marginTop: 12 }}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => handleCompleteSale(false)}>
              Skip & Complete
            </Button>
            <Button mode="contained" onPress={() => handleCompleteSale(true)} style={{ borderRadius: 10 }}>
              Send Bill & Complete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── 2. PREMIUM RECEIPT & SHARING DIALOG ────────────── */}
      <Portal>
        <Dialog visible={showReceipt} onDismiss={handleResetCheckout} style={[styles.dialog, { maxWidth: 500, alignSelf: 'center', width: '90%' }]}>
          <Dialog.Title style={[styles.dialogTitle, { color: appTheme.colors.onSurface }]}>
            <Icon name="check-circle-outline" size={24} color="#10B981" style={{ marginRight: 8 }} />
            Invoice Shared Successfully
          </Dialog.Title>
          <Dialog.Content>
            {/* Live Bill Receipt Preview */}
            <ScrollView style={styles.receiptPreview} showsVerticalScrollIndicator={false}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptStoreName}>{lastCompletedBill?.storeName || storeName}</Text>
                <Text style={styles.receiptStoreMeta}>GSTIN: {(lastCompletedBill ? lastCompletedBill.isGst : isGstRegistered) ? (lastCompletedBill?.gstNum || gstNum) : 'None'}</Text>
                <Text style={styles.receiptStoreMeta}>Date: {lastCompletedBill?.date || new Date().toLocaleDateString('en-IN')}</Text>
                <Text style={styles.receiptStoreMeta}>Bill No: {lastCompletedBill?.billNo || activeBillNo}</Text>
                <Text style={styles.receiptStoreMeta}>Payment: {lastCompletedBill?.payMethod || payMethod}</Text>
              </View>

              {(lastCompletedBill?.custPhone || custPhone) ? (
                <View style={styles.receiptCustomerBox}>
                  <Text style={styles.receiptCustomerText}>Billed To: {lastCompletedBill?.custName || custName || 'Walk-in Customer'}</Text>
                  <Text style={styles.receiptCustomerText}>Phone: +91 {lastCompletedBill?.custPhone || custPhone}</Text>
                </View>
              ) : null}

              <Divider style={{ marginVertical: 10, backgroundColor: appTheme.colors.surface }} />

              {(lastCompletedBill?.items || cart).map((item: any) => (
                <View key={item.id} style={styles.receiptItemRow}>
                  <Text style={styles.receiptItemName} numberOfLines={1}>{item.name} x{item.qty}</Text>
                  <Text style={styles.receiptItemTotal}>₹{(Number(item.price) * Number(item.qty)).toFixed(0)}</Text>
                </View>
              ))}

              <Divider style={{ marginVertical: 10, backgroundColor: appTheme.colors.surface }} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Subtotal</Text>
                <Text style={styles.receiptValue}>₹{Number(lastCompletedBill?.subtotal ?? subtotal).toFixed(2)}</Text>
              </View>
              {(lastCompletedBill ? lastCompletedBill.isGst : isGstRegistered) && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>GST Tax</Text>
                  <Text style={styles.receiptValue}>₹{Number(lastCompletedBill?.gstAmount ?? gstBreakdown.totalGst).toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { fontWeight: 'bold' }]}>Grand Total</Text>
                <Text style={[styles.receiptValue, { fontWeight: 'bold', fontSize: 16 }]}>₹{Number(lastCompletedBill?.finalTotal ?? finalTotal).toFixed(2)}</Text>
              </View>

              <View style={styles.receiptFooter}>
                <Text style={styles.receiptFooterText}>Thank you for shopping!</Text>
                {(lastCompletedBill?.custPhone || custPhone) ? (
                  <View style={styles.smsAlertBox}>
                    <Icon name="whatsapp" size={14} color="#2E7D32" />
                    <Text style={[styles.smsAlertText, { color: '#2E7D32' }]}>WhatsApp invoice ready for +91 {lastCompletedBill?.custPhone || custPhone}</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>

            {/* Dispatched Message Preview Box */}
            <View style={{ backgroundColor: appTheme.colors.surface, padding: 12, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: '#10B981', marginVertical: 8 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: appTheme.colors.onSurface, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Digital Invoice Ready</Text>
              <Text style={{ fontSize: 12, color: appTheme.colors.onSurface, lineHeight: 17, fontStyle: 'italic' }}>
                "Thank you for shopping at {lastCompletedBill?.storeName || storeName}.{"\n"}
                Bill No: {lastCompletedBill?.billNo || activeBillNo} · Grand Total: ₹{Number(lastCompletedBill?.finalTotal ?? finalTotal).toFixed(2)}"
              </Text>
            </View>

            {/* Sharing Options row */}
            <View style={styles.sharingGrid}>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleWhatsAppShare()}
              >
                <View style={[styles.shareIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Icon name="whatsapp" size={24} color="#2E7D32" />
                </View>
                <Text style={styles.shareText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handlePrintPdf()}
              >
                <View style={[styles.shareIcon, { backgroundColor: '#FCE4EC' }]}>
                  <Icon name="printer-pos" size={24} color="#10B981" />
                </View>
                <Text style={styles.shareText}>Print / PDF</Text>
              </TouchableOpacity>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button mode="contained" onPress={handleResetCheckout} style={{ borderRadius: 10, flex: 1 }}>
              Start New Bill
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── 3. BILL SAVED MODAL ─────────────────────────────── */}
      <Portal>
        <Dialog visible={showSavedModal} onDismiss={() => setShowSavedModal(false)} style={[styles.dialog, { maxWidth: 480, alignSelf: 'center', width: '90%' }]}>
          <Dialog.Title style={[styles.dialogTitle, { color: '#10B981' }]}>
            <Icon name="check-decagram" size={24} color="#10B981" style={{ marginRight: 8 }} />
            Bill Saved Successfully
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: appTheme.colors.onSurface, marginBottom: 12 }}>
              Invoice <Text style={{ fontWeight: '700' }}>#{savedBillData?.billNo || activeBillNo}</Text> has been saved to your drafts. You can print, download PDF, share via WhatsApp/SMS, or resume editing at any time.
            </Text>

            <Surface style={{ padding: 14, borderRadius: 10, backgroundColor: appTheme.colors.surface, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Total Amount:</Text>
                <Text style={{ fontSize: 15, fontWeight: '800', color: appTheme.colors.onSurface }}>₹{Number(savedBillData?.finalTotal || finalTotal).toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Items Count:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: appTheme.colors.onSurface }}>{(savedBillData?.items || cart).length} items</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Billed To:</Text>
                <Text style={{ fontSize: 12, color: appTheme.colors.onSurface }}>{savedBillData?.custName || custName || 'Walk-in Customer'}</Text>
              </View>
            </Surface>

            <Text style={[styles.dialogLabel, { marginBottom: 10 }]}>Instant Transfer & Print Options</Text>
            <View style={styles.sharingGrid}>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleWhatsAppShare(savedBillData)}
              >
                <View style={[styles.shareIcon, { backgroundColor: '#E8F5E9' }]}>
                  <Icon name="whatsapp" size={24} color="#2E7D32" />
                </View>
                <Text style={styles.shareText}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handlePrintPdf(savedBillData)}
              >
                <View style={[styles.shareIcon, { backgroundColor: '#FCE4EC' }]}>
                  <Icon name="printer-pos" size={24} color="#10B981" />
                </View>
                <Text style={styles.shareText}>Print / PDF</Text>
              </TouchableOpacity>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setShowSavedModal(false)} textColor="#64748B">
              Keep Editing
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                clearCart();
                setShowSavedModal(false);
              }}
              style={{ borderRadius: 8, backgroundColor: '#10B981' }}
            >
              Start New Bill
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── 4. SAVED DRAFTS & HELD BILLS DIALOG ─────────────── */}
      <Portal>
        <Dialog visible={showSessionModal} onDismiss={() => setShowSessionModal(false)} style={[styles.dialog, { maxWidth: 560, alignSelf: 'center', width: '92%' }]}>
          <Dialog.Title style={[styles.dialogTitle, { color: appTheme.colors.onSurface }]}>
            <Icon name="history" size={24} color="#10B981" style={{ marginRight: 8 }} />
            Saved Drafts & Held Bills ({savedDraftList.length})
          </Dialog.Title>
          <Dialog.Content style={{ maxHeight: 420 }}>
            {savedDraftList.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 }}>
                <Icon name="file-document-outline" size={44} color="#9E9E9E" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: appTheme.colors.onSurface }}>No Saved Bills</Text>
                <Text style={{ fontSize: 12, color: '#757575', textAlign: 'center' }}>
                  Click 'Save Bill' or 'Hold' on the billing screen to store drafts here.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {savedDraftList.map((draft) => (
                  <Surface key={draft.id} style={{ padding: 12, borderRadius: 10, marginBottom: 10, backgroundColor: appTheme.colors.surface, borderWidth: 1, borderColor: '#E2E8F0' }} elevation={0}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: appTheme.colors.onSurface }}>Invoice #{draft.billNo}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>{draft.displayDate || draft.date}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                          {draft.custName ? `Customer: ${draft.custName}` : 'Walk-in'} {draft.custPhone ? `(+91 ${draft.custPhone})` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: '#10B981' }}>₹{Number(draft.finalTotal).toFixed(2)}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>{draft.items?.length || 0} item(s)</Text>
                      </View>
                    </View>

                    <Divider style={{ marginVertical: 8, backgroundColor: '#E2E8F0' }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Button
                        mode="contained-tonal"
                        compact
                        icon="refresh"
                        onPress={() => handleResumeDraft(draft)}
                        style={{ borderRadius: 6 }}
                      >
                        Resume
                      </Button>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <IconButton icon="printer" size={18} iconColor="#10B981" onPress={() => handlePrintPdf(draft)} />
                        <IconButton icon="whatsapp" size={18} iconColor="#2E7D32" onPress={() => handleWhatsAppShare(draft)} />
                        <IconButton icon="delete-outline" size={18} iconColor="#EF4444" onPress={() => handleDeleteDraft(draft.id)} />
                      </View>
                    </View>
                  </Surface>
                ))}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setShowSessionModal(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── 5. STORE OWNER DISCOUNT CONTROLLER MODAL ────────── */}
      <Portal>
        <Dialog visible={showDiscountModal} onDismiss={() => setShowDiscountModal(false)} style={[styles.dialog, { maxWidth: 440, alignSelf: 'center', width: '90%' }]}>
          <Dialog.Title style={[styles.dialogTitle, { color: '#10B981' }]}>
            <Icon name="tag-outline" size={22} color="#10B981" style={{ marginRight: 8 }} />
            Apply Customer Discount
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: appTheme.colors.onSurface, marginBottom: 12 }}>
              Choose discount type and amount to offer your customer on this sale.
            </Text>

            {/* Mode Switcher */}
            <SegmentedButtons
              value={discountType}
              onValueChange={(val: any) => setDiscountType(val)}
              buttons={[
                { value: 'flat', label: 'Flat Amount (₹)' },
                { value: 'percent', label: 'Percentage (%)' }
              ]}
              style={{ marginBottom: 16 }}
            />

            {/* Quick Presets */}
            <Text style={[styles.dialogLabel, { marginBottom: 6 }]}>Quick Presets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {discountType === 'percent' ? (
                  ['5', '10', '15', '20', '25'].map(pct => (
                    <Chip
                      key={pct}
                      mode="outlined"
                      selected={discountInput === pct}
                      onPress={() => setDiscountInput(pct)}
                      style={{ backgroundColor: discountInput === pct ? 'rgba(16, 185, 129, 0.15)' : 'transparent' }}
                      textStyle={{ fontWeight: '700', fontSize: 12, color: discountInput === pct ? '#10B981' : appTheme.colors.onSurface }}
                    >
                      {pct}%
                    </Chip>
                  ))
                ) : (
                  ['10', '20', '50', '100', '200'].map(amt => (
                    <Chip
                      key={amt}
                      mode="outlined"
                      selected={discountInput === amt}
                      onPress={() => setDiscountInput(amt)}
                      style={{ backgroundColor: discountInput === amt ? 'rgba(16, 185, 129, 0.15)' : 'transparent' }}
                      textStyle={{ fontWeight: '700', fontSize: 12, color: discountInput === amt ? '#10B981' : appTheme.colors.onSurface }}
                    >
                      ₹{amt}
                    </Chip>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Custom Discount Input */}
            <TextInput
              label={discountType === 'percent' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
              placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 50'}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="numeric"
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#10B981"
              style={{ marginBottom: 12, backgroundColor: appTheme.colors.surface }}
              left={<TextInput.Icon icon={discountType === 'percent' ? 'percent' : 'currency-inr'} size={18} color="#10B981" />}
              right={discountInput ? <TextInput.Icon icon="close" size={16} onPress={() => setDiscountInput('')} /> : undefined}
            />

            {/* Live Calculation Preview */}
            <Surface style={{ padding: 12, borderRadius: 8, backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#64748B' }}>Cart Subtotal:</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: appTheme.colors.onSurface }}>₹{subtotal.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: '#10B981' }}>Discount to Apply:</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>
                  - ₹{(discountType === 'percent' ? ((subtotal * (parseFloat(discountInput) || 0)) / 100) : (parseFloat(discountInput) || 0)).toFixed(2)}
                </Text>
              </View>
              <Divider style={{ marginVertical: 6 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: appTheme.colors.onSurface }}>New Estimated Total:</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981' }}>
                  ₹{Math.max(0, subtotal - (discountType === 'percent' ? ((subtotal * (parseFloat(discountInput) || 0)) / 100) : (parseFloat(discountInput) || 0))).toFixed(2)}
                </Text>
              </View>
            </Surface>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => {
                setDiscount(0);
                setDiscountInput('');
                setShowDiscountModal(false);
              }}
              textColor="#EF4444"
            >
              Remove Discount
            </Button>
            <Button
              mode="contained"
              onPress={handleApplyDiscount}
              style={{ borderRadius: 8, backgroundColor: '#10B981' }}
            >
              Apply Discount
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── 6. PHONE NUMBER PROMPT MODAL FOR WHATSAPP/SMS ───── */}
      <Portal>
        <Dialog visible={showPhonePromptModal} onDismiss={() => setShowPhonePromptModal(false)} style={[styles.dialog, { maxWidth: 420, alignSelf: 'center', width: '90%' }]}>
          <Dialog.Title style={[styles.dialogTitle, { color: '#2E7D32' }]}>
            <Icon name="whatsapp" size={22} color="#2E7D32" style={{ marginRight: 8 }} />
            Send Bill on WhatsApp
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: appTheme.colors.onSurface, marginBottom: 12 }}>
              Enter the customer's 10-digit mobile number to send their digital tax invoice & PDF download link on WhatsApp.
            </Text>
            <TextInput
              label="Customer Mobile (+91)"
              placeholder="e.g. 9876543210"
              value={phonePromptInput}
              onChangeText={setPhonePromptInput}
              keyboardType="phone-pad"
              mode="outlined"
              outlineColor="#E2E8F0"
              activeOutlineColor="#10B981"
              style={{ backgroundColor: appTheme.colors.surface }}
              left={<TextInput.Icon icon="phone" size={18} color="#10B981" />}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setShowPhonePromptModal(false)} textColor="#64748B">
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                const clean = phonePromptInput.trim();
                if (!clean) {
                  Alert.alert('Phone Required', 'Please enter a valid 10-digit mobile number.');
                  return;
                }
                setCustPhone(clean);
                setShowPhonePromptModal(false);
                const targetBill = phonePromptBill
                  ? { ...phonePromptBill, custPhone: clean }
                  : { items: cart, subtotal, discount, finalTotal, payMethod, custName, custGstin, custPhone: clean, billNo: activeBillNo || 'INV-' + Date.now().toString().slice(-6) };
                setTimeout(() => handleWhatsAppShare(targetBill), 100);
              }}
              style={{ borderRadius: 8, backgroundColor: '#2E7D32' }}
            >
              Send on WhatsApp
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Camera Barcode Scanner Modal */}
      {showCameraScanner && (
        <Modal
          visible={showCameraScanner}
          animationType="slide"
          onRequestClose={() => setShowCameraScanner(false)}
        >
          <View style={styles.cameraModalContainer}>
            <View style={styles.cameraHeader}>
              <IconButton icon="close" iconColor="white" size={24} onPress={() => setShowCameraScanner(false)} />
              <Text style={styles.cameraHeaderTitle}>Scan Barcode</Text>
              <View style={{ width: 48 }} />
            </View>
            
            <View style={styles.cameraPreviewBox}>
              {hasCameraPermission ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  onBarcodeScanned={cameraScanned ? undefined : async ({ data }) => {
                    setCameraScanned(true);
                    if (data) {
                      let barcode = data;
                      if (data && typeof data === 'string' && data.includes('scanBarcode=')) {
                        const match = data.match(/[?&]scanBarcode=([^&]+)/);
                        if (match) {
                          barcode = match[1];
                        }
                      }
                      const cleanBarcode = barcode.trim().replace(/[\r\n]/g, '');
                      // Search locally in products first
                      const matchingProduct = products.find(p => p.barcode === cleanBarcode);
                      if (matchingProduct) {
                        handleAddProduct(matchingProduct);
                        setShowCameraScanner(false);
                      } else {
                        // Attempt database check if firebase is configured
                        if (isFirebaseConfigured) {
                          try {
                            const q = query(
                              collection(db, 'products'),
                              where('tenant_id', '==', tenantId || 'anonymous'),
                              where('barcode', '==', cleanBarcode)
                            );
                            const snapshot = await getDocs(q);
                            if (!snapshot.empty) {
                              const pId = snapshot.docs[0].id;
                              const pData = snapshot.docs[0].data();
                              const newProduct = {
                                id: pId,
                                name: pData.name,
                                price: pData.selling_price || pData.price || 0,
                                gst_pct: pData.gst_pct || 0,
                                hsn: pData.hsn || '',
                                image_url: pData.image_url,
                                barcode: pData.barcode || ''
                              };
                              setProducts(prev => [newProduct, ...prev]);
                              handleAddProduct(newProduct);
                              setShowCameraScanner(false);
                              return;
                            }
                          } catch (e) {
                            console.error(e);
                          }
                        }
                        Alert.alert('Not Found', `Product with barcode: ${cleanBarcode} not found in inventory.`, [
                          { text: 'OK', onPress: () => setCameraScanned(false) }
                        ]);
                      }
                    } else {
                      setCameraScanned(false);
                    }
                  }}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8", "code128"],
                  }}
                />
              ) : (
                <Text style={{ color: 'white' }}>Requesting camera permission...</Text>
              )}
              
              {/* Overlay Frame */}
              <View style={styles.cameraOverlayFrame}>
                <View style={[styles.cameraCorner, styles.cameraTopLeft]} />
                <View style={[styles.cameraCorner, styles.cameraTopRight]} />
                <View style={[styles.cameraCorner, styles.cameraBottomLeft]} />
                <View style={[styles.cameraCorner, styles.cameraBottomRight]} />
                <View style={styles.cameraLaser} />
              </View>
            </View>
            
            <Text style={styles.cameraInstruction}>Position barcode inside the frame</Text>
          </View>
        </Modal>
      )}

      {/* Floating AI Voice Copilot FAB */}
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
        onAddToCart={(item, qty) => {
          for (let i = 0; i < qty; i++) {
            addToCart({
              id: item.id,
              name: item.name,
              price: item.price || item.selling_price || 0,
              qty: 1,
              gst_pct: isGstRegistered ? (item.gst_pct || 0) : 0,
              hsn: item.hsn || '',
              image_url: item.image_url,
            });
          }
        }}
        onClearCart={clearCart}
        onApplyDiscount={(d) => {
          if (d.type === 'percent') {
            setDiscount((subtotal * d.value) / 100);
          } else {
            setDiscount(d.value);
          }
        }}
        onCheckout={(mode) => {
          if (['cash', 'upi', 'card', 'credit'].includes(mode)) {
            setPayMethod(mode.toUpperCase() as any);
          }
        }}
        contextData={{
          cartItems: cart,
        }}
      />
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, padding: DS.space.lg, backgroundColor: DS.colors.surfaceBg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerIconBox: {
    width: 42, height: 42, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  headerTitle: { fontSize: DS.font.h2.fontSize, fontWeight: DS.font.h2.fontWeight, color: DS.colors.text },
  headerSubtitle: { fontSize: 12, marginTop: 2, fontWeight: '500', color: DS.colors.textSecondary },
  headerRight: { flexDirection: 'row', gap: 8 },
  chip: { },
  chipText: { fontSize: 12, fontWeight: '600', },

  // Content
  contentRow: { flexDirection: 'row', gap: 24, flex: 1 },

  // Left Pane
  leftPane: { flex: 2, borderRadius: DS.radius.lg, padding: 20, borderWidth: 0, backgroundColor: DS.colors.cardBg, ...DS.shadow.sm },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  searchIconBox: {
    width: 44, height: 44, borderRadius: DS.radius.md, alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  searchInput: { flex: 1, height: 46, borderRadius: DS.radius.sm, fontSize: 14 },

  // Suggestions
  suggestionsDropdown: {
    position: 'absolute', top: 86, left: 20, right: 20, zIndex: 50,
    borderRadius: DS.radius.md, borderWidth: 0, backgroundColor: DS.colors.cardBg, ...DS.shadow.lg, overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: DS.colors.borderLight,
  },
  suggestionCategoryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 14, fontWeight: '600', color: DS.colors.text },
  suggestionMeta: { fontSize: 11, marginTop: 2, color: DS.colors.textSecondary },
  suggestionPrice: { fontSize: 15, fontWeight: '700', marginRight: 12, color: DS.colors.text },
  addIconCircle: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
  },

  // Cart Header
  cartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 12 },
  cartHeaderTitle: { fontSize: 16, fontWeight: '700', color: DS.colors.text },
  cartItemCount: { fontSize: 12, color: DS.colors.textSecondary },

  // Column Headers
  columnHeaders: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, borderRadius: DS.radius.sm, marginBottom: 8, backgroundColor: DS.colors.surfaceBg },
  colHeader: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: DS.colors.textSecondary },

  // Cart List
  cartList: { flex: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: DS.radius.md, marginBottom: 4, backgroundColor: DS.colors.surfaceBg },
  itemName: { fontSize: 13, fontWeight: '700', color: DS.colors.text },
  itemSku: { fontSize: 10, marginTop: 2, color: DS.colors.textMuted },
  itemPrice: { fontSize: 13, fontWeight: '500', color: DS.colors.text },
  itemGst: { fontSize: 12, color: DS.colors.textSecondary },
  itemTotal: { fontSize: 13, fontWeight: '700', color: DS.colors.text },
  deleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  // Qty Controls
  qtyController: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 6, borderWidth: 1.5, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  qtyBtnPlus: { backgroundColor: '#10B981', borderColor: '#10B981' },
  qtyDisplay: { minWidth: 22, alignItems: 'center' },
  qtyText: { fontSize: 13, fontWeight: '800', color: DS.colors.text },

  emptyCartContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyCartTitle: { fontSize: 16, fontWeight: '700', marginTop: 12, color: DS.colors.text },
  emptyCartSubtitle: { fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 280, color: DS.colors.textSecondary },

  // Right Pane
  rightPane: { flex: 1, gap: 20 },
  summaryCard: { borderRadius: DS.radius.lg, padding: 20, borderWidth: 0, backgroundColor: DS.colors.cardBg, ...DS.shadow.sm },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryTitle: { fontSize: 16, fontWeight: '700', },
  summaryDivider: { marginVertical: 16 },
  summaryDividerLight: { marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  summaryLabel: { fontSize: 13, },
  summaryValue: { fontSize: 14, fontWeight: '700', },

  labelWithBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  discountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discountBadgeText: { fontSize: 10, fontWeight: '700', },

  // GST Breakdown
  gstHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 },
  gstHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  gstLabel: { fontSize: 12, },
  gstValue: { fontSize: 12, },

  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandTotalLabel: { fontSize: 15, fontWeight: '800', },
  grandTotalValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  savingsCallout: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 10, marginTop: 12 },
  savingsText: { fontSize: 12, fontWeight: '700' },

  // Action Buttons
  actionButtons: { flexDirection: 'row', gap: 10, marginTop: 16 },
  holdBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10, borderWidth: 1, },
  holdBtnText: { fontSize: 13, fontWeight: '700', },
  clearBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40, borderRadius: 10, borderWidth: 1, },
  clearBtnText: { fontSize: 13, fontWeight: '700', },

  weighScaleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E65100', borderRadius: 10, paddingVertical: 12, gap: 8, marginBottom: 16 },
  weighScaleBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 10, marginTop: 12 },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { fontSize: 15, fontWeight: '800', },

  secondaryActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: 8, },
  secondaryBtnText: { fontSize: 12, fontWeight: '700', },

  // Quick Add
  quickAddCard: { borderRadius: DS.radius.lg, padding: 16, borderWidth: 0, backgroundColor: DS.colors.cardBg, ...DS.shadow.sm },
  quickAddTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12, color: DS.colors.text },
  quickAddGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickAddItem: { flexGrow: 1, flexBasis: '28%', padding: 10, borderRadius: DS.radius.sm, borderWidth: 1, borderColor: DS.colors.border, alignItems: 'center', backgroundColor: DS.colors.cardBg },
  quickAddDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 6 },
  quickAddName: { fontSize: 11, fontWeight: '600', color: DS.colors.text },
  quickAddPrice: { fontSize: 11, fontWeight: '700', marginTop: 2, color: DS.colors.textSecondary },

  // Dialog Modals
  dialog: { borderRadius: DS.radius.lg, backgroundColor: DS.colors.cardBg },
  dialogTitle: { fontSize: 18, fontWeight: '800', flexDirection: 'row', alignItems: 'center', color: DS.colors.text },
  dialogLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 4, color: DS.colors.textSecondary },
  dialogActions: { paddingHorizontal: 16, paddingBottom: 16, justifyContent: 'space-between' },

  // Receipt Preview
  receiptPreview: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: DS.colors.border, borderRadius: DS.radius.sm,
    padding: 16, maxHeight: 300, marginBottom: 16, backgroundColor: DS.colors.surfaceBg
  },
  receiptHeader: { alignItems: 'center', marginBottom: 12 },
  receiptStoreName: { fontSize: 16, fontWeight: '800', color: DS.colors.text },
  receiptStoreMeta: { fontSize: 11, marginTop: 2, color: DS.colors.textSecondary },
  receiptCustomerBox: { marginTop: 8, padding: 8, borderRadius: DS.radius.xs, backgroundColor: DS.colors.cardBg },
  receiptCustomerText: { fontSize: 11, fontWeight: '600', color: DS.colors.text },
  receiptItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  receiptItemName: { fontSize: 12, flex: 1, color: DS.colors.text },
  receiptItemTotal: { fontSize: 12, fontWeight: '700', color: DS.colors.text },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 },
  receiptLabel: { fontSize: 11, color: DS.colors.textSecondary },
  receiptValue: { fontSize: 11, color: DS.colors.text },
  receiptFooter: { alignItems: 'center', marginTop: 14 },
  receiptFooterText: { fontSize: 11, fontWeight: '700', color: DS.colors.text },
  smsAlertBox: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: DS.radius.xs },
  smsAlertText: { fontSize: 10, fontWeight: '700' },

  // Sharing Option row
  sharingGrid: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 8 },
  shareOption: { alignItems: 'center' },
  shareIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  shareText: { fontSize: 11, fontWeight: '600', color: DS.colors.textSecondary },

  // Camera Barcode Scanner styles
  cameraModalContainer: {
    flex: 1,
    backgroundColor: '#0D0F14',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
  },
  cameraHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  cameraPreviewBox: {
    width: 280,
    height: 280,
    alignSelf: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  cameraOverlayFrame: {
    width: 220,
    height: 170,
    position: 'absolute',
    justifyContent: 'center',
  },
  cameraCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10B981',
  },
  cameraTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cameraTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cameraBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cameraBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  cameraLaser: {
    height: 2,
    backgroundColor: '#EF4444',
    width: '100%',
    position: 'absolute',
  },
  cameraInstruction: {
    color: '#8891A8',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 40,
  },
  floatingAiFab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
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

  // ── Retail Redesign Styles ──
  newSaleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    flexWrap: 'wrap',
    gap: 12,
  },
  newSaleTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  newSaleActionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  actionPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 14,
  },
  actionPillSub: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 12,
  },
  actionFBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 8,
  },
  actionFBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  categoryScrollRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryFilterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryFilterPillActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  categoryFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  posColumnsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    flexWrap: 'wrap',
  },
  posLeftCatalog: {
    flex: 2.2,
    minWidth: 320,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCard: {
    width: '23%',
    minWidth: 120,
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  productCardImgWrap: {
    height: 70,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  productCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  productCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productCardPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  productCardPlusBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequentlySoldSection: {
    marginTop: 20,
  },
  frequentlySoldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  frequentlySoldTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  frequentlySoldGrid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  freqCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  freqImgWrap: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  freqPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  freqPlusBtn: {
    padding: 4,
  },
  posRightBill: {
    flex: 1.1,
    minWidth: 280,
  },
  billCardSurface: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  billCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearBillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  custSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  custSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  billItemsScroll: {
    maxHeight: 220,
    marginBottom: 12,
  },
  billItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  billItemImgWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  billItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  billItemQtyPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  billItemLineTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyBillBox: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBillText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
  },
  billCalculationsArea: {
    paddingTop: 8,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calcLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  calcVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  takePaymentOrangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    borderRadius: 8,
    paddingVertical: 12,
    shadowColor: '#F97316',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  takePaymentBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 8,
  },
  f8Badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  f8BadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomCardsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 16,
    flexWrap: 'wrap',
  },
  bottomStatCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statSubdate: {
    fontSize: 11,
    color: '#64748B',
  },
  statBigNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    marginLeft: 3,
  },
  miniChartBarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 52,
    gap: 4,
    paddingVertical: 4,
  },
  chartBar: {
    flex: 1,
    backgroundColor: '#86EFAC',
    borderRadius: 2,
  },
  threeMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  metricLabelSmall: {
    fontSize: 10,
    color: '#64748B',
  },
  metricValBold: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  viewAllSmall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  statAlertSubtitle: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 8,
  },
  alertListContainer: {
    gap: 6,
  },
  alertItemLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  alertItemImg: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  alertItemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  alertItemBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EF4444',
  },
  txListContainer: {
    gap: 6,
    marginTop: 6,
  },
  txRowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  txIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  txAmountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  txTimeText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  keyFeaturesFooterStrip: {
    marginTop: 24,
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  footerFeaturesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  featuresRowStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureStripItem: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
    textAlign: 'center',
  },
  featureStripIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureStripTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  featureStripSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },

});
