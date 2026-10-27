import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { Text, Card, Button, TextInput, SegmentedButtons, Dialog, Portal, Chip, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../providers/AuthProvider';
import { db, isFirebaseConfigured } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from '../../lib/firestore_adapter';
import { DS } from '../../constants/designTokens';
import { PremiumHeader } from '../../components/PremiumHeader';

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  gstin: string;
  address: string;
  category: string;
  outstandingPayable: number;
}

interface PurchaseOrderItem {
  productId: string;
  name: string;
  qty: number;
  costPrice: number;
  total: number;
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  supplierId: string;
  supplierName: string;
  date: string;
  status: 'ordered' | 'received' | 'paid' | 'cancelled';
  items: PurchaseOrderItem[];
  totalAmount: number;
  paidAmount: number;
  receivedDate?: string;
  paymentMethod?: string;
}

export default function SuppliersProcurementScreen() {
  const { tenantId } = useAuth();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

  // Dialogs
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPOForPayment, setSelectedPOForPayment] = useState<PurchaseOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer / NEFT');

  // Supplier form
  const [suppName, setSuppName] = useState('');
  const [suppContact, setSuppContact] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppGstin, setSuppGstin] = useState('');
  const [suppAddress, setSuppAddress] = useState('');
  const [suppCategory, setSuppCategory] = useState('FMCG & Groceries');
  const [savingSupplier, setSavingSupplier] = useState(false);

  // PO form
  const [poSupplierId, setPoSupplierId] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
  const [itemQtyToAdd, setItemQtyToAdd] = useState('20');
  const [itemCostPrice, setItemCostPrice] = useState('');
  const [savingPO, setSavingPO] = useState(false);

  useEffect(() => {
    fetchProcurementData();
  }, [tenantId]);

  const fetchProcurementData = async () => {
    setLoading(true);
    try {
      let supps: Supplier[] = [];
      let pos: PurchaseOrder[] = [];
      let prods: any[] = [];

      if (isFirebaseConfigured && tenantId) {
        const suppSnap = await getDocs(query(collection(db, 'suppliers'), where('tenant_id', '==', tenantId)));
        supps = suppSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const poSnap = await getDocs(query(collection(db, 'purchase_orders'), where('tenant_id', '==', tenantId)));
        pos = poSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const prodSnap = await getDocs(query(collection(db, 'products'), where('tenant_id', '==', tenantId)));
        prods = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } else if (typeof window !== 'undefined') {
        supps = JSON.parse(window.localStorage.getItem('bharatpos_suppliers') || '[]');
        pos = JSON.parse(window.localStorage.getItem('bharatpos_purchase_orders') || '[]');
        prods = JSON.parse(window.localStorage.getItem('cachedProductsList') || '[]');
      }

      setSuppliers(supps);
      setOrders(pos);
      setCatalogProducts(prods);
    } catch (err) {
      console.error('Error fetching procurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSupplier = async () => {
    if (!suppName.trim() || !suppPhone.trim()) {
      Alert.alert('Required Fields', 'Supplier name and contact phone are required.');
      return;
    }

    setSavingSupplier(true);
    try {
      const newSupp: Omit<Supplier, 'id'> = {
        name: suppName.trim(),
        contactPerson: suppContact.trim(),
        phone: suppPhone.trim(),
        gstin: suppGstin.trim().toUpperCase(),
        address: suppAddress.trim(),
        category: suppCategory,
        outstandingPayable: 0
      };

      if (isFirebaseConfigured && tenantId) {
        const ref = await addDoc(collection(db, 'suppliers'), {
          ...newSupp,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        });
        setSuppliers(prev => [...prev, { id: ref.id, ...newSupp }]);
      } else if (typeof window !== 'undefined') {
        const id = 'SUPP-' + Date.now().toString().slice(-4);
        const updated = [...suppliers, { id, ...newSupp }];
        setSuppliers(updated);
        window.localStorage.setItem('bharatpos_suppliers', JSON.stringify(updated));
      }

      setShowSupplierModal(false);
      setSuppName('');
      setSuppContact('');
      setSuppPhone('');
      setSuppGstin('');
      setSuppAddress('');
      Alert.alert('Supplier Added', 'Supplier has been registered.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleAddItemToPO = () => {
    if (!selectedProductToAdd) {
      Alert.alert('Select Product', 'Please choose a product to order.');
      return;
    }
    const product = catalogProducts.find(p => p.id === selectedProductToAdd);
    if (!product) return;

    const qty = parseInt(itemQtyToAdd) || 1;
    const cost = parseFloat(itemCostPrice) || parseFloat(product.cost_price) || (parseFloat(product.selling_price) * 0.75) || 50;
    const total = cost * qty;

    setPoItems(prev => [...prev, {
      productId: product.id,
      name: product.name,
      qty,
      costPrice: cost,
      total
    }]);

    setSelectedProductToAdd('');
    setItemQtyToAdd('20');
    setItemCostPrice('');
  };

  const handleCreatePO = async () => {
    if (!poSupplierId) {
      Alert.alert('Select Supplier', 'Please select a supplier for this purchase order.');
      return;
    }
    if (poItems.length === 0) {
      Alert.alert('Empty Order', 'Add at least one item to order.');
      return;
    }

    const supplier = suppliers.find(s => s.id === poSupplierId);
    if (!supplier) return;

    const totalAmount = poItems.reduce((sum, item) => sum + item.total, 0);

    setSavingPO(true);
    try {
      const poNo = `PO-${Date.now().toString().slice(-6)}`;
      const newPO: Omit<PurchaseOrder, 'id'> = {
        poNo,
        supplierId: supplier.id,
        supplierName: supplier.name,
        date: new Date().toLocaleDateString('en-IN'),
        status: 'ordered',
        items: poItems,
        totalAmount,
        paidAmount: 0
      };

      if (isFirebaseConfigured && tenantId) {
        const ref = await addDoc(collection(db, 'purchase_orders'), {
          ...newPO,
          tenant_id: tenantId,
          created_at: new Date().toISOString()
        });

        const suppRef = doc(db, 'suppliers', supplier.id);
        await updateDoc(suppRef, {
          outstandingPayable: (supplier.outstandingPayable || 0) + totalAmount
        });

        setOrders(prev => [{ id: ref.id, ...newPO }, ...prev]);
        setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, outstandingPayable: s.outstandingPayable + totalAmount } : s));
      } else if (typeof window !== 'undefined') {
        const id = 'PO-' + Date.now().toString().slice(-4);
        const updated = [{ id, ...newPO }, ...orders];
        setOrders(updated);
        window.localStorage.setItem('bharatpos_purchase_orders', JSON.stringify(updated));

        const updatedSupps = suppliers.map(s => s.id === supplier.id ? { ...s, outstandingPayable: s.outstandingPayable + totalAmount } : s);
        setSuppliers(updatedSupps);
        window.localStorage.setItem('bharatpos_suppliers', JSON.stringify(updatedSupps));
      }

      setShowPOModal(false);
      setPoItems([]);
      setPoSupplierId('');
      Alert.alert('Purchase Order Created', `Purchase Order ${poNo} sent to ${supplier.name}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingPO(false);
    }
  };

  // ── Receive Goods (GRN) ───────────────────────────────────────────────────
  const handleReceiveGoods = async (order: PurchaseOrder) => {
    try {
      // 1. Update stock in products catalog
      if (isFirebaseConfigured && tenantId) {
        for (const item of order.items) {
          const prod = catalogProducts.find(p => p.id === item.productId || p.name === item.name);
          if (prod) {
            const prodRef = doc(db, 'products', prod.id);
            await updateDoc(prodRef, {
              stock_qty: (prod.stock_qty || 0) + item.qty
            });
          }
        }

        const poRef = doc(db, 'purchase_orders', order.id);
        await updateDoc(poRef, {
          status: 'received',
          receivedDate: new Date().toISOString()
        });
      }

      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'received', receivedDate: new Date().toLocaleDateString('en-IN') } : o));
      Alert.alert('Stock Received', `Inventory stock increased for all ${order.items.length} items from ${order.supplierName}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedPOForPayment) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Enter valid amount.');
      return;
    }

    try {
      const remaining = selectedPOForPayment.totalAmount - selectedPOForPayment.paidAmount;
      const actualPaid = Math.min(amt, remaining);
      const newPaidTotal = selectedPOForPayment.paidAmount + actualPaid;
      const newStatus = newPaidTotal >= selectedPOForPayment.totalAmount ? 'paid' : selectedPOForPayment.status;

      if (isFirebaseConfigured && tenantId) {
        const poRef = doc(db, 'purchase_orders', selectedPOForPayment.id);
        await updateDoc(poRef, {
          paidAmount: newPaidTotal,
          status: newStatus,
          paymentMethod: paymentMode
        });

        const supplier = suppliers.find(s => s.id === selectedPOForPayment.supplierId);
        if (supplier) {
          const suppRef = doc(db, 'suppliers', supplier.id);
          const newPayable = Math.max(0, supplier.outstandingPayable - actualPaid);
          await updateDoc(suppRef, { outstandingPayable: newPayable });
          setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, outstandingPayable: newPayable } : s));
        }

        // Add to cash/bank transactions
        await addDoc(collection(db, 'transactions'), {
          tenant_id: tenantId,
          dateTime: new Date().toISOString(),
          voucherType: 'Payment Voucher',
          voucherNo: selectedPOForPayment.poNo,
          partyName: selectedPOForPayment.supplierName,
          debit: actualPaid,
          credit: 0,
          paymentMethod: paymentMode,
          notes: `Supplier payment for PO #${selectedPOForPayment.poNo}`
        });
      }

      setOrders(prev => prev.map(o => o.id === selectedPOForPayment.id ? {
        ...o,
        paidAmount: newPaidTotal,
        status: newStatus,
        paymentMethod: paymentMode
      } : o));

      setShowPaymentModal(false);
      setSelectedPOForPayment(null);
      setPaymentAmount('');
      Alert.alert('Payment Logged', `Paid ₹${actualPaid.toLocaleString('en-IN')} to supplier via ${paymentMode}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalPurchases = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0);
    const totalPayables = suppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0);
    const pendingReceipts = orders.filter(o => o.status === 'ordered').length;
    return { totalPurchases, totalPaid, totalPayables, pendingReceipts };
  }, [orders, suppliers]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <PremiumHeader
        title="Suppliers & Procurement"
        subtitle="Purchase Orders, Goods Receipt (GRN), Supplier Bills & Payables"
        icon="truck-delivery-outline"
      />

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <Card style={styles.metricCard} elevation={0}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Total Purchases</Text>
              <Icon name="cart-arrow-down" size={20} color="#2563EB" />
            </View>
            <Text style={styles.metricVal}>₹{metrics.totalPurchases.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSub}>{orders.length} orders placed</Text>
          </Card.Content>
        </Card>

        <Card style={styles.metricCard} elevation={0}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Payables (Dena)</Text>
              <Icon name="alert-circle-outline" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.metricVal, { color: '#DC2626' }]}>₹{metrics.totalPayables.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSub}>Due to {suppliers.length} vendors</Text>
          </Card.Content>
        </Card>

        <Card style={styles.metricCard} elevation={0}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Paid to Suppliers</Text>
              <Icon name="check-circle-outline" size={20} color="#16A34A" />
            </View>
            <Text style={[styles.metricVal, { color: '#16A34A' }]}>₹{metrics.totalPaid.toLocaleString('en-IN')}</Text>
            <Text style={styles.metricSub}>Settled via Bank/Cash</Text>
          </Card.Content>
        </Card>

        <Card style={styles.metricCard} elevation={0}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.metricLabel}>Pending Delivery</Text>
              <Icon name="truck-outline" size={20} color="#D97706" />
            </View>
            <Text style={[styles.metricVal, { color: '#D97706' }]}>{metrics.pendingReceipts}</Text>
            <Text style={styles.metricSub}>Goods awaiting GRN</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Tabs & Buttons */}
      <View style={styles.tabsRow}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={v => setActiveTab(v as any)}
          buttons={[
            { value: 'orders', label: `Purchase Orders (${orders.length})`, icon: 'file-document-outline' },
            { value: 'suppliers', label: `Suppliers Directory (${suppliers.length})`, icon: 'domain' }
          ]}
          style={{ maxWidth: 500 }}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {activeTab === 'suppliers' && (
            <Button
              mode="contained"
              buttonColor="#16A34A"
              icon="plus"
              onPress={() => setShowSupplierModal(true)}
            >
              + Register Supplier
            </Button>
          )}
          {activeTab === 'orders' && (
            <Button
              mode="contained"
              buttonColor="#2563EB"
              icon="plus"
              onPress={() => setShowPOModal(true)}
            >
              + Create Purchase Order
            </Button>
          )}
        </View>
      </View>

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <Card style={styles.tableCard} elevation={0}>
          <Card.Content style={{ padding: 0 }}>
            {orders.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="truck-delivery-outline" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Purchase Orders Created</Text>
                <Text style={styles.emptySub}>Order FMCG goods, retail inventory or kitchen ingredients from suppliers.</Text>
                <Button mode="contained" buttonColor="#2563EB" onPress={() => setShowPOModal(true)} style={{ marginTop: 12 }}>
                  + Create First PO
                </Button>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: 900 }}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.th, { width: 110 }]}>PO Number</Text>
                    <Text style={[styles.th, { width: 100 }]}>Date</Text>
                    <Text style={[styles.th, { width: 220 }]}>Supplier</Text>
                    <Text style={[styles.th, { width: 100, textAlign: 'center' }]}>Items</Text>
                    <Text style={[styles.th, { width: 120, textAlign: 'right' }]}>Total (₹)</Text>
                    <Text style={[styles.th, { width: 110, textAlign: 'center' }]}>Status</Text>
                    <Text style={[styles.th, { width: 140, textAlign: 'center' }]}>Actions</Text>
                  </View>

                  {orders.map(order => (
                    <View key={order.id} style={styles.tableRow}>
                      <Text style={[styles.td, { width: 110, fontWeight: '700', color: '#2563EB' }]}>{order.poNo}</Text>
                      <Text style={[styles.td, { width: 100, color: '#64748B' }]}>{order.date}</Text>
                      <Text style={[styles.td, { width: 220, fontWeight: '700' }]}>{order.supplierName}</Text>
                      <Text style={[styles.td, { width: 100, textAlign: 'center' }]}>{order.items.length} SKUs</Text>
                      <Text style={[styles.td, { width: 120, textAlign: 'right', fontWeight: '800' }]}>₹{order.totalAmount.toLocaleString('en-IN')}</Text>
                      <View style={{ width: 110, alignItems: 'center' }}>
                        <Chip
                          compact
                          textStyle={{ fontSize: 10, fontWeight: '800', color: order.status === 'received' ? '#16A34A' : order.status === 'paid' ? '#059669' : '#D97706' }}
                          style={{ backgroundColor: order.status === 'received' ? '#DCFCE7' : order.status === 'paid' ? '#D1FAE5' : '#FEF3C7' }}
                        >
                          {order.status.toUpperCase()}
                        </Chip>
                      </View>
                      <View style={{ width: 140, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                        {order.status === 'ordered' && (
                          <Button mode="contained" buttonColor="#16A34A" compact onPress={() => handleReceiveGoods(order)}>
                            Receive Goods
                          </Button>
                        )}
                        {order.paidAmount < order.totalAmount && (
                          <Button
                            mode="outlined"
                            compact
                            onPress={() => {
                              setSelectedPOForPayment(order);
                              setPaymentAmount((order.totalAmount - order.paidAmount).toString());
                              setShowPaymentModal(true);
                            }}
                          >
                            Pay
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

      {/* Tab 2: Suppliers */}
      {activeTab === 'suppliers' && (
        <Card style={styles.tableCard} elevation={0}>
          <Card.Content style={{ padding: 0 }}>
            {suppliers.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="domain" size={48} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Suppliers Registered</Text>
                <Text style={styles.emptySub}>Add distributor companies and ingredient vendors with GSTIN and phone.</Text>
                <Button mode="contained" buttonColor="#16A34A" onPress={() => setShowSupplierModal(true)} style={{ marginTop: 12 }}>
                  + Register First Supplier
                </Button>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: 850 }}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.th, { width: 220 }]}>Supplier Name</Text>
                    <Text style={[styles.th, { width: 140 }]}>Contact Person</Text>
                    <Text style={[styles.th, { width: 120 }]}>Phone</Text>
                    <Text style={[styles.th, { width: 140 }]}>GSTIN</Text>
                    <Text style={[styles.th, { width: 130, textAlign: 'right' }]}>Payables (Dena)</Text>
                  </View>

                  {suppliers.map(supp => (
                    <View key={supp.id} style={styles.tableRow}>
                      <View style={{ width: 220 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#1E293B' }}>{supp.name}</Text>
                        <Text style={{ fontSize: 11, color: '#64748B' }}>{supp.category}</Text>
                      </View>
                      <Text style={[styles.td, { width: 140 }]}>{supp.contactPerson || '—'}</Text>
                      <Text style={[styles.td, { width: 120, fontWeight: '600' }]}>+91 {supp.phone}</Text>
                      <Text style={[styles.td, { width: 140, fontFamily: 'monospace', fontSize: 11 }]}>{supp.gstin || 'Unregistered'}</Text>
                      <Text style={[styles.td, { width: 130, textAlign: 'right', fontWeight: '800', color: supp.outstandingPayable > 0 ? '#DC2626' : '#16A34A' }]}>
                        ₹{supp.outstandingPayable.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Modal: Register Supplier */}
      <Portal>
        <Dialog visible={showSupplierModal} onDismiss={() => setShowSupplierModal(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Register Supplier</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Supplier / Company Name *"
              value={suppName}
              onChangeText={setSuppName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Contact Person Name"
              value={suppContact}
              onChangeText={setSuppContact}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Contact Mobile Number *"
              value={suppPhone}
              onChangeText={setSuppPhone}
              keyboardType="phone-pad"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Supplier GSTIN"
              value={suppGstin}
              onChangeText={setSuppGstin}
              autoCapitalize="characters"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Business Address"
              value={suppAddress}
              onChangeText={setSuppAddress}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSupplierModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#16A34A" onPress={handleSaveSupplier} loading={savingSupplier}>
              Save Supplier
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Modal: Create PO */}
      <Portal>
        <Dialog visible={showPOModal} onDismiss={() => setShowPOModal(false)} style={[styles.dialog, { maxWidth: 620 }]}>
          <Dialog.Title style={styles.dialogTitle}>Create Purchase Order</Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Select Supplier *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {suppliers.map(s => (
                  <Chip
                    key={s.id}
                    selected={poSupplierId === s.id}
                    onPress={() => setPoSupplierId(s.id)}
                    style={{ backgroundColor: poSupplierId === s.id ? '#DBEAFE' : '#F1F5F9' }}
                  >
                    {s.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 4 }}>Add Order Items</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 2 }}>
                <TextInput
                  placeholder="Select Product..."
                  value={catalogProducts.find(p => p.id === selectedProductToAdd)?.name || ''}
                  mode="outlined"
                  dense
                  editable={false}
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
                placeholder="Cost (₹)"
                value={itemCostPrice}
                onChangeText={setItemCostPrice}
                keyboardType="numeric"
                mode="outlined"
                dense
                style={{ width: 100 }}
              />
              <Button mode="contained" buttonColor="#2563EB" compact onPress={handleAddItemToPO}>
                Add
              </Button>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 40, marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {catalogProducts.slice(0, 10).map(p => (
                  <Chip
                    key={p.id}
                    compact
                    onPress={() => {
                      setSelectedProductToAdd(p.id);
                      setItemCostPrice((p.cost_price || p.selling_price * 0.75).toFixed(0));
                    }}
                  >
                    {p.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>

            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, maxHeight: 160, marginBottom: 12 }}>
              {poItems.map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', flex: 1 }}>{item.name} x{item.qty}</Text>
                  <Text style={{ fontSize: 12, color: '#64748B' }}>@₹{item.costPrice}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', marginLeft: 12 }}>₹{item.total.toLocaleString('en-IN')}</Text>
                </View>
              ))}
              {poItems.length === 0 && (
                <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', paddingVertical: 10 }}>No products added to order yet.</Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Total PO Value:</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#16A34A' }}>
                ₹{poItems.reduce((acc, i) => acc + i.total, 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPOModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#2563EB" onPress={handleCreatePO} loading={savingPO}>
              Dispatch Purchase Order
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Modal: Pay Supplier */}
      <Portal>
        <Dialog visible={showPaymentModal} onDismiss={() => setShowPaymentModal(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Record Supplier Payment</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Payment Amount (₹) *"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
            <SegmentedButtons
              value={paymentMode}
              onValueChange={setPaymentMode}
              buttons={[
                { value: 'Bank Transfer / NEFT', label: 'NEFT / Bank' },
                { value: 'Cheque', label: 'Cheque' },
                { value: 'Cash', label: 'Cash' }
              ]}
              style={{ marginBottom: 12 }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaymentModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#16A34A" onPress={handleRecordPayment}>
              Record Payment
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
