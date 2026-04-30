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
    <div className="max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
      <div className="flex items-center space-x-3 mb-2">
        <Tag className="w-8 h-8 text-blue-800" fill="currentColor" stroke="white" strokeWidth={1} />
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventory Overview</h1>
      </div>
      <p className="text-slate-600 mb-8">High-level analytics and stock distribution metrics.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Cards */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <Box size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Unique Products</p>
            <p className="text-2xl font-black text-slate-900">{uniqueProducts}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <Box size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Units Stock</p>
            <p className="text-2xl font-black text-slate-900">{totalUnitsStock}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <PiggyBank size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Inventory Value (Cost)</p>
            <p className="text-2xl font-black text-slate-900">৳{inventoryValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="bg-pink-50 p-3 rounded-xl text-red-500">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Potential Revenue</p>
            <p className="text-2xl font-black text-slate-900">৳{potentialRevenue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mt-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2 text-slate-700">
            <Box size={20} />
            <h2 className="font-bold uppercase tracking-widest text-sm">Inventory Analytics</h2>
          </div>
          <button className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center hover:text-slate-900">
            Hide Details <ChevronDown size={14} className="ml-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* By Category */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center">
               <span className="w-4 h-4 bg-slate-200 rounded-sm inline-flex items-center justify-center mr-2"><Box size={10} /></span>
               By Category
            </h3>
            
            <div className="space-y-6">
              {categoryArray.map((cat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <p className="font-bold text-slate-700 text-sm">{cat.name}</p>
                    <p className="text-xs font-bold text-blue-600">{cat.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400">{cat.products} PRODUCTS</p>
                    <p className="text-xs font-bold text-slate-400">{cat.units} UNITS</p>
                  </div>
                </div>
              ))}
              {categoryArray.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-4">No categories found</div>
              )}
            </div>
          </div>

          {/* Top Attributes (Units) */}
          <div>
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center">
               <span className="w-4 h-4 bg-slate-200 rounded-sm inline-flex items-center justify-center mr-2"><Tag size={10} /></span>
               Top Attributes (Units)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sizeArray.map((sizeObj, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3">
                    <div className="font-black text-blue-600 text-sm w-8">{sizeObj.name}</div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{sizeObj.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{sizeObj.products} PRODUCTS</p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-slate-500">{sizeObj.units}</div>
                </div>
              ))}
              {sizeArray.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-4 col-span-2">No attributes found</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
