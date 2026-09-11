import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';

function getDeviceInfo(): { device: 'Mobile' | 'Desktop' | 'Tablet'; browser: string; os: string } {
  if (typeof window === 'undefined') {
    return { device: 'Desktop', browser: 'Unknown', os: 'Unknown' };
  }

  const ua = navigator.userAgent || '';
  let device: 'Mobile' | 'Desktop' | 'Tablet' = 'Desktop';
  const width = window.innerWidth || window.screen.width || 1024;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) || (width >= 640 && width <= 1024 && 'ontouchstart' in window)) {
    device = 'Tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua) || width < 640) {
    device = 'Mobile';
  }

  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  return { device, browser, os };
}

function getReferrerSource(): string {
  if (typeof document === 'undefined') return 'Direct';
  const ref = document.referrer;
  if (!ref) return 'Direct';
  try {
    const url = new URL(ref);
    const host = url.hostname.toLowerCase();
    if (host.includes(window.location.hostname)) return 'Direct';
    if (host.includes('facebook') || host.includes('fb.com') || host.includes('messenger')) return 'Facebook';
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('google')) return 'Google';
    if (host.includes('youtube')) return 'YouTube';
    if (host.includes('tiktok')) return 'TikTok';
    if (host.includes('t.co') || host.includes('twitter') || host.includes('x.com')) return 'Twitter / X';
    return host.replace(/^www\./, '');
  } catch {
    return 'Direct';
  }
}

export default function LiveVisitorTracker() {
  const location = useLocation();
  const visitorIdRef = useRef<string>('');
  const firstSeenRef = useRef<number>(Date.now());
  const pageViewsRef = useRef<number>(1);
  const referrerRef = useRef<string>('Direct');

  // Initialize persistent visitor & session info
  useEffect(() => {
    try {
      let vid = sessionStorage.getItem('elegan_visitor_id');
      if (!vid) {
        vid = localStorage.getItem('elegan_visitor_id');
      }
      if (!vid) {
        vid = `v_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
        localStorage.setItem('elegan_visitor_id', vid);
      }
      sessionStorage.setItem('elegan_visitor_id', vid);
      visitorIdRef.current = vid;

      const storedFirstSeen = localStorage.getItem('elegan_visitor_first_seen');
      if (storedFirstSeen) {
        firstSeenRef.current = parseInt(storedFirstSeen, 10) || Date.now();
      } else {
        localStorage.setItem('elegan_visitor_first_seen', String(firstSeenRef.current));
      }

      let storedRef = sessionStorage.getItem('elegan_visitor_referrer');
      if (!storedRef) {
        storedRef = getReferrerSource();
        sessionStorage.setItem('elegan_visitor_referrer', storedRef);
      }
      referrerRef.current = storedRef;

      // Track daily summary
      const todayKey = new Date().toISOString().split('T')[0];
      const hasLoggedDaily = sessionStorage.getItem(`elegan_daily_${todayKey}`);
      if (!hasLoggedDaily) {
        sessionStorage.setItem(`elegan_daily_${todayKey}`, '1');
        const summaryDoc = doc(db, 'site_analytics', 'summary');
        setDoc(summaryDoc, {
          totalVisits: increment(1),
          todayVisits: increment(1),
          lastUpdated: Date.now(),
          date: todayKey
        }, { merge: true }).catch(() => {});
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Update visitor location on route change or heartbeat
  useEffect(() => {
    if (!visitorIdRef.current) return;
    const { device, browser, os } = getDeviceInfo();
    const isAdmin = location.pathname.startsWith('/admin');
    const path = location.pathname + (location.search ? location.search : '');

    pageViewsRef.current += 1;

    const pingData = {
      id: visitorIdRef.current,
      path: path || '/',
      pageTitle: document.title || 'Elegan BD',
      referrer: referrerRef.current,
      device,
      browser,
      os,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      firstSeen: firstSeenRef.current,
      lastActive: Date.now(),
      pageViews: pageViewsRef.current,
      isOnline: true,
      isAdminSession: isAdmin
    };

    // Update active visitor document in Firestore
    const visitorDoc = doc(db, 'active_visitors', visitorIdRef.current);
    setDoc(visitorDoc, pingData, { merge: true }).catch(() => {});

    // Update total page views
    const summaryDoc = doc(db, 'site_analytics', 'summary');
    setDoc(summaryDoc, {
      totalPageViews: increment(1),
      todayPageViews: increment(1),
      lastUpdated: Date.now()
    }, { merge: true }).catch(() => {});

    // Periodic heartbeat every 25 seconds while tab is open
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateDoc(visitorDoc, {
          lastActive: Date.now(),
          isOnline: true
        }).catch(() => {
          // If update fails (doc might have been cleaned), use setDoc
          setDoc(visitorDoc, pingData, { merge: true }).catch(() => {});
        });
      }
    }, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateDoc(visitorDoc, {
          lastActive: Date.now(),
          isOnline: true
        }).catch(() => {});
      } else {
        updateDoc(visitorDoc, {
          lastActive: Date.now(),
          isOnline: false
        }).catch(() => {});
      }
    };

    const handleBeforeUnload = () => {
      try {
        updateDoc(visitorDoc, {
          lastActive: Date.now(),
          isOnline: false
        }).catch(() => {});
      } catch (e) {}
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname, location.search]);

  return null;
}
