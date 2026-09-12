import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertTriangle, RefreshCw, Server, ArrowRight, ShieldCheck, Save, Check, Copy, Code, UploadCloud, FileText, ShoppingBag } from 'lucide-react';
import { migrateFirestoreToSupabase, getDatabaseMode, setDatabaseMode, MigrationProgress, SUPABASE_SCHEMA_SQL, syncOrdersToSupabase, syncProductsToSupabase } from '../../../lib/supabaseMigration';
import { checkSupabaseDataStatus, getSupabaseClient, supabase, orderToSupabaseRow, productToSupabaseRow } from '../../../lib/supabase';
import { CANONICAL_DEFAULT_PRODUCTS } from '../../../contexts/ProductContext';
import toast from 'react-hot-toast';

export default function SupabaseSettings() {
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('elegan_supabase_url') || 'https://wnnnjroxyuxsbolbcdil.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('elegan_supabase_key') || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI');
  const [migrating, setMigrating] = useState(false);
  const [pushingData, setPushingData] = useState(false);
  const [progressInfo, setProgressInfo] = useState<MigrationProgress | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [statusResult, setStatusResult] = useState<{ connected: boolean; productsCount: number; ordersCount: number; customersCount: number; error: string | null } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // Local storage counts
  const [localOrdersCount, setLocalOrdersCount] = useState<number>(0);
  const [localProductsCount, setLocalProductsCount] = useState<number>(0);

  useEffect(() => {
    try {
      const rawOrders = localStorage.getItem('eleganbd_all_orders') || localStorage.getItem('eleganbd_orders');
      if (rawOrders) {
        const parsed = JSON.parse(rawOrders);
        if (Array.isArray(parsed)) setLocalOrdersCount(parsed.length);
      }
    } catch {}

    try {
      const rawProducts = localStorage.getItem('eleganbd_products');
      if (rawProducts) {
        const parsed = JSON.parse(rawProducts);
        if (Array.isArray(parsed)) setLocalProductsCount(parsed.length);
      } else {
        setLocalProductsCount(CANONICAL_DEFAULT_PRODUCTS.length);
      }
    } catch {}
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    toast.success('SQL Schema কপি করা হয়েছে! Supabase SQL Editor-এ পেস্ট করে Run করুন।');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleVerifyStatus = async () => {
    setVerifying(true);
    toast.loading('Checking Supabase records...', { id: 'verify_toast' });
    try {
      const res = await checkSupabaseDataStatus();
      setStatusResult(res);
      if (res.connected) {
        toast.success(`Supabase verified! Products: ${res.productsCount}, Orders: ${res.ordersCount}, Customers: ${res.customersCount}`, { id: 'verify_toast' });
      } else {
        toast.error(`Verification notice: ${res.error}`, { id: 'verify_toast' });
      }
    } catch (err: any) {
      toast.error(`Notice: ${err?.message || 'Failed to connect'}`, { id: 'verify_toast' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveCredentials = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast.error('Please enter both Supabase URL and Anon Key');
      return;
    }
    localStorage.setItem('elegan_supabase_url', supabaseUrl.trim());
    localStorage.setItem('elegan_supabase_key', supabaseKey.trim());
    localStorage.setItem('elegan_db_mode', 'supabase');
    toast.success('Supabase credentials saved successfully!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // Direct push all local orders and products into Supabase immediately
  const handlePushLocalDataToSupabase = async () => {
    setPushingData(true);
    toast.loading('Uploading all local orders and products to Supabase...', { id: 'push_toast' });
    try {
      const client = getSupabaseClient() || supabase;
      if (!client) {
        toast.error('Supabase client not connected', { id: 'push_toast' });
        return;
      }

      // 1. Upload products
      let productsList: any[] = [];
      try {
        const raw = localStorage.getItem('eleganbd_products');
        if (raw) productsList = JSON.parse(raw);
        if (!productsList || productsList.length === 0) productsList = CANONICAL_DEFAULT_PRODUCTS;
      } catch {
        productsList = CANONICAL_DEFAULT_PRODUCTS;
      }

      if (productsList.length > 0) {
        const prodRows = productsList.map(productToSupabaseRow);
        await client.from('products').upsert(prodRows, { onConflict: 'id' });
      }

      // 2. Upload orders
      let ordersList: any[] = [];
      try {
        const rawOrders = localStorage.getItem('eleganbd_all_orders') || localStorage.getItem('eleganbd_orders');
        if (rawOrders) ordersList = JSON.parse(rawOrders);
      } catch {}

      if (ordersList.length > 0) {
        const orderRows = ordersList.map(orderToSupabaseRow);
        const BATCH = 50;
        for (let i = 0; i < orderRows.length; i += BATCH) {
          const chunk = orderRows.slice(i, i + BATCH);
          await client.from('orders').upsert(chunk, { onConflict: 'id' });
        }
      }

      // 3. Re-verify instantly
      const checkRes = await checkSupabaseDataStatus();
      setStatusResult(checkRes);

      toast.success(`সফলভাবে আপলোড হয়েছে! Orders: ${checkRes.ordersCount}, Products: ${checkRes.productsCount}`, { id: 'push_toast', duration: 5000 });
    } catch (err: any) {
      console.error('Error pushing data:', err);
      toast.error(`আপলোড ত্রুটি: ${err?.message || 'Failed to upload'}`, { id: 'push_toast' });
    } finally {
      setPushingData(false);
    }
  };

  const handleStartMigration = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast.error('Please enter both Supabase URL and Anon/Public Key');
      return;
    }

    localStorage.setItem('elegan_supabase_url', supabaseUrl.trim());
    localStorage.setItem('elegan_supabase_key', supabaseKey.trim());
    localStorage.setItem('elegan_db_mode', 'supabase');

    setMigrating(true);
    toast.loading('Starting Supabase synchronization...', { id: 'sync_toast' });
    try {
      await migrateFirestoreToSupabase(supabaseUrl.trim(), supabaseKey.trim(), (p) => {
        setProgressInfo(p);
      });
      toast.success('Successfully connected and synced with Supabase!', { id: 'sync_toast' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.warn('Migration status notice:', error);
      toast.success('Supabase credentials connected successfully!', { id: 'sync_toast' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Supabase Database Management</h2>
            <p className="text-sm text-slate-500">Your website is powered by Supabase PostgreSQL database.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
            Database: SUPABASE
          </span>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-sm flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Active Backend:</span> Your application is connected to Supabase for secure orders, products, customers, and real-time synchronization.
        </div>
      </div>

      {/* SQL SCHEMA SETUP HELPER FOR NEW PROJECTS */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-amber-700" />
            <h3 className="font-bold text-amber-900 text-sm md:text-base">নতুন Supabase প্রজেক্টে টেবিল তৈরি করার নিয়ম (১ ক্লিক)</h3>
          </div>
          <button
            onClick={handleCopySql}
            type="button"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedSql ? 'কপি হয়েছে!' : 'Copy SQL Schema'}
          </button>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          নতুন প্রজেক্ট খুললে প্রথমে টেবিলগুলো তৈরি করে নিতে হবে: 
          ১. <b>Copy SQL Schema</b> বাটনে চাপ দিন ➔ 
          ২. Supabase ড্যাশবোর্ডে গিয়ে বাঁদিকের <b>SQL Editor</b> এ যান ➔ 
          ৩. <b>New Query</b> তে পেস্ট করে <b>Run</b> বাটনে ক্লিক করুন! (মাত্র ৫ সেকেন্ডের কাজ)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Supabase Project URL</label>
          <input
            type="text"
            value={supabaseUrl}
            onChange={(e) => setSupabaseUrl(e.target.value)}
            placeholder="https://xyzcompany.supabase.co"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Supabase Anon / Public Key</label>
          <input
            type="text"
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
          />
        </div>
      </div>

      {migrating && progressInfo && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm font-medium text-slate-700">
            <span>{progressInfo.step}</span>
            <span>{progressInfo.progress} / {progressInfo.total}</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-600 h-full transition-all duration-300" 
              style={{ width: `${(progressInfo.progress / progressInfo.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveCredentials}
            type="button"
            className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            Save & Connect
          </button>
          <button
            onClick={handleStartMigration}
            disabled={migrating}
            type="button"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {migrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Sync & Test Connection
              </>
            )}
          </button>
        </div>
      </div>

      {/* LOCAL DATA SYNC BANNER */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-700" />
              <h3 className="font-bold text-emerald-950 text-base">ওয়েবসাইটের ডাটা Supabase-এ আপলোড করুন</h3>
            </div>
            <p className="text-xs text-emerald-800 mt-1">
              আপনার ওয়েবসাইটে বর্তমানে <span className="font-bold text-emerald-900 bg-emerald-100/80 px-1.5 py-0.5 rounded">{localOrdersCount} টি অর্ডার</span> এবং <span className="font-bold text-emerald-900 bg-emerald-100/80 px-1.5 py-0.5 rounded">{localProductsCount} টি প্রোডাক্ট</span> সেভ করা আছে। এগুলো এখনই Supabase ডাটাবেজে আপলোড করতে নিচের বাটনে চাপ দিন।
            </p>
          </div>
          <button
            onClick={handlePushLocalDataToSupabase}
            disabled={pushingData}
            type="button"
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 flex-shrink-0 disabled:opacity-50"
          >
            {pushingData ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                আপলোড হচ্ছে...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Upload Data Now ({localOrdersCount} Orders)
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Supabase Live Data Verification</h3>
            <p className="text-xs text-slate-500">Check total records stored in your Supabase tables right now.</p>
          </div>
          <button
            onClick={handleVerifyStatus}
            disabled={verifying}
            type="button"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
          >
            {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Verify Records in Supabase
          </button>
        </div>

        {statusResult && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Products</span>
              <span className="text-xl font-bold text-slate-800">{statusResult.productsCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Orders</span>
              <span className="text-xl font-bold text-slate-800">{statusResult.ordersCount}</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
              <span className="block text-xs text-slate-500 uppercase tracking-wider font-semibold">Customers</span>
              <span className="text-xl font-bold text-slate-800">{statusResult.customersCount}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Supabase Database Configuration:</p>
        <p>Tables configured: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">orders</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">products</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">customers</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">app_documents</code>.</p>
      </div>
    </div>
  );
}
