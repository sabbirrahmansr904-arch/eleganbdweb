import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal transport logs and quota errors
try {
  setLogLevel('silent');
} catch {}

const app = initializeApp(firebaseConfig);

// Configure Firestore with long-polling to work reliably inside sandboxed iframe environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
