import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Package, 
  DollarSign, 
  FileText,
  Sparkles,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Order, Product, CartItem } from '../../types';
import { cn } from '../../lib/utils';

interface GoogleSheetImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onImportOrders: (orders: Order[]) => Promise<number>;
  getNextOrderId: () => string;
}

interface ParsedSheetRow {
  rowNumber: number;
  originalData: Record<string, any>;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  thana: string;
  orderDate: string; // ISO or formatted date
  productName: string;
  productSku: string;
  size: string;
  quantity: number;
  price: number;
  deliveryCharge: number;
  discount: number;
  advancePayment: number;
  total: number;
  paymentMethod: 'cod' | 'bkash' | 'nagad' | 'rocket';
  status: Order['status'];
  notes: string;
  courier: string;
  partner: string;
  isValid: boolean;
  errors: string[];
  matchedProduct?: Product;
}

export const GoogleSheetImporterModal: React.FC<GoogleSheetImporterModalProps> = ({
  isOpen,
  onClose,
  products,
  onImportOrders,
  getNextOrderId
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('link');
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedSheetRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<number, boolean>>({});
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sheetFetchError, setSheetFetchError] = useState<{ message: string; isPermission: boolean } | null>(null);

  if (!isOpen) return null;

  // Smart Date Parser that handles formats like: 03-09-2026, 2026/09/03, 3 Sep 2026, Excel serial numbers, etc.
  const parseFlexibleDate = (rawDate: any): string => {
    if (!rawDate) return new Date().toISOString();
    
    // If it's an Excel numeric serial date (e.g. 46268)
    if (typeof rawDate === 'number') {
      try {
        const parsed = XLSX.SSF.parse_date_code(rawDate);
        if (parsed) {
          const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 12, parsed.M || 0, parsed.S || 0));
          return d.toISOString();
        }
      } catch (e) {}
    }

    const str = String(rawDate).trim();
    if (!str) return new Date().toISOString();

    // Try standard Date.parse
    const timestamp = Date.parse(str);
    if (!isNaN(timestamp)) {
      return new Date(timestamp).toISOString();
    }

    // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 12;
      const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
      const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    // Try YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const d = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    return new Date().toISOString();
  };

  // Convert raw row keys to normalized fields
  const normalizeRowData = (row: Record<string, any>, index: number): ParsedSheetRow => {
    const keys = Object.keys(row);
    const getVal = (possibleKeys: string[]): any => {
      for (const pk of possibleKeys) {
        const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(pk.toLowerCase().replace(/[^a-z0-9]/g, '')));
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
          return row[foundKey];
        }
      }
      return '';
    };

    // Extract fields
    const customerName = String(getVal(['customer name', 'name', 'client', 'customer', 'নাম', 'গ্রাহক']) || '').trim();
    let phone = String(getVal(['phone', 'mobile', 'cell', 'contact', 'নাম্বার', 'ফোন', 'মোবাইল']) || '').trim();
    // Normalize BD phone
    phone = phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('880')) phone = '0' + phone.slice(3);

    const address = String(getVal(['address', 'delivery address', 'location', 'ঠিকানা', 'বাসার ঠিকানা']) || '').trim();
    const city = String(getVal(['city', 'district', 'area', 'শহর', 'জেলা']) || 'Dhaka').trim();
    const thana = String(getVal(['thana', 'upazila', 'থানা', 'উপজেলা']) || '').trim();
    
    // Date
    const rawDate = getVal(['date', 'order date', 'time', 'created at', 'তারিখ', 'অর্ডার তারিখ', 'দিন']);
    const orderDate = parseFlexibleDate(rawDate);

    // Product & Size
    const productName = String(getVal(['product', 'product name', 'item', 'description', 'পণ্য', 'প্রোডাক্ট']) || 'Formal Item').trim();
    const productSku = String(getVal(['sku', 'code', 'product code', 'model', 'কোড', 'এসকেইউ']) || '').trim();
    const size = String(getVal(['size', 'waist', 'dimension', 'সাইজ', 'মাপ']) || '32').trim();
    
    // Quantity
    const rawQty = getVal(['qty', 'quantity', 'count', 'পিস', 'পরিমাণ', 'সংখ্যা']);
    const quantity = Math.max(1, parseInt(String(rawQty).replace(/[^0-9]/g, '') || '1', 10));

    // Pricing
    const rawPrice = getVal(['price', 'unit price', 'item price', 'rate', 'মূল্য', 'দাম']);
    let price = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '') || '0');

    // Delivery Charge
    const rawDc = getVal(['delivery', 'delivery charge', 'shipping', 'ডেলিভারি চার্জ', 'ডেলিভারি']);
    const deliveryCharge = rawDc !== '' ? parseFloat(String(rawDc).replace(/[^0-9.]/g, '') || '0') : (city.toLowerCase().includes('dhaka') ? 80 : 130);

    // Discount & Advance
    const rawDiscount = getVal(['discount', 'ছাড়']);
    const discount = parseFloat(String(rawDiscount).replace(/[^0-9.]/g, '') || '0');

    const rawAdvance = getVal(['advance', 'paid', 'অগ্রিম', 'জমা']);
    const advancePayment = parseFloat(String(rawAdvance).replace(/[^0-9.]/g, '') || '0');

    // Total Calculation
    const calculatedSubtotal = (price > 0 ? price : 1050) * quantity;
    const rawTotal = getVal(['total', 'net total', 'bill', 'সর্বমোট', 'মোট']);
    let total = parseFloat(String(rawTotal).replace(/[^0-9.]/g, '') || '0');
    if (total <= 0) {
      total = calculatedSubtotal + deliveryCharge - discount - advancePayment;
    }
    if (price <= 0) {
      price = Math.round(calculatedSubtotal / quantity);
    }

    // Status
    const rawStatus = String(getVal(['status', 'order status', 'অবস্থা', 'স্ট্যাটাস']) || '').toLowerCase();
    let status: Order['status'] = 'Pending';
    if (rawStatus.includes('deliver') || rawStatus.includes('success') || rawStatus.includes('সাকসেস')) status = 'Delivered';
    else if (rawStatus.includes('ship') || rawStatus.includes('courier') || rawStatus.includes('কুরিয়ার')) status = 'Shipped';
    else if (rawStatus.includes('process') || rawStatus.includes('pack')) status = 'Processing';
    else if (rawStatus.includes('cancel') || rawStatus.includes('বাতিল')) status = 'Cancelled';
    else if (rawStatus.includes('hold') || rawStatus.includes('হোল্ড')) status = 'Hold';
    else if (rawStatus.includes('return') || rawStatus.includes('রিটার্ন')) status = 'Returned';

    // Payment method
    const rawPay = String(getVal(['payment', 'payment method', 'পেমেন্ট']) || '').toLowerCase();
    let paymentMethod: 'cod' | 'bkash' | 'nagad' | 'rocket' = 'cod';
    if (rawPay.includes('bkash') || rawPay.includes('বিকাশ')) paymentMethod = 'bkash';
    else if (rawPay.includes('nagad') || rawPay.includes('নগদ')) paymentMethod = 'nagad';
    else if (rawPay.includes('rocket') || rawPay.includes('রকেট')) paymentMethod = 'rocket';

    // Notes & Courier
    const notes = String(getVal(['note', 'notes', 'remarks', 'comment', 'মন্তব্য', 'নোট']) || '').trim();
    const courier = String(getVal(['courier', 'delivery partner', 'পাঠাও', 'কুরিয়ার']) || 'Pathao').trim();
    const partner = String(getVal(['partner', 'source', 'চ্যানেল', 'সোর্স']) || 'Google Sheet').trim();

    // Match product catalog
    let matchedProduct = products.find(p => 
      (productSku && p.sku && p.sku.toLowerCase() === productSku.toLowerCase()) ||
      (productName && p.name && p.name.toLowerCase() === productName.toLowerCase()) ||
      (productName && p.name && p.name.toLowerCase().includes(productName.toLowerCase()))
    );

    if (!matchedProduct && products.length > 0) {
      matchedProduct = products[0]; // fallback to first item
    }

    const errors: string[] = [];
    if (!customerName) errors.push('Missing customer name');
    if (!phone || phone.length < 10) errors.push('Invalid phone number');
    if (!address) errors.push('Missing delivery address');

    return {
      rowNumber: index + 2, // 1-indexed header + row
      originalData: row,
      customerName: customerName || 'Valued Customer',
      phone: phone || '01700000000',
      address: address || 'Not specified',
      city: city || 'Dhaka',
      thana: thana || '',
      orderDate,
      productName: matchedProduct ? matchedProduct.name : productName,
      productSku: productSku || (matchedProduct ? matchedProduct.sku || 'SKU-001' : 'FP-01'),
      size: size || '32',
      quantity,
      price: price > 0 ? price : (matchedProduct?.price || 1050),
      deliveryCharge,
      discount,
      advancePayment,
      total,
      paymentMethod,
      status,
      notes: notes ? `[Sheet Import] ${notes}` : `[Imported from Google Sheet]`,
      courier,
      partner,
      isValid: errors.length === 0,
      errors,
      matchedProduct
    };
  };

  // Convert Google Sheet URL to direct CSV Export URL
  const convertSheetUrlToCsv = (url: string): string => {
    const trimmed = url.trim();
    // Match standard Google Sheets ID
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      // Check if there is a specific sheet gid
      const gidMatch = trimmed.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : '0';
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    }
    return trimmed;
  };

  // Load from Google Sheets Live Link
  const handleFetchGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      toast.error('Please paste your Google Sheet link or share URL');
      return;
    }

    setIsLoading(true);
    setSheetFetchError(null);
    const toastId = toast.loading('Connecting to Google Sheet and scanning order rows...');

    try {
      let csvText = '';
      let isPermission = false;

      // 1. Try our dedicated backend proxy first (handles CORS, redirects, and GViz endpoint seamlessly)
      try {
        const proxyApiRes = await fetch('/api/fetch-google-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sheetUrl.trim() })
        });
        const proxyApiData = await proxyApiRes.json();

        if (proxyApiRes.ok && proxyApiData.success && proxyApiData.csv) {
          csvText = proxyApiData.csv;
        } else if (proxyApiData.isPermissionError) {
          isPermission = true;
          throw new Error(proxyApiData.error || 'Could not access Google Sheet. Please make sure link sharing is set to "Anyone with the link can view"');
        }
      } catch (backendErr: any) {
        if (isPermission) {
          throw backendErr;
        }
        console.warn('Backend proxy fetch notice, trying direct/client fallbacks:', backendErr.message);
      }

      // 2. If backend proxy wasn't able to get it, try direct client fallback
      if (!csvText) {
        const csvUrl = convertSheetUrlToCsv(sheetUrl);
        try {
          const res = await fetch(csvUrl);
          if (res.ok) {
            csvText = await res.text();
          } else {
            throw new Error('Direct fetch failed');
          }
        } catch (directErr) {
          // 3. Fallback using public CORS proxy if sheet is public
          try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(csvUrl)}`;
            const proxyRes = await fetch(proxyUrl);
            if (proxyRes.ok) {
              csvText = await proxyRes.text();
            }
          } catch (corsErr) {}
        }
      }

      if (!csvText || csvText.includes('<!DOCTYPE html>') || csvText.includes('ServiceLogin') || csvText.includes('<html')) {
        setSheetFetchError({
          message: 'Could not access Google Sheet. Please make sure link sharing is set to "Anyone with the link can view".',
          isPermission: true
        });
        throw new Error('Could not access Google Sheet. Please make sure link sharing is set to "Anyone with the link can view"');
      }

      // Parse CSV using XLSX
      const workbook = XLSX.read(csvText, { type: 'string', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rawRows.length === 0) {
        toast.error('No order rows found in the sheet!', { id: toastId });
        setIsLoading(false);
        return;
      }

      const parsed = rawRows.map((r, i) => normalizeRowData(r, i));
      setParsedRows(parsed);

      // Select all valid rows by default
      const initialSelected: Record<number, boolean> = {};
      parsed.forEach(r => {
        initialSelected[r.rowNumber] = r.isValid;
      });
      setSelectedRows(initialSelected);

      toast.success(`Scanned ${parsed.length} orders successfully!`, { id: toastId });
    } catch (err: any) {
      console.error('Sheet fetch error:', err);
      toast.error(err.message || 'Failed to parse Google Sheet. Check link permissions.', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle local CSV / XLSX file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const toastId = toast.loading(`Scanning ${file.name}...`);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawRows.length === 0) {
          toast.error('No rows found in this file', { id: toastId });
          setIsLoading(false);
          return;
        }

        const parsed = rawRows.map((r, i) => normalizeRowData(r, i));
        setParsedRows(parsed);

        const initialSelected: Record<number, boolean> = {};
        parsed.forEach(r => {
          initialSelected[r.rowNumber] = r.isValid;
        });
        setSelectedRows(initialSelected);

        toast.success(`Loaded ${parsed.length} orders from ${file.name}!`, { id: toastId });
      } catch (err: any) {
        toast.error(`File parsing error: ${err.message}`, { id: toastId });
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read file', { id: toastId });
      setIsLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // Toggle selection
  const toggleSelectRow = (rowNum: number) => {
    setSelectedRows(prev => ({ ...prev, [rowNum]: !prev[rowNum] }));
  };

  const toggleSelectAll = (checked: boolean) => {
    const next: Record<number, boolean> = {};
    parsedRows.forEach(r => {
      if (checked) {
        next[r.rowNumber] = r.isValid;
      } else {
        next[r.rowNumber] = false;
      }
    });
    setSelectedRows(next);
  };

  // Execute Import
  const handleConfirmImport = async () => {
    const rowsToImport = parsedRows.filter(r => selectedRows[r.rowNumber]);
    if (rowsToImport.length === 0) {
      toast.error('Please select at least one order to import');
      return;
    }

    setIsProcessing(true);
    setImportProgress({ current: 0, total: rowsToImport.length });
    const toastId = toast.loading(`Importing ${rowsToImport.length} individual orders...`);

    try {
      const ordersToSave: Order[] = [];

      for (let i = 0; i < rowsToImport.length; i++) {
        const row = rowsToImport[i];
        const uniqueId = getNextOrderId();

        // Build item object
        const prod = row.matchedProduct || (products.length > 0 ? products[0] : null);
        const cartItem: CartItem = {
          id: prod ? prod.id : `sheet-prod-${Date.now()}-${i}`,
          name: row.productName,
          sku: row.productSku || 'FP 1',
          price: row.price,
          description: prod?.description || 'Imported from Google Sheet',
          category: prod?.category || 'Formal Pant',
          images: prod?.images || [],
          sizes: prod?.sizes || [row.size],
          selectedSize: row.size,
          quantity: row.quantity,
          stock: prod?.stock || 50,
          sizeStock: prod?.sizeStock || { [row.size]: 50 }
        };

        const newOrder: Order = {
          id: uniqueId,
          invoiceNo: parseInt(uniqueId, 10) || undefined,
          customerId: `sheet_${row.phone}_${Date.now()}`,
          customerName: row.customerName,
          email: '',
          phone: row.phone,
          address: row.address,
          city: row.city,
          thana: row.thana,
          items: [cartItem],
          deliveryCharge: row.deliveryCharge,
          discount: row.discount,
          advancePayment: row.advancePayment,
          total: row.total,
          status: row.status,
          paymentMethod: row.paymentMethod,
          notes: row.notes,
          courier: row.courier,
          partner: row.partner || 'Google Sheet',
          invoiceBy: 'Google Sheet Sync',
          createdAt: row.orderDate, // Preserves the exact original order date from Google Sheet
          updatedAt: Date.now()
        };

        ordersToSave.push(newOrder);
      }

      // Bulk import callback
      const importedCount = await onImportOrders(ordersToSave);

      toast.success(`🎉 Successfully imported ${importedCount} individual orders with their original dates!`, { id: toastId });
      onClose();
    } catch (err: any) {
      console.error('Import execution error:', err);
      toast.error(`Import error: ${err.message || 'Failed to save orders'}`, { id: toastId });
    } finally {
      setIsProcessing(false);
      setImportProgress(null);
    }
  };

  const selectedCount = parsedRows.filter(r => selectedRows[r.rowNumber]).length;
  const validCount = parsedRows.filter(r => r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-6 animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-[#F8F9FD] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold shadow-2xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Google Sheet / Excel Order Scanner</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Sparkles size={11} /> Auto Separate
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                শিটের প্রতিটি রো স্বয়ংক্রিয়ভাবে স্ক্যান করে মূল তারিখসহ আলাদা আলাদা স্বতন্ত্র অর্ডারে রূপান্তর করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Tabs: Live Link vs Upload CSV/Excel */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200/80">
            <button
              onClick={() => setActiveTab('link')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeTab === 'link' 
                  ? "bg-white text-slate-900 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <LinkIcon size={14} />
              <span>Google Sheet Live Link</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeTab === 'upload' 
                  ? "bg-white text-slate-900 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <Upload size={14} />
              <span>Upload Excel / CSV File</span>
            </button>
          </div>

          {/* Input Section */}
          {activeTab === 'link' ? (
            <div className="bg-[#F8F9FD] p-5 rounded-2xl border border-slate-200 space-y-3">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Google Sheet Public Link / Share URL:</span>
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit#gid=0"
                  className="w-full flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500 shadow-3xs"
                />
                <button
                  onClick={handleFetchGoogleSheet}
                  disabled={isLoading || !sheetUrl.trim()}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isLoading ? <RefreshCw className="animate-spin" size={15} /> : <FileSpreadsheet size={15} />}
                  <span>Scan & Parse Sheet</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <Info size={13} className="text-emerald-600 shrink-0" />
                <span>টিপস: গুগল শিটের <b>Share</b> বাটনে ক্লিক করে এক্সেস <b>"Anyone with the link" (Viewer)</b> দেওয়া নিশ্চিত করুন।</span>
              </div>

              {sheetFetchError && (
                <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2.5 text-slate-700 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-xs">গুগল শিট এক্সেস পারমিশন প্রয়োজন</h4>
                      <p className="text-[11px] text-amber-800/90 mt-0.5">
                        গুগল শিটটি প্রাইভেট থাকলে সরাসরি ডাটা রিড করা যায় না। নিচের যেকোনো একটি উপায় অনুসরণ করুন:
                      </p>
                    </div>
                  </div>

                  <div className="pl-7 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>আপনার গুগল শিটে গিয়ে উপরের ডানে <b>Share (শেয়ার)</b> এ ক্লিক করুন।</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold">2</span>
                      <span><b>General access</b> থেকে <i>Restricted</i> পরিবর্তন করে <b>"Anyone with the link" (Viewer)</b> সিলেক্ট করুন।</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold">3</span>
                      <span>এরপর আবার <b>"Scan & Parse Sheet"</b> বাটনে চাপুন।</span>
                    </div>
                  </div>

                  <div className="pl-7 pt-1 flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-600">অথবা সরাসরি ফাইল আপলোড করুন:</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upload')}
                      className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <Upload size={12} />
                      <span>Upload File ট্যাবে যান</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#F8F9FD] p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 transition-all text-center space-y-3 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <Upload size={22} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Click to browse or Drag & Drop your Excel / CSV file
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports .XLSX, .XLS, .CSV format spreadsheets
                </p>
              </div>
            </div>
          )}

          {/* Parsed Results Overview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">Total Scanned:</span>
                    <span className="px-2 py-0.5 rounded-md bg-white border font-black text-slate-900">{parsedRows.length} Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700">Ready to Import:</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 font-black text-emerald-700">{validCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100"
                  >
                    Select Valid ({validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#F1F5F9] sticky top-0 z-10 text-[11px] font-black text-slate-700 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCount === parsedRows.length && parsedRows.length > 0}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">Row #</th>
                        <th className="py-2.5 px-3">Date (তারিখ)</th>
                        <th className="py-2.5 px-3">Customer Details</th>
                        <th className="py-2.5 px-3">Product & Size</th>
                        <th className="py-2.5 px-3">Amount (টাকা)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Validity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-[11px]">
                      {parsedRows.map((row) => {
                        const isSelected = !!selectedRows[row.rowNumber];
                        const dateFormatted = new Date(row.orderDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        });

                        return (
                          <tr 
                            key={row.rowNumber} 
                            className={cn(
                              "transition-colors hover:bg-slate-50/80",
                              !row.isValid ? "bg-red-50/30" : isSelected ? "bg-emerald-50/20" : ""
                            )}
                          >
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!row.isValid}
                                onChange={() => toggleSelectRow(row.rowNumber)}
                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-500">
                              #{row.rowNumber}
                            </td>
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-800 flex items-center gap-1">
                                <Calendar size={11} className="text-slate-400" />
                                {dateFormatted}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">{row.customerName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{row.phone} • {row.city}</div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-800 truncate max-w-[180px]">{row.productName}</div>
                              <div className="text-[10px] text-slate-500">Size: {row.size} • Qty: {row.quantity}</div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-black text-slate-900">৳{row.total}</div>
                              <div className="text-[10px] text-slate-400 uppercase">{row.paymentMethod}</div>
                            </td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                {row.status}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 size={11} /> Valid
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 cursor-help"
                                  title={row.errors.join(', ')}
                                >
                                  <AlertCircle size={11} /> Errors ({row.errors.length})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8F9FD] shrink-0">
          <div className="text-xs font-bold text-slate-600">
            {parsedRows.length > 0 ? (
              <span>Selected <b className="text-emerald-600">{selectedCount}</b> of {parsedRows.length} orders to import</span>
            ) : (
              <span>Paste Google Sheet URL or upload file to begin parsing</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing || selectedCount === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-95"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  <span>Importing Orders...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Import {selectedCount} Separate Orders</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
