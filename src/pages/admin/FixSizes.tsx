import React from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const FixSizes = () => {
  const fixSizes = async () => {
    try {
      const q = query(collection(db, 'products')); // Fetch all
      const snapshot = await getDocs(q);
      
      const newSizes = ['28', '30', '32', '34', '36', '38', '40'];
      const newSizeStock = {'28': 5, '30': 8, '32': 8, '34': 8, '36': 8, '38': 7, '40': 6};
      
      let count = 0;
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.category === 'Formal Pant' || data.category === 'Formal Pants') {
          await updateDoc(doc.ref, {
            sizes: newSizes,
            sizeStock: newSizeStock
          });
          count++;
        }
      }
      toast.success(`Sizes updated for ${count} Formal Pants!`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update sizes');
    }
  };

  return (
    <div className="p-10">
      <button 
        onClick={fixSizes}
        className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs"
      >
        Fix Sizes for Formal Pants
      </button>
    </div>
  );
};

export default FixSizes;
