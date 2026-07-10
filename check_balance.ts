import { doc, getDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function checkBalance() {
  try {
    const smsRef = doc(db, 'config', 'sms_otp');
    const smsSnap = await getDoc(smsRef);
    if (smsSnap.exists()) {
      console.log('Balance:', smsSnap.data().balance);
    } else {
      console.log('Document does not exist');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkBalance();
