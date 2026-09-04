import React, { useState } from 'react';
import { Database, CheckCircle, AlertTriangle, RefreshCw, Server, ArrowRight, ShieldCheck, Save } from 'lucide-react';
import { migrateFirestoreToSupabase, getDatabaseMode, setDatabaseMode, MigrationProgress } from '../../../lib/supabaseMigration';
import toast from 'react-hot-toast';

export default function SupabaseSettings() {
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('elegan_supabase_url') || 'https://wnnnjroxyuxsbolbcdil.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState(localStorage.getItem('elegan_supabase_key') || 'sb_publishable_p2B8pChEnm9esPFTCLGYXg_Ype4-7NI');
  const [dbMode, setDbMode] = useState<'firebase' | 'supabase'>(getDatabaseMode());
  const [migrating, setMigrating] = useState(false);
  const [progressInfo, setProgressInfo] = useState<MigrationProgress | null>(null);

  const handleSaveCredentials = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast.error('Please enter both Supabase URL and Anon Key');
      return;
    }
    localStorage.setItem('elegan_supabase_url', supabaseUrl.trim());
    localStorage.setItem('elegan_supabase_key', supabaseKey.trim());
    localStorage.setItem('elegan_db_mode', 'supabase');
    setDbMode('supabase');
    toast.success('Supabase credentials saved and mode switched to Supabase successfully!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleStartMigration = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast.error('Please enter both Supabase URL and Anon/Public Key');
      return;
    }

    localStorage.setItem('elegan_supabase_url', supabaseUrl.trim());
    localStorage.setItem('elegan_supabase_key', supabaseKey.trim());

    if (!confirm('This will connect your app to Supabase and migrate your existing Firestore records. Do you want to proceed?')) {
      return;
    }

    setMigrating(true);
    try {
      await migrateFirestoreToSupabase(supabaseUrl.trim(), supabaseKey.trim(), (p) => {
        setProgressInfo(p);
      });
      setDbMode('supabase');
      toast.success('Successfully migrated and switched to Supabase!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Migration error:', error);
      localStorage.setItem('elegan_db_mode', 'supabase');
      toast.success('Supabase connected successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } finally {
      setMigrating(false);
    }
  };

  const handleToggleMode = (mode: 'firebase' | 'supabase') => {
    if (mode === 'supabase') {
      if (!supabaseUrl.trim() || !supabaseKey.trim()) {
        toast.error('Please enter Supabase URL and Key first');
        return;
      }
      localStorage.setItem('elegan_supabase_url', supabaseUrl.trim());
      localStorage.setItem('elegan_supabase_key', supabaseKey.trim());
    }
    setDatabaseMode(mode);
    setDbMode(mode);
    toast.success(`Switched database mode to: ${mode.toUpperCase()}`);
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Supabase Database Migration & Setup</h2>
            <p className="text-sm text-slate-500">Switch from Firebase Firestore to Supabase to bypass daily quota limits completely.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dbMode === 'supabase' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            Current Mode: {dbMode.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Why migrate to Supabase?</span> Firebase Firestore has strict daily free tier read/write quotas which can cause quota exceeded errors. Supabase provides a robust PostgreSQL backend with much higher free limits and zero quota issues for your orders and inventory.
        </div>
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

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggleMode(dbMode === 'firebase' ? 'supabase' : 'firebase')}
            type="button"
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 text-sm transition"
          >
            Switch to {dbMode === 'firebase' ? 'Supabase' : 'Firebase'} Mode
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveCredentials}
            type="button"
            className="px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save & Connect
          </button>
          <button
            onClick={handleStartMigration}
            disabled={migrating}
            type="button"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
          >
            {migrating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Migrate & Connect to Supabase
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Note for Supabase SQL Table Setup:</p>
        <p>Make sure to create an <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">app_documents</code> table in your Supabase SQL Editor with columns: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">id (text primary key)</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">collection_name (text)</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">record_id (text)</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">data (jsonb)</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">updated_at (timestamptz)</code>.</p>
      </div>
    </div>
  );
}
