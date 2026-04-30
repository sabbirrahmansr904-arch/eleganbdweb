/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  X, 
  Plus, 
  ChevronDown, 
  Bold, 
  Italic, 
  Underline, 
  Link as LinkIcon, 
  Type, 
  AlignLeft, 
  List, 
  Quote, 
  RotateCcw,
  Library,
  Star,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useProducts } from '../../contexts/ProductContext';
import { Product } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

const SHIRT_SIZES = ['M', 'L', 'XL', 'XXL'];
const PANT_SIZES = ['30', '32', '34', '36', '38', '40'];

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { products, addProduct, updateProduct } = useProducts();
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialData, setInitialData] = useState<Partial<Product>>({});

  useEffect(() => {
    if (editId) {
      const productToEdit = products.find(p => p.id === editId);
      if (productToEdit) {
        setIsEditMode(true);
        setInitialData(productToEdit);
        setUploadedImages(productToEdit.images || []);
        setSelectedSizes(productToEdit.sizes || []);
        setQuantities(productToEdit.sizeStock || {});
      }
    }
  }, [editId, products]);

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          const newImages = [...uploadedImages];
          newImages[index] = dataUrl;
          setUploadedImages(newImages);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQuantityChange = (size: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [size]: numValue
    }));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const images = [...uploadedImages].filter(img => img);
    if (coverImageIndex < images.length && coverImageIndex !== 0) {
      const cover = images[coverImageIndex];
      images.splice(coverImageIndex, 1);
      images.unshift(cover);
    }

    const priceStr = formData.get('price') as string;
    const costStr = formData.get('cost') as string;
    const salePriceStr = formData.get('salePrice') as string;

    const price = priceStr ? parseFloat(priceStr) : 0;
    const cost = costStr ? parseFloat(costStr) : 0;
    const salePrice = salePriceStr ? parseFloat(salePriceStr) : 0;

    if (isNaN(price)) {
      toast.error('Invalid price');
      return;
    }

    // Prepare sizeStock
    const sizeStock: Record<string, number> = {};
    selectedSizes.forEach(s => {
      sizeStock[s] = quantities[s] || 0;
    });

    const productData: any = {
      ...initialData,
      id: editId || Date.now().toString(),
      sku: formData.get('sku') as string,
      name: formData.get('name') as string,
      price: price,
      cost: isNaN(cost) ? 0 : cost,
      salePrice: isNaN(salePrice) ? 0 : salePrice,
      rating: formData.get('rating') ? parseFloat(formData.get('rating') as string) : 0,
      isTopRated: formData.get('isTopRated') === 'on',
      category: formData.get('category') as string,
      fabric: formData.get('fabric') as string,
      fitType: formData.get('fitType') as string,
      stock: Object.values(sizeStock).reduce((a, b) => a + b, 0),
      sizeStock,
      description: formData.get('description') as string,
      images,
      sizes: selectedSizes,
      newArrival: isEditMode ? initialData.newArrival : true,
      featured: isEditMode ? initialData.featured : false,
    };

    try {
      if (isEditMode) {
        await updateProduct(productData);
        toast.success('Product updated successfully');
      } else {
        await addProduct(productData);
        toast.success('Product added successfully');
      }
      navigate('/admin/products');
    } catch (err) {
      toast.error(isEditMode ? 'Failed to update product' : 'Failed to add product');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-6">
        <button 
          onClick={() => navigate('/admin/products')}
          className="p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
             <div className="p-2 bg-brand-ink text-white rounded-lg shadow-lg">
               {isEditMode ? <Bold size={24} /> : <Plus size={24} />}
             </div>
             {isEditMode ? 'Edit Product' : 'Add Products'}
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {isEditMode ? `Updating SKU: ${initialData.sku || initialData.id}` : 'Create new product SKUs to start tracking their variant inventory.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Product Name</label>
              <input 
                name="name"
                defaultValue={initialData.name}
                placeholder="e.g. Premium Tech Hoodie"
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">SKU (Stock Keeping Unit)</label>
              <input 
                name="sku"
                defaultValue={initialData.sku}
                placeholder="e.g. HD-TECH-01"
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all"
              />
            </div>

            <div className="space-y-4 relative">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Category</label>
              <select 
                name="category"
                key={initialData.category}
                defaultValue={initialData.category || "Formal Shirt"}
                className="w-full appearance-none bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all cursor-pointer"
              >
                <option value="Formal Pant">Formal Pant</option>
                <option value="Formal Shirt">Formal Shirt</option>
                <option value="Cuban Shirt">Cuban Shirt</option>
                <option value="T-shirt">T-shirt</option>
                <option value="UNCATEGORIZED">UNCATEGORIZED</option>
              </select>
              <ChevronDown size={16} className="absolute right-5 bottom-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Top Rated</label>
                <div className="flex items-center gap-3 pt-1">
                  <input 
                    type="checkbox" 
                    name="isTopRated" 
                    defaultChecked={initialData.isTopRated}
                    className="w-5 h-5 rounded border-slate-200 text-brand-gold focus:ring-brand-gold" 
                  />
                  <span className="text-sm font-bold text-slate-600">Feature in Top Rated</span>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Rating (0-5)</label>
                <input 
                  name="rating" 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="5" 
                  defaultValue={initialData.rating} 
                  placeholder="4.8" 
                  className="w-full bg-white border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none ring-1 ring-slate-100 focus:ring-brand-gold transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Fabric</label>
                <input 
                  name="fabric"
                  defaultValue={initialData.fabric}
                  placeholder="e.g. 100% Refine Cotton"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Fit Type</label>
                <input 
                  name="fitType"
                  defaultValue={initialData.fitType}
                  placeholder="e.g. Slim Fit"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 text-sm font-bold placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-brand-gold/20 focus:border-brand-gold transition-all"
                />
              </div>
            </div>

            {/* Size Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">Available Sizes & Stock</label>
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Units:</span>
                  <span className="text-xs font-black text-brand-ink leading-none">
                    {Object.entries(quantities)
                      .filter(([size]) => selectedSizes.includes(size))
                      .reduce((acc, [_, qty]) => acc + (qty as number || 0), 0)}
                  </span>
                </div>
              </div>
              <div className="space-y-6 pt-2">
                <div className="space-y-4">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Apparel (Shirt/T-Shirt)</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {SHIRT_SIZES.map(size => (
                      <div key={size} className="space-y-2">
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={cn(
                            "w-full px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-between",
                            selectedSizes.includes(size) ? "bg-brand-ink text-white border-brand-ink" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                          )}
                        >
                          {size}
                          {selectedSizes.includes(size) && <CheckCircle2 size={10} className="text-brand-gold fill-brand-gold" />}
                        </button>
                        {selectedSizes.includes(size) && (
                          <div className="relative group">
                            <input 
                              type="number"
                              min="0"
                              placeholder="Qty"
                              value={quantities[size] || ''}
                              onChange={(e) => handleQuantityChange(size, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase">PCS</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bottoms (Pants)</span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {PANT_SIZES.map(size => (
                      <div key={size} className="space-y-2">
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={cn(
                            "w-full px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-between",
                            selectedSizes.includes(size) ? "bg-brand-ink text-white border-brand-ink" : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                          )}
                        >
                          {size}
                          {selectedSizes.includes(size) && <CheckCircle2 size={10} className="text-brand-gold fill-brand-gold" />}
                        </button>
                        {selectedSizes.includes(size) && (
                          <div className="relative group">
                            <input 
                              type="number"
                              min="0"
                              placeholder="Qty"
                              value={quantities[size] || ''}
                              onChange={(e) => handleQuantityChange(size, e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-brand-gold/30 focus:border-brand-gold transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase">PCS</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Description</label>
              <div className="border border-slate-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-gold/20 focus-within:border-brand-gold transition-all">
                <textarea 
                  name="description"
                  defaultValue={initialData.description}
                  placeholder="Write detailed product information..."
                  rows={8}
                  className="w-full bg-white px-5 py-4 text-sm font-medium outline-none resize-none placeholder:text-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block">Cost (৳)</label>
              <input name="cost" type="number" defaultValue={initialData.cost} placeholder="0.00" className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none ring-1 ring-slate-100 focus:ring-brand-gold transition-all" />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-ink block">Price (৳)</label>
              <input name="price" type="number" defaultValue={initialData.price} placeholder="0.00" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none ring-1 ring-slate-100 focus:ring-brand-gold transition-all" />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-500 block">Sale (৳)</label>
              <input name="salePrice" type="number" defaultValue={initialData.salePrice} placeholder="0.00" className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none ring-1 ring-slate-100 focus:ring-rose-500 transition-all" />
            </div>
          </div>
        </div>

        {/* Right Column: Media */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Media Management</h3>
              <button type="button" className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors">
                <Library size={12} />
                Library: {uploadedImages.length} Photos
              </button>
            </div>

            {/* Main Cover */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Cover Photo (Main)</label>
              <div className="relative aspect-[4/3] bg-slate-50 rounded-2xl overflow-hidden border-2 border-dashed border-slate-200 group">
                {uploadedImages[coverImageIndex] ? (
                  <>
                    <img 
                      src={uploadedImages[coverImageIndex]} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute top-4 left-4 bg-[#FF4D4D] text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-widest shadow-xl">
                       <Star size={10} className="fill-white text-white" />
                       Primary Cover
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const newImgs = [...uploadedImages];
                        newImgs.splice(coverImageIndex, 1);
                        setUploadedImages(newImgs);
                        setCoverImageIndex(0);
                      }}
                      className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white p-2 rounded-lg hover:bg-rose-500 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100/50 transition-colors">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-slate-400">
                      <Upload size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Drag or click to upload cover</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(uploadedImages.length, e)} />
                  </label>
                )}
              </div>
            </div>

            {/* Gallery */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block ml-1">Gallery Images</label>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: Math.max(4, uploadedImages.length + 1) }).map((_, i) => (
                  <label key={i} className="aspect-square bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all relative group">
                    {uploadedImages[i] ? (
                      <>
                        <img src={uploadedImages[i]} className="w-full h-full object-cover" />
                        {i === coverImageIndex && (
                           <div className="absolute inset-0 bg-brand-ink/40 flex items-center justify-center">
                              <Star size={12} className="fill-brand-gold text-brand-gold" />
                           </div>
                        )}
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setCoverImageIndex(i);
                          }}
                          className="absolute bottom-2 right-2 p-1.5 bg-white/20 backdrop-blur-md rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                          title="Set as Cover"
                        >
                          <Star size={10} className={cn("text-white", i === coverImageIndex && "fill-brand-gold text-brand-gold")} />
                        </button>
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="text-slate-200" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(i, e)} />
                      </>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-brand-ink text-white py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-brand-gold hover:shadow-2xl hover:shadow-brand-gold/20 transition-all active:scale-[0.98]"
          >
            {isEditMode ? 'Update Product Portfolio' : 'Create Product Portfolio'}
          </button>
        </div>
      </form>
    </div>
  );
}
