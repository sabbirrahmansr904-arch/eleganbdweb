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
  Star,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { Product } from '../../types';
import { formatPrice, cn } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const navigate = useNavigate();
  const { products, deleteProduct, updateProduct, addProduct } = useProducts();
  const { categories } = useCategories();
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

    const regularPriceStr = formData.get('regularPrice') as string;
    const regularPrice = regularPriceStr ? parseFloat(regularPriceStr) : null;

    const productData: any = {
      id: editingProduct?.id || Date.now().toString(),
      name: formData.get('name') as string,
      price: parseFloat(formData.get('price') as string),
      category: formData.get('category') as string,
      stock: totalStock,
      sizeStock,
      description: formData.get('description') as string,
      images: uploadedImages.filter(img => img),
      sizes,
      featured: formData.get('featured') === 'on',
      newArrival: formData.get('newArrival') === 'on',
    };

    if (regularPrice !== null && !isNaN(regularPrice)) {
      productData.regularPrice = regularPrice;
    }

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-black flex items-center gap-3 italic tracking-tighter uppercase">
             <div className="p-2 bg-black text-white rounded-lg shadow-lg">
               <Box size={24} />
             </div>
             Product List
          </h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manage and browse your entire product catalog.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-4 py-3 text-[10px] uppercase tracking-widest font-black text-black hover:bg-black hover:text-white transition-all rounded-xl shadow-sm">
            <LayoutGrid size={14} className="text-brand-gold" />
            Categories
          </button>
          <button 
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 bg-black text-white px-6 py-3 text-[10px] uppercase tracking-widest font-black hover:bg-brand-gold hover:shadow-lg transition-all rounded-xl shadow-md"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search catalogue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-lg pl-12 pr-4 py-3 outline-none focus:border-brand-gold text-sm text-black transition-all"
          />
        </div>
        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full lg:w-auto">
          <div className="relative group min-w-[170px] flex-1 md:flex-none">
            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-100 rounded-lg pl-10 pr-10 py-3 outline-none focus:border-brand-gold text-[10px] uppercase tracking-widest font-black text-black cursor-pointer"
            >
              <option value="All">Category: All</option>
              {Array.from(new Set(products.map(p => p.category))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
              <tr>
                <th className="px-6 py-5">Product Details</th>
                <th className="px-6 py-5 text-center">Size Status</th>
                <th className="px-6 py-5 text-center">Inventory</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-all group font-sans">
                  <td className="px-6 py-6 font-sans">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-18 bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shadow-sm shrink-0 group-hover:border-brand-gold transition-all">
                        <img 
                          src={product.images[0]} 
                          alt={product.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <h4 className="text-sm font-black text-black uppercase italic tracking-tighter leading-tight group-hover:text-brand-gold transition-colors">{product.name}</h4>
                        <div className="flex items-center gap-3">
                          {product.featured && (
                            <span className="text-[8px] font-black bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded-sm flex items-center gap-1 shrink-0">
                              <Star size={8} className="fill-brand-gold" />
                              FEATURED
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            SKU: {product.sku || product.id.slice(0, 8)}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                            <Tag size={10} className="text-gray-400" />
                            {product.category}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                       <div className="grid grid-cols-4 gap-x-4 gap-y-2">
                         {product.sizes.map(size => (
                           <div key={size} className="flex flex-col items-center min-w-[24px]">
                             <span className="text-[8px] font-black text-gray-400 mb-0.5">{size}</span>
                             <span className={cn(
                               "text-[10px] font-mono leading-none",
                               (product.sizeStock?.[size] || 0) === 0 ? "text-red-500/50" : "text-black font-bold"
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
                          product.stock === 0 ? "text-red-500" : "text-black"
                        )}>
                          {product.stock}
                        </span>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                           <div className={cn(
                             "w-1.5 h-1.5 rounded-full",
                             product.stock === 0 ? "bg-red-500 animate-pulse" : 
                             product.stock < 10 ? "bg-amber-500" : "bg-emerald-500"
                           )} />
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Units</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="p-2 text-gray-400 hover:text-black hover:bg-black/5 rounded-xl transition-all"
                        title="View Online"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          addProduct({ ...product, id: Date.now().toString(), name: `${product.name} (Copy)` });
                          toast.success('Product duplicated');
                        }}
                        className="p-2 text-gray-400 hover:text-black hover:bg-black/5 rounded-xl transition-all"
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                      <button 
                        onClick={() => setEditingProduct(product)}
                        className="p-2 text-gray-400 hover:text-brand-gold hover:bg-brand-gold/5 rounded-xl transition-all"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setProductToDelete({ id: product.id, name: product.name })}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
              <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto border border-gray-100">
                <Box size={32} />
              </div>
              <p className="text-gray-400 font-black uppercase tracking-widest text-[10px] italic">No matching products found</p>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-12 rounded-[2rem] max-w-sm w-full text-center relative shadow-2xl border border-gray-100 font-sans"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border border-rose-100">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-black mb-4">Delete Product?</h3>
              <p className="text-gray-400 text-[10px] uppercase tracking-widest leading-loose mb-10 font-bold">
                Are you sure you want to delete <span className="text-black font-black italic underline decoration-rose-500/30">{productToDelete.name}</span>? This action is immutable.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all rounded-xl shadow-sm italic"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black bg-black text-white hover:bg-rose-600 transition-all rounded-xl shadow-lg italic"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {(isAddingNew || editingProduct) && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingNew(false);
                setEditingProduct(null);
                setUploadedImages([]);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-5xl mx-auto my-6 z-[120]"
            >
              <div className="border-0 rounded-[3rem] shadow-2xl relative flex flex-col w-full bg-black outline-none focus:outline-none overflow-hidden font-sans border border-white/10">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-10 border-b border-white/10 bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-gold text-white rounded-2xl shadow-xl">
                      {isAddingNew ? <Plus size={24} /> : <Edit2 size={24} />}
                    </div>
                    <div>
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">
                        {isAddingNew ? 'Inject Product' : 'Synchronize Product'}
                      </h3>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-1 italic">
                        {isAddingNew ? 'Defining new asset into the matrix' : 'Calibrating existing unit parameters'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingProduct(null);
                      setUploadedImages([]);
                    }}
                    className="p-3 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all shadow-sm border border-transparent hover:border-white/10"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSave} className="flex-auto p-12 max-h-[70vh] overflow-y-auto no-scrollbar bg-black">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 block ml-1">Product Name</label>
                        <input 
                          name="name"
                          defaultValue={editingProduct?.name}
                          placeholder="Ex: Prime Edition Essential Pant..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 outline-none transition-all placeholder:text-gray-600 shadow-sm"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 block ml-1">Sale Price</label>
                          <input 
                            name="price"
                            type="number"
                            step="0.01"
                            defaultValue={editingProduct?.price}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-brand-gold outline-none transition-all placeholder:text-gray-600 shadow-sm"
                            required
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 block ml-1">Regular Price</label>
                          <input 
                            name="regularPrice"
                            type="number"
                            step="0.01"
                            defaultValue={editingProduct?.regularPrice}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white/40 focus:border-brand-gold outline-none transition-all placeholder:text-gray-600 shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 block ml-1">Category</label>
                        <select 
                          name="category"
                          defaultValue={editingProduct?.category || 'UNCATEGORIZED'}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-sm font-bold text-white focus:border-brand-gold outline-none transition-all shadow-sm cursor-pointer appearance-none"
                          required
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name} className="bg-black">{cat.name}</option>
                          ))}
                          <option value="UNCATEGORIZED" className="bg-black">UNCATEGORIZED</option>
                        </select>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 block ml-1">Product Description</label>
                        <textarea 
                          name="description"
                          defaultValue={editingProduct?.description}
                          rows={6}
                          placeholder="Describe the product details..."
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-medium text-white focus:border-brand-gold outline-none transition-all placeholder:text-gray-600 shadow-sm leading-relaxed"
                          required
                        />
                      </div>
                    </div>

                    {/* Right Column: Images & Variants */}
                    <div className="space-y-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 block ml-1">Product Images (Max 4)</label>
                        <div className="grid grid-cols-4 gap-4">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className="aspect-[3/4] relative group rounded-2xl overflow-hidden border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-brand-gold transition-all shadow-sm">
                              {uploadedImages[i] ? (
                                <>
                                  <img 
                                    src={uploadedImages[i]} 
                                    className="w-full h-full object-cover" 
                                    alt="Asset Preview"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 backdrop-blur-sm">
                                    <label className="p-2 bg-white text-black rounded-lg cursor-pointer hover:scale-105 transition-all shadow-lg">
                                      <Upload size={14} />
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => handleFileChange(i, e)}
                                      />
                                    </label>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        const newImages = [...uploadedImages];
                                        newImages.splice(i, 1);
                                        setUploadedImages(newImages);
                                      }}
                                      className="p-2 bg-red-500 text-white rounded-lg hover:scale-105 transition-all shadow-lg"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                                  <div className="p-2 rounded-xl bg-white/5 text-white/20 mb-2 border border-white/10 group-hover:text-white transition-all">
                                    <ImageIcon size={18} />
                                  </div>
                                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/20 group-hover:text-white">Upload</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleFileChange(i, e)}
                                  />
                                </label>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10 shadow-sm">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 block">Available Sizes (Comma Separated)</label>
                          <input 
                            name="sizes"
                            defaultValue={editingProduct?.sizes.join(', ') || 'M, L, XL, XXL'}
                            placeholder="M, L, XL, XXL"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:border-brand-gold outline-none transition-all"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          {(editingProduct?.sizes || ['M', 'L', 'XL', 'XXL']).map(size => (
                            <div key={size} className="space-y-2">
                              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 block text-center">{size}</label>
                              <input 
                                name={`stock_${size}`}
                                type="number"
                                defaultValue={editingProduct?.sizeStock?.[size] || 0}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 text-[10px] font-bold text-center text-white focus:border-brand-gold outline-none transition-all"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <label className="flex-1 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-brand-gold transition-all cursor-pointer flex items-center justify-between group shadow-sm">
                          <div className="flex items-center gap-3">
                            <Star size={16} className="text-brand-gold fill-brand-gold" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Featured</span>
                          </div>
                          <input 
                            type="checkbox" 
                            name="featured" 
                            defaultChecked={editingProduct?.featured}
                            className="w-4 h-4 rounded border-white/20 text-brand-gold focus:ring-brand-gold bg-black" 
                          />
                        </label>
                        <label className="flex-1 p-4 rounded-xl border border-white/10 bg-white/5 hover:border-brand-gold transition-all cursor-pointer flex items-center justify-between group shadow-sm">
                          <div className="flex items-center gap-3">
                            <Box size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">New Arrival</span>
                          </div>
                          <input 
                            type="checkbox" 
                            name="newArrival" 
                            defaultChecked={editingProduct?.newArrival}
                            className="w-4 h-4 rounded border-white/20 text-brand-gold focus:ring-brand-gold bg-black" 
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Submission Footer */}
                  <div className="mt-12 flex items-center justify-between p-8 bg-white/5 rounded-2xl border border-white/10">
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Confirm Content Update</p>
                      <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">Ensure all product details are accurate before saving.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => {
                          setIsAddingNew(false);
                          setEditingProduct(null);
                          setUploadedImages([]);
                        }}
                        className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-8 py-4 bg-brand-gold text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-gold/80 shadow-lg transition-all active:scale-95 flex items-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        {editingProduct ? 'Update Product' : 'Add Product'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
