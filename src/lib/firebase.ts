import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db as mockDb } from './firestoreMock';

const app = initializeApp(firebaseConfig);

// Completely export mock DB to eliminate any real Firestore write streams or RPC quota errors
export const db = mockDb as any;

export const auth = getAuth(app);


