import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Platform, Alert } from 'react-native';
import { Text, Card, Button, Surface, Chip, TextInput, Divider, Portal, Dialog, IconButton, Badge, SegmentedButtons } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Print from 'expo-print';
import { useAuth } from '../../providers/AuthProvider';
import { router } from 'expo-router';

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

// 100% Clean initial tables - NO fake orders

export interface RestaurantTableItem {
  id: string;
  name: string;
  capacity: number;
  status: 'occupied' | 'available' | 'reserved' | 'cleaning';
  items?: OrderItem[];
  total?: number;
}

const RESTAURANT_TABLES: RestaurantTableItem[] = [
  { id: 'T1', name: 'T1', capacity: 2, status: 'occupied', items: [], total: 0 },
  { id: 'T2', name: 'T2', capacity: 4, status: 'occupied', items: [
    { id: 'm2', name: 'Paneer Tikka', price: 220, qty: 1 },
    { id: 'm6', name: 'Butter Naan', price: 60, qty: 2 },
    { id: 'm5', name: 'Cold Coffee', price: 140, qty: 1 },
  ], total: 480 },
  { id: 'T3', name: 'T3', capacity: 2, status: 'available', items: [], total: 0 },
  { id: 'T4', name: 'T4', capacity: 6, status: 'reserved', items: [], total: 0 },
  { id: 'T5', name: 'T5', capacity: 4, status: 'available', items: [], total: 0 },
  { id: 'T6', name: 'T6', capacity: 2, status: 'available', items: [], total: 0 },
  { id: 'T7', name: 'T7', capacity: 4, status: 'occupied', items: [], total: 0 },
  { id: 'T8', name: 'T8', capacity: 4, status: 'cleaning', items: [], total: 0 },
  { id: 'T9', name: 'T9', capacity: 4, status: 'available', items: [], total: 0 },
  { id: 'T10', name: 'T10', capacity: 6, status: 'available', items: [], total: 0 },
  { id: 'T11', name: 'T11', capacity: 4, status: 'occupied', items: [], total: 0 },
  { id: 'T12', name: 'T12', capacity: 2, status: 'available', items: [], total: 0 },
];

const CAFE_MENU_ITEMS = [
  { id: 'm1', name: 'Tomato Soup', price: 120, category: 'Starters', icon: 'bowl-mix-outline' },
  { id: 'm2', name: 'Paneer Tikka', price: 220, category: 'Starters', icon: 'food-croissant' },
  { id: 'm3', name: 'Veg Burger', price: 180, category: 'Main Course', icon: 'hamburger' },
  { id: 'm4', name: 'French Fries', price: 90, category: 'Starters', icon: 'french-fries' },
  { id: 'm5', name: 'Cold Coffee', price: 140, category: 'Beverages', icon: 'coffee' },
  { id: 'm6', name: 'Butter Naan', price: 60, category: 'Main Course', icon: 'bread-slice-outline' },
  { id: 'm7', name: 'Caesar Salad', price: 160, category: 'Starters', icon: 'salad' },
  { id: 'm8', name: 'Pizza Margherita', price: 290, category: 'Main Course', icon: 'pizza' },
  { id: 'm9', name: 'Chocolate Brownie', price: 150, category: 'Desserts', icon: 'cake' },
];

const KDS_LIVE_TICKETS = [
  { id: '#KOT-1024', table: 'T3', time: '12 min', items: 'Paneer Tikka x2, Butter Naan x2, Cold Coffee x1', status: 'Preparing', color: '#F59E0B', bg: '#FEF3C7' },
  { id: '#KOT-1025', table: 'T5', time: '8 min', items: 'Veg Burger x2, French Fries x1', status: 'Ready', color: '#10B981', bg: '#D1FAE5' },
  { id: '#KOT-1026', table: 'T7', time: '5 min', items: 'Tomato Soup x1, Caesar Salad x1', status: 'In Progress', color: '#3B82F6', bg: '#DBEAFE' },
  { id: '#KOT-1027', table: 'T9', time: '2 min', items: 'Pizza Margherita x1', status: 'Queued', color: '#94A3B8', bg: '#F1F5F9' },
];

