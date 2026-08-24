import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal transport logs and quota errors
try {
  setLogLevel('silent');
} catch {}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust long-polling transport settings to prevent stream chunk desync & internal assertion errors (ca9/b815)
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);

