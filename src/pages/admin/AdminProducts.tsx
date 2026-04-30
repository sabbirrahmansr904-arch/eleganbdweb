/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  Eye,
  Download,
  X,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  EyeOff,
  Layers,
  Box,
  LayoutGrid,
  Book,
  Tag,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProducts } from '../../contexts/ProductContext';
import { Product } from '../../types';
import { formatPrice, cn } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const navigate = useNavigate();
  const { products, deleteProduct, updateProduct, addProduct } = useProducts();
  const { currency, rate } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{id: string, name: string} | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  React.useEffect(() => {
    if (editingProduct) {
      setUploadedImages(editingProduct.images || []);
    } else {
      setUploadedImages([]);
    }
  }, [editingProduct]);

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image is too large. Please select a file under 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality to keep base64 string small
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          // Check if dataUrl is roughly within 600KB base64 string size, which is safe for Firestore
          if (dataUrl.length > 700000) {
              toast.error('Image is still too complex/large after compression. Try a simpler image.');
              return;
          }
          
          const newImages = [...uploadedImages];
          newImages[index] = dataUrl;
          setUploadedImages(newImages);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete.id);
        toast.success(`${productToDelete.name} has been deleted.`);
      } catch (err) {
        toast.error('Failed to delete product');
      } finally {
        setProductToDelete(null);
      }
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sizes = (formData.get('sizes') as string).split(',').map(s => s.trim());
    const sizeStock: Record<string, number> = {};
    let totalStock = 0;
    sizes.forEach(size => {
      const stock = parseInt(formData.get(`stock_${size}`) as string) || 0;
      sizeStock[size] = stock;
      totalStock += stock;
    });

    const productData: any = {
      id: editingProduct?.id || Date.now().toString(),
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      regularPrice: parseFloat(formData.get('regularPrice') as string) || undefined,
      category: formData.get('category') as string,
      stock: totalStock,
      sizeStock,
      description: formData.get('description') as string,
      images: uploadedImages.filter(img => img),
      sizes,
      featured: formData.get('featured') === 'on',
      newArrival: formData.get('newArrival') === 'on',
    };

    if (editingProduct) {
      updateProduct(productData);
      toast.success('Product updated successfully');
    } else {
      addProduct(productData);
      toast.success('Product added successfully');
    }
    setEditingProduct(null);
    setIsAddingNew(false);
    setUploadedImages([]);
  };
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
             <div className="p-2 bg-brand-ink text-white rounded-lg shadow-lg">
               <Box size={24} />
             </div>
             Product List
          </h1>
          <p className="text-sm text-slate-500 font-medium">Manage and browse your entire product catalog.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-slate-50 transition-all rounded-lg shadow-sm">
            <LayoutGrid size={14} className="text-brand-gold" />
            Category Manager
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-slate-50 transition-all rounded-lg shadow-sm">
            <Book size={14} className="text-brand-gold" />
            Attribute Manager
          </button>
          <button 
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 bg-brand-ink text-white px-5 py-2.5 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold hover:shadow-lg transition-all rounded-lg shadow-md"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search catalogue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-12 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold text-sm transition-all"
          />
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full lg:w-auto">
          <div className="relative group min-w-[160px] flex-1 md:flex-none">
            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-brand-gold/20 text-[10px] uppercase tracking-widest font-black text-slate-600 cursor-pointer"
            >
              <option value="All">Category: All</option>
              {Array.from(new Set(products.map(p => p.category))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <button className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-lg text-[10px] uppercase tracking-widest font-black text-slate-600 hover:bg-slate-100 transition-all flex-1 md:flex-none">
            <Layers size={14} />
            Filter
          </button>
          <div className="relative min-w-[160px] flex-1 md:flex-none">
            <Eye size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-lg pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-gold/20 text-[10px] uppercase tracking-widest font-black text-slate-600 cursor-pointer">
              <option>Visibility: All</option>
              <option>Public Only</option>
              <option>Hidden Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-[0.2em] font-black text-slate-500">
              <tr>
                <th className="pl-6 py-5 w-8">
                  <input type="checkbox" className="rounded border-slate-300 text-brand-ink focus:ring-brand-ink" />
                </th>
                <th className="px-6 py-5">Product Essence</th>
                <th className="px-6 py-5 text-center">Active Matrix</th>
                <th className="px-6 py-5 text-center">Available Stock</th>
                <th className="px-8 py-5 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="pl-6 py-4">
                    <input type="checkbox" className="rounded border-slate-300 text-brand-ink focus:ring-brand-ink" />
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-18 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm shrink-0 group-hover:shadow-md transition-shadow">
                        <img 
                          src={product.images[0]} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <h4 className="text-sm font-black text-slate-800 uppercase italic tracking-tighter leading-tight group-hover:text-brand-gold transition-colors">{product.name}</h4>
                        <div className="flex items-center gap-3">
                          {product.isTopRated && (
                            <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-sm flex items-center gap-1 shrink-0">
                              <Star size={8} className="fill-amber-600" />
                              TOP RATED
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-brand-ink uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-sm">
                            SKU: {product.sku || product.id}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <Tag size={10} className="text-slate-300" />
                            {product.category}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Size Status</span>
                       <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                         {product.sizes.map(size => (
                           <div key={size} className="flex flex-col items-center min-w-[24px]">
                             <span className="text-[8px] font-black text-slate-400 mb-0.5">{size}</span>
                             <span className={cn(
                               "text-[11px] font-mono leading-none",
                               (product.sizeStock?.[size] || 0) === 0 ? "text-slate-200" : "text-brand-ink font-bold"
                             )}>
                               {product.sizeStock?.[size] || 0}
                             </span>
                           </div>
                         ))}
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-[180px]">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="text-center">
                        <span className={cn(
                          "text-2xl font-black italic tracking-tighter leading-none block",
                          product.stock === 0 ? "text-red-500" : "text-slate-900"
                        )}>
                          {product.stock}
                        </span>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                           <div className={cn(
                             "w-1.5 h-1.5 rounded-full",
                             product.stock === 0 ? "bg-red-500 animate-pulse" : 
                             product.stock < 10 ? "bg-amber-500" : "bg-emerald-500"
                           )} />
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inventory Level</span>
                        </div>
                      </div>
                      <div className="w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
                         <div 
                           className={cn(
                             "h-full transition-all duration-1000",
                             product.stock === 0 ? "bg-red-500 w-full opacity-30" : 
                             product.stock < 10 ? "bg-amber-500" : "bg-emerald-500"
                           )}
                           style={{ width: `${Math.min((product.stock / 50) * 100, 100)}%` }}
                         />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 text-slate-400 hover:text-brand-ink hover:bg-slate-100 rounded-lg transition-all" title="Toggle Visibility">
                        <EyeOff size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="p-2 text-slate-400 hover:text-brand-ink hover:bg-slate-100 rounded-lg transition-all"
                        title="View Online"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          addProduct({ ...product, id: Date.now().toString(), name: `${product.name} (Copy)` });
                          toast.success('Product duplicated');
                        }}
                        className="p-2 text-slate-400 hover:text-brand-ink hover:bg-slate-100 rounded-lg transition-all"
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/admin/products/add?edit=${product.id}`)}
                        className="p-2 text-slate-400 hover:text-brand-gold hover:bg-slate-100 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto">
                <Box size={32} />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No matching products found</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
           <span>Total: {filteredProducts.length} Items</span>
           <div className="flex gap-4">
             <span>Items per page: 10</span>
             <span>Page 1 of 1</span>
           </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-brand-ink/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-12 rounded-2xl max-w-sm w-full text-center relative shadow-2xl"
            >
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-serif mb-4">Delete Product?</h3>
              <p className="text-gray-400 text-xs uppercase tracking-widest leading-loose mb-10">
                Are you sure you want to delete <span className="text-brand-ink font-bold">{productToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-4 text-[10px] uppercase tracking-widest font-bold bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-4 text-[10px] uppercase tracking-widest font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
