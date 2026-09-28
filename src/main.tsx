import React from 'react'
import ReactDOM from 'react-dom/client'
import './lib/firestoreUtils'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Automatic Cache Migration & Invalidation
(() => {
  try {
    const CURRENT_CACHE_VERSION = 'v2026.09.28.3';
    const savedVersion = localStorage.getItem('eleganbd_cache_version');
    if (savedVersion !== CURRENT_CACHE_VERSION) {
      // Purge old cached data so browser immediately uses fresh Firestore/Supabase & Canonical assets
      localStorage.removeItem('eleganbd_categories');
      localStorage.removeItem('eleganbd_banners_large');
      localStorage.removeItem('eleganbd_products');
      localStorage.removeItem('eleganbd_branding');
      localStorage.setItem('eleganbd_cache_version', CURRENT_CACHE_VERSION);
    }
  } catch (e) {
    // Ignore storage access errors in restricted iframe
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

