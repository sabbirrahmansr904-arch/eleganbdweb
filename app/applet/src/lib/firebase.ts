// Firebase is completely removed and replaced by Supabase exclusively.
// Providing mock/safe exports to prevent import errors in legacy components.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Dummy Firestore db export to prevent runtime crashes if any legacy component imports db
export const db = {} as any;
