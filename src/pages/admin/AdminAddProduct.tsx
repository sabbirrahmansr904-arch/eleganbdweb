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
  CheckCircle2,
  Save,
  Trash2,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { Product } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { autoSaveToMediaLibrary } from '../../utils/mediaLibrary';

const SHIRT_SIZES = ['M', 'L', 'XL', 'XXL'];
const PANT_SIZES = ['28', '30', '32', '34', '36', '38', '40'];

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { products, addProduct, updateProduct } = useProducts();
  const { categories, addCategory, deleteCategory } = useCategories();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [initialData, setInitialData] = useState<Partial<Product>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isBestSelling, setIsBestSelling] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [coverFit, setCoverFit] = useState<'contain' | 'cover'>('contain');
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  const handleDeleteCategory = async () => {
    if (selectedCategory === 'UNCATEGORIZED') return;
    
    const categoryToDelete = categories.find(c => c.name === selectedCategory);
    if (!categoryToDelete) return;

    try {
      await deleteCategory(categoryToDelete.id);
      setSelectedCategory(categories.find(c => c.id !== categoryToDelete.id)?.name || 'UNCATEGORIZED');
      toast.success('Category deleted successfully');
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryName.trim()) {
      setShowNewCategoryInput(false);
      return;
    }
    
    const trimmedName = newCategoryName.trim();
    // Check for duplicates
    if (categories.some(cat => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('This category already exists');
      return;
    }

    const slug = trimmedName.toLowerCase().replace(/\s+/g, '-');
    const newCat = {
      id: `cat-${Date.now()}`,
      name: trimmedName,
      slug,
      image: '',
      description: ''
    };
    try {
      await addCategory(newCat);
      setSelectedCategory(newCat.name);
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      toast.success('Category added successfully');
    } catch (err: any) {
      console.error('Error adding category:', err);
      toast.error(err?.message || 'Failed to add category');
    }
  };

  useEffect(() => {
    if (editId) {
      const productToEdit = products.find(p => p.id === editId);
      if (productToEdit) {
        setIsEditMode(true);
        setInitialData(productToEdit);
        setUploadedImages(productToEdit.images || []);
        setSelectedSizes(productToEdit.sizes || []);
        setQuantities(productToEdit.sizeStock || {});
        setSelectedCategory(productToEdit.category || '');
        setIsBestSelling(!!(productToEdit.featured || productToEdit.bestSelling));
        setIsNewArrival(productToEdit.newArrival !== undefined ? productToEdit.newArrival : true);
      }
    } else if (categories.length > 0) {
      setSelectedCategory(categories[0].name);
    }
  }, [editId, products, categories]);

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter(s => s !== size));
      const newQuantities = { ...quantities };
      delete newQuantities[size];
      setQuantities(newQuantities);
    } else {
      setSelectedSizes([...selectedSizes, size]);
      setQuantities({ ...quantities, [size]: 0 });
    }
  };

  const getSizesForCategory = () => {
    const cat = selectedCategory.toLowerCase();
    if (cat.includes('bag')) return ['QN'];
    if (cat.includes('pant')) return PANT_SIZES;
    if (cat.includes('shirt')) return ['M', 'L', 'XL', 'XXL'];
    return ['40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL', '11XL'];
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
          const MAX_WIDTH = 1254;
          const MAX_HEIGHT = 1254;
          
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          
          canvas.width = Math.round(width);
          canvas.height = Math.round(height);
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, Math.round(width), Math.round(height));
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          
          const newImages = [...uploadedImages];
          if (index < newImages.length) {
            newImages[index] = dataUrl;
          } else {
            newImages.push(dataUrl);
          }
          setUploadedImages(newImages);

          // Auto save uploaded image to Media Library
          autoSaveToMediaLibrary(dataUrl, {
            name: file.name ? file.name.replace(/\.[^/.]+$/, "") : `Product Photo ${index + 1}`,
            category: 'Product Catalog',
            source: 'product'
          });
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

    // Images are stored directly (compressed base64 or URLs)
    let finalImages = [...images];

    const priceStr = formData.get('price') as string;
    const costStr = formData.get('cost') as string;
    const regularPriceStr = formData.get('regularPrice') as string;

    const price = priceStr ? parseFloat(priceStr) : 0;
    const cost = costStr ? parseFloat(costStr) : 0;
    const regularPrice = regularPriceStr ? parseFloat(regularPriceStr) : null;

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
      sku: (formData.get('sku') as string) || '',
      name: (formData.get('name') as string) || '',
      price: price,
      cost: isNaN(cost) ? 0 : cost,
      rating: formData.get('rating') ? parseFloat(formData.get('rating') as string) : 0,
      isTopRated: formData.get('isTopRated') === 'on',
      category: (formData.get('category') as string) || selectedCategory,
      fabric: (formData.get('fabric') as string) || '',
      fitType: (formData.get('fitType') as string) || '',
      stock: Object.values(sizeStock).reduce((a, b) => a + b, 0),
      sizeStock,
      description: (formData.get('description') as string) || '',
      images: finalImages,
      sizes: selectedSizes,
      newArrival: isNewArrival,
      featured: isBestSelling,
      bestSelling: isBestSelling,
    };

    if (regularPrice !== null && !isNaN(regularPrice)) {
      productData.regularPrice = regularPrice;
    }

    try {
      if (isEditMode) {
        await updateProduct(productData);
        toast.success('Product updated successfully');
      } else {
        await addProduct(productData);
        toast.success('Product added successfully');
      }
      // Stay in admin panel - redirect back to products list
      navigate('/admin/products');
    } catch (err) {
      toast.error(isEditMode ? 'Failed to update product' : 'Failed to add product');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] -m-4 md:-m-8 p-4 md:p-10 space-y-8 pb-20 font-sans text-gray-800">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          onClick={() => navigate('/admin/products')}
          className="p-2.5 bg-[#F8F9FD] rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-gray-400 hover:text-black"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
            <Plus size={20} className="stroke-[3]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a1c21] tracking-tight">
              {isEditMode ? 'Edit Product' : 'Add Products'}
            </h1>
            <p className="text-[11px] text-gray-400 font-medium tracking-wide">
              Create new product SKUs to start tracking their variant inventory.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isEditMode && (
            <button 
              type="button"
              onClick={() => window.open(`/product/${editId}`, '_blank')}
              className="px-6 py-2.5 bg-[#F8F9FD] border border-gray-100 text-gray-500 rounded-xl text-[11px] font-black uppercase tracking-widest hover:text-black hover:shadow-md transition-all flex items-center gap-2"
            >
              <ExternalLink size={16} />
              Preview on Website
            </button>
          )}
          <button 
            type="submit"
            form="product-form"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
          >
            <Save size={16} />
            {isEditMode ? 'Save Changes' : 'Save Product'}
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSave} className="space-y-8">
        <div className="bg-[#F8F9FD] border border-gray-100 rounded-[2rem] p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Details */}
          <div className="lg:col-span-6 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block ml-1">Product Name</label>
              <input 
                name="name"
                defaultValue={initialData.name}
                placeholder="e.g. Premium Tech Hoodie"
                required
                className="w-full bg-[#fcfdfe] border border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-200 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block ml-1">SKU (Stock Keeping Unit)</label>
              <input 
                name="sku"
                defaultValue={initialData.sku}
                placeholder="E.G. HD-TECH-01"
                className="w-full bg-[#fcfdfe] border border-gray-100 rounded-xl px-5 py-4 text-sm font-semibold text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-200 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block">Category</label>
                <button 
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 hover:text-blue-600 transition-colors"
                >
                  <Plus size={12} /> {showNewCategoryInput ? 'Cancel' : 'New Category'}
                </button>
              </div>
              
              {showNewCategoryInput ? (
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name..."
                    className="flex-1 bg-[#f1f3f8] border border-blue-100 rounded-xl px-5 py-3 text-[10px] font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewCategory();
                      }
                    }}
                  />
                  <button 
                    type="button"
                    onClick={handleAddNewCategory}
                    className="bg-blue-500 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <select 
                      name="category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full appearance-none bg-[#f1f3f8] border border-transparent rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                      <option key="uncategorized-static" value="UNCATEGORIZED">UNCATEGORIZED</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {selectedCategory !== 'UNCATEGORIZED' && (
                    <button
                      type="button"
                      onClick={handleDeleteCategory}
                      className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                      title="Delete selected category"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block">Description</label>
                <button 
                  type="button"
                  onClick={() => {
                    const textarea = document.querySelector('textarea[name="description"]') as HTMLTextAreaElement;
                    if (textarea) {
                      const template = `Product overview and details:
• Experience unmatched smoothness and comfort that makes you feel confident. With our Cotton Solid Shirt, you get the goodness of the finest carbon cotton. Precisely stitched for a tailored fit, this full-sleeve shirt ensures you look polished from AM to PM. Known for its lightweight feel and versatility, it’s available in 12 timeless shades and multiple sizes. Pick yours today and elevate your wardrobe with timeless elegance!

Size & Fit:
• Every Shirt is tailored with regular fit over years of testing.
• Our model (Height: 6ft, Chest: 40") is wearing a Large size.
• Please refer to the size chart for more accuracy.

Wash Care:
• Normal machine wash
• Do not use bleach, fabric softener
• Iron on low temperature
• Air dry or low tumble dry`;
                      textarea.value = template;
                      // Trigger React's onChange if needed, but since it's defaultValue it might work
                    }
                  }}
                  className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-600 transition-colors"
                >
                  ✨ Use Template
                </button>
              </div>
              <div className="border border-gray-100 rounded-2xl overflow-hidden bg-[#fcfdfe]">
                {/* Mock Rich Text Toolbar */}
                <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-[#F8F9FD]">
                  <select className="text-[10px] font-bold bg-transparent outline-none text-gray-600 mr-2">
                    <option>Normal</option>
                  </select>
                  <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                  <button type="button" className="p-1 hover:bg-gray-50 rounded"><Bold size={14} className="text-gray-600" /></button>
                  <button type="button" className="p-1 hover:bg-gray-50 rounded"><Italic size={14} className="text-gray-600" /></button>
                  <button type="button" className="p-1 hover:bg-gray-50 rounded"><Underline size={14} className="text-gray-600" /></button>
                  <button type="button" className="p-1 hover:bg-gray-50 rounded"><LinkIcon size={14} className="text-gray-600" /></button>
                  <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                  <button type="button" className="p-1 hover:bg-gray-50 rounded"><List size={14} className="text-gray-600" /></button>
                </div>
                <textarea 
                  name="description"
                  defaultValue={initialData.description}
                  placeholder="Write detailed product information..."
                  rows={6}
                  className="w-full bg-transparent px-5 py-4 text-sm font-medium text-gray-600 outline-none resize-none placeholder:text-gray-300 no-scrollbar"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-red-500 block ml-1">Cost (৳)</label>
                <input name="cost" type="number" step="any" defaultValue={initialData.cost} placeholder="0" className="w-full bg-[#fcfdfe] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-200" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-500 block ml-1">Price (৳)</label>
                <input name="price" type="number" step="any" defaultValue={initialData.price} placeholder="0" required className="w-full bg-[#fcfdfe] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-200" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-orange-400 block ml-1">Regular (৳)</label>
                <input name="regularPrice" type="number" step="any" defaultValue={initialData.regularPrice} placeholder="None" className="w-full bg-[#fcfdfe] border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-200" />
              </div>
            </div>

            {/* Homepage Showcase Section Toggles */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block ml-1">
                Homepage Showcase Sections
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Best Selling Toggle */}
                <div 
                  onClick={() => setIsBestSelling(!isBestSelling)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none",
                    isBestSelling 
                      ? "bg-indigo-50/70 border-indigo-200 text-indigo-950 shadow-2xs" 
                      : "bg-[#fcfdfe] border-gray-100 text-gray-500 hover:border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                      isBestSelling ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-400"
                    )}>
                      ⭐
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">Best Selling</p>
                      <p className="text-[10px] text-gray-400 font-medium">Show in Best Selling section</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    isBestSelling ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 bg-[#F8F9FD]"
                  )}>
                    {isBestSelling && <CheckCircle2 size={12} />}
                  </div>
                </div>

                {/* New Arrival Toggle */}
                <div 
                  onClick={() => setIsNewArrival(!isNewArrival)}
                  className={cn(
                    "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between select-none",
                    isNewArrival 
                      ? "bg-rose-50/70 border-rose-200 text-rose-950 shadow-2xs" 
                      : "bg-[#fcfdfe] border-gray-100 text-gray-500 hover:border-gray-200"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                      isNewArrival ? "bg-rose-600 text-white shadow-sm" : "bg-gray-100 text-gray-400"
                    )}>
                      🔥
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight">New Arrival</p>
                      <p className="text-[10px] text-gray-400 font-medium">Show in New Arrival section</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    isNewArrival ? "bg-rose-600 border-rose-600 text-white" : "border-gray-200 bg-[#F8F9FD]"
                  )}>
                    {isNewArrival && <CheckCircle2 size={12} />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Media */}
          <div className="lg:col-span-6 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-700 flex items-center gap-2">
                  Media Management
                </h3>
              </div>
              <div className="flex items-center gap-4">
                <button type="button" className="text-[9px] font-black uppercase tracking-widest text-[#7c9cf8] flex items-center gap-1">
                  <Library size={12} /> Library
                </button>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">
                  {uploadedImages.length} Photos
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 block">Cover Photo (Main)</label>
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100/80 px-2 py-0.5 rounded-md">
                    1254 × 1254 PX (1:1)
                  </span>
                </div>
                {uploadedImages[coverImageIndex] && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCoverFit(prev => prev === 'contain' ? 'cover' : 'contain')}
                      className="text-[9px] font-bold text-gray-600 hover:text-blue-600 bg-white hover:bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                      title="Toggle image display mode"
                    >
                      {coverFit === 'contain' ? 'Fit (Contain)' : 'Fill (Cover)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewModalImage(uploadedImages[coverImageIndex])}
                      className="text-[9px] font-bold text-gray-600 hover:text-blue-600 bg-white hover:bg-gray-50 border border-gray-200 p-1.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                      title="Full Resolution Preview (1254 × 1254)"
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* 1254 x 1254 px aspect-square display box */}
              <div className="relative aspect-square max-w-[560px] mx-auto w-full bg-[#f8fafc] rounded-2xl overflow-hidden border border-gray-200 group transition-all shadow-xs flex items-center justify-center">
                {uploadedImages[coverImageIndex] ? (
                  <>
                    <img 
                      src={uploadedImages[coverImageIndex]} 
                      alt="Cover Preview (1254 × 1254)"
                      className={cn(
                        "w-full h-full transition-transform duration-300 group-hover:scale-[1.01]",
                        coverFit === 'contain' ? "object-contain p-2" : "object-cover object-top"
                      )} 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      <button
                        type="button"
                        onClick={() => setPreviewModalImage(uploadedImages[coverImageIndex])}
                        className="bg-white/90 backdrop-blur-md text-gray-700 hover:text-blue-600 p-2 rounded-xl hover:bg-white transition-all shadow-md cursor-pointer"
                        title="View Full 1254 × 1254"
                      >
                        <Maximize2 size={16} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const newImgs = [...uploadedImages];
                          newImgs.splice(coverImageIndex, 1);
                          setUploadedImages(newImgs);
                          setCoverImageIndex(0);
                        }}
                        className="bg-white/90 backdrop-blur-md text-gray-700 hover:text-red-600 p-2 rounded-xl hover:bg-white transition-all shadow-md cursor-pointer"
                        title="Remove Photo"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/40 transition-all text-center p-8">
                    <div className="relative mb-6">
                       <div className="absolute inset-0 bg-[#F8F9FD] opacity-40 blur-2xl rounded-full" />
                       <div className="relative w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center text-blue-500 border border-blue-100">
                         <Upload size={32} className="stroke-[1.5]" />
                       </div>
                    </div>
                    <span className="text-[11px] font-black text-blue-600 uppercase tracking-[0.15em] mb-1">Select Main Thumbnail</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">1254 × 1254 PX (1:1 Square) Recommended</span>
                    <span className="text-[8px] font-medium text-gray-300 italic mt-1">High Quality 1:1 Edge-to-Edge Fit</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(uploadedImages.length, e)} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 block">Gallery Images</label>
                  <span className="text-[9px] font-bold text-gray-400">1:1 Square</span>
                </div>
                <label className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={12} /> Add More
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(uploadedImages.length, e)} />
                </label>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {uploadedImages.map((img, i) => (
                  i !== coverImageIndex && (
                    <div key={i} className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-200 group shadow-xs flex items-center justify-center">
                      <img src={img} alt="" className="w-full h-full object-contain p-1" />
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                        <button
                          type="button"
                          onClick={() => setPreviewModalImage(img)}
                          className="bg-white/90 text-gray-700 hover:text-blue-600 p-1.5 rounded-lg transition-all shadow-md cursor-pointer"
                          title="Zoom"
                        >
                          <Maximize2 size={12} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            const newImgs = [...uploadedImages];
                            newImgs.splice(i, 1);
                            setUploadedImages(newImgs);
                            if (coverImageIndex === i) setCoverImageIndex(0);
                            else if (coverImageIndex > i) setCoverImageIndex(coverImageIndex - 1);
                          }}
                          className="bg-white/90 text-gray-700 hover:text-red-600 p-1.5 rounded-lg transition-all shadow-md cursor-pointer"
                          title="Remove Image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )
                ))}
                {uploadedImages.length <= 1 && (
                  <div className="col-span-full h-28 bg-[#F8F9FD] border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">No Additional Gallery Images</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-red-50/50 border border-red-50 p-4 rounded-xl flex items-center gap-3">
              <div className="w-6 h-6 bg-[#F8F9FD] rounded-full flex items-center justify-center text-red-400 shadow-sm flex-shrink-0">
                <Plus size={12} className="rotate-45" />
              </div>
              <p className="text-[9px] text-red-500/70 font-bold tracking-wide">
                <span className="text-red-500 font-black">TIP:</span> Drag items to reorder. Cover photo is shown first on storefront.
              </p>
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <div className="bg-[#F8F9FD] border border-gray-100 rounded-[2rem] p-10 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-[#1a1c21] uppercase tracking-[0.1em]">Product Attributes (Variants)</h3>
              <p className="text-[10px] text-gray-400 font-medium mt-1">Select the sizes, colors, or variations for this product.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="px-4 py-2 bg-blue-50/50 rounded-lg text-blue-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-500 rounded-sm" /> Select All
              </button>
              <button type="button" className="px-4 py-2 bg-gray-50 rounded-lg text-gray-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                <Type size={12} /> Manager
              </button>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-50">
            <div className="p-1 bg-[#F8F9FD] rounded-xl w-fit mb-8 border border-gray-100 shadow-sm">
               <div className="px-5 py-2 bg-blue-50 text-blue-500 rounded-lg text-[9px] font-black uppercase tracking-widest">
                 {selectedCategory.toLowerCase().includes('bag') ? 'QN' : 'Size'}
               </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {getSizesForCategory().map(size => (
                <div key={size} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={cn(
                      "w-full aspect-[2/1] rounded-xl text-[10px] font-black uppercase border transition-all flex items-center justify-center",
                      selectedSizes.includes(size)
                        ? "bg-[#6366f1] text-white border-[#6366f1] shadow-md shadow-indigo-100"
                        : "bg-[#F8F9FD] text-gray-400 border-gray-100 hover:border-indigo-200 hover:text-gray-600 shadow-sm"
                    )}
                  >
                    {size}
                  </button>
                  {selectedSizes.includes(size) && (
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        value={quantities[size] || ''}
                        onChange={(e) => handleQuantityChange(size, e.target.value)}
                        placeholder="Qty"
                        className="w-full bg-[#F8F9FD] border border-gray-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-gray-700 outline-none focus:border-indigo-200"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-gray-300 uppercase">PCS</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-10 pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/admin/products')}
            className="text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-10 py-4 bg-[#8fb3fc] text-white rounded-xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-[#7cacf8] shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center gap-3"
          >
            <Plus size={16} className="bg-[#F8F9FD]/20 rounded p-0.5" />
            {isEditMode ? 'Update Product' : 'Initialize Product'}
          </button>
        </div>
      </form>

      {/* 1254 x 1254 Full Preview Modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewModalImage(null)}
        >
          <div 
            className="relative max-w-[88vh] max-h-[88vh] aspect-square w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-3 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Product Photo Preview</span>
                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md">
                  1254 × 1254 PX (1:1)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                className="text-gray-400 hover:text-gray-800 p-1.5 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[#f8fafc] rounded-2xl m-1 p-2">
              <img 
                src={previewModalImage} 
                alt="1254 × 1254 Preview" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