const CLEAN_TABLES: TableData[] = [
  { id: 'T1', name: 'AC 1', section: 'AC Hall', capacity: 4, status: 'vacant', items: [], total: 0 },
  { id: 'T2', name: 'AC 2', section: 'AC Hall', capacity: 2, status: 'vacant', items: [], total: 0 },
  { id: 'T3', name: 'AC 3', section: 'AC Hall', capacity: 6, status: 'vacant', items: [], total: 0 },
  { id: 'T4', name: 'AC 4', section: 'AC Hall', capacity: 4, status: 'vacant', items: [], total: 0 },
  { id: 'T5', name: 'D 1', section: 'Main Dining', capacity: 4, status: 'vacant', items: [], total: 0 },
  { id: 'T6', name: 'D 2', section: 'Main Dining', capacity: 4, status: 'vacant', items: [], total: 0 },
  { id: 'T7', name: 'D 3', section: 'Main Dining', capacity: 8, status: 'vacant', items: [], total: 0 },
  { id: 'T8', name: 'D 4', section: 'Main Dining', capacity: 2, status: 'vacant', items: [], total: 0 },
  { id: 'T9', name: 'G 1', section: 'Garden Patio', capacity: 4, status: 'vacant', items: [], total: 0 },
  { id: 'T10', name: 'G 2', section: 'Garden Patio', capacity: 6, status: 'vacant', items: [], total: 0 },
  { id: 'TK1', name: 'Counter 1', section: 'Takeaway', capacity: 1, status: 'vacant', items: [], total: 0 },
  { id: 'TK2', name: 'Counter 2', section: 'Takeaway', capacity: 1, status: 'vacant', items: [], total: 0 },
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

// Clean HTML printing utility without blank pages
function printSlipHtml(htmlContent: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    let printFrame = document.getElementById('kot-print-iframe') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'kot-print-iframe';
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
      doc.write(htmlContent);
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
  // Mobile app fallback
  Print.printAsync({ html: htmlContent }).catch(err => console.warn('Mobile print error:', err));
}

export default function TablesKOTScreen() {
  const { tenantId } = useAuth();
  const [storeName, setStoreName] = useState('BharatPOS');

  const [tables, setTables] = useState<TableData[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('bharatpos_tables_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          // Auto-clean legacy hardcoded fake data if detected
          const hasOldFake = parsed.some((t: any) => t.orderId === 'ORD-101' || t.orderId === 'ORD-102');
          if (hasOldFake) {
            window.localStorage.setItem('bharatpos_tables_data', JSON.stringify(CLEAN_TABLES));
            return CLEAN_TABLES;
          }
          return parsed;
        }
      } catch (_) {}
    }
    return CLEAN_TABLES;
  });

  const [activeSection, setActiveSection] = useState<string>('All');
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [searchMenu, setSearchMenu] = useState('');
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [waiterName, setWaiterName] = useState('Captain 1');
  const [specialNote, setSpecialNote] = useState('');

  const [diningMode, setDiningMode] = useState<'Dine In' | 'Take Away' | 'Delivery'>('Dine In');
  const [searchTableText, setSearchTableText] = useState('');
  const [searchMenuText, setSearchMenuText] = useState('');
  const [activeMenuCat, setActiveMenuCat] = useState('Starters');
  const [activeKdsFilter, setActiveKdsFilter] = useState('All (5)');
  const [cafeTables, setCafeTables] = useState<any[]>(() => RESTAURANT_TABLES);

  // Auto-select T2 on mount to match reference design
  useEffect(() => {
    const t2 = RESTAURANT_TABLES.find(t => t.id === 'T2');
    if (t2) {
      setSelectedTable(t2 as any);
      setCurrentOrderItems(t2.items || []);
    }
  }, []);


  // Restaurant operational dialogs
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState('2');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetTableId, setTargetTableId] = useState('');
  const [selectedModifier, setSelectedModifier] = useState<'regular' | 'large' | 'cheese'>('regular');

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const sName = window.localStorage.getItem('storeName');
      if (sName) setStoreName(sName);
    }
  }, []);

  // Save changes locally and sync with live dashboard
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
    setWaiterName(table.waiter || 'Captain 1');
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

  // ── Dispatch to Kitchen & Print 80mm KOT Slip ───────────────────
  const handleFireKOT = () => {
    if (!selectedTable || currentOrderItems.length === 0) return;

    const newKotNo = (selectedTable.kotNo || Math.floor(100 + Math.random() * 900));
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

    // Synchronize to Kitchen KDS queue
    if (typeof window !== 'undefined') {
      try {
        const existingKots = JSON.parse(window.localStorage.getItem('bharatpos_live_kots') || '[]');
        const newTicket = {
          id: `kot-${Date.now()}`,
          kotNo: newKotNo,
          table: selectedTable.name,
          section: selectedTable.section,
          waiter: waiterName,
          orderType: selectedTable.section === 'Takeaway' ? 'Takeaway' : 'Dine-In',
          minutesAgo: 0,
          status: 'preparing',
          items: currentOrderItems.map(i => ({ name: i.name, qty: i.qty, done: false, note: i.notes })),
        };
        const filtered = existingKots.filter((k: any) => k.table !== selectedTable.name);
        window.localStorage.setItem('bharatpos_live_kots', JSON.stringify([newTicket, ...filtered]));
      } catch (_) {}
    }

    // 80mm Thermal KOT Slip Layout
    const kotHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>KOT #${newKotNo} - Table ${selectedTable.name}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: monospace, Courier, sans-serif; 
              width: 280px; 
              margin: 0 auto; 
              padding: 12px; 
              color: #000;
              background: #fff;
            }
            .kot-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .kot-title { font-size: 18px; font-weight: 900; margin: 0; }
            .kot-table { font-size: 20px; font-weight: 900; margin: 4px 0; border: 2px solid #000; padding: 2px 4px; display: inline-block; }
            .meta { font-size: 11px; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
            th { border-bottom: 1px solid #000; padding: 4px 0; text-align: left; }
            td { padding: 6px 0; border-bottom: 1px dotted #888; }
            .qty { text-align: right; font-weight: 900; font-size: 16px; }
            .note { font-size: 10px; font-style: italic; color: #333; margin-top: 2px; }
            .footer { border-top: 2px dashed #000; margin-top: 10px; padding-top: 6px; text-align: center; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="kot-header">
            <div class="kot-title">*** KITCHEN ORDER TICKET ***</div>
            <div class="kot-table">TABLE: ${selectedTable.name}</div>
            <div class="meta">Section: <b>${selectedTable.section}</b> | KOT: <b>#${newKotNo}</b></div>
            <div class="meta">Server: <b>${waiterName}</b> | Time: <b>${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</b></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ITEM NAME</th>
                <th style="text-align: right;">QTY</th>
              </tr>
            </thead>
            <tbody>
              ${currentOrderItems.map(i => `
                <tr>
                  <td>
                    <b>${i.name}</b>
                    ${i.notes ? `<div class="note">👉 Instruction: ${i.notes}</div>` : ''}
                  </td>
                  <td class="qty">x${i.qty}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Total Items to Cook: <b>${currentOrderItems.reduce((acc, i) => acc + i.qty, 0)}</b><br/>
            Kitchen Dispatch Station • BharatPOS
          </div>
        </body>
      </html>
    `;

    printSlipHtml(kotHtml);
    Alert.alert('KOT Fired!', `KOT #${newKotNo} sent to Chef station for Table ${selectedTable.name}.`);
    setShowOrderModal(false);
  };

  // ── Print Final Tax Bill & Settle Table ────────────────────────
  const handlePrintTableBill = () => {
    if (!selectedTable || currentOrderItems.length === 0) return;

    const total = calculateOrderTotal();
    const gstRate = 0.05; // 5% restaurant GST
    const subtotal = Math.round(total / (1 + gstRate));
    const gstAmount = total - subtotal;
    const billNo = `TBL-${selectedTable.name.replace(/\s+/g, '')}-${Date.now().toString().slice(-4)}`;

    const billHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Bill - Table ${selectedTable.name}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              width: 290px; 
              margin: 0 auto; 
              padding: 12px; 
              color: #1e293b; 
              background: #fff;
            }
            .header { text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 8px; margin-bottom: 8px; }
            .store-name { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
            .sub { font-size: 11px; color: #64748b; margin: 2px 0; }
            .inv-box { display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
            th { border-bottom: 1px solid #cbd5e1; padding: 4px 0; text-align: left; font-size: 11px; }
            td { padding: 5px 0; border-bottom: 1px dotted #e2e8f0; }
            .totals { margin-top: 8px; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 12px; }
            .t-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand { font-size: 16px; font-weight: 900; color: #0f172a; border-top: 2px solid #0f172a; padding-top: 6px; margin-top: 6px; }
            .footer { text-align: center; margin-top: 12px; font-size: 10px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="store-name">${storeName}</h1>
            <p class="sub">Dine-In Restaurant & Cafe</p>
            <div class="inv-box"><span>Bill No: <b>${billNo}</b></span> <span>Table: <b>${selectedTable.name}</b></span></div>
            <div class="inv-box"><span>Date: ${new Date().toLocaleDateString('en-IN')}</span> <span>Server: ${waiterName}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">Item</th>
                <th style="text-align: center; width: 15%;">Qty</th>
                <th style="text-align: right; width: 15%;">Rate</th>
                <th style="text-align: right; width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${currentOrderItems.map(i => `
                <tr>
                  <td><b>${i.name}</b></td>
                  <td style="text-align: center;">${i.qty}</td>
                  <td style="text-align: right;">₹${i.price}</td>
                  <td style="text-align: right;">₹${i.price * i.qty}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div class="t-row"><span>Subtotal:</span> <span>₹${subtotal.toLocaleString('en-IN')}</span></div>
            <div class="t-row"><span>CGST (2.5%):</span> <span>₹${(gstAmount / 2).toFixed(2)}</span></div>
            <div class="t-row"><span>SGST (2.5%):</span> <span>₹${(gstAmount / 2).toFixed(2)}</span></div>
            <div class="t-row grand"><span>GRAND TOTAL:</span> <span>₹${total.toLocaleString('en-IN')}</span></div>
          </div>
          <div class="footer">
            Thank you for dining with us!<br/>
            Visit Again • Powered by BharatPOS
          </div>
        </body>
      </html>
    `;

    printSlipHtml(billHtml);

    // Save digital invoice so /invoice page also renders this bill
    const invoicePayload = {
      billNo: billNo,
      storeName: storeName || 'BharatPOS Restaurant',
      storeAddress: '',
      gstNum: '',
      isGst: true,
      date: new Date().toLocaleDateString('en-IN'),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      payMethod: 'Dine-In',
      custName: `Table ${selectedTable.name}`,
      custPhone: '',
      custGstin: '',
      items: currentOrderItems.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        gst_pct: 5
      })),
      subtotal: subtotal,
      discount: 0,
      gstAmount: gstAmount,
      finalTotal: total,
      createdAt: new Date().toISOString()
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const storedInvoices = JSON.parse(window.localStorage.getItem('bharatpos_invoices') || '{}');
        storedInvoices[billNo] = invoicePayload;
        window.localStorage.setItem('bharatpos_invoices', JSON.stringify(storedInvoices));
        window.localStorage.setItem('bharatpos_last_bill', JSON.stringify(invoicePayload));
      } catch (_) {}
    }

    // Update table status to billed
    const billedTable: TableData = {
      ...selectedTable,
      status: 'billed',
    };
    setTables(prev => prev.map(t => t.id === selectedTable.id ? billedTable : t));
    setSelectedTable(billedTable);
    Alert.alert('Bill Generated!', `Customer Bill printed for Table ${selectedTable.name}.`);
  };

  const handleSettleTable = () => {
    if (!selectedTable) return;
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
    
    // Clear from kitchen KDS
    if (typeof window !== 'undefined') {
      try {
        const existingKots = JSON.parse(window.localStorage.getItem('bharatpos_live_kots') || '[]');
        const filtered = existingKots.filter((k: any) => k.table !== selectedTable.name);
        window.localStorage.setItem('bharatpos_live_kots', JSON.stringify(filtered));
      } catch (_) {}
    }

    setShowOrderModal(false);
    Alert.alert('Table Vacated', `Table ${selectedTable.name} is now clean, vacant and ready for new guests.`);
  };

  // ── Transfer Active Table to Another Table ──────────────────────────────
  const handleTransferTable = () => {
    if (!selectedTable || !targetTableId) return;
    const target = tables.find(t => t.id === targetTableId);
    if (!target) return;

    if (target.status !== 'vacant') {
      Alert.alert('Target Occupied', `Table ${target.name} is currently occupied. Please choose a vacant table.`);
      return;
    }

    const transferredTarget: TableData = {
      ...target,
      status: selectedTable.status,
      items: selectedTable.items,
      total: selectedTable.total,
      kotNo: selectedTable.kotNo,
      waiter: selectedTable.waiter,
      startTime: selectedTable.startTime,
    };

    const vacatedSource: TableData = {
      ...selectedTable,
      status: 'vacant',
      items: [],
      total: 0,
      kotNo: undefined,
      orderId: undefined,
      startTime: undefined,
    };

    setTables(prev => prev.map(t => {
      if (t.id === target.id) return transferredTarget;
      if (t.id === selectedTable.id) return vacatedSource;
      return t;
    }));

    // Update KDS queue with new table name
    if (typeof window !== 'undefined') {
      try {
        const existingKots = JSON.parse(window.localStorage.getItem('bharatpos_live_kots') || '[]');
        const updated = existingKots.map((k: any) => k.table === selectedTable.name ? { ...k, table: target.name } : k);
        window.localStorage.setItem('bharatpos_live_kots', JSON.stringify(updated));
      } catch (_) {}
    }

    setShowTransferModal(false);
    setShowOrderModal(false);
    setSelectedTable(null);
    Alert.alert('Table Transferred', `Order successfully transferred from ${selectedTable.name} to ${target.name}.`);
  };

  // ── Split Bill Slip Printing ─────────────────────────────────────────────
  const handleSplitBillPrint = () => {
    if (!selectedTable || currentOrderItems.length === 0) return;
    const total = calculateOrderTotal();
    const count = parseInt(splitCount) || 2;
    const splitAmount = Math.round((total / count) * 100) / 100;

    let splitHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Split Bill - Table ${selectedTable.name}</title>
          <style>
            @page { margin: 0; }
            body { font-family: -apple-system, sans-serif; width: 280px; margin: 0 auto; padding: 12px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
            .title { font-size: 16px; font-weight: 900; }
            .meta { font-size: 11px; color: #475569; margin: 3px 0; }
            .split-box { border: 1.5px solid #000; padding: 8px; margin: 10px 0; text-align: center; border-radius: 6px; }
            .split-val { font-size: 20px; font-weight: 900; color: #16a34a; }
            .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${storeName}</div>
            <div class="meta">Table: <b>${selectedTable.name}</b> | Equal Split (${count} Guests)</div>
            <div class="meta">Total Bill: <b>₹${total.toLocaleString('en-IN')}</b></div>
          </div>
          <div class="split-box">
            <div style="font-size: 11px; text-transform: uppercase;">Amount Due Per Guest:</div>
            <div class="split-val">₹${splitAmount.toLocaleString('en-IN')}</div>
          </div>
          <div class="footer">
            Thank you for dining! Powered by BharatPOS
          </div>
        </body>
      </html>
    `;

    printSlipHtml(splitHtml);
    setShowSplitModal(false);
    Alert.alert('Split Bill Printed', `Bill split into ${count} equal shares of ₹${splitAmount} each.`);
  };

  const handleResetAllTables = () => {
    Alert.alert(
      'Reset All Tables',
      'Free up all tables and clear kitchen queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Floor',
          style: 'destructive',
          onPress: () => {
            setTables(CLEAN_TABLES);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('bharatpos_tables_data', JSON.stringify(CLEAN_TABLES));
              window.localStorage.setItem('bharatpos_live_kots', '[]');
            }
            Alert.alert('Floor Cleared', 'All 12 dining tables are now completely vacant.');
          }
        }
      ]
    );
  };

  const handleLoadSampleOrder = () => {
    const sample = [...CLEAN_TABLES];
    sample[0] = {
      id: 'T1',
      name: 'AC 1',
      section: 'AC Hall',
      capacity: 4,
      status: 'occupied',
      orderId: 'DEMO-01',
      kotNo: 101,
      waiter: 'Rohan',
      startTime: '5 mins ago',
      items: [
        { id: 'm1', name: 'Chicken Biryani Special', price: 320, qty: 1 },
        { id: 'm5', name: 'Butter Tandoori Naan', price: 45, qty: 2 }
      ],
      total: 410,
    };
    setTables(sample);
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

  const tableSubtotal = currentOrderItems.reduce((acc, i) => acc + (i.price * i.qty), 0);
  const serviceCharge = tableSubtotal * 0.05;
  const cgst = tableSubtotal * 0.025;
  const sgst = tableSubtotal * 0.025;
  const tableFinalTotal = tableSubtotal + serviceCharge + cgst + sgst;

  const printCurrentOrderBill = () => {
    const billHtml = `
      <div style="font-family: monospace; width: 260px; padding: 10px;">
        <h2 style="text-align: center; margin: 0;">Sunrise Cafe</h2>
        <p style="text-align: center; margin: 2px 0;">Table: ${selectedTable?.name || 'T3'} (Dine In)</p>
        <hr/>
        ${currentOrderItems.map(i => `<div>${i.name} x${i.qty} - ₹${i.price * i.qty}</div>`).join('')}
        <hr/>
        <div>Subtotal: ₹${tableSubtotal.toFixed(2)}</div>
        <div>Service (5%): ₹${serviceCharge.toFixed(2)}</div>
        <div>CGST (2.5%): ₹${cgst.toFixed(2)}</div>
        <div>SGST (2.5%): ₹${sgst.toFixed(2)}</div>
        <div style="font-weight: bold; font-size: 16px;">TOTAL: ₹${tableFinalTotal.toFixed(2)}</div>
      </div>
    `;
    printSlipHtml(billHtml);
  };

  return (
    <ScrollView style={styles.darkMainContainer} showsVerticalScrollIndicator={false}>
      {/* ── 1. Top Sub-Navigation: Dining Mode Pills & Table Search ── */}
      <View style={styles.topDiningModeRow}>
        <View style={styles.diningModePillsWrap}>
          {(['Dine In', 'Take Away', 'Delivery'] as const).map((mode) => {
            const isActive = diningMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.diningPillBtn,
                  isActive && styles.diningPillBtnActive
                ]}
                onPress={() => setDiningMode(mode)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.diningPillText,
                  isActive && styles.diningPillTextActive
                ]}>
                  {mode}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Table Search Input */}
        <View style={styles.darkTableSearchWrap}>
          <Icon name="magnify" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search table..."
            placeholderTextColor="#64748B"
            value={searchTableText}
            onChangeText={setSearchTableText}
            style={styles.darkTableSearchInput}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
          />
        </View>
      </View>

      {/* ── 2. Middle Row: Table Floor Grid & Right Order Drawer ── */}
      <View style={styles.middleCafeColumnsRow}>
        {/* Left / Center: Floor Plan + Kitchen Display */}
        <View style={styles.cafeFloorAndKdsCol}>
          {/* Table Floor Grid (4 columns) */}
          <View style={styles.tableFloorGrid}>
            {cafeTables
              .filter(t => !searchTableText || t.name.toLowerCase().includes(searchTableText.toLowerCase()))
              .map((t) => {
                const isSelected = selectedTable?.id === t.id;
                let cardBg = '#1E293B';
                let badgeColor = '#10B981';
                let statusLabel = 'Available';
                let borderColor = '#334155';

                if (t.status === 'occupied') {
                  cardBg = 'rgba(239, 68, 68, 0.12)';
                  badgeColor = '#EF4444';
                  statusLabel = 'Occupied';
                  borderColor = 'rgba(239, 68, 68, 0.35)';
                } else if (t.status === 'reserved') {
                  cardBg = 'rgba(245, 158, 11, 0.12)';
                  badgeColor = '#F59E0B';
                  statusLabel = 'Reserved';
                  borderColor = 'rgba(245, 158, 11, 0.35)';
                } else if (t.status === 'cleaning') {
                  cardBg = 'rgba(59, 130, 246, 0.12)';
                  badgeColor = '#3B82F6';
                  statusLabel = 'Cleaning';
                  borderColor = 'rgba(59, 130, 246, 0.35)';
                } else {
                  cardBg = 'rgba(16, 185, 129, 0.1)';
                  badgeColor = '#10B981';
                  statusLabel = 'Available';
                  borderColor = 'rgba(16, 185, 129, 0.25)';
                }

                if (isSelected) {
                  borderColor = '#10B981';
                  cardBg = 'rgba(16, 185, 129, 0.22)';
                }

                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.cafeTableCard,
                      { backgroundColor: cardBg, borderColor: borderColor },
                      isSelected && { borderWidth: 2 }
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedTable(t as any);
                      setCurrentOrderItems(t.items || []);
                    }}
                  >
                    <Text style={[styles.cafeTableNum, { color: badgeColor }]}>{t.name}</Text>
                    <Text style={styles.cafeTableGuests}>{t.capacity} Guests</Text>
                    <View style={[styles.cafeTableStatusBadge, { backgroundColor: `${badgeColor}20` }]}>
                      <Text style={[styles.cafeTableStatusText, { color: badgeColor }]}>{statusLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>

          {/* Kitchen Display Live Section */}
          <View style={styles.kdsSectionContainer}>
            <View style={styles.kdsHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.kdsMainHeading}>Kitchen Display</Text>
                <Text style={styles.kdsPendingBadge}>Pending Orders (3)</Text>
              </View>
              <View style={styles.kdsFilterPillsRow}>
                {['All (5)', 'Starters (1)', 'Main Course (3)', 'Beverages (1)'].map((tab, idx) => {
                  const active = activeKdsFilter === tab;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.kdsTabPill, active && styles.kdsTabPillActive]}
                      onPress={() => setActiveKdsFilter(tab)}
                    >
                      <Text style={[styles.kdsTabText, active && styles.kdsTabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* KOT Tickets List */}
            <View style={styles.kdsTicketList}>
              {KDS_LIVE_TICKETS.map((kot) => (
                <View key={kot.id} style={styles.kdsTicketRow}>
                  <View style={styles.kotLeftInfo}>
                    <Text style={styles.kotIdText}>{kot.id}</Text>
                    <View style={styles.kotTableBadge}>
                      <Text style={styles.kotTableBadgeText}>{kot.table}</Text>
                    </View>
                    <Text style={styles.kotTimeElapsed}>{kot.time}</Text>
                  </View>
                  <Text style={styles.kotItemsSummary} numberOfLines={1}>{kot.items}</Text>
                  <View style={[styles.kotStatusBadge, { backgroundColor: kot.bg }]}>
                    <Text style={[styles.kotStatusText, { color: kot.color }]}>{kot.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Right Column: Menu Quick Add & Order Summary */}
        <View style={styles.cafeRightDrawerCol}>
          {/* Table Header Pill */}
          <View style={styles.activeTableHeaderCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.activeTableTitle}>{selectedTable?.name || 'T3'} - Table {selectedTable?.id?.replace('T', '') || '3'}</Text>
              <Text style={styles.activeTableGuests}>  ·  {selectedTable?.capacity || 4} Guests</Text>
            </View>
            <View style={styles.dineInBadgeGreen}>
              <Text style={styles.dineInBadgeGreenText}>{diningMode}</Text>
            </View>
          </View>

          {/* Search Menu Input */}
          <View style={styles.darkMenuSearchWrap}>
            <Icon name="magnify" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Search menu items..."
              placeholderTextColor="#64748B"
              value={searchMenuText}
              onChangeText={setSearchMenuText}
              style={styles.darkMenuSearchInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
            />
          </View>

          {/* Menu Category Pills */}
          <View style={styles.cafeMenuCategoryRow}>
            {['Starters', 'Main Course', 'Beverages', 'Desserts'].map((cat) => {
              const active = activeMenuCat === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.cafeMenuCatPill, active && styles.cafeMenuCatPillActive]}
                  onPress={() => setActiveMenuCat(cat)}
                >
                  <Text style={[styles.cafeMenuCatText, active && styles.cafeMenuCatTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Menu Quick Add List */}
          <View style={styles.cafeMenuItemsList}>
            {CAFE_MENU_ITEMS
              .filter(m => activeMenuCat === 'All' || m.category === activeMenuCat)
              .filter(m => !searchMenuText || m.name.toLowerCase().includes(searchMenuText.toLowerCase()))
              .slice(0, 5)
              .map((m) => (
                <View key={m.id} style={styles.cafeMenuItemRow}>
                  <View style={styles.cafeMenuImgWrap}>
                    <Icon name={m.icon} size={20} color="#F97316" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cafeMenuName}>{m.name}</Text>
                    <Text style={styles.cafeMenuPrice}>₹{m.price}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.cafeMenuPlusBtn}
                    onPress={() => addItemToOrder(m as any)}
                  >
                    <Icon name="plus" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
          </View>

          {/* Order Summary Drawer */}
          <View style={styles.cafeOrderSummaryBox}>
            <View style={styles.orderSummaryHeader}>
              <Text style={styles.orderSummaryTitle}>Order Summary</Text>
              <TouchableOpacity onPress={() => setCurrentOrderItems([])}>
                <Text style={styles.orderSummaryClear}>Clear</Text>
              </TouchableOpacity>
            </View>

            {/* Line Items */}
            <ScrollView style={{ maxHeight: 110 }} showsVerticalScrollIndicator={false}>
              {currentOrderItems.map((item) => (
                <View key={item.id} style={styles.cafeOrderLineItem}>
                  <Text style={styles.cafeOrderLineName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cafeOrderLineQty}>x{item.qty}</Text>
                  <Text style={styles.cafeOrderLinePrice}>₹{item.price * item.qty}</Text>
                </View>
              ))}
              {currentOrderItems.length === 0 && (
                <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center', paddingVertical: 10 }}>
                  Tap dishes above to add to table KOT
                </Text>
              )}
            </ScrollView>

            <Divider style={{ marginVertical: 6, backgroundColor: '#334155' }} />

            {/* Calculations Breakdown */}
            <View style={styles.cafeCalcRow}>
              <Text style={styles.cafeCalcLabel}>Subtotal</Text>
              <Text style={styles.cafeCalcVal}>₹{tableSubtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.cafeCalcRow}>
              <Text style={styles.cafeCalcLabel}>Service Charge (5%)</Text>
              <Text style={styles.cafeCalcVal}>₹{serviceCharge.toFixed(2)}</Text>
            </View>
            <View style={styles.cafeCalcRow}>
              <Text style={styles.cafeCalcLabel}>CGST (2.5%)</Text>
              <Text style={styles.cafeCalcVal}>₹{cgst.toFixed(2)}</Text>
            </View>
            <View style={styles.cafeCalcRow}>
              <Text style={styles.cafeCalcLabel}>SGST (2.5%)</Text>
              <Text style={styles.cafeCalcVal}>₹{sgst.toFixed(2)}</Text>
            </View>
            <Divider style={{ marginVertical: 6, backgroundColor: '#334155' }} />
            <View style={[styles.cafeCalcRow, { marginBottom: 10 }]}>
              <Text style={styles.cafeTotalLabel}>Total</Text>
              <Text style={styles.cafeTotalVal}>₹{tableFinalTotal.toFixed(2)}</Text>
            </View>

            {/* Send to Kitchen CTA (Emerald Green) */}
            <TouchableOpacity
              style={styles.sendToKitchenBtn}
              activeOpacity={0.8}
              onPress={handleFireKOT}
            >
              <Text style={styles.sendToKitchenBtnText}>Send to Kitchen</Text>
            </TouchableOpacity>

            {/* Hold, Print, Save Sub-actions */}
            <View style={styles.cafeSubActionsRow}>
              <TouchableOpacity style={styles.cafeSubBtn} onPress={() => Alert.alert('Order Held', 'Table order kept on hold')}>
                <Icon name="pause" size={13} color="#94A3B8" />
                <Text style={styles.cafeSubBtnText}>Hold</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cafeSubBtn} onPress={() => printCurrentOrderBill()}>
                <Icon name="printer" size={13} color="#94A3B8" />
                <Text style={styles.cafeSubBtnText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cafeSubBtn} onPress={() => Alert.alert('Saved', 'Order saved successfully')}>
                <Icon name="content-save" size={13} color="#94A3B8" />
                <Text style={styles.cafeSubBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* ── 3. Bottom Key Features Strip ── */}
      <Surface style={styles.cafeKeyFeaturesFooter} elevation={0}>
        <Text style={styles.cafeFooterHeading}>Cafe / Restaurant POS – Key Features</Text>
        <View style={styles.cafeFeaturesRow}>
          {[
            { title: 'Table Management\n& Floor Plan', icon: 'table-furniture' },
            { title: 'KOT & Kitchen\nDisplay System', icon: 'chef-hat' },
            { title: 'Menu & Modifiers\n(Recipes / Food Costing)', icon: 'silverware-clean' },
            { title: 'Online Orders\n(Delivery / Takeaway)', icon: 'moped' },
            { title: 'Inventory &\nIngredient Tracking', icon: 'clipboard-list-outline' },
            { title: 'Billing & Split Bill\n(Payments)', icon: 'credit-card-outline' },
          ].map((f, i) => (
            <View key={i} style={styles.cafeFeaturePill}>
              <View style={styles.cafeFeatureIconWrap}>
                <Icon name={f.icon} size={16} color="#F97316" />
              </View>
              <Text style={styles.cafeFeaturePillText}>{f.title}</Text>
            </View>
          ))}
        </View>
      </Surface>

      {/* 4. Table KOT Order & Billing Modal */}
      <Portal>
        <Dialog visible={showOrderModal} onDismiss={() => setShowOrderModal(false)} style={styles.orderDialog}>
          <Dialog.Title style={styles.dialogHeader}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>
                  {selectedTable?.name} ({selectedTable?.section})
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B' }}>
                  Server: <b>{waiterName}</b> • Status: <b style={{ textTransform: 'capitalize' }}>{selectedTable?.status.replace('_', ' ')}</b>
                </Text>
              </View>
              <IconButton icon="close" size={20} onPress={() => setShowOrderModal(false)} />
            </View>
          </Dialog.Title>

          <Dialog.Content style={styles.dialogBody}>
            <View style={styles.splitOrderView}>
              {/* Left: Food Catalog Picker */}
              <View style={styles.catalogColumn}>
                <TextInput
                  mode="outlined"
                  placeholder="Search dishes, drinks, breads..."
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
                      <View style={{ flex: 1 }}>
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

              {/* Right: Active KOT Items */}
              <View style={styles.activeOrderColumn}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 }}>
                  KOT Ticket Items ({currentOrderItems.reduce((a, b) => a + b.qty, 0)})
                </Text>

                <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                  {currentOrderItems.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                      <Icon name="food-off" size={32} color="#CBD5E1" />
                      <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 8 }}>No items added yet. Click dishes on left.</Text>
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
                          <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{item.qty}</Text>
                          <IconButton icon="plus" size={14} onPress={() => updateItemQty(item.id, 1)} />
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                <TextInput
                  mode="outlined"
                  placeholder="Kitchen special note (e.g. less spicy, extra raita)"
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

          <Dialog.Actions style={{ paddingHorizontal: 20, paddingBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            {selectedTable?.status !== 'vacant' && (
              <>
                <Button
                  mode="outlined"
                  textColor="#475569"
                  style={{ borderColor: '#CBD5E1' }}
                  icon="swap-horizontal"
                  onPress={() => setShowTransferModal(true)}
                >
                  Transfer Table
                </Button>
                <Button
                  mode="outlined"
                  textColor="#7C3AED"
                  style={{ borderColor: '#DDD6FE' }}
                  icon="call-split"
                  onPress={() => setShowSplitModal(true)}
                >
                  Split Bill
                </Button>
                <Button
                  mode="outlined"
                  textColor="#DC2626"
                  style={{ borderColor: '#FCA5A5' }}
                  onPress={handleSettleTable}
                >
                  Vacate Table
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#2563EB"
                  icon="receipt"
                  onPress={handlePrintTableBill}
                  disabled={currentOrderItems.length === 0}
                >
                  Print Customer Bill
                </Button>
              </>
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

      {/* 5. Transfer Table Dialog */}
      <Portal>
        <Dialog visible={showTransferModal} onDismiss={() => setShowTransferModal(false)} style={styles.dialogSmall}>
          <Dialog.Title style={{ fontSize: 16, fontWeight: '800' }}>
            Transfer Order from {selectedTable?.name}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
              Select a vacant dining table to transfer this active order and KOT.
            </Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {tables.filter(t => t.status === 'vacant').map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.targetTableItem,
                    targetTableId === t.id && styles.targetTableItemActive
                  ]}
                  onPress={() => setTargetTableId(t.id)}
                >
                  <Text style={{ fontWeight: '700' }}>{t.name} ({t.section})</Text>
                  <Chip compact style={{ backgroundColor: '#DCFCE7' }}>Vacant ({t.capacity}p)</Chip>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTransferModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#2563EB" onPress={handleTransferTable} disabled={!targetTableId}>
              Transfer Order
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 6. Split Bill Dialog */}
      <Portal>
        <Dialog visible={showSplitModal} onDismiss={() => setShowSplitModal(false)} style={styles.dialogSmall}>
          <Dialog.Title style={{ fontSize: 16, fontWeight: '800' }}>
            Split Bill — Table {selectedTable?.name}
          </Dialog.Title>
          <Dialog.Content>
            <Text style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
              Total Order Value: <Text style={{ fontWeight: '800' }}>₹{calculateOrderTotal().toLocaleString('en-IN')}</Text>
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6 }}>Number of Guests / Shares:</Text>
            <SegmentedButtons
              value={splitCount}
              onValueChange={setSplitCount}
              buttons={[
                { value: '2', label: '2 Guests' },
                { value: '3', label: '3 Guests' },
                { value: '4', label: '4 Guests' },
                { value: '5', label: '5 Guests' }
              ]}
              style={{ marginBottom: 16 }}
            />
            <View style={{ backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#64748B' }}>Amount per guest:</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#16A34A', marginTop: 4 }}>
                ₹{(Math.round((calculateOrderTotal() / (parseInt(splitCount) || 2)) * 100) / 100).toLocaleString('en-IN')}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSplitModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor="#7C3AED" icon="printer" onPress={handleSplitBillPrint}>
              Print Split Receipts
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  posModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  modeBannerSub: {
    fontSize: 11,
    color: '#15803D',
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
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  headerStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  statPillText: {
    fontSize: 12,
    color: '#334155',
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  sectionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTabActive: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  sectionTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
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
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  tableCardOccupied: {
    borderColor: '#FDE68A',
  },
  tableCardKotFired: {
    borderColor: '#DDD6FE',
  },
  tableCardBilled: {
    borderColor: '#BFDBFE',
  },
  tableCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  tableCardMiddle: {
    height: 60,
    justifyContent: 'center',
  },
  vacantState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  vacantStateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  occupiedState: {
    justifyContent: 'center',
  },
  kotBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7E22CE',
  },
  orderTime: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  itemSummary: {
    fontSize: 11.5,
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
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  totalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionIndicatorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderDialog: {
    maxWidth: 720,
    width: '95%',
    maxHeight: '90%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  dialogHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  dialogBody: {
    paddingHorizontal: 20,
    maxHeight: 460,
  },
  splitOrderView: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  catalogColumn: {
    flex: 1,
    minWidth: 260,
  },
  activeOrderColumn: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuItemCategory: {
    fontSize: 10.5,
    color: '#64748B',
  },
  menuItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },
  orderItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dialogSmall: {
    maxWidth: 440,
    width: '90%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  targetTableItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  targetTableItemActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },

  // ── Cafe Dark Theme Styles ──
  darkMainContainer: {
    flex: 1,
    backgroundColor: '#090E17',
  },
  topDiningModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexWrap: 'wrap',
    gap: 12,
  },
  diningModePillsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  diningPillBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  diningPillBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FEF3C7',
  },
  diningPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  diningPillTextActive: {
    color: '#0F172A',
  },
  darkTableSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    height: 34,
    width: 180,
  },
  darkTableSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#F1F5F9',
    backgroundColor: 'transparent',
    height: 34,
  },
  middleCafeColumnsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 14,
    flexWrap: 'wrap',
  },
  cafeFloorAndKdsCol: {
    flex: 2.1,
    minWidth: 320,
  },
  tableFloorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  cafeTableCard: {
    width: '23%',
    minWidth: 90,
    flexGrow: 1,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cafeTableNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  cafeTableGuests: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 6,
  },
  cafeTableStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cafeTableStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  kdsSectionContainer: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
  },
  kdsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  kdsMainHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  kdsPendingBadge: {
    fontSize: 11,
    color: '#F97316',
    fontWeight: '700',
    marginLeft: 8,
  },
  kdsFilterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  kdsTabPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  kdsTabPillActive: {
    backgroundColor: '#334155',
  },
  kdsTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  kdsTabTextActive: {
    color: '#F1F5F9',
    fontWeight: '700',
  },
  kdsTicketList: {
    gap: 8,
  },
  kdsTicketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
  },
  kotLeftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kotIdText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  kotTableBadge: {
    backgroundColor: '#334155',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  kotTableBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F97316',
  },
  kotTimeElapsed: {
    fontSize: 10,
    color: '#64748B',
  },
  kotItemsSummary: {
    flex: 1,
    fontSize: 11,
    color: '#CBD5E1',
    marginHorizontal: 10,
  },
  kotStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  kotStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cafeRightDrawerCol: {
    flex: 1.1,
    minWidth: 280,
  },
  activeTableHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  activeTableTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  activeTableGuests: {
    fontSize: 11,
    color: '#94A3B8',
  },
  dineInBadgeGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dineInBadgeGreenText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
  },
  darkMenuSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 10,
    height: 34,
    marginBottom: 8,
  },
  darkMenuSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#F1F5F9',
    backgroundColor: 'transparent',
    height: 34,
  },
  cafeMenuCategoryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  cafeMenuCatPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  cafeMenuCatPillActive: {
    backgroundColor: '#F97316',
  },
  cafeMenuCatText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cafeMenuCatTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  cafeMenuItemsList: {
    gap: 6,
    marginBottom: 12,
  },
  cafeMenuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 8,
  },
  cafeMenuImgWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cafeMenuName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  cafeMenuPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 1,
  },
  cafeMenuPlusBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cafeOrderSummaryBox: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
  },
  orderSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  orderSummaryClear: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  cafeOrderLineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  cafeOrderLineName: {
    flex: 1,
    fontSize: 11,
    color: '#CBD5E1',
  },
  cafeOrderLineQty: {
    fontSize: 11,
    color: '#94A3B8',
    marginHorizontal: 8,
  },
  cafeOrderLinePrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  cafeCalcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cafeCalcLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  cafeCalcVal: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  cafeTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  cafeTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10B981',
  },
  sendToKitchenBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sendToKitchenBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cafeSubActionsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cafeSubBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingVertical: 6,
    gap: 4,
  },
  cafeSubBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  cafeKeyFeaturesFooter: {
    margin: 16,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
  },
  cafeFooterHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F97316',
    marginBottom: 12,
  },
  cafeFeaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  cafeFeaturePill: {
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  cafeFeatureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cafeFeaturePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CBD5E1',
    textAlign: 'center',
  },

});
