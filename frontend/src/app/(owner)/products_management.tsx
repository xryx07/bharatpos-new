import React, { useState, useEffect } from 'react';

import { useAuth } from '../../providers/AuthProvider';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, Platform } from 'react-native';
import { Text, useTheme, Card, DataTable, Button, IconButton, TextInput } from 'react-native-paper';
import { db, isFirebaseConfigured, auth } from '../../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, doc, updateDoc, deleteDoc } from '../../lib/firestore_adapter';
import { useAppTheme } from '../../providers/ThemeProvider';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cleanAndMapCategory } from '../../lib/ui_helpers';
import { DS } from '../../constants/designTokens';

const DEFAULT_PRODUCTS_LIST = [
  { id: 'p1', name: 'Amul Butter 100g', category: 'Groceries', stock_qty: 45, stock: 45, selling_price: 52, price: 52, mrp: 56, status: 'Active', barcode: '8901262010053' },
  { id: 'p2', name: 'Britannia Marie Gold 250g', category: 'Biscuits', stock_qty: 32, stock: 32, selling_price: 35, price: 35, mrp: 38, status: 'Active', barcode: '8901063012016' },
  { id: 'p3', name: 'Tata Tea Premium 250g', category: 'Beverages', stock_qty: 18, stock: 18, selling_price: 120, price: 120, mrp: 135, status: 'Active', barcode: '8901052000017' },
  { id: 'p4', name: 'Maggi Noodles 70g', category: 'Snacks', stock_qty: 56, stock: 56, selling_price: 14, price: 14, mrp: 14, status: 'Active', barcode: '8901058852276' },
  { id: 'p5', name: 'Surf Excel 1kg', category: 'Household', stock_qty: 24, stock: 24, selling_price: 125, price: 125, mrp: 140, status: 'Active', barcode: '8901030704405' },
  { id: 'p6', name: 'Dove Soap', category: 'Soap', stock_qty: 40, stock: 40, selling_price: 45, price: 45, mrp: 50, status: 'Active', barcode: '8901396112203' },
];

