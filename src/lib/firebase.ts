import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal transport logs and quota errors
try {
  setLogLevel('silent');
} catch {}

const app = initializeApp(firebaseConfig);

// Initialize Firestore with reliable WebChannel transport settings preventing duplicate target ACK assertions (ca9/b815)
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: false,
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
