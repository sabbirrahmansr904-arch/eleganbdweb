/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  List, 
  Library, 
  CheckCircle2, 
  Save, 
  Trash2, 
  ExternalLink, 
  Maximize2,
  Loader2,
  Image as ImageIcon,
  Check
} from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import { useCategories } from '../../contexts/CategoryContext';
import { Product } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { autoSaveToMediaLibrary } from '../../utils/mediaLibrary';
import { compressImage } from '../../utils/imageCompressor';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const SHIRT_SIZES = ['M', 'L', 'XL', 'XXL'];
const PANT_SIZES = ['28', '30', '32', '34', '36', '38', '40'];

export default function AdminAddProduct() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const { products, addProduct, updateProduct } = useProducts();
  const { categories, addCategory, deleteCategory } = useCategories();

  // Controlled Form States
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [regularPrice, setRegularPrice] = useState<string>('');
  const [description, setDescription] = useState<string>('');
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
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [fabric, setFabric] = useState<string>('');
  const [fitType, setFitType] = useState<string>('');

  // Processing & Modal states
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [libraryPhotos, setLibraryPhotos] = useState<{ id: string; url: string; name?: string }[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const PRESET_COLORS = [
    { name: 'Black', hex: '#111827' },
    { name: 'Navy Blue', hex: '#1e3a8a' },
    { name: 'Ash Grey', hex: '#9ca3af' },
    { name: 'Charcoal Grey', hex: '#374151' },
    { name: 'Olive Green', hex: '#3f6212' },
    { name: 'Khaki / Beige', hex: '#d4a373' },
    { name: 'Coffee Brown', hex: '#5c3d2e' },
    { name: 'White', hex: '#f8fafc' },
    { name: 'Maroon', hex: '#881337' },
    { name: 'Sky Blue', hex: '#38bdf8' },
    { name: 'Off-White', hex: '#fef08a' }
  ];

  const POPULAR_FABRICS = [
    'Woven Gabardine',
    'Twill Cotton',
    'Gabardine Stretch',
    'Royal Oxford',
    'Refine Cotton',
    'Carbon Cotton',
    'Silk Blend',
    'Denim Cotton'
  ];

  const POPULAR_FITS = [
    'Slim Fit',
    'Regular Fit',
    'Relaxed Fit',
    'Straight Fit',
    'Tapered Fit'
  ];

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
        setProductName(productToEdit.name || '');
        setSku(productToEdit.sku || '');
        setPrice(productToEdit.price !== undefined ? String(productToEdit.price) : '');
        setCost(productToEdit.cost !== undefined ? String(productToEdit.cost) : '');
        setRegularPrice(productToEdit.regularPrice !== undefined ? String(productToEdit.regularPrice) : '');
        setDescription(productToEdit.description || '');
        setUploadedImages(Array.isArray(productToEdit.images) ? productToEdit.images.filter(Boolean) : []);
        setCoverImageIndex(0);
        setSelectedSizes(Array.isArray(productToEdit.sizes) ? productToEdit.sizes : []);
        setQuantities(productToEdit.sizeStock || {});
        setSelectedCategory(productToEdit.category || (categories[0]?.name || 'UNCATEGORIZED'));
        setSelectedColor(productToEdit.color || '');
        setFabric(productToEdit.fabric || productToEdit.material || '');
        setFitType(productToEdit.fitType || '');
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
    if (cat.includes('shirt')) return SHIRT_SIZES;
    return ['40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL', '9XL', '10XL', '11XL'];
  };

  // Robust, high-speed image compression for 1:1 HD storage without Firestore quota overflow
  const handleFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const toastId = toast.loading('Processing image...');
      
      const dataUrl = await compressImage(file, 1200, 1200, 0.82);
      
      setUploadedImages(prev => {
        const next = [...prev];
        if (index < next.length) {
          next[index] = dataUrl;
        } else {
          next.push(dataUrl);
        }
        return next;
      });

      toast.dismiss(toastId);
      toast.success('Photo added successfully');

      // Auto save to Media Library in background
      autoSaveToMediaLibrary(dataUrl, {
        name: file.name ? file.name.replace(/\.[^/.]+$/, "") : `Product Photo ${index + 1}`,
        category: 'Product Catalog',
        source: 'product'
      });
    } catch (err) {
      console.error('Image compression error:', err);
      toast.error('Failed to process image');
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleQuantityChange = (size: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setQuantities(prev => ({
      ...prev,
      [size]: numValue
    }));
  };

  // Load photos from Firestore Media collection for the Library Picker
  const openMediaLibraryModal = async () => {
    setShowMediaModal(true);
    setLoadingLibrary(true);
    try {
      const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'), limit(40));
      const snap = await getDocs(q);
      const items: { id: string; url: string; name?: string }[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.url) {
          items.push({ id: docSnap.id, url: d.url, name: d.name });
        }
      });
      setLibraryPhotos(items);
    } catch (e) {
      console.warn('Failed to load media items:', e);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const handleSelectFromLibrary = (url: string) => {
    if (!uploadedImages.includes(url)) {
      setUploadedImages(prev => [...prev, url]);
      toast.success('Added photo from library');
    } else {
      toast('Photo is already in gallery', { icon: 'ℹ️' });
    }
  };

  // Direct unified Save Handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (isSaving) return;

    const trimmedName = productName.trim();
    if (!trimmedName) {
      toast.error('Please enter Product Name');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Please enter a valid product price');
      return;
    }

    const numCost = cost ? parseFloat(cost) : 0;
    const numRegularPrice = regularPrice ? parseFloat(regularPrice) : undefined;

    // Filter valid images and make sure cover photo is at index 0
    const images = [...uploadedImages].filter(Boolean);
    if (coverImageIndex < images.length && coverImageIndex !== 0) {
      const cover = images[coverImageIndex];
      images.splice(coverImageIndex, 1);
      images.unshift(cover);
    }

    // Size breakdown
    const sizeStock: Record<string, number> = {};
    selectedSizes.forEach(s => {
      sizeStock[s] = Number(quantities[s]) || 0;
    });

    const calculatedStock = Object.values(sizeStock).length > 0 
      ? Object.values(sizeStock).reduce((a, b) => a + b, 0)
      : (Number(initialData.stock) || 0);

    const productData: any = {
      ...initialData,
      id: editId || `prod-${Date.now()}`,
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      name: trimmedName,
      price: numPrice,
      cost: isNaN(numCost) ? 0 : numCost,
      rating: initialData.rating || 5,
      isTopRated: initialData.isTopRated || false,
      category: selectedCategory || 'UNCATEGORIZED',
      color: (selectedColor || '').trim(),
      fabric: (fabric || '').trim(),
      material: (fabric || '').trim(),
      fitType: (fitType || '').trim(),
      stock: calculatedStock,
      sizeStock,
      description: description || '',
      images: images,
      sizes: selectedSizes,
      newArrival: isNewArrival,
      featured: isBestSelling,
      bestSelling: isBestSelling,
    };

    if (numRegularPrice !== undefined && !isNaN(numRegularPrice) && numRegularPrice > 0) {
      productData.regularPrice = numRegularPrice;
    }

    try {
      setIsSaving(true);
      const toastId = toast.loading(isEditMode ? 'Saving changes...' : 'Creating product...');

      if (isEditMode) {
        await updateProduct(productData);
        toast.dismiss(toastId);
        toast.success('Product updated successfully!');
      } else {
        await addProduct(productData);
        toast.dismiss(toastId);
        toast.success('Product created successfully!');
      }

      // Smooth transition back to admin products list
      setTimeout(() => {
        navigate('/admin/products');
      }, 300);
    } catch (err: any) {
      console.error('Save product error:', err);
      toast.error(err?.message || (isEditMode ? 'Failed to update product' : 'Failed to create product'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] -m-4 md:-m-8 p-4 md:p-10 space-y-8 pb-20 font-sans text-gray-800">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button 
          type="button"
          onClick={() => navigate('/admin/products')}
          className="p-2.5 bg-[#F8F9FD] rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 text-gray-400 hover:text-black cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
            <Plus size={20} className="stroke-[3]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a1c21] tracking-tight">
              {isEditMode ? 'Edit Product' : 'Add Product'}
            </h1>
            <p className="text-[11px] text-gray-400 font-medium tracking-wide">
              Create and manage product SKUs, photos, and variant inventory.
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isEditMode && editId && (
            <button 
              type="button"
              onClick={() => window.open(`/product/${editId}`, '_blank')}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-[11px] font-black uppercase tracking-widest hover:text-blue-600 hover:border-blue-200 hover:shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <ExternalLink size={15} />
              <span>Preview on Website</span>
            </button>
          )}
          <button 
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || isUploadingImage}
            className={cn(
              "px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer",
              (isSaving || isUploadingImage) && "opacity-70 cursor-not-allowed"
            )}
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isEditMode ? 'Save Changes' : 'Save Product'}</span>
          </button>
        </div>
      </div>

      <form id="product-form" onSubmit={handleSave} className="space-y-8">
        <div className="bg-[#F8F9FD] border border-gray-100 rounded-[2rem] p-6 sm:p-10 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Details */}
          <div className="lg:col-span-6 space-y-7">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block ml-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input 
                name="name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Premium Solid Formal Shirt"
                required
                className="w-full bg-[#fcfdfe] border border-gray-200 rounded-xl px-5 py-3.5 text-sm font-semibold text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block ml-1">SKU (Stock Keeping Unit)</label>
              <input 
                name="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. FS-SOLID-01"
                className="w-full bg-[#fcfdfe] border border-gray-200 rounded-xl px-5 py-3.5 text-sm font-semibold text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block">Category</label>
                <button 
                  type="button"
                  onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                  className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
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
                    className="flex-1 bg-white border border-blue-200 rounded-xl px-5 py-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
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
                    className="bg-blue-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase transition-all hover:bg-blue-700 cursor-pointer"
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
                      className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider text-gray-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
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
                      className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors shadow-2xs cursor-pointer"
                      title="Delete selected category"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Color Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 block">
                  Product Color
                </label>
                {selectedColor && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Selected: {selectedColor}
                  </span>
                )}
              </div>

              {/* Preset Color Swatches */}
              <div className="flex flex-wrap gap-2 p-2 bg-[#fcfdfe] border border-gray-200 rounded-xl">
                {PRESET_COLORS.map(c => {
                  const isSelected = selectedColor.toLowerCase() === c.name.toLowerCase();
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.name)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer",
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      )}
                    >
                      <span 
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 shadow-3xs"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <div className="flex gap-2">
                <input 
                  type="text"
                  name="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  placeholder="Or type custom color name..."
                  className="w-full bg-[#fcfdfe] border border-gray-200 rounded-xl px-5 py-3 text-xs font-semibold text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-300 transition-all"
                />
              </div>
            </div>

            {/* Fabric & Fit Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fabric */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block ml-1">
                  Fabric / Material
                </label>
                <input 
                  name="fabric"
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  placeholder="e.g. Woven Gabardine"
                  className="w-full bg-[#fcfdfe] border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-300 transition-all"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {POPULAR_FABRICS.slice(0, 4).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFabric(f)}
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer",
                        fabric === f ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-gray-200 text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fit Silhouette */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block ml-1">
                  Fit Silhouette
                </label>
                <input 
                  name="fitType"
                  value={fitType}
                  onChange={(e) => setFitType(e.target.value)}
                  placeholder="e.g. Slim Fit / Regular Fit"
                  className="w-full bg-[#fcfdfe] border border-gray-200 rounded-xl px-4 py-3 text-xs font-semibold text-gray-700 placeholder:text-gray-300 outline-none focus:border-blue-300 transition-all"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {POPULAR_FITS.slice(0, 4).map(ft => (
                    <button
                      key={ft}
                      type="button"
                      onClick={() => setFitType(ft)}
                      className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer",
                        fitType === ft ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-gray-200 text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {ft}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 block">Description</label>
                <button 
                  type="button"
                  onClick={() => {
                    const template = `Product overview and details:
• Experience unmatched smoothness and comfort that makes you feel confident. With our Cotton Solid Shirt, you get the goodness of the finest carbon cotton. Precisely stitched for a tailored fit, this full-sleeve shirt ensures you look polished from AM to PM. Known for its lightweight feel and versatility, it's available in multiple shades and sizes. Pick yours today and elevate your wardrobe!

Size & Fit:
• Every Shirt is tailored with regular fit over years of testing.
• Please refer to the size chart for exact measurements.

Wash Care:
• Normal machine wash
• Do not use bleach
• Iron on low temperature
• Air dry or low tumble dry`;
                    setDescription(template);
                  }}
                  className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  ✨ Use Template
                </button>
              </div>
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-[#fcfdfe]">
                <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-[#F8F9FD]">
                  <span className="text-[10px] font-bold text-gray-500">Editor</span>
                  <div className="h-4 w-[1px] bg-gray-200 mx-1" />
                  <span className="text-[10px] text-gray-400">Plain text & Markdown supported</span>
                </div>
                <textarea 
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write detailed product specifications, size guides, wash care..."
                  rows={6}
                  className="w-full bg-transparent px-5 py-4 text-sm font-medium text-gray-700 outline-none resize-none placeholder:text-gray-300 no-scrollbar"
                />
              </div>
            </div>

            {/* Price Row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-red-500 block ml-1">Cost (৳)</label>
                <input 
                  name="cost" 
                  type="number" 
                  step="any" 
                  value={cost} 
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0" 
                  className="w-full bg-[#fcfdfe] border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-300" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-emerald-500 block ml-1">
                  Price (৳) <span className="text-red-500">*</span>
                </label>
                <input 
                  name="price" 
                  type="number" 
                  step="any" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0" 
                  required 
                  className="w-full bg-[#fcfdfe] border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-300" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-orange-400 block ml-1">Regular (৳)</label>
                <input 
                  name="regularPrice" 
                  type="number" 
                  step="any" 
                  value={regularPrice} 
                  onChange={(e) => setRegularPrice(e.target.value)}
                  placeholder="None" 
                  className="w-full bg-[#fcfdfe] border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:border-blue-300" 
                />
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
                      : "bg-[#fcfdfe] border-gray-200 text-gray-500 hover:border-gray-300"
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
                      <p className="text-[10px] text-gray-400 font-medium">Show in Best Selling</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    isBestSelling ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-300 bg-white"
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
                      : "bg-[#fcfdfe] border-gray-200 text-gray-500 hover:border-gray-300"
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
                      <p className="text-[10px] text-gray-400 font-medium">Show in New Arrivals</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                    isNewArrival ? "bg-rose-600 border-rose-600 text-white" : "border-gray-300 bg-white"
                  )}>
                    {isNewArrival && <CheckCircle2 size={12} />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Media Management */}
          <div className="lg:col-span-6 space-y-7">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-gray-800 flex items-center gap-2">
                  Media Management
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={openMediaLibraryModal}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Library size={13} /> Library
                </button>
                <span className="text-[10px] font-bold text-gray-400">
                  {uploadedImages.length} Photos
                </span>
              </div>
            </div>

            {/* Cover Photo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 block">Cover Photo (Main)</label>
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
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
                      title="Full Resolution Preview"
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* 1:1 Aspect Preview Box */}
              <div className="relative aspect-square max-w-[560px] mx-auto w-full bg-white rounded-2xl overflow-hidden border-2 border-gray-200 group transition-all shadow-xs flex items-center justify-center">
                {uploadedImages[coverImageIndex] ? (
                  <>
                    <img 
                      src={uploadedImages[coverImageIndex]} 
                      alt="Cover Preview"
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
                        title="View Full Resolution"
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
                    <div className="relative mb-5">
                       <div className="w-20 h-20 bg-blue-50 rounded-2xl shadow-sm flex items-center justify-center text-blue-600 border border-blue-100">
                         {isUploadingImage ? <Loader2 size={28} className="animate-spin" /> : <Upload size={28} />}
                       </div>
                    </div>
                    <span className="text-xs font-black text-blue-600 uppercase tracking-wider mb-1">Upload Main Photo</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">1254 × 1254 PX (1:1 Square)</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      disabled={isUploadingImage}
                      onChange={(e) => handleFileChange(uploadedImages.length, e)} 
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Gallery Images */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 block">Gallery Photos</label>
                  <span className="text-[9px] font-bold text-gray-400">1:1 Ratio</span>
                </div>
                <label className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={13} className="stroke-[3]" /> Add Photo
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    disabled={isUploadingImage}
                    onChange={(e) => handleFileChange(uploadedImages.length, e)} 
                  />
                </label>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {uploadedImages.map((img, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "relative aspect-square bg-white rounded-xl overflow-hidden border group shadow-2xs flex items-center justify-center cursor-pointer",
                      i === coverImageIndex ? "border-blue-600 ring-2 ring-blue-100" : "border-gray-200 hover:border-gray-300"
                    )}
                    onClick={() => setCoverImageIndex(i)}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain p-1.5" />
                    {i === coverImageIndex && (
                      <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-xs">
                        Cover
                      </span>
                    )}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10" onClick={e => e.stopPropagation()}>
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
                ))}
                {uploadedImages.length === 0 && (
                  <div className="col-span-full h-24 bg-white border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">No Gallery Photos Added</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50/60 border border-blue-100 p-3.5 rounded-xl flex items-center gap-3">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs flex-shrink-0 text-xs font-bold">
                ✓
              </div>
              <p className="text-[10px] text-blue-900 font-semibold tracking-wide">
                <span className="font-black">PRO TIP:</span> Click any thumbnail in the gallery to set it as the main Cover Photo.
              </p>
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <div className="bg-[#F8F9FD] border border-gray-100 rounded-[2rem] p-6 sm:p-10 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-[#1a1c21] uppercase tracking-[0.1em]">Product Sizes & Stock Breakdown</h3>
              <p className="text-[10px] text-gray-400 font-medium mt-1">Select available sizes and allocate real-time inventory quantity.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {getSizesForCategory().map(size => (
                <div key={size} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={cn(
                      "w-full aspect-[2/1] rounded-xl text-xs font-black uppercase border transition-all flex items-center justify-center cursor-pointer",
                      selectedSizes.includes(size)
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-200"
                    )}
                  >
                    {size}
                  </button>
                  {selectedSizes.includes(size) && (
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        value={quantities[size] !== undefined ? quantities[size] : ''}
                        onChange={(e) => handleQuantityChange(size, e.target.value)}
                        placeholder="Qty"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-blue-400"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-400 uppercase">PCS</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-6 pt-4 border-t border-gray-200">
          <button 
            type="button" 
            onClick={() => navigate('/admin/products')}
            className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-gray-800 cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving || isUploadingImage}
            className={cn(
              "px-8 py-3.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 shadow-md transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer",
              (isSaving || isUploadingImage) && "opacity-70 cursor-not-allowed"
            )}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{isEditMode ? 'Save Changes' : 'Create Product'}</span>
          </button>
        </div>
      </form>

      {/* Media Library Picker Modal */}
      {showMediaModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowMediaModal(false)}
        >
          <div 
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Media Library</h3>
                <p className="text-[10px] text-gray-400">Click any photo to insert it directly into this product</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="text-gray-400 hover:text-gray-800 p-1.5 rounded-xl hover:bg-gray-100 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {loadingLibrary ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <span className="text-xs font-bold">Loading media items...</span>
                </div>
              ) : libraryPhotos.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-xs font-bold">
                  No images found in library. Upload images using the upload button.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {libraryPhotos.map(item => {
                    const isAlreadyAdded = uploadedImages.includes(item.url);
                    return (
                      <div 
                        key={item.id}
                        onClick={() => handleSelectFromLibrary(item.url)}
                        className={cn(
                          "relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all group bg-gray-50 flex items-center justify-center",
                          isAlreadyAdded ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200 hover:border-blue-400"
                        )}
                      >
                        <img src={item.url} alt="" className="w-full h-full object-contain p-1" />
                        {isAlreadyAdded && (
                          <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5">
                            <Check size={12} className="stroke-[3]" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase">
                          {isAlreadyAdded ? 'Added' : '+ Add'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-black transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
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
