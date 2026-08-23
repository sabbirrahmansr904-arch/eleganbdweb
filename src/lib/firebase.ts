import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose internal transport logs and quota errors
try {
  setLogLevel('silent');
} catch {}

const app = initializeApp(firebaseConfig);

// Standard reliable Firestore instance preventing experimental long-polling assertion failures (ca9/b815)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
