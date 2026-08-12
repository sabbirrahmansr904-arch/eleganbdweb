import React from 'react';
import { Users, Search } from 'lucide-react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice } from '../../lib/utils';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function CustomerProfiler() {
  const { currency, rate } = useCurrency();
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    }, (err) => console.warn('[AdminCustomerProfiler] Snapshot listener notice:', err));
    return () => unsubscribe();
  }, []);

  const filtered = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="p-8 font-sans bg-slate-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Customer Profiler</h1>
        <p className="text-slate-500 mt-2">Search customers to view order success stats, ratings, and profile notes.</p>
      </div>

      <div className="bg-[#F8F9FD] p-6 rounded-3xl border border-slate-100 shadow-sm mb-8 flex items-center gap-4">
        <Search className="text-slate-400" size={24} />
        <input 
          type="text"
          placeholder="Search by name or phone..."
          className="w-full text-lg outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {filtered.map(customer => (
          <div key={customer.id} className="bg-[#F8F9FD] p-6 rounded-3xl border border-slate-100 shadow-sm flex items-start gap-6">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-black text-slate-400">
              {customer.name?.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h3 className="text-xl font-black text-slate-900">{customer.name}</h3>
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Highly Reliable</span>
              </div>
              <p className="text-slate-500 text-sm mb-1">{customer.phone}</p>
              <p className="text-slate-500 text-sm">{customer.address}</p>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              <Stat title="Total Orders" value={customer.totalOrders || 0} />
              <Stat title="Delivered" value={customer.deliveredOrders || 0} color="text-emerald-600" />
              <Stat title="Cancelled" value={customer.cancelledOrders || 0} color="text-red-600" />
              <Stat title="Exchanges" value={customer.exchanges || 0} color="text-indigo-600" />
            </div>

            <div className="w-64">
              <p className="text-sm font-bold text-slate-500 mb-2">Total Spend</p>
              <p className="text-2xl font-black text-slate-900">{formatPrice(customer.totalSpent || 0, currency, rate)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ title, value, color = "text-slate-900" }: { title: string, value: string | number, color?: string }) {
  return (
    <div className="bg-slate-50 p-4 rounded-2xl w-28 text-center border border-slate-100">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}
