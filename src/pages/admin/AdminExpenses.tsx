
import React, { useState } from 'react';
import { useExpenses } from '../../contexts/ExpenseContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../lib/utils';
import { Plus, Trash2, CreditCard, Search, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminExpenses(): React.JSX.Element {
  const { expenses, loading, addExpense, deleteExpense } = useExpenses();
  const { currency, rate } = useCurrency();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    category: 'খরচ', 
    amount: '', 
    notes: '' 
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(form.amount);
    if (!form.category || isNaN(amountNum) || amountNum <= 0) {
      toast.error('দয়া করে সঠিক তথ্য দিন।');
      return;
    }
    await addExpense({ 
      date: new Date(form.date).getTime(),
      category: form.category, 
      amount: amountNum, 
      notes: form.notes,
      description: form.notes
    });
    setForm({ date: new Date().toISOString().split('T')[0], category: 'খরচ', amount: '', notes: '' });
    setShowModal(false);
  };

  if (loading) return <div className="p-12 text-center">লোড হচ্ছে...</div>;

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#FBFBFD] min-h-screen text-black antialiased p-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
        <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-600" />
          সকল লেনদেন (Expenses)
        </h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          নতুন লেনদেন যোগ করুন
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-[20px] p-6 shadow-sm">
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="নোট দিয়ে খুঁজুন..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-xs" />
          </div>
          <select className="border rounded-xl text-xs px-4 py-2">
            <option>সব ধরন</option>
          </select>
          <input type="date" className="border rounded-xl text-xs px-4 py-2" />
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100 uppercase tracking-wider font-black text-[9px]">
              <th className="py-4 px-6">তারিখ</th>
              <th className="py-4 px-6">বিবরণ / নোট</th>
              <th className="py-4 px-6">ধরন</th>
              <th className="py-4 px-6 text-right">পরিমাণ</th>
              <th className="py-4 px-6 text-center">আকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 font-bold text-gray-700">
            {expenses.map(ex => (
              <tr key={ex.id}>
                <td className="py-4 px-6 text-gray-400">{new Date(ex.date).toLocaleDateString()}</td>
                <td className="py-4 px-6">{ex.description}</td>
                <td className="py-4 px-6">{ex.category}</td>
                <td className="py-4 px-6 text-right">{formatPrice(ex.amount)}</td>
                <td className="py-4 px-6 text-center">
                  <button onClick={() => deleteExpense(ex.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {expenses.length === 0 && <div className="py-8 text-center text-xs text-gray-400">কোনো লেনদেন পাওয়া যায়নি।</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-[#E5E7EB] p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-black text-lg text-gray-900">নতুন লেনদেন যোগ করুন</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">তারিখ</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full p-3 border rounded-xl text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">ধরন</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full p-3 border rounded-xl text-xs">
                <option value="খরচ">খরচ</option>
                <option value="অন্যান্য">অন্যান্য</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">পরিমাণ (৳)</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full p-3 border rounded-xl text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">নোট / বিবরণ</label>
              <textarea placeholder="লেনদেনের বিবরণ লিখুন..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full p-3 border rounded-xl text-xs h-24" />
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-6 py-3 text-xs font-bold text-gray-700 bg-gray-200 rounded-xl hover:bg-gray-300">ক্যানসেল</button>
              <button onClick={handleSubmit} className="px-6 py-3 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-lg">সেভ করুন</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
