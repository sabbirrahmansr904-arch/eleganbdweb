import React from 'react';
import { ShoppingCart, Search, Filter, ArrowRight } from 'lucide-react';

const AdminExchanges = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-black">Exchanges & Returns</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Manage product exchange requests</p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-6 py-3 bg-white border border-gray-100 text-black text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all rounded-xl shadow-sm">
            Download Report
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Search exchange ID or Order ID..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-sm text-black focus:border-black outline-none transition-all placeholder:text-gray-300"
            />
          </div>
          <div className="flex items-center gap-4">
            <select className="bg-white border border-gray-100 text-black text-xs px-4 py-3 rounded-xl outline-none focus:border-black shadow-sm">
              <option>All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Completed</option>
              <option>Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
              <tr>
                <th className="px-6 py-4">Request ID</th>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[1, 2, 3].map((i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-black">#EX-902{i}</td>
                  <td className="px-6 py-4 text-sm text-gray-400 font-mono">#EB-882{i}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-black">Customer Name</span>
                      <span className="text-[10px] text-gray-400 uppercase tracking-tighter">017XXXXXXXX</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-400">Size Mismatch</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-100">Pending</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-300 hover:text-black transition-colors rounded-lg hover:bg-white shadow-sm">
                      <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-gray-100 text-center bg-gray-50/30">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Showing 3 exchange requests</p>
        </div>
      </div>
    </div>

  );
};

export default AdminExchanges;
