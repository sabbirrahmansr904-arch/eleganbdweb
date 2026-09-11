import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, getDocs, writeBatch, query, limit } from 'firebase/firestore';
import { ActiveVisitor, TrafficSummary } from '../types';

function parseSafeNumber(val: any, fallback = 0): number {
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  if (val && typeof val === 'object') {
    if (typeof val.value === 'number') return val.value;
    if (typeof val.count === 'number') return val.count;
    return fallback;
  }
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
}

export function useLiveVisitors() {
  const [visitors, setVisitors] = useState<ActiveVisitor[]>([]);
  const [summary, setSummary] = useState<TrafficSummary>({
    todayVisits: 0,
    todayPageViews: 0,
    totalVisits: 0,
    totalPageViews: 0,
    lastUpdated: Date.now()
  });
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Clock tick every 5 seconds to accurately refresh "Active 10s ago", "Active 1m ago"
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Listen to active_visitors collection in real time
  useEffect(() => {
    const colRef = collection(db, 'active_visitors');
    const q = query(colRef, limit(200));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ActiveVisitor[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() || {};
        items.push({
          id: String(docSnap.id || ''),
          path: typeof data.path === 'string' ? data.path : '/',
          pageTitle: typeof data.pageTitle === 'string' ? data.pageTitle : '',
          referrer: typeof data.referrer === 'string' ? data.referrer : 'Direct',
          device: typeof data.device === 'string' ? data.device : 'Desktop',
          browser: typeof data.browser === 'string' ? data.browser : 'Unknown',
          os: typeof data.os === 'string' ? data.os : 'Unknown',
          screen: typeof data.screen === 'string' ? data.screen : '',
          firstSeen: parseSafeNumber(data.firstSeen, Date.now()),
          lastActive: parseSafeNumber(data.lastActive, Date.now()),
          pageViews: parseSafeNumber(data.pageViews, 1),
          isOnline: data.isOnline !== false,
          isAdminSession: Boolean(data.isAdminSession)
        });
      });

      // Sort by last active descending (most recently active first)
      items.sort((a, b) => b.lastActive - a.lastActive);
      setVisitors(items);
      setLoading(false);
    }, (err) => {
      console.error('Error reading live visitors:', err);
      setLoading(false);
    });

    // Also listen to site_analytics summary
    const summaryRef = doc(db, 'site_analytics', 'summary');
    const unsubSummary = onSnapshot(summaryRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() || {};
        setSummary({
          todayVisits: parseSafeNumber(data.todayVisits, 0),
          todayPageViews: parseSafeNumber(data.todayPageViews, 0),
          totalVisits: parseSafeNumber(data.totalVisits, 0),
          totalPageViews: parseSafeNumber(data.totalPageViews, 0),
          lastUpdated: parseSafeNumber(data.lastUpdated, Date.now())
        });
      }
    }, () => {});

    return () => {
      unsubscribe();
      unsubSummary();
    };
  }, []);

  // Active within last 2 minutes (120,000 ms)
  const activeNowVisitors = useMemo(() => {
    const threshold = currentTime - 120000;
    return visitors.filter(v => v.lastActive >= threshold && v.isOnline);
  }, [visitors, currentTime]);

  // Public customer active visitors (excluding admin panel users)
  const customerActiveVisitors = useMemo(() => {
    return activeNowVisitors.filter(v => !v.isAdminSession);
  }, [activeNowVisitors]);

  // Clean inactive visitors older than 24 hours
  const cleanOldVisitors = useCallback(async () => {
    try {
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const snapshot = await getDocs(collection(db, 'active_visitors'));
      const batch = writeBatch(db);
      let count = 0;

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if ((data.lastActive || 0) < oneDayAgo) {
          batch.delete(docSnap.ref);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
      }
      return count;
    } catch (e) {
      console.error('Error cleaning old visitors:', e);
      return 0;
    }
  }, []);

  return {
    visitors,
    activeNowVisitors,
    customerActiveVisitors,
    activeCount: activeNowVisitors.length,
    customerActiveCount: customerActiveVisitors.length,
    summary,
    loading,
    currentTime,
    cleanOldVisitors
  };
}