export default function ProductsManagementScreen() {
  const { tenantId, loading: authLoading } = useAuth();

  const { isDarkMode, toggleTheme } = useAppTheme();
  const appTheme = useTheme();

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
    return DEFAULT_PRODUCTS_LIST;
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawInvoiceText, setRawInvoiceText] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [fileLoadingMsg, setFileLoadingMsg] = useState('');
  const [showDriveModal, setShowDriveModal] = useState(false);

  // Add Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addBarcode, setAddBarcode] = useState('');
  const [addMrp, setAddMrp] = useState('');
  const [addSellingPrice, setAddSellingPrice] = useState('');
  const [addCostPrice, setAddCostPrice] = useState('');
  const [addStockQty, setAddStockQty] = useState('10');
  const [addGstPct, setAddGstPct] = useState('18');
  const [savingAdd, setSavingAdd] = useState(false);

  // Generate EAN-13 barcode helper
  const handleGenerateBarcode = () => {
    let hash = 0;
    const seedStr = tenantId || 'store';
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash + seedStr.charCodeAt(i)) % 10000;
    }
    const storePrefix = hash.toString().padStart(4, '0');
    const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
    const base = '890' + storePrefix + randomDigits;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(base.charAt(i)) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const finalBarcode = base + checkDigit;
    setAddBarcode(finalBarcode);
  };

  const handleSaveAddProduct = async () => {
    if (!addName.trim() || !addSellingPrice.trim()) {
      Alert.alert('Validation Error', 'Product Name and Selling Price are required.');
      return;
    }

    setSavingAdd(true);
    try {
      let finalBarcode = addBarcode.trim();
      if (!finalBarcode) {
        let hash = 0;
        const seedStr = tenantId || 'store';
        for (let i = 0; i < seedStr.length; i++) {
          hash = (hash + seedStr.charCodeAt(i)) % 10000;
        }
        const storePrefix = hash.toString().padStart(4, '0');
        const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
        const base = '890' + storePrefix + randomDigits;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          sum += parseInt(base.charAt(i)) * (i % 2 === 0 ? 1 : 3);
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        finalBarcode = base + checkDigit;
      }

      await addDoc(collection(db, 'products'), {
        tenant_id: tenantId,
        name: addName.trim(),
        category: addCategory.trim() || 'General',
        barcode: finalBarcode,
        mrp: parseFloat(addMrp) || parseFloat(addSellingPrice) || 0,
        selling_price: parseFloat(addSellingPrice) || 0,
        price: parseFloat(addSellingPrice) || 0,
        cost_price: parseFloat(addCostPrice) || (parseFloat(addSellingPrice) * 0.8) || 0,
        stock_qty: parseInt(addStockQty) || 0,
        stock_quantity: parseInt(addStockQty) || 0,
        stock: parseInt(addStockQty) || 0,
        gst_pct: parseFloat(addGstPct) || 0,
        created_at: new Date().toISOString()
      });

      Alert.alert('Success', `Product "${addName}" added successfully!`);
      setShowAddModal(false);
      setAddName('');
      setAddCategory('');
      setAddBarcode('');
      setAddMrp('');
      setAddSellingPrice('');
      setAddCostPrice('');
      setAddStockQty('10');
      setAddGstPct('18');
      fetchProducts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add product.');
    } finally {
      setSavingAdd(false);
    }
  };

  // Editing state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editMrp, setEditMrp] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editStockQty, setEditStockQty] = useState('');
  const [editGstPct, setEditGstPct] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  const handleQueueBarcode = (prod: any) => {
    if (typeof window === 'undefined') return;
    try {
      const existingQueueStr = window.localStorage.getItem('barcode_print_queue');
      let queue: any[] = [];
      if (existingQueueStr) queue = JSON.parse(existingQueueStr);
      const idx = queue.findIndex((item: any) => item.id === prod.id);
      if (idx > -1) {
        queue[idx].copies = (queue[idx].copies || 0) + 24;
      } else {
        queue.push({
          id: prod.id,
          name: prod.name,
          barcode: prod.barcode || `AUTO-${prod.id.substring(0, 8).toUpperCase()}`,
          category: prod.category,
          price: String(prod.selling_price || prod.mrp || 0),
          copies: 24,
        });
      }
      window.localStorage.setItem('barcode_print_queue', JSON.stringify(queue));
      Alert.alert('Label Queued', `Added 24 barcode stickers for "${prod.name}" to Print Queue!`);
    } catch (e) {
      Alert.alert('Error', 'Failed to update barcode print queue.');
    }
  };

  // Preloaded Templates for testing
  const INVOICE_TEMPLATES = [
    {
      name: "Britannia Wholesaler Invoice (3 SKUs)",
      text: "Britannia Marie Gold 250g, 40, 35.00, 28.00, 8901063023245\nBritannia 50-50 Maska Chaska, 50, 25.00, 20.00, 8901063030311\nBritannia Bourbon 150g, 30, 40.00, 32.00, 8901063141222"
    },
    {
      name: "Maggi & Nestle Invoice (3 SKUs)",
      text: "Maggi Noodles 70g | Qty: 100 | MRP: 14.00 | Cost: 11.50 | Barcode: 8901058002316\nNestle KitKat 38g | Qty: 50 | MRP: 25.00 | Cost: 20.00 | Barcode: 8901058860718\nNescafe Classic Coffee 50g | Qty: 20 | MRP: 160.00 | Cost: 130.00 | Barcode: 8901058190013"
    },
    {
      name: "HUL Soap & Detergents Invoice (3 SKUs)",
      text: "Dettol Liquid Soap 200ml - Qty: 25 - MRP: 99 - Cost: 80 - Barcode: 8901396326124\nSurf Excel Easy Wash 1kg - Qty: 15 - MRP: 140 - Cost: 112 - Barcode: 8901030752536\nVim Liquid Gel 250ml - Qty: 30 - MRP: 55 - Cost: 44 - Barcode: 8901030683410"
    }
  ];

  // Binary content checker
  const isBinaryText = (txt: string) => {
    if (!txt) return false;
    if (txt.startsWith('%PDF-') || txt.includes('\uFFFD')) return true;
    const sample = txt.slice(0, 500);
    const nonAscii = sample.replace(/[\x20-\x7E\r\n\t]/g, '').length;
    return nonAscii > (sample.length * 0.15);
  };

  // Real-time parsing helper with strict binary filtering & clean table parsing
  const parsedItems = React.useMemo(() => {
    if (!rawInvoiceText.trim() || isBinaryText(rawInvoiceText)) return [];
    const lines = rawInvoiceText.split('\n');
    const items: any[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 4) return;
      
      // Skip binary garbage lines
      if (trimmed.includes('\uFFFD') || (trimmed.replace(/[\x20-\x7E]/g, '').length > 5)) return;

      // Skip common table headers
      const lower = trimmed.toLowerCase();
      if (lower.includes('product name') || lower.includes('item description') || lower.includes('invoice bill') || lower.includes('total gst') || lower.startsWith('---') || lower.startsWith('===')) {
        return;
      }
      
      // 1. Try CSV format: Name, Qty, MRP, Cost, Barcode
      const csvParts = trimmed.split(',').map(s => s.trim());
      if (csvParts.length >= 3) {
        const name = csvParts[0];
        const qty = parseInt(csvParts[1]) || 0;
        const mrp = parseFloat(csvParts[2]) || 0;
        const cost = csvParts[3] ? parseFloat(csvParts[3]) : mrp * 0.8;
        const barcode = csvParts[4] || '';
        if (name && name.length >= 3 && !isNaN(qty) && qty > 0 && !isNaN(mrp) && mrp > 0) {
          // Validate name contains valid alphabet characters
          if (/[a-zA-Z]/.test(name)) {
            items.push({ name, qty, mrp, cost, barcode });
            return;
          }
        }
      }
      
      // 2. Try Key-Value / Pipeline delimited format: Name | Qty: 10 | MRP: 50 | Barcode: ...
      const barcodeMatch = trimmed.match(/\b(890\d{10}|\d{8,14})\b/);
      const barcode = barcodeMatch ? barcodeMatch[0] : '';
      
      const qtyMatch = trimmed.match(/(?:qty|quantity|units|items|pcs|x)\s*[:\-\s]*\s*(\d+)/i);
      const mrpMatch = trimmed.match(/(?:mrp|selling|price|m\.r\.p\.|rate)\s*[:\-\s]*\s*(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)/i);
      const costMatch = trimmed.match(/(?:cost|purchase|wholesale)\s*[:\-\s]*\s*(?:₹|Rs\.?\s*)?(\d+(?:\.\d+)?)/i);
      
      if (qtyMatch || mrpMatch) {
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        const mrp = mrpMatch ? parseFloat(mrpMatch[1]) : 0;
        const cost = costMatch ? parseFloat(costMatch[1]) : (mrp > 0 ? mrp * 0.8 : 0);
        
        let name = trimmed
          .replace(barcode, '')
          .replace(/(?:qty|quantity|units|items|pcs|x)\s*[:\-\s]*\s*\d+/gi, '')
          .replace(/(?:mrp|selling|price|m\.r\.p\.|rate)\s*[:\-\s]*\s*(?:₹|Rs\.?\s*)?\d+(?:\.\d+)?/gi, '')
          .replace(/(?:cost|purchase|wholesale)\s*[:\-\s]*\s*(?:₹|Rs\.?\s*)?\d+(?:\.\d+)?/gi, '')
          .replace(/^[0-9]+[.)\-\s]+/, '')
          .replace(/[|\-,;]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
          
        if (name.length >= 3 && /[a-zA-Z]/.test(name) && mrp > 0) {
          items.push({ name, qty, mrp, cost, barcode });
        }
      }
    });
    return items;
  }, [rawInvoiceText]);

  const handleImportSubmit = async () => {
    if (parsedItems.length === 0) {
      Alert.alert('No Items Found', 'Please enter or select a valid item list to import.');
      return;
    }
    
    setIsImporting(true);
    try {
      for (const item of parsedItems) {
        // Map category dynamically based on name
        let category = 'Grocery';
        const nameLower = item.name.toLowerCase();
        if (nameLower.includes('tea') || nameLower.includes('coffee') || nameLower.includes('juice') || nameLower.includes('drink')) {
          category = 'Beverages';
        } else if (nameLower.includes('biscuit') || nameLower.includes('cookie') || nameLower.includes('chips') || nameLower.includes('noodles') || nameLower.includes('bhujia') || nameLower.includes('snacks')) {
          category = 'Snacks';
        } else if (nameLower.includes('soap') || nameLower.includes('wash') || nameLower.includes('paste') || nameLower.includes('shampoo') || nameLower.includes('gel')) {
          category = 'Personal Care';
        } else if (nameLower.includes('detergent') || nameLower.includes('clean') || nameLower.includes('vim') || nameLower.includes('surf')) {
          category = 'Cleaning';
        } else if (nameLower.includes('butter') || nameLower.includes('milk') || nameLower.includes('cheese')) {
          category = 'Dairy';
        }

        // Generate EAN-13 barcode if missing
        let finalBarcode = item.barcode;
        if (!finalBarcode) {
          let hash = 0;
          const seedStr = tenantId || 'random';
          for (let i = 0; i < seedStr.length; i++) {
            hash = (hash + seedStr.charCodeAt(i)) % 10000;
          }
          const storePrefix = hash.toString().padStart(4, '0');
          const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
          const base = '890' + storePrefix + randomDigits;
          let sum = 0;
          for (let i = 0; i < 12; i++) {
            sum += parseInt(base.charAt(i)) * (i % 2 === 0 ? 1 : 3);
          }
          const checkDigit = (10 - (sum % 10)) % 10;
          finalBarcode = base + checkDigit;
        }

        await addDoc(collection(db, 'products'), {
          name: item.name,
          category: category,
          barcode: finalBarcode,
          mrp: item.mrp,
          selling_price: item.mrp, // Default selling price to MRP
          stock_qty: item.qty,
          gst_pct: 18, // Default 18% GST for imported invoice items
          tenant_id: tenantId || 'anonymous',
          created_at: new Date().toISOString()
        });
      }
      
      Alert.alert('Import Successful', `Successfully imported ${parsedItems.length} items to your product list!`);
      setShowImportModal(false);
      setRawInvoiceText('');
      fetchProducts();
    } catch (e: any) {
      Alert.alert('Import Failed', e.message || 'An error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  // Dynamic PDF.js worker loading for real PDF parsing
  const loadPdfJS = () => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not defined.'));
        return;
      }
      if ((window as any).pdfjsLib) {
        resolve((window as any).pdfjsLib);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js script.'));
      document.body.appendChild(script);
    });
  };

  const handleRealFileUpload = async (accept: string) => {
    if (typeof document === 'undefined') return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = accept;
    
    fileInput.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      setIsFileLoading(true);
      setFileLoadingMsg(`Reading file "${file.name}"...`);

      try {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          setFileLoadingMsg(`Parsing PDF text content...`);
          const reader = new FileReader();
          reader.onload = async (evt: any) => {
            try {
              const arrayBuffer = evt.target.result as ArrayBuffer;
              const pdfjsLib: any = await loadPdfJS();
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              
              let extractedText = '';
              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                extractedText += pageText + '\n';
              }

              if (!extractedText.trim()) {
                throw new Error('No readable text found in PDF. Make sure it is not a scanned image.');
              }

              setRawInvoiceText(extractedText);
              Alert.alert('PDF Parsing Success', `Extracted text from "${file.name}" successfully!`);
            } catch (err: any) {
              Alert.alert('PDF Parsing Error', err.message || 'Failed to extract text from the PDF file.');
            } finally {
              setIsFileLoading(false);
            }
          };
          reader.readAsArrayBuffer(file);
        } else {
          // Standard CSV / Text files
          const reader = new FileReader();
          reader.onload = (evt: any) => {
            const text = evt.target.result;
            if (isBinaryText(text)) {
              setIsFileLoading(false);
              Alert.alert(
                'Invalid File Format',
                'This file contains binary or unreadable data. Please upload a standard text PDF, CSV spreadsheet, or Excel file.'
              );
              setRawInvoiceText('');
              return;
            }
            setRawInvoiceText(text);
            setIsFileLoading(false);
            Alert.alert('File Upload Success', `Loaded "${file.name}" successfully!`);
          };
          reader.readAsText(file);
        }
      } catch (err: any) {
        Alert.alert('File Upload Error', err.message || 'Failed to read the file.');
        setIsFileLoading(false);
      }
    };

    fileInput.click();
  };

  const handleDriveImport = async (driveUrl: string) => {
    if (!driveUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid Google Drive file/sheet share link.');
      return;
    }

    let fileId = '';
    const sheetMatch = driveUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const idMatch = driveUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (sheetMatch) {
      fileId = sheetMatch[1];
    } else if (idMatch) {
      fileId = idMatch[1];
    } else {
      fileId = driveUrl.trim(); // assume direct file ID
    }

    setShowDriveModal(false);
    setIsFileLoading(true);
    setFileLoadingMsg(`Downloading file from Google Drive...`);

    try {
      // 1. Try fetching as exported Google Sheet (CSV format)
      const exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
      const response = await fetch(exportUrl);
      if (!response.ok) {
        // 2. Fallback to direct raw file download
        const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        const resp2 = await fetch(directUrl);
        if (!resp2.ok) {
          throw new Error('Failed to retrieve Google Drive file. Ensure the file is shared publicly as "Anyone with link".');
        }
        const text = await resp2.text();
        setRawInvoiceText(text);
      } else {
        const csvText = await response.text();
        setRawInvoiceText(csvText);
      }
      Alert.alert('Google Drive Sync Success', 'Successfully fetched and imported file content!');
    } catch (e: any) {
      Alert.alert('Google Drive Error', e.message || 'Failed to fetch the file.');
    } finally {
      setIsFileLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && tenantId) {
      fetchProducts();
    }
  }, [authLoading, tenantId]);

  const fetchProducts = async () => {
    if (!isFirebaseConfigured) return;
    try {
      if (!tenantId) return;
      const q = query(
        collection(db, 'products'),
        where('tenant_id', '==', tenantId)
      );
      const snapshot = await getDocs(q);
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      productsData.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      const finalProducts = productsData.length > 0 ? productsData : DEFAULT_PRODUCTS_LIST;
      setProducts(finalProducts);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem('cachedProductsList', JSON.stringify(finalProducts));
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleDeleteProduct = (product: any) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${product.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'products', product.id));
              Alert.alert("Success", "Product deleted successfully");
              fetchProducts();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete product");
            }
          }
        }
      ]
    );
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setEditName(product.name || '');
    setEditCategory(product.category || '');
    setEditBarcode(product.barcode || '');
    setEditMrp(String(product.mrp || ''));
    setEditSellingPrice(String(product.selling_price || ''));
    setEditStockQty(String(product.stock_qty || '0'));
    setEditGstPct(String(product.gst_pct || '0'));
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (!editName.trim() || !editSellingPrice.trim()) {
      Alert.alert("Validation Error", "Product Name and Selling Price are required");
      return;
    }
    setSavingEdit(true);
    try {
      await updateDoc(doc(db, 'products', editingProduct.id), {
        name: editName,
        category: editCategory,
        barcode: editBarcode,
        mrp: parseFloat(editMrp) || parseFloat(editSellingPrice),
        selling_price: parseFloat(editSellingPrice),
        stock_qty: parseInt(editStockQty) || 0,
        gst_pct: parseFloat(editGstPct) || 0
      });
      Alert.alert("Success", "Product updated successfully");
      setEditingProduct(null);
      fetchProducts();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update product");
    } finally {
      setSavingEdit(false);
    }
  };

  // Metrics Computations
  const totalSkus = products.length;
  const totalStockUnits = products.reduce((acc, p) => acc + (p.stock_qty || 0), 0);
  const inventoryValue = products.reduce((acc, p) => acc + ((p.selling_price || 0) * (p.stock_qty || 0)), 0);
  const lowStockAlerts = products.filter(p => (p.stock_qty || 0) <= 5).length;

  const categoriesList = ['All', 'Groceries', 'Beverages', 'Snacks', 'Dairy', 'Personal Care', 'Bakery', 'General'];

  // Filtered list
  const filteredProducts = products.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q);

    const matchesCat = selectedCategory === 'All' ||
      (p.category || '').toLowerCase() === selectedCategory.toLowerCase();

    let matchesStock = true;
    if (selectedStockFilter === 'in_stock') matchesStock = (p.stock_qty || 0) > 5;
    else if (selectedStockFilter === 'low_stock') matchesStock = (p.stock_qty || 0) > 0 && (p.stock_qty || 0) <= 5;
    else if (selectedStockFilter === 'out_of_stock') matchesStock = (p.stock_qty || 0) <= 0;

    return matchesSearch && matchesCat && matchesStock;
  });

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.title}>Products & Price Catalog</Text>
              <View style={styles.proTag}>
                <Text style={styles.proTagText}>PETPOOJA SUITE</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Unified master catalog with barcode generator & wholesaler bill parser</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button 
              mode="outlined" 
              onPress={() => setShowImportModal(true)} 
              style={[styles.actionBtn, { borderColor: '#16A34A' }]}
              contentStyle={{ paddingHorizontal: 12, height: 42 }}
              textColor="#16A34A"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="file-import-outline" size={18} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: 13 }}>Import Bill</Text>
              </View>
            </Button>
            <Button 
              mode="contained" 
              onPress={() => { handleGenerateBarcode(); setShowAddModal(true); }} 
              style={[styles.actionBtn, { backgroundColor: '#16A34A' }]}
              contentStyle={{ paddingHorizontal: 14, height: 42 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="plus" size={18} color="white" style={{ marginRight: 6 }} />
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Add Product</Text>
              </View>
            </Button>
          </View>
        </View>

        {/* ── KPI Summary Cards ───────────────────────────────────────── */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>TOTAL SKUs</Text>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Icon name="package-variant-closed" size={18} color="#16A34A" />
              </View>
            </View>
            <Text style={styles.kpiVal}>{totalSkus}</Text>
            <Text style={styles.kpiFoot}>Active catalog items</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>STOCK UNITS</Text>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Icon name="archive-outline" size={18} color="#0284C7" />
              </View>
            </View>
            <Text style={styles.kpiVal}>{totalStockUnits.toLocaleString('en-IN')}</Text>
            <Text style={styles.kpiFoot}>Units across all godowns</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>CATALOG VALUATION</Text>
              <View style={[styles.kpiIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Icon name="currency-inr" size={18} color="#7C3AED" />
              </View>
            </View>
            <Text style={styles.kpiVal}>₹{Math.round(inventoryValue).toLocaleString('en-IN')}</Text>
            <Text style={styles.kpiFoot}>At selling price</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <Text style={styles.kpiLabel}>LOW STOCK ALERT</Text>
              <View style={[styles.kpiIconWrap, { backgroundColor: lowStockAlerts > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                <Icon name="alert-circle-outline" size={18} color={lowStockAlerts > 0 ? '#DC2626' : '#16A34A'} />
              </View>
            </View>
            <Text style={[styles.kpiVal, { color: lowStockAlerts > 0 ? '#DC2626' : '#16A34A' }]}>{lowStockAlerts}</Text>
            <Text style={styles.kpiFoot}>{lowStockAlerts > 0 ? 'Need immediate restocking' : 'All stocks healthy'}</Text>
          </View>
        </View>

        {/* ── Search & Filter Toolbar ─────────────────────────────────── */}
        <View style={styles.toolbarCard}>
          {/* Search Bar */}
          <View style={styles.searchWrap}>
            <Icon name="magnify" size={20} color="#64748B" style={{ marginLeft: 14 }} />
            <TextInput
              placeholder="Search by Product Name, Barcode, or Category..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8, marginRight: 8 }}>
                <Icon name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Chips: Categories & Stock Status */}
          <View style={styles.filterRows}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
              {categoriesList.map(cat => {
                const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Stock Filters */}
            <View style={styles.stockFilters}>
              {[
                { id: 'all', label: `All (${products.length})` },
                { id: 'in_stock', label: 'In Stock' },
                { id: 'low_stock', label: 'Low Stock' },
                { id: 'out_of_stock', label: 'Out of Stock' },
              ].map(tab => {
                const active = selectedStockFilter === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setSelectedStockFilter(tab.id as any)}
                    style={[styles.stockTab, active && styles.stockTabActive]}
                  >
                    <Text style={[styles.stockTabText, active && styles.stockTabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Products Table ──────────────────────────────────────────── */}
        <Card style={styles.card} elevation={0}>
          <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === 'web'}>
            <View style={{ minWidth: 1040, width: '100%' }}>
              <DataTable>
                <DataTable.Header style={styles.tableHeader}>
                  <DataTable.Title style={{ flex: 3.2 }}><Text style={styles.colHeader}>PRODUCT NAME & SKU</Text></DataTable.Title>
                  <DataTable.Title style={{ flex: 2 }}><Text style={styles.colHeader}>CATEGORY</Text></DataTable.Title>
                  <DataTable.Title numeric style={{ flex: 1.5 }}><Text style={styles.colHeader}>MRP / SELLING</Text></DataTable.Title>
                  <DataTable.Title numeric style={{ flex: 1.2 }}><Text style={styles.colHeader}>STOCK</Text></DataTable.Title>
                  <DataTable.Title style={{ flex: 1.8, justifyContent: 'center' }}><Text style={styles.colHeader}>STATUS</Text></DataTable.Title>
                  <DataTable.Title numeric style={{ flex: 2 }}><Text style={styles.colHeader}>ACTIONS</Text></DataTable.Title>
                </DataTable.Header>

                {filteredProducts.map((item) => {
                  const isOutOfStock = item.stock_qty <= 0;
                  const isLowStock = item.stock_qty > 0 && item.stock_qty <= 5;

                  const statusLabel = isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock';
                  const statusBg = isOutOfStock ? '#FEF2F2' : isLowStock ? '#FFFBEB' : '#F0FDF4';
                  const statusBorder = isOutOfStock ? '#FEE2E2' : isLowStock ? '#FEF3C7' : '#DCFCE7';
                  const statusColor = isOutOfStock ? '#DC2626' : isLowStock ? '#D97706' : '#16A34A';
                  const statusDot = isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#10B981';

                  return (
                    <DataTable.Row key={item.id} style={styles.tableRow}>
                      <DataTable.Cell style={{ flex: 3.2 }}>
                        <View style={{ paddingVertical: 8 }}>
                          <Text style={styles.cellMainText}>{item.name}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <View style={styles.skuPill}>
                              <Icon name="barcode" size={12} color="#64748B" />
                              <Text style={styles.skuText}>{item.barcode || 'NO-SKU'}</Text>
                            </View>
                            {item.gst_pct ? (
                              <View style={styles.gstPill}>
                                <Text style={styles.gstText}>GST {item.gst_pct}%</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ flex: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={styles.catIconCircle}>
                            <Icon name={cleanAndMapCategory(item.category || '').icon} size={14} color="#16A34A" />
                          </View>
                          <Text style={styles.cellSubText}>{cleanAndMapCategory(item.category || '').cleanName}</Text>
                        </View>
                      </DataTable.Cell>

                      <DataTable.Cell numeric style={{ flex: 1.5 }}>
                        <View style={{ alignItems: 'flex-end', paddingVertical: 8 }}>
                          <Text style={styles.priceMain}>₹{Number(item.selling_price || item.price || 0).toFixed(2)}</Text>
                          {item.mrp && item.mrp > item.selling_price ? (
                            <Text style={styles.priceStrike}>MRP ₹{Number(item.mrp).toFixed(2)}</Text>
                          ) : null}
                        </View>
                      </DataTable.Cell>

                      <DataTable.Cell numeric style={{ flex: 1.2 }}>
                        <Text style={[styles.stockCountText, { color: isOutOfStock ? '#DC2626' : '#0F172A' }]}>
                          {item.stock_qty || 0}
                        </Text>
                      </DataTable.Cell>

                      <DataTable.Cell style={{ flex: 1.8, justifyContent: 'center' }}>
                        <View style={[styles.statusPill, { backgroundColor: statusBg, borderColor: statusBorder }]}>
                          <View style={[styles.statusDot, { backgroundColor: statusDot }]} />
                          <Text style={[styles.statusText, { color: statusColor }]}>
                            {statusLabel}
                          </Text>
                        </View>
                      </DataTable.Cell>

                      <DataTable.Cell numeric style={{ flex: 2 }}>
                        <View style={styles.actionRow}>
                          <TouchableOpacity
                            style={styles.actionPillBtn}
                            onPress={() => handleQueueBarcode(item)}
                            accessibilityLabel="Queue Barcode"
                          >
                            <Icon name="barcode" size={15} color="#2563EB" />
                            <Text style={styles.actionPillText}>Tag</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.iconActionBtn, { backgroundColor: '#F1F5F9' }]}
                            onPress={() => openEditModal(item)}
                          >
                            <Icon name="pencil" size={16} color="#475569" />
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.iconActionBtn, { backgroundColor: '#FEE2E2' }]}
                            onPress={() => handleDeleteProduct(item)}
                          >
                            <Icon name="delete-outline" size={16} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </DataTable.Cell>
                    </DataTable.Row>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <View style={styles.emptyStateContainer}>
                    <Text style={styles.emptyStateIcon}>🔍</Text>
                    <Text style={styles.emptyStateTitle}>No products matching criteria</Text>
                    <Text style={styles.emptyStateText}>
                      {products.length === 0
                        ? 'No items in catalog yet. Click Add Product or Import Bill to populate.'
                        : 'Try adjusting your search terms or clearing category filters.'}
                    </Text>
                    {products.length > 0 && (
                      <Button
                        mode="outlined"
                        onPress={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedStockFilter('all'); }}
                        style={{ borderRadius: 8, borderColor: '#16A34A' }}
                        textColor="#16A34A"
                      >
                        Reset Filters
                      </Button>
                    )}
                  </View>
                )}
              </DataTable>
            </View>
          </ScrollView>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
      {/* Auto-Import from Purchase Bill / Invoice Dialog */}
      <Modal
        visible={showImportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Auto-Import Product List</Text>
              <IconButton icon="close" size={20} onPress={() => setShowImportModal(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, padding: 20 }}>
              <Text style={styles.modalDesc}>
                Paste your distributor's item list, bill details, or purchase log below. BharatPOS will automatically parse name, quantity, price, and barcode.
              </Text>

              {/* Multi-Input Options */}
              <Text style={styles.sectionLabel}>Select Input Source / Import Option:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <Button 
                  mode="outlined" 
                  icon="google-drive" 
                  onPress={() => setShowDriveModal(true)}
                  style={{ borderColor: '#34A853', borderRadius: 8 }}
                  textColor="#34A853"
                  compact
                >
                  Google Drive Link
                </Button>
                <Button 
                  mode="outlined" 
                  icon="file-pdf-box" 
                  onPress={() => handleRealFileUpload('.pdf')}
                  style={{ borderColor: '#E53935', borderRadius: 8 }}
                  textColor="#E53935"
                  compact
                >
                  PDF Bill
                </Button>
                <Button 
                  mode="outlined" 
                  icon="file-delimited-outline" 
                  onPress={() => handleRealFileUpload('.csv,.txt')}
                  style={{ borderColor: '#43A047', borderRadius: 8 }}
                  textColor="#43A047"
                  compact
                >
                  CSV List
                </Button>
                <Button 
                  mode="outlined" 
                  icon="camera-outline" 
                  onPress={() => handleRealFileUpload('image/*')}
                  style={{ borderColor: '#F57C00', borderRadius: 8 }}
                  textColor="#F57C00"
                  compact
                >
                  Scan Photo (OCR)
                </Button>
              </View>

              {/* Templates */}
              <Text style={styles.sectionLabel}>Select Sample Distributor Template:</Text>
              <View style={styles.templateContainer}>
                {INVOICE_TEMPLATES.map((tmpl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.templateBadge}
                    onPress={() => setRawInvoiceText(tmpl.text)}
                  >
                    <Text style={styles.templateText}>{tmpl.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* File Loading Feedback */}
              {isFileLoading && (
                <Card style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 14 }} elevation={0}>
                  <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                    <ActivityIndicator size="small" color="#10B981" />
                    <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>{fileLoadingMsg}</Text>
                  </Card.Content>
                </Card>
              )}

              {/* Input text area */}
              <TextInput
                label="Invoice Bill / Purchase List Raw Content"
                value={rawInvoiceText}
                onChangeText={setRawInvoiceText}
                mode="outlined"
                multiline
                numberOfLines={6}
                style={styles.textArea}
                placeholder={"Format example:\nBritannia Marie Gold 250g, 40, 35.00, 28.00, 8901063023245\nOR\nMaggi Noodles 70g | Qty: 100 | MRP: 14.00 | Cost: 11.50 | Barcode: 8901058002316"}
              />

              {/* Parser Real-time Preview */}
              {parsedItems.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.sectionLabel}>Parsed Items Preview ({parsedItems.length} found):</Text>
                  <Card style={styles.previewCard} elevation={0}>
                    <DataTable>
                      <DataTable.Header>
                        <DataTable.Title style={{ flex: 2 }}><Text style={styles.previewColHead}>Name</Text></DataTable.Title>
                        <DataTable.Title numeric style={{ flex: 0.8 }}><Text style={styles.previewColHead}>Qty</Text></DataTable.Title>
                        <DataTable.Title numeric style={{ flex: 1 }}><Text style={styles.previewColHead}>MRP</Text></DataTable.Title>
                        <DataTable.Title numeric style={{ flex: 1.2 }}><Text style={styles.previewColHead}>Barcode</Text></DataTable.Title>
                      </DataTable.Header>

                      {parsedItems.map((pItem, idx) => (
                        <DataTable.Row key={idx}>
                          <DataTable.Cell style={{ flex: 2 }}><Text style={styles.previewCellMain}>{pItem.name}</Text></DataTable.Cell>
                          <DataTable.Cell numeric style={{ flex: 0.8 }}><Text style={styles.previewCellSub}>{pItem.qty}</Text></DataTable.Cell>
                          <DataTable.Cell numeric style={{ flex: 1 }}><Text style={styles.previewCellSub}>₹{pItem.mrp.toFixed(2)}</Text></DataTable.Cell>
                          <DataTable.Cell numeric style={{ flex: 1.2 }}><Text style={styles.previewCellBarcode} numberOfLines={1}>{pItem.barcode || 'Auto-Gen'}</Text></DataTable.Cell>
                        </DataTable.Row>
                      ))}
                    </DataTable>
                  </Card>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => { setShowImportModal(false); setRawInvoiceText(''); }}
                style={[styles.modalBtn, { marginRight: 8 }]}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleImportSubmit}
                loading={isImporting}
                disabled={isImporting || parsedItems.length === 0}
                style={styles.modalBtn}
              >
                Add {parsedItems.length} Products to Catalog
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Google Drive Link Input Modal */}
      <Modal
        visible={showDriveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDriveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 500 }]}>
            <View style={[styles.modalHeader, { backgroundColor: '#F0FDF4' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="google-drive" size={24} color="#34A853" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: '#166534' }]}>Import from Google Drive</Text>
              </View>
              <IconButton icon="close" size={20} onPress={() => setShowDriveModal(false)} />
            </View>

            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 12 }}>
                Enter the shareable link of a public Google Spreadsheet or text file. Make sure the file is set to "Anyone with link" can view.
              </Text>

              <TextInput
                label="Public Google Drive Share Link / File ID"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                value={driveUrl}
                onChangeText={setDriveUrl}
                mode="outlined"
                style={{ marginBottom: 16 }}
              />

              <Button 
                mode="contained" 
                onPress={() => handleDriveImport(driveUrl)}
                loading={isFileLoading}
                disabled={isFileLoading || !driveUrl.trim()}
                style={{ borderRadius: 8, backgroundColor: '#34A853', paddingVertical: 4 }}
                contentStyle={{ height: 44 }}
              >
                Sync & Download
              </Button>
            </View>

            <View style={[styles.modalFooter, { backgroundColor: '#F8FAFC' }]}>
              <Button mode="outlined" onPress={() => setShowDriveModal(false)} style={{ borderRadius: 8 }}>
                Cancel
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      
      {/* Add Product Direct Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 520 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="package-variant-plus" size={22} color="#10B981" />
                <Text style={styles.modalTitle}>Add New Product</Text>
              </View>
              <IconButton icon="close" size={20} onPress={() => setShowAddModal(false)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 20 }}>
              <TextInput
                label="Product Name *"
                value={addName}
                onChangeText={setAddName}
                mode="outlined"
                placeholder="e.g. Britannia Marie Gold 250g"
                activeOutlineColor="#10B981"
                outlineColor="#D1D5DB"
                outlineStyle={{ borderRadius: 10 }}
                style={{ height: 44, marginBottom: 12, backgroundColor: '#FFFFFF' }}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TextInput
                  label="Category"
                  value={addCategory}
                  onChangeText={setAddCategory}
                  mode="outlined"
                  placeholder="e.g. Snacks, Dairy, Grocery"
                  activeOutlineColor="#10B981"
                  outlineColor="#D1D5DB"
                  outlineStyle={{ borderRadius: 10 }}
                  style={{ flex: 1, height: 44, backgroundColor: '#FFFFFF' }}
                />
                <TextInput
                  label="Stock Qty"
                  value={addStockQty}
                  onChangeText={setAddStockQty}
                  keyboardType="numeric"
                  mode="outlined"
                  activeOutlineColor="#10B981"
                  outlineColor="#D1D5DB"
                  outlineStyle={{ borderRadius: 10 }}
                  style={{ width: 110, height: 44, backgroundColor: '#FFFFFF' }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TextInput
                  label="Selling Price (₹) *"
                  value={addSellingPrice}
                  onChangeText={setAddSellingPrice}
                  keyboardType="numeric"
                  mode="outlined"
                  placeholder="0.00"
                  activeOutlineColor="#10B981"
                  outlineColor="#D1D5DB"
                  outlineStyle={{ borderRadius: 10 }}
                  style={{ flex: 1, height: 44, backgroundColor: '#FFFFFF' }}
                />
                <TextInput
                  label="MRP (₹)"
                  value={addMrp}
                  onChangeText={setAddMrp}
                  keyboardType="numeric"
                  mode="outlined"
                  placeholder="0.00"
                  activeOutlineColor="#10B981"
                  outlineColor="#D1D5DB"
                  outlineStyle={{ borderRadius: 10 }}
                  style={{ flex: 1, height: 44, backgroundColor: '#FFFFFF' }}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TextInput
                  label="Cost / Wholesale Price (₹)"
                  value={addCostPrice}
                  onChangeText={setAddCostPrice}
                  keyboardType="numeric"
                  mode="outlined"
                  placeholder="0.00"
                  activeOutlineColor="#10B981"
                  outlineColor="#D1D5DB"
                  outlineStyle={{ borderRadius: 10 }}
                  style={{ flex: 1, height: 44, backgroundColor: '#FFFFFF' }}
                />
                <TextInput
                  label="GST %"
                  value={addGstPct}
                  onChangeText={setAddGstPct}
                  keyboardType="numeric"
                  mode="outlined"
                  placeholder="18"
                  activeOutlineColor="#10B981"
                  outlineColor="#D1D5DB"
                  outlineStyle={{ borderRadius: 10 }}
                  style={{ width: 110, height: 44, backgroundColor: '#FFFFFF' }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TextInput
                    label="Barcode (EAN-13)"
                    value={addBarcode}
                    onChangeText={setAddBarcode}
                    mode="outlined"
                    placeholder="Scan or auto-generate"
                    activeOutlineColor="#10B981"
                    outlineColor="#D1D5DB"
                    outlineStyle={{ borderRadius: 10 }}
                    style={{ flex: 1, height: 44, backgroundColor: '#FFFFFF' }}
                  />
                  <Button
                    mode="outlined"
                    icon="barcode"
                    onPress={handleGenerateBarcode}
                    style={{ height: 44, justifyContent: 'center', borderColor: '#10B981', borderRadius: 10, marginTop: 6 }}
                    textColor="#10B981"
                  >
                    Auto-Gen
                  </Button>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowAddModal(false)}
                style={[styles.modalBtn, { marginRight: 8 }]}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                buttonColor="#10B981"
                textColor="#FFFFFF"
                onPress={handleSaveAddProduct}
                loading={savingAdd}
                disabled={savingAdd}
                style={styles.modalBtn}
              >
                Save Product
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        visible={editingProduct !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingProduct(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <IconButton icon="close" size={20} onPress={() => setEditingProduct(null)} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 20 }}>
              <TextInput
                label="Product Name"
                value={editName}
                onChangeText={setEditName}
                mode="outlined"
                activeOutlineColor="#16A34A"
                outlineColor="#D1D5DB"
                outlineStyle={{ borderRadius: 10 }}
                style={{ height: 44, marginBottom: 12, backgroundColor: '#FFFFFF' }}
              />
              <TextInput
                label="Category"
                value={editCategory}
                onChangeText={setEditCategory}
                mode="outlined"
                activeOutlineColor="#16A34A"
                outlineColor="#D1D5DB"
                outlineStyle={{ borderRadius: 10 }}
                style={{ height: 44, marginBottom: 12, backgroundColor: '#FFFFFF' }}
              />
              <TextInput
                label="Barcode"
                value={editBarcode}
                onChangeText={setEditBarcode}
                mode="outlined"
                activeOutlineColor="#16A34A"
                outlineColor="#D1D5DB"
                outlineStyle={{ borderRadius: 10 }}
                style={{ height: 44, marginBottom: 12, backgroundColor: '#FFFFFF' }}
              />
              <TextInput
                label="MRP"
                value={editMrp}
                onChangeText={setEditMrp}
                keyboardType="numeric"
                mode="outlined"
                activeOutlineColor="#16A34A"
                outlineColor="#D1D5DB"
                outlineStyle={{ borderRadius: 10 }}
                style={{ height: 44, marginBottom: 12, backgroundColor: '#FFFFFF' }}
              />
              <TextInput
                label="Selling Price"
                value={editSellingPrice}
                onChangeText={setEditSellingPrice}
                keyboardType="numeric"
                mode="outlined"
                activeOutlineColor="#16A34A"
                outlineColor="#D1D5DB"
                outlineStyle={{ borderRadius: 10 }}
                style={{ height: 44, marginBottom: 12, backgroundColor: '#FFFFFF' }}
              />
              <TextInput
                label="Stock Quantity"
                value={editStockQty}
                onChangeText={setEditStockQty}
                keyboardType="numeric"
                mode="outlined"
                activeOutlineColor="#16A34A"
                outlineColor="#D1D5DB"
                outlineStyle={{ borderRadius: 10 }}
                style={{ height: 44, marginBottom: 12, backgroundColor: '#FFFFFF' }}
              />
              <TextInput
                label="GST Percentage"
                value={editGstPct}
                onChangeText={setEditGstPct}
                keyboardType="numeric"
                mode="outlined"
                activeOutlineColor="#16A34A"
                outlineColor="#D1D5DB"
                outlineStyle={{ borderRadius: 10 }}
                style={{ height: 44, marginBottom: 20, backgroundColor: '#FFFFFF' }}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setEditingProduct(null)}
                style={[styles.modalBtn, { marginRight: 8 }]}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveEdit}
                loading={savingEdit}
                disabled={savingEdit}
                style={styles.modalBtn}
              >
                Save Changes
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  proTag: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  proTagText: { fontSize: 10, fontWeight: '800', color: '#16A34A', letterSpacing: 0.5 },
  actionBtn: { borderRadius: 10 },

  // KPI Row
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kpiLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.6 },
  kpiIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  kpiVal: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  kpiFoot: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  // Toolbar
  toolbarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 13,
    height: 40,
  },
  filterRows: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#16A34A',
    fontWeight: '700',
  },
  stockFilters: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  stockTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stockTabActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  stockTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  stockTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // DataTable Card
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  tableHeader: { backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  colHeader: { fontWeight: '800', color: '#475569', fontSize: 11, letterSpacing: 0.5 },
  tableRow: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  cellMainText: { fontWeight: '700', fontSize: 14, color: '#0F172A' },
  cellSubText: { color: '#475569', fontSize: 13, fontWeight: '500' },
  catIconCircle: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  skuPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  skuText: { fontSize: 11, fontFamily: 'monospace', color: '#64748B', fontWeight: '600' },
  gstPill: { backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  gstText: { fontSize: 10, color: '#7C3AED', fontWeight: '700' },
  priceMain: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  priceStrike: { fontSize: 11, color: '#94A3B8', textDecorationLine: 'line-through' },
  stockCountText: { fontSize: 14, fontWeight: '800' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, alignSelf: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Actions
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  actionPillBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  actionPillText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  iconActionBtn: { width: 30, height: 30, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 620, maxHeight: '88%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  modalDesc: { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 8, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  templateContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  templateBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  templateText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  textArea: { backgroundColor: '#F8FAFC', fontSize: 13, minHeight: 120, textAlignVertical: 'top' },
  previewCard: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden', marginTop: 6, backgroundColor: '#F8FAFC' },
  previewColHead: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  previewCellMain: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  previewCellSub: { fontSize: 12, color: '#64748B' },
  previewCellBarcode: { fontSize: 11, fontFamily: 'monospace', color: '#94A3B8' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  modalBtn: { borderRadius: 10, height: 42, justifyContent: 'center' },

  // Empty State
  emptyStateContainer: { padding: 48, alignItems: 'center', justifyContent: 'center', width: '100%' },
  emptyStateIcon: { fontSize: 36, marginBottom: 12 },
  emptyStateTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  emptyStateText: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16, maxWidth: 360 },
});