import React from 'react';
import { Tag, Box, PiggyBank, TrendingUp, ChevronDown } from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import { motion } from 'motion/react';

export default function AdminInventoryOverview() {
  const { products } = useProducts();

  // Calculations
  const uniqueProducts = products.length;
  
  // Total units stock
  const totalUnitsStock = products.reduce((total, product) => {
    return total + (product.stock || 0);
  }, 0);

  // Inventory Value (Cost) - Assuming cost is same as price for now or need a separate field. We'll use price.
  const inventoryValue = products.reduce((total, product) => {
    return total + (product.price * (product.stock || 0));
  }, 0);

  // Potential Revenue
  const potentialRevenue = products.reduce((total, product) => {
      // Maybe regular price vs discount
      return total + ((product.originalPrice || product.price) * (product.stock || 0));
  }, 0);


  // Group by category
  const categories: Record<string, { products: number; units: number }> = {};
  products.forEach(p => {
    const cat = p.category;
    if (!categories[cat]) categories[cat] = { products: 0, units: 0 };
    categories[cat].products += 1;
    categories[cat].units += p.stock || 0;
  });

  const categoryArray = Object.entries(categories).map(([name, data]) => ({
    name,
    products: data.products,
    units: data.units,
    percentage: totalUnitsStock > 0 ? (data.units / totalUnitsStock) * 100 : 0
  }));

  // Group by size attributes
  const sizes: Record<string, { products: number; units: number }> = {};
  products.forEach(p => {
    if (p.sizes) {
      p.sizes.forEach(size => {
         if (!sizes[size]) sizes[size] = { products: 0, units: 0 };
         sizes[size].products += 1; // It has this size
         const sStock = p.sizeStock ? (p.sizeStock[size] || 0) : 0;
         sizes[size].units += sStock; 
      });
    }
  });

  const sizeArray = Object.entries(sizes).map(([name, data]) => ({
    name,
    products: data.products,
    units: data.units,
  })).sort((a, b) => {
      const order = ['M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL'];
      return order.indexOf(a.name) - order.indexOf(b.name);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-black">
      <div className="flex items-center space-x-4 mb-4 bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:bg-gray-100/50">
        <div className="p-3 bg-black text-white rounded-2xl shadow-lg">
          <Box className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-black">Inventory Metrics</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">High-level analytics and stock distribution matrix.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 group hover:border-black transition-all">
          <div className="bg-gray-50 p-3 rounded-xl text-black border border-gray-100 group-hover:bg-black group-hover:text-white transition-all">
            <Box size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Unique SKUs</p>
            <p className="text-2xl font-black italic tracking-tighter text-black">{uniqueProducts}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 group hover:border-black transition-all">
          <div className="bg-gray-50 p-3 rounded-xl text-black border border-gray-100 group-hover:bg-black group-hover:text-white transition-all">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Stock Pool</p>
            <p className="text-2xl font-black italic tracking-tighter text-black">{totalUnitsStock}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 group hover:border-emerald-500 transition-all">
          <div className="bg-gray-50 p-3 rounded-xl text-emerald-500 border border-gray-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <PiggyBank size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Warehouse Value</p>
            <p className="text-2xl font-black italic tracking-tighter text-black">৳{inventoryValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4 group hover:border-black transition-all">
          <div className="bg-black p-3 rounded-xl text-white shadow-xl shadow-black/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Projected Revenue</p>
            <p className="text-2xl font-black italic tracking-tighter text-black">৳{potentialRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mt-6 transition-all hover:bg-gray-50/30">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center space-x-3 text-black">
            <Box size={20} className="text-brand-gold" />
            <h2 className="font-black uppercase tracking-[0.2em] text-xs italic">Analytical Distribution</h2>
          </div>
          <button className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center hover:text-black transition-colors">
            EXPAND VIEW <ChevronDown size={14} className="ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* By Category */}
          <div className="space-y-8">
            <h3 className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-6 flex items-center">
               <span className="w-6 h-6 bg-black text-white rounded flex items-center justify-center mr-3 italic">C</span>
               Category Breakdown
            </h3>
            
            <div className="space-y-8">
              {categoryArray.map((cat, idx) => (
                <div key={idx} className="space-y-3 group">
                  <div className="flex justify-between items-end">
                    <p className="font-black text-black text-[11px] uppercase tracking-widest group-hover:text-brand-gold transition-all">{cat.name}</p>
                    <p className="text-[10px] font-black text-brand-gold">{cat.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 1, ease: "circOut" }}
                      className="h-full bg-black rounded-full" 
                    />
                  </div>
                  <div className="flex justify-between items-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <p>{cat.products} SKUS</p>
                    <p>{cat.units} TOTAL UNITS</p>
                  </div>
                </div>
              ))}
              {categoryArray.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4 italic">No data detected</div>
              )}
            </div>
          </div>

          {/* Top Attributes (Units) */}
          <div className="space-y-8">
             <h3 className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] mb-6 flex items-center">
               <span className="w-6 h-6 bg-black text-white rounded flex items-center justify-center mr-3 italic">A</span>
               Attribute Distribution
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {sizeArray.map((sizeObj, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-black transition-all group shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-lg font-black text-black group-hover:text-brand-gold transition-all italic">{sizeObj.name}</span>
                    <div className="w-2 h-2 rounded-full bg-brand-gold/30 group-hover:bg-brand-gold animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{sizeObj.products} SKUs</p>
                    <p className="text-xs font-black text-black">{sizeObj.units} Units</p>
                  </div>
                </div>
              ))}
              {sizeArray.length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4 col-span-3 italic">No attributes found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
