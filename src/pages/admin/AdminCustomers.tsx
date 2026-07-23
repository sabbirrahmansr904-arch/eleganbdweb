/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Mail, 
  Phone, 
  ShoppingBag, 
  TrendingUp,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import toast from 'react-hot-toast';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function AdminCustomers() {
  const { currency, rate } = useCurrency();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('lastOrderDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customersData: any[] = [];
      snapshot.forEach(doc => {
        customersData.push({ id: doc.id, ...doc.data() });
      });
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching customers:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const handleAction = (name: string) => {
    toast.success(`Accessing profile for ${name}...`);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm font-bold text-gray-500">Loading customers...</div>;
  }

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:bg-gray-100/50">
        <div>
          <h1 className="text-3xl font-black text-black italic tracking-tighter uppercase">Customer Directory</h1>
          <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-[0.2em] font-black">{customers.length} Registered Identities</p>
        </div>
      </div>

      {/* Stats row for Customers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 border border-gray-100 rounded-2xl flex items-center space-x-6 shadow-sm group hover:border-black transition-all">
          <div className="w-14 h-14 bg-black text-white rounded-xl flex items-center justify-center shadow-lg">
            <Users size={28} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">Total Profiles</p>
            <p className="text-2xl font-black text-black italic tracking-tighter">{customers.length}</p>
          </div>
        </div>
        <div className="bg-white p-8 border border-gray-100 rounded-2xl flex items-center space-x-6 shadow-sm group hover:border-black transition-all">
          <div className="w-14 h-14 bg-gray-50 text-black rounded-xl flex items-center justify-center border border-gray-100">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">Active Interaction</p>
            <p className="text-2xl font-black text-black italic tracking-tighter">{customers.length > 0 ? '100%' : '0%'}</p>
          </div>
        </div>
        <div className="bg-white p-8 border border-gray-100 rounded-2xl flex items-center space-x-6 shadow-sm group hover:border-brand-gold/50 transition-all">
          <div className="w-14 h-14 bg-brand-gold text-white rounded-xl flex items-center justify-center shadow-xl shadow-brand-gold/20">
            <ShoppingBag size={28} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-black mb-1">Avg. Retention</p>
            <p className="text-2xl font-black text-black italic tracking-tighter">{customers.length > 0 ? formatPrice(customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length, currency, rate) : '0'}</p>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-3xl overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="relative w-full md:w-[450px] group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
            <input 
              type="text"
              placeholder="Search by name, email or telephone identification..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-black text-black placeholder:text-gray-300 transition-all text-sm font-medium"
            />
          </div>
          <button 
            onClick={() => toast.success('Initializing filter matrix...')}
            className="flex items-center gap-3 px-8 py-4 bg-gray-50 text-black border border-gray-100 text-[10px] uppercase tracking-widest font-black rounded-2xl hover:bg-gray-100 hover:text-black transform-gpu transition-all active:scale-95"
          >
            <Filter size={16} className="text-brand-gold" />
            <span>Advanced Filters</span>
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
              <tr>
                <th className="px-10 py-6">Customer Profile</th>
                <th className="px-6 py-6">Contact Identification</th>
                <th className="px-6 py-6 text-center">Order Matrix</th>
                <th className="px-6 py-6">Lifetime Value</th>
                <th className="px-6 py-6">Last Manifest</th>
                <th className="px-10 py-6 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-all group font-sans">
                  <td className="px-10 py-8">
                    <div className="flex items-center space-x-5">
                      <div className="w-12 h-12 bg-gray-50 text-black rounded-2xl flex items-center justify-center font-black italic text-lg border border-gray-100 shadow-sm group-hover:bg-gray-100 transition-all transform group-hover:rotate-6">
                        {customer.name?.charAt(0) || '?'}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-black uppercase italic tracking-tighter transition-colors">{customer.name}</h4>
                        <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8 font-mono text-[11px] text-gray-400">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Mail size={12} className="text-gray-300" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone size={12} className="text-gray-300" />
                        <span className="text-black">{customer.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-8 text-center">
                    <span className="bg-gray-50 text-black border border-gray-100 px-4 py-1.5 rounded-xl text-[10px] font-black font-mono shadow-sm group-hover:bg-gray-100 group-hover:border-gray-200 transition-all">{customer.totalOrders || 0}</span>
                  </td>
                  <td className="px-6 py-8">
                    <span className="text-sm font-black text-black italic tracking-tighter">{formatPrice(customer.totalSpent || 0, currency, rate)}</span>
                  </td>
                  <td className="px-6 py-8">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString() : 'N/A'}</p>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button 
                      onClick={() => handleAction(customer.name)}
                      className="p-3 text-gray-400 hover:text-black hover:bg-white rounded-2xl transition-all border border-transparent hover:border-gray-100"
                    >
                      <MoreVertical size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
