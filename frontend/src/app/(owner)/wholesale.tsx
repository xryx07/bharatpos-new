import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { Text, Card, Button, TextInput, SegmentedButtons, Dialog, Portal, Chip, Divider, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../providers/AuthProvider';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, setDoc } from '../../lib/firestore_adapter';
import { DS } from '../../constants/designTokens';
import { PremiumHeader } from '../../components/PremiumHeader';

interface B2BCustomer {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  gstin: string;
  address: string;
  creditLimit: number;
  outstandingBalance: number;
  paymentTermsDays: number;
}

interface WholesaleOrderItem {
  productId: string;
  name: string;
  qty: number;
  wholesalePrice: number;
  mrp: number;
  gstPct: number;
  total: number;
}

interface WholesaleOrder {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  customerGstin: string;
  date: string;
  status: 'draft' | 'confirmed' | 'dispatched' | 'invoiced' | 'paid' | 'cancelled';
  items: WholesaleOrderItem[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod?: string;
  notes?: string;
}

export default function WholesaleScreen() {
  const { tenantId } = useAuth();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'pricing'>('orders');
  const [loading, setLoading] = useState(true);

  // Data state
  const [customers, setCustomers] = useState<B2BCustomer[]>([]);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

  // Dialogs
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<WholesaleOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer / NEFT');

  // Customer form
  const [custBusinessName, setCustBusinessName] = useState('');
  const [custContactPerson, setCustContactPerson] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custGstin, setCustGstin] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCreditLimit, setCustCreditLimit] = useState('50000');
  const [custTermsDays, setCustTermsDays] = useState('15');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Order form
  const [orderCustomerId, setOrderCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState<WholesaleOrderItem[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [itemQtyToAdd, setItemQtyToAdd] = useState('10');
  const [itemWholesaleRate, setItemWholesaleRate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    fetchWholesaleData();
  }, [tenantId]);

  const fetchWholesaleData = async () => {
    setLoading(true);
    try {
      // 1. Fetch B2B Customers
      let custs: B2BCustomer[] = [];
      let ords: WholesaleOrder[] = [];
      let prods: any[] = [];

      if (isFirebaseConfigured && tenantId) {
        const custSnap = await getDocs(query(collection(db, 'b2b_customers'), where('tenant_id', '==', tenantId)));
        custs = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const orderSnap = await getDocs(query(collection(db, 'wholesale_orders'), where('tenant_id', '==', tenantId)));
        ords = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const prodSnap = await getDocs(query(collection(db, 'products'), where('tenant_id', '==', tenantId)));
        prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else if (typeof window !== 'undefined') {
        custs = JSON.parse(window.localStorage.getItem('bharatpos_b2b_customers') || '[]');
        ords = JSON.parse(window.localStorage.getItem('bharatpos_wholesale_orders') || '[]');
        prods = JSON.parse(window.localStorage.getItem('cachedProductsList') || '[]');
      }

      setCustomers(custs);
      setOrders(ords);
      setCatalogProducts(prods);
    } catch (err) {
      console.error('Error fetching wholesale data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Customer Management ───────────────────────────────────────────────────
  const handleSaveCustomer = async () => {
    if (!custBusinessName.trim() || !custPhone.trim()) {
      Alert.alert('Required Fields', 'Business name and phone number are required.');
      return;
    }

    setSavingCustomer(true);
    try {
      const newCust: Omit<B2BCustomer, 'id'> = {
        businessName: custBusinessName.trim(),
        contactPerson: custContactPerson.trim(),
        phone: custPhone.trim(),
        gstin: custGstin.trim().toUpperCase(),
        address: custAddress.trim(),
        creditLimit: parseFloat(custCreditLimit) || 0,
        outstandingBalance: 0,
        paymentTermsDays: parseInt(custTermsDays) || 15,
      };

      if (isFirebaseConfigured && tenantId) {
        const ref = await addDoc(collection(db, 'b2b_customers'), {
          ...newCust,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        });
        setCustomers(prev => [...prev, { id: ref.id, ...newCust }]);
      } else if (typeof window !== 'undefined') {
        const id = 'CUST-' + Date.now().toString().slice(-4);
        const updated = [...customers, { id, ...newCust }];
        setCustomers(updated);
        window.localStorage.setItem('bharatpos_b2b_customers', JSON.stringify(updated));
      }

      setShowCustomerModal(false);
      setCustBusinessName('');
      setCustContactPerson('');
      setCustPhone('');
      setCustGstin('');
      setCustAddress('');
      Alert.alert('Success', 'B2B Customer account created.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save customer.');
    } finally {
      setSavingCustomer(false);
    }
  };

  // ── Order Item Addition ───────────────────────────────────────────────────
  const handleAddItemToOrder = () => {
    if (!selectedProductToAdd) {
      Alert.alert('Select Product', 'Please select a catalog product first.');
      return;
    }
    const product = catalogProducts.find(p => p.id === selectedProductToAdd);
    if (!product) return;

    const qty = parseInt(itemQtyToAdd) || 1;
    const rate = parseFloat(itemWholesaleRate) || parseFloat(product.wholesale_price) || (parseFloat(product.selling_price) * 0.85) || 100;
    const gstPct = product.gst_pct || 18;
    const total = rate * qty;

    const newItem: WholesaleOrderItem = {
      productId: product.id,
      name: product.name,
      qty,
      wholesalePrice: rate,
      mrp: product.mrp || product.selling_price || rate,
      gstPct,
      total
    };

    setOrderItems(prev => [...prev, newItem]);
    setSelectedProductToAdd('');
    setItemQtyToAdd('10');
    setItemWholesaleRate('');
  };

  const handleCreateOrder = async () => {
    if (!orderCustomerId) {
      Alert.alert('Select Customer', 'Please choose a B2B customer.');
      return;
    }
    if (orderItems.length === 0) {
      Alert.alert('Empty Order', 'Add at least one wholesale product line item.');
      return;
    }

    const customer = customers.find(c => c.id === orderCustomerId);
    if (!customer) return;

    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const gstAmount = orderItems.reduce((sum, item) => sum + (item.total * (item.gstPct || 0)) / 100, 0);
    const totalAmount = Math.round((subtotal + gstAmount) * 100) / 100;

    // Check Credit Limit
    if (customer.creditLimit > 0 && (customer.outstandingBalance + totalAmount) > customer.creditLimit) {
      const proceed = confirm(`Customer credit limit of ₹${customer.creditLimit.toLocaleString('en-IN')} will be exceeded (Current balance: ₹${customer.outstandingBalance}, Order: ₹${totalAmount}). Do you want to proceed with order approval?`);
      if (!proceed) return;
    }

    setSavingOrder(true);
    try {
      const orderNo = `SO-${Date.now().toString().slice(-6)}`;
      const newOrder: Omit<WholesaleOrder, 'id'> = {
        orderNo,
        customerId: customer.id,
        customerName: customer.businessName,
        customerGstin: customer.gstin,
        date: new Date().toLocaleDateString('en-IN'),
        status: 'confirmed',
        items: orderItems,
        subtotal,
        gstAmount,
        totalAmount,
        paidAmount: 0,
        notes: orderNotes
      };

      if (isFirebaseConfigured && tenantId) {
        const ref = await addDoc(collection(db, 'wholesale_orders'), {
          ...newOrder,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        });
        // Update customer outstanding
        const custRef = doc(db, 'b2b_customers', customer.id);
        await updateDoc(custRef, {
          outstandingBalance: (customer.outstandingBalance || 0) + totalAmount
        });
        setOrders(prev => [{ id: ref.id, ...newOrder }, ...prev]);
        setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, outstandingBalance: c.outstandingBalance + totalAmount } : c));
      } else if (typeof window !== 'undefined') {
        const id = 'ORD-' + Date.now().toString().slice(-4);
        const updatedOrders = [{ id, ...newOrder }, ...orders];
        setOrders(updatedOrders);
        window.localStorage.setItem('bharatpos_wholesale_orders', JSON.stringify(updatedOrders));

        const updatedCusts = customers.map(c => c.id === customer.id ? { ...c, outstandingBalance: c.outstandingBalance + totalAmount } : c);
        setCustomers(updatedCusts);
        window.localStorage.setItem('bharatpos_b2b_customers', JSON.stringify(updatedCusts));
      }

      setShowOrderModal(false);
      setOrderItems([]);
      setOrderCustomerId('');
      setOrderNotes('');
      Alert.alert('Order Created', `Wholesale Sales Order ${orderNo} confirmed for ₹${totalAmount.toLocaleString('en-IN')}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create sales order.');
    } finally {
      setSavingOrder(false);
    }
  };

  // ── Record Payment ────────────────────────────────────────────────────────
  const handleRecordPayment = async () => {
    if (!selectedOrderForPayment) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    try {
      const remaining = selectedOrderForPayment.totalAmount - selectedOrderForPayment.paidAmount;
      const actualPaid = Math.min(amt, remaining);
      const newPaidTotal = selectedOrderForPayment.paidAmount + actualPaid;
      const newStatus = newPaidTotal >= selectedOrderForPayment.totalAmount ? 'paid' : 'invoiced';

      if (isFirebaseConfigured && tenantId) {
        const orderRef = doc(db, 'wholesale_orders', selectedOrderForPayment.id);
        await updateDoc(orderRef, {
          paidAmount: newPaidTotal,
          status: newStatus,
          paymentMethod: paymentMode
        });

        // Reduce customer balance
        const customer = customers.find(c => c.id === selectedOrderForPayment.customerId);
        if (customer) {
          const custRef = doc(db, 'b2b_customers', customer.id);
          const newBal = Math.max(0, customer.outstandingBalance - actualPaid);
          await updateDoc(custRef, { outstandingBalance: newBal });
          setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, outstandingBalance: newBal } : c));
        }

        // Log transaction to Day Book
        await addDoc(collection(db, 'transactions'), {
          tenant_id: tenantId,
          dateTime: new Date().toISOString(),
          voucherType: 'Wholesale Receipt',
          voucherNo: selectedOrderForPayment.orderNo,
          partyName: selectedOrderForPayment.customerName,
          debit: 0,
          credit: actualPaid,
          paymentMethod: paymentMode,
          notes: `Payment for Order #${selectedOrderForPayment.orderNo}`
        });
      }

      setOrders(prev => prev.map(o => o.id === selectedOrderForPayment.id ? {
        ...o,
        paidAmount: newPaidTotal,
        status: newStatus,
        paymentMethod: paymentMode
      } : o));

      setShowPaymentModal(false);
      setSelectedOrderForPayment(null);
      setPaymentAmount('');
      Alert.alert('Payment Recorded', `Received ₹${actualPaid.toLocaleString('en-IN')} via ${paymentMode}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record payment.');
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
    const totalReceived = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalReceivables = customers.reduce((sum, c) => sum + (c.outstandingBalance || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'invoiced').length;
    return { totalSales, totalReceived, totalReceivables, pendingOrders };
  }, [orders, customers]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={{ marginTop: 12, color: '#64748B' }}>Loading Wholesale ERP...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <PremiumHeader
        title="Wholesale & Distribution ERP"
        subtitle="B2B Sales Orders, Customer Credit Limits, Tiered Pricing & Invoicing"
        icon="warehouse"
      />

      {/* KPI Cards Strip */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard} elevation={0}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Total B2B Orders</Text>
              <Icon name="file-document-outline" size={20} color="#2563EB" />
            </View>
            <Text style={styles.metricVal}>₹{metrics.totalSales.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSub}>{orders.length} orders recorded</Text>
          </Card.Content>
        </Card>

        <Card style={styles.metricCard} elevation={0}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Receivables (Udhar)</Text>
              <Icon name="alert-circle-outline" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.metricVal, { color: '#DC2626' }]}>₹{metrics.totalReceivables.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSub}>Across {customers.length} accounts</Text>
          </Card.Content>
        </Card>

        <Card style={styles.metricCard} elevation={0}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Collected Revenue</Text>
              <Icon name="check-circle-outline" size={20} color="#16A34A" />
            </View>
            <Text style={[styles.metricVal, { color: '#16A34A' }]}>₹{metrics.totalReceived.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSub}>Bank & Cash Receipts</Text>
          </Card.Content>
        </Card>

        <Card style={styles.metricCard} elevation={0}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Pending Fulfillment</Text>
              <Icon name="clock-outline" size={20} color="#D97706" />
            </View>
            <Text style={[styles.metricVal, { color: '#D97706' }]}>{metrics.pendingOrders}</Text>
            <Text style={styles.metricSub}>Needs dispatch/invoice</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Tabs & Action Strip */}
      <View style={styles.tabsRow}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={v => setActiveTab(v as any)}
          buttons={[
            { value: 'orders', label: `Sales Orders (${orders.length})`, icon: 'receipt' },
            { value: 'customers', label: `B2B Customers (${customers.length})`, icon: 'account-group' },
            { value: 'pricing', label: 'Tiered Pricing (MOQ)', icon: 'tag-multiple' },
          ]}
          style={{ maxWidth: 600 }}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {activeTab === 'customers' && (
            <Button
              mode="contained"
              buttonColor="#16A34A"
              icon="plus"
              onPress={() => setShowCustomerModal(true)}
            >
              + New B2B Customer
            </Button>
          )}
          {activeTab === 'orders' && (
            <Button
              mode="contained"
              buttonColor="#2563EB"
              icon="plus"
              onPress={() => setShowOrderModal(true)}
            >
              + Create Sales Order
            </Button>
          )}
        </View>
      </View>

      {/* ── TAB 1: SALES ORDERS ────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <Card style={styles.tableCard} elevation={0}>
          <Card.Content style={{ padding: 0 }}>
            {orders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="cart-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Wholesale Orders Yet</Text>
                <Text style={styles.emptySub}>Create your first bulk sales order with customer credit and GST tax invoice.</Text>
                <Button mode="contained" buttonColor="#2563EB" onPress={() => setShowOrderModal(true)} style={{ marginTop: 12 }}>
                  + Create First Sales Order
                </Button>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: 900 }}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.th, { width: 110 }]}>Order No</Text>
                    <Text style={[styles.th, { width: 100 }]}>Date</Text>
                    <Text style={[styles.th, { width: 220 }]}>B2B Customer</Text>
                    <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>Items</Text>
                    <Text style={[styles.th, { width: 120, textAlign: 'right' }]}>Total (₹)</Text>
                    <Text style={[styles.th, { width: 120, textAlign: 'right' }]}>Paid (₹)</Text>
                    <Text style={[styles.th, { width: 110, textAlign: 'center' }]}>Status</Text>
                    <Text style={[styles.th, { width: 120, textAlign: 'center' }]}>Actions</Text>
                  </View>

                  {orders.map(order => (
                    <View key={order.id} style={styles.tableRow}>
                      <Text style={[styles.td, { width: 110, fontWeight: '700', color: '#2563EB' }]}>{order.orderNo}</Text>
                      <Text style={[styles.td, { width: 100, color: '#64748B' }]}>{order.date}</Text>
                      <View style={{ width: 220 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{order.customerName}</Text>
                        {order.customerGstin ? <Text style={{ fontSize: 10, color: '#64748B' }}>GSTIN: {order.customerGstin}</Text> : null}
                      </View>
                      <Text style={[styles.td, { width: 100, textAlign: 'center' }]}>{order.items?.length || 0} SKUs</Text>
                      <Text style={[styles.td, { width: 120, textAlign: 'right', fontWeight: '800' }]}>₹{order.totalAmount.toLocaleString('en-IN')}</Text>
                      <Text style={[styles.td, { width: 120, textAlign: 'right', color: order.paidAmount >= order.totalAmount ? '#16A34A' : '#D97706', fontWeight: '700' }]}>
                        ₹{order.paidAmount.toLocaleString('en-IN')}
                      </Text>
                      <View style={{ width: 110, alignItems: 'center' }}>
                        <Chip
                          compact
                          textStyle={{ fontSize: 10, fontWeight: '800', color: order.status === 'paid' ? '#16A34A' : order.status === 'confirmed' ? '#2563EB' : '#D97706' }}
                          style={{ backgroundColor: order.status === 'paid' ? '#DCFCE7' : order.status === 'confirmed' ? '#DBEAFE' : '#FEF3C7' }}
                        >
                          {order.status.toUpperCase()}
                        </Chip>
                      </View>
                      <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                        {order.paidAmount < order.totalAmount && (
                          <Button
                            mode="contained-tonal"
                            compact
                            onPress={() => {
                              setSelectedOrderForPayment(order);
                              setPaymentAmount((order.totalAmount - order.paidAmount).toString());
                              setShowPaymentModal(true);
                            }}
                          >
                            Receive
                          </Button>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── TAB 2: B2B CUSTOMERS ─────────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <Card style={styles.tableCard} elevation={0}>
          <Card.Content style={{ padding: 0 }}>
            {customers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="account-group-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No B2B Customers Added</Text>
                <Text style={styles.emptySub}>Register wholesale distributors, retail partners, and bulk buyers with GSTIN and credit limits.</Text>
                <Button mode="contained" buttonColor="#16A34A" onPress={() => setShowCustomerModal(true)} style={{ marginTop: 12 }}>
                  + Add First B2B Customer
                </Button>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: 900 }}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.th, { width: 220 }]}>Business Name</Text>
                    <Text style={[styles.th, { width: 140 }]}>Contact Person</Text>
                    <Text style={[styles.th, { width: 120 }]}>Phone</Text>
                    <Text style={[styles.th, { width: 140 }]}>GSTIN</Text>
                    <Text style={[styles.th, { width: 120, textAlign: 'right' }]}>Credit Limit</Text>
                    <Text style={[styles.th, { width: 130, textAlign: 'right' }]}>Balance (Udhar)</Text>
                    <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>Terms</Text>
                  </View>

                  {customers.map(cust => (
                    <View key={cust.id} style={styles.tableRow}>
                      <View style={{ width: 220 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1E293B' }}>{cust.businessName}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>{cust.address || 'No address'}</Text>
                      </View>
                      <Text style={[styles.td, { width: 140 }]}>{cust.contactPerson || '—'}</Text>
                      <Text style={[styles.td, { width: 120, fontWeight: '600' }]}>+91 {cust.phone}</Text>
                      <Text style={[styles.td, { width: 140, fontFamily: 'monospace', fontSize: 11 }]}>{cust.gstin || 'Unregistered'}</Text>
                      <Text style={[styles.td, { width: 120, textAlign: 'right' }]}>₹{cust.creditLimit.toLocaleString('en-IN')}</Text>
                      <Text style={[styles.td, { width: 130, textAlign: 'right', fontWeight: '800', color: cust.outstandingBalance > 0 ? '#DC2626' : '#16A34A' }]}>
                        ₹{cust.outstandingBalance.toLocaleString('en-IN')}
                      </Text>
                      <Text style={[styles.td, { width: 100, textAlign: 'center', color: '#64748B' }]}>{cust.paymentTermsDays} days</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </Card.Content>
        </Card>
      )}

      {/* ── TAB 3: TIERED PRICING & MOQs ─────────────────────────────────── */}
      {activeTab === 'pricing' && (
        <Card style={styles.tableCard} elevation={0}>
          <Card.Content>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Wholesale Price Lists & Minimum Order Quantities</Text>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                Configure wholesale discount rates and carton packs. When bulk quantities are ordered, the system automatically applies the wholesale rate.
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: 800 }}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { width: 240 }]}>Product Name</Text>
                  <Text style={[styles.th, { width: 120, textAlign: 'right' }]}>MRP (₹)</Text>
                  <Text style={[styles.th, { width: 140, textAlign: 'right' }]}>Retail Price (₹)</Text>
                  <Text style={[styles.th, { width: 150, textAlign: 'right' }]}>Wholesale Rate (₹)</Text>
                  <Text style={[styles.th, { width: 120, textAlign: 'center' }]}>Min Order Qty</Text>
                </View>

                {catalogProducts.slice(0, 20).map(p => {
                  const mrp = Number(p.mrp || p.selling_price || 0);
                  const retail = Number(p.selling_price || 0);
                  const wholesale = Number(p.wholesale_price || (retail * 0.85));
                  const moq = Number(p.min_order_qty || 10);
                  return (
                    <View key={p.id} style={styles.tableRow}>
                      <View style={{ width: 240 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{p.name}</Text>
                        <Text style={{ fontSize: 10.5, color: '#64748B' }}>Category: {p.category || 'General'}</Text>
                      </View>
                      <Text style={[styles.td, { width: 120, textAlign: 'right' }]}>₹{mrp.toFixed(2)}</Text>
                      <Text style={[styles.td, { width: 140, textAlign: 'right', fontWeight: '600' }]}>₹{retail.toFixed(2)}</Text>
                      <Text style={[styles.td, { width: 150, textAlign: 'right', fontWeight: '800', color: '#16A34A' }]}>
                        ₹{wholesale.toFixed(2)}
                      </Text>
                      <Text style={[styles.td, { width: 120, textAlign: 'center', fontWeight: '700' }]}>{moq} units</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>
      )}

      {/* ── MODAL 1: ADD B2B CUSTOMER ──────────────────────────────────────── */}
      <Portal>
        <Dialog visible={showCustomerModal} onDismiss={() => setShowCustomerModal(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Register B2B Customer</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Business / Enterprise Name *"
              value={custBusinessName}
              onChangeText={setCustBusinessName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Contact Person Name"
              value={custContactPerson}
              onChangeText={setCustContactPerson}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Mobile Number *"
              value={custPhone}
              onChangeText={setCustPhone}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="GSTIN (GST Identification Number)"
              value={custGstin}
              onChangeText={setCustGstin}
              autoCapitalize="characters"
              mode="outlined"
              placeholder="e.g. 07AAAAA0000A1Z5"
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                label="Credit Limit (₹)"
                value={custCreditLimit}
                onChangeText={setCustCreditLimit}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
              <TextInput
                label="Payment Terms (Days)"
                value={custTermsDays}
                onChangeText={setCustTermsDays}
                keyboardType="numeric"
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
            <TextInput
              label="Registered Business Address"
              value={custAddress}
              onChangeText={setCustAddress}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowCustomerModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#16A34A" onPress={handleSaveCustomer} loading={savingCustomer}>
              Save B2B Customer
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── MODAL 2: CREATE WHOLESALE SALES ORDER ───────────────────────────── */}
      <Portal>
        <Dialog visible={showOrderModal} onDismiss={() => setShowOrderModal(false)} style={[styles.dialog, { maxWidth: 640 }]}>
          <Dialog.Title style={styles.dialogTitle}>Create Wholesale Sales Order</Dialog.Title>
          <Dialog.Content>
            {/* Customer Selector */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Select B2B Customer *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {customers.map(c => (
                  <Chip
                    key={c.id}
                    selected={orderCustomerId === c.id}
                    onPress={() => setOrderCustomerId(c.id)}
                    style={{ backgroundColor: orderCustomerId === c.id ? '#DBEAFE' : '#F1F5F9' }}
                  >
                    {c.businessName} (Balance: ₹{c.outstandingBalance})
                  </Chip>
                ))}
              </View>
            </ScrollView>

            {/* Product Quick-Add Row */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Add Bulk Products</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 2 }}>
                <TextInput
                  placeholder="Select Product..."
                  value={catalogProducts.find(p => p.id === selectedProductToAdd)?.name || ''}
                  mode="outlined"
                  dense
                  editable={false}
                  right={<TextInput.Icon icon="chevron-down" />}
                />
              </View>
              <TextInput
                placeholder="Qty"
                value={itemQtyToAdd}
                onChangeText={setItemQtyToAdd}
                keyboardType="numeric"
                mode="outlined"
                dense
                style={{ width: 80 }}
              />
              <TextInput
                placeholder="Rate (₹)"
                value={itemWholesaleRate}
                onChangeText={setItemWholesaleRate}
                keyboardType="numeric"
                mode="outlined"
                dense
                style={{ width: 100 }}
              />
              <Button mode="contained" buttonColor="#2563EB" compact onPress={handleAddItemToOrder}>
                Add
              </Button>
            </View>

            {/* Catalog quick selection pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {catalogProducts.slice(0, 10).map(p => (
                  <Chip
                    key={p.id}
                    compact
                    onPress={() => {
                      setSelectedProductToAdd(p.id);
                      setItemWholesaleRate(p.wholesale_price || (p.selling_price * 0.85).toFixed(0));
                    }}
                  >
                    {p.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>

            {/* Added line items table */}
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, maxHeight: 180, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>LINE ITEMS ({orderItems.length})</Text>
              {orderItems.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', flex: 1 }}>{item.name} x{item.qty}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>@₹{item.wholesalePrice}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', marginLeft: 12 }}>₹{item.total.toLocaleString('en-IN')}</Text>
                </View>
              ))}
              {orderItems.length === 0 && (
                <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 10 }}>No products added yet.</Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Order Total (with GST):</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#16A34A' }}>
                ₹{Math.round(orderItems.reduce((acc, i) => acc + i.total * (1 + (i.gstPct || 0) / 100), 0)).toLocaleString('en-IN')}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowOrderModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#2563EB" onPress={handleCreateOrder} loading={savingOrder}>
              Confirm & Book Order
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* ── MODAL 3: RECORD PAYMENT ────────────────────────────────────────── */}
      <Portal>
        <Dialog visible={showPaymentModal} onDismiss={() => setShowPaymentModal(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Record Wholesale Payment</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
              Recording settlement for Order <Text style={{ fontWeight: '800' }}>#{selectedOrderForPayment?.orderNo}</Text> ({selectedOrderForPayment?.customerName}).
            </Text>
            <TextInput
              label="Payment Amount (₹) *"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 }}>Payment Channel</Text>
            <SegmentedButtons
              value={paymentMode}
              onValueChange={setPaymentMode}
              buttons={[
                { value: 'Bank Transfer / NEFT', label: 'NEFT / RTGS' },
                { value: 'UPI / Dynamic QR', label: 'UPI' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Cash', label: 'Cash' }
              ]}
              style={{ marginBottom: 12 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#16A34A" onPress={handleRecordPayment}>
              Record Receipt
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  metricCard: { flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  metricLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  metricVal: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  metricSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  tabsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  th: { fontSize: 11.5, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
  td: { fontSize: 13, color: '#334155' },
  emptyBox: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 4, maxWidth: 440 },
  dialog: { maxWidth: 520, width: '92%', alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 14 },
  dialogTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  input: { marginBottom: 12, backgroundColor: '#FFFFFF' }
});
