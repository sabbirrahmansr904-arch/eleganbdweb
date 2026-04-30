/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
import { MOCK_CUSTOMERS } from '../../constants';
import { formatPrice } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import toast from 'react-hot-toast';

export default function AdminCustomers() {
  const { currency, rate } = useCurrency();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredCustomers = MOCK_CUSTOMERS.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const handleAction = (name: string) => {
    toast.success(`Accessing profile for ${name}...`);
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif">Customer Directory</h1>
          <p className="text-sm text-gray-400 mt-2 uppercase tracking-widest">{MOCK_CUSTOMERS.length} Registered Customers</p>
        </div>
      </div>

      {/* Stats row for Customers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 border border-gray-100 shadow-sm flex items-center space-x-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Total Users</p>
            <p className="text-xl font-serif">124</p>
          </div>
        </div>
        <div className="bg-white p-6 border border-gray-100 shadow-sm flex items-center space-x-6">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Active This Month</p>
            <p className="text-xl font-serif">86</p>
          </div>
        </div>
        <div className="bg-white p-6 border border-gray-100 shadow-sm flex items-center space-x-6">
          <div className="w-12 h-12 bg-brand-muted text-brand-gold rounded-lg flex items-center justify-center">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Avg. Order Value</p>
            <p className="text-xl font-serif">{formatPrice(185, currency, rate)}</p>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-lg pl-12 pr-4 py-3 outline-none focus:ring-1 focus:ring-brand-gold text-sm"
            />
          </div>
          <button 
            onClick={() => toast.success('Initializing advanced filter configuration...')}
            className="flex items-center space-x-2 px-6 py-3 border border-gray-200 text-[10px] uppercase tracking-widest font-bold hover:bg-gray-50 transition-colors"
          >
            <Filter size={14} />
            <span>Advanced Filters</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500">
              <tr>
                <th className="px-8 py-5">Customer</th>
                <th className="px-6 py-5">Contact Info</th>
                <th className="px-6 py-5 text-center">Orders</th>
                <th className="px-6 py-5">Total Spent</th>
                <th className="px-6 py-5">Last Order</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-brand-muted rounded-full flex items-center justify-center text-brand-gold font-bold">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold uppercase tracking-widest">{customer.name}</h4>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">{customer.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 font-mono text-xs text-gray-500">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Mail size={12} className="text-gray-300" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={12} className="text-gray-300" />
                        <span>{customer.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-center">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold font-mono">{customer.totalOrders}</span>
                  </td>
                  <td className="px-6 py-6">
                    <span className="text-sm font-bold">{formatPrice(customer.totalSpent, currency, rate)}</span>
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-xs text-gray-500">{new Date(customer.lastOrderDate).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleAction(customer.name)}
                      className="p-2 text-gray-400 hover:text-brand-ink hover:bg-gray-100 rounded-full transition-all"
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
