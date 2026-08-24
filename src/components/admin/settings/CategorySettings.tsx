import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Folder, 
  Save, 
  X, 
  Check,
  Upload,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
  ImageIcon
} from 'lucide-react';
import { useCategories } from '../../../contexts/CategoryContext';
import { useProducts } from '../../../contexts/ProductContext';
import { Category } from '../../../types';
import toast from 'react-hot-toast';
import { compressImage } from '../../../utils/imageCompressor';
import { autoSaveToMediaLibrary } from '../../../utils/mediaLibrary';

export default function CategorySettings() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { products } = useProducts();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryImage, setEditCategoryImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const loadingToast = toast.loading('ছবি অপ্টিমাইজ ও আপলোড করা হচ্ছে...');
      try {
        const compressedBase64 = await compressImage(file, 800, 800, 0.85);
        if (isEdit) {
          setEditCategoryImage(compressedBase64);
        } else {
          setNewCategoryImage(compressedBase64);
        }
        // Auto save to Media Library in background
        autoSaveToMediaLibrary(compressedBase64, {
          name: isEdit ? `Category: ${editCategoryName || 'Updated Cover'}` : `Category: ${newCategoryName || 'New Cover'}`,
          category: 'Category Icons',
          source: 'category'
        });
        toast.success('ক্যাটাগরি ছবি সফলভাবে যুক্ত ও মিডিয়াতে সেভ হয়েছে!', { id: loadingToast });
      } catch (err) {
        toast.error('ছবি প্রসেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', { id: loadingToast });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('দয়া করে ক্যাটাগরির নাম লিখুন');
      return;
    }
    
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
      toast.error('এই নামের ক্যাটাগরি ইতিমধ্যে বিদ্যমান রয়েছে');
      return;
    }

    try {
      const name = newCategoryName.trim();
      const id = Date.now().toString();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const image = newCategoryImage.trim();
      await addCategory({ id, name, slug, image });
      toast.success(`'${name}' ক্যাটাগরি সফলভাবে তৈরি হয়েছে!`);
      setNewCategoryName('');
      setNewCategoryImage('');
      setIsAdding(false);
    } catch (err) {
      toast.error('ক্যাটাগরি তৈরি করতে সমস্যা হয়েছে');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim()) {
      toast.error('দয়া করে ক্যাটাগরির নাম লিখুন');
      return;
    }

    try {
      const catToUpdate = categories.find(c => c.id === id);
      if (!catToUpdate) return;
      const name = editCategoryName.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const image = editCategoryImage.trim();
      await updateCategory({ ...catToUpdate, name, slug, image });
      toast.success(`'${name}' ক্যাটাগরি সফলভাবে আপডেট হয়েছে!`);
      setEditingId(null);
      setEditCategoryName('');
      setEditCategoryImage('');
    } catch (err) {
      toast.error('ক্যাটাগরি আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryImage(category.image || '');
  };

  const getProductCount = (categoryName: string) => {
    return products.filter(p => p.category?.toLowerCase() === categoryName.toLowerCase()).length;
  };

  const totalCategorizedProducts = categories.reduce((sum, cat) => sum + getProductCount(cat.name), 0);

  return (
    <div className="w-full space-y-8 font-sans pb-12">
      {/* Top Header with Stats and Actions */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-md">
                <Layers size={20} />
              </div>
              <div>
                <h3 className="serif text-2xl sm:text-3xl text-black italic tracking-tighter uppercase font-black">
                  Category Management
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  আপনার স্টোরের প্রোডাক্ট ক্যাটাগরি ও কালেকশনগুলো সুন্দর শেপে সাজান ও পরিচালনা করুন
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Quick Stats */}
            <div className="flex items-center gap-3 bg-[#F8F9FD] border border-gray-200/80 px-4 py-2.5 rounded-2xl">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">মোট ক্যাটাগরি</p>
                <p className="text-base font-black text-gray-900 leading-none">{categories.length}</p>
              </div>
              <div className="w-[1px] h-7 bg-gray-200" />
              <div className="text-left">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">মোট প্রোডাক্ট</p>
                <p className="text-base font-black text-blue-600 leading-none">{totalCategorizedProducts}</p>
              </div>
            </div>

            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="bg-black hover:bg-gray-800 text-white px-6 py-3.5 text-xs uppercase tracking-widest font-black transition-all flex items-center gap-2 rounded-2xl shadow-md cursor-pointer hover:shadow-lg active:scale-95"
            >
              {isAdding ? <X size={16} /> : <Plus size={16} />}
              <span>{isAdding ? 'ফর্ম বন্ধ করুন' : 'নতুন ক্যাটাগরি যুক্ত করুন'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add New Category Panel */}
      {isAdding && (
        <div className="bg-white border-2 border-black rounded-3xl p-6 sm:p-8 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <h4 className="text-sm font-black uppercase tracking-wider text-black">
                নতুন ক্যাটাগরি তৈরি করুন (Create Collection)
              </h4>
            </div>
            <button 
              onClick={() => setIsAdding(false)} 
              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input fields */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  ক্যাটাগরির নাম (Category Name) *
                </label>
                <input 
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Formal Pants, Cuban Shirts, Check Shirts..."
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-2xl px-5 py-3.5 outline-none focus:border-black focus:bg-white transition-all text-sm font-bold text-gray-900"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  autoFocus
                />
                {newCategoryName && (
                  <p className="text-[11px] text-gray-400 font-mono">
                    URL Slug: <span className="font-bold text-gray-700">/category/{newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}</span>
                  </p>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  অথবা ছবির অনলাইন লিংক (Image URL - Optional)
                </label>
                <input 
                  type="text"
                  value={newCategoryImage}
                  onChange={(e) => setNewCategoryImage(e.target.value)}
                  placeholder="https://example.com/category-cover.jpg"
                  className="w-full bg-[#F8F9FD] border border-gray-200 rounded-2xl px-5 py-3.5 outline-none focus:border-black focus:bg-white transition-all text-xs font-medium text-gray-900"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs uppercase font-bold tracking-wider transition-all cursor-pointer"
                >
                  বাতিল করুন
                </button>
                <button 
                  onClick={handleAddCategory}
                  disabled={isUploading}
                  className="px-8 py-3 bg-black hover:bg-gray-800 text-white rounded-2xl text-xs uppercase font-bold tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>ক্যাটাগরি সেভ করুন</span>
                </button>
              </div>
            </div>

            {/* Image Upload Box & Live Preview */}
            <div className="lg:col-span-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
                ক্যাটাগরি ছবি (Upload Photo from Device)
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative border-2 border-dashed border-gray-200 hover:border-black rounded-3xl p-6 text-center bg-[#F8F9FD] transition-all cursor-pointer h-52 flex flex-col items-center justify-center group overflow-hidden"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleImageUpload(e, false)} 
                />
                
                {newCategoryImage ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <img 
                      src={newCategoryImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-20 backdrop-blur-3xs">
                      <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2 bg-black/70 px-4 py-2 rounded-xl">
                        <Upload size={14} />
                        ছবি পরিবর্তন করুন
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewCategoryImage('');
                      }}
                      className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-red-50 text-black hover:text-red-500 rounded-xl transition-all z-30 shadow-md"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-black group-hover:border-black transition-all shadow-xs">
                      <Upload size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        ডিভাইস থেকে ছবি আপলোড করুন
                      </p>
                      <p className="text-[11px] text-gray-400">
                        মোবাইল বা পিসি থেকে ক্লিক করে সিলেক্ট করুন (JPG, PNG, WebP)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
        {categories.map((category) => {
          const isEditing = editingId === category.id;
          const productCount = getProductCount(category.name);

          return (
            <div 
              key={category.id} 
              className="bg-white border border-gray-200/80 rounded-3xl overflow-hidden group hover:border-black/40 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
            >
              {/* Category Image Cover Banner */}
              <div className="relative w-full h-48 bg-[#F8F9FD] border-b border-gray-100 overflow-hidden group/img">
                {isEditing ? (
                  <>
                    <input 
                      type="file" 
                      ref={editFileInputRef}
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageUpload(e, true)} 
                    />
                    {editCategoryImage ? (
                      <img 
                        src={editCategoryImage} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2 bg-[#F8F9FD]">
                        <ImageIcon size={32} />
                        <span className="text-[11px] font-bold">কোন ছবি নেই</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white transition-all cursor-pointer gap-1.5"
                    >
                      <Upload size={20} />
                      <span className="text-xs font-black uppercase tracking-wider">ছবি আপলোড / পরিবর্তন</span>
                    </button>
                  </>
                ) : (
                  category.image ? (
                    <img 
                      src={category.image} 
                      alt={category.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2 bg-gradient-to-br from-slate-50 to-slate-100">
                      <Folder size={36} className="text-gray-400" />
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">No Cover Image</span>
                    </div>
                  )
                )}

                {/* Badge Overlay */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-xs border border-black/10 rounded-full text-[11px] font-black text-gray-900 shadow-sm">
                    <Package size={12} className="text-blue-600" />
                    <span>{productCount} টি প্রোডাক্ট</span>
                  </span>
                </div>

                {/* Quick actions top right (when not editing) */}
                {!isEditing && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(category)}
                      title="এডিট করুন"
                      className="p-2 bg-white/95 hover:bg-white text-gray-800 hover:text-black rounded-xl shadow-md transition-all cursor-pointer hover:scale-105"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button 
                      onClick={() => setCategoryToDelete(category)}
                      title="ডিলিট করুন"
                      className="p-2 bg-white/95 hover:bg-red-50 text-gray-800 hover:text-red-600 rounded-xl shadow-md transition-all cursor-pointer hover:scale-105"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">নাম</label>
                      <input 
                        type="text" 
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-black outline-none focus:border-black text-gray-900"
                        autoFocus
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">ছবির লিংক (URL)</label>
                      <input 
                        type="text" 
                        value={editCategoryImage}
                        onChange={(e) => setEditCategoryImage(e.target.value)}
                        placeholder="Image URL"
                        className="w-full bg-[#F8F9FD] border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-black text-gray-900"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => handleUpdateCategory(category.id)} 
                        className="flex-1 py-2 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check size={14} />
                        <span>সেভ</span>
                      </button>
                      <button 
                        onClick={() => setEditingId(null)} 
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        বাতিল
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-black text-gray-950 uppercase tracking-tight italic line-clamp-1">
                        {category.name}
                      </h4>
                      <p className="text-[11px] font-mono text-gray-400 truncate">
                        /category/{category.slug || category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                      </p>
                    </div>

                    {/* Bottom row */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-semibold text-[11px]">
                        ক্যাটাগরি আইডি: #{category.id.slice(-4)}
                      </span>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startEdit(category)}
                          className="px-3 py-1.5 bg-[#F8F9FD] hover:bg-black hover:text-white text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-gray-200"
                        >
                          <Edit2 size={12} />
                          <span>এডিট</span>
                        </button>
                        <button 
                          onClick={() => setCategoryToDelete(category)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="ডিলিট"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {categories.length === 0 && (
          <div className="col-span-full py-20 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-center bg-[#F8F9FD] space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400">
              <Folder size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase tracking-wider text-gray-800">
                এখনো কোন ক্যাটাগরি তৈরি করা হয়নি
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                উপরের "+ নতুন ক্যাটাগরি যুক্ত করুন" বাটনে ক্লিক করে প্রথম ক্যাটাগরি কালেকশন তৈরি করুন।
              </p>
            </div>
            <button
              onClick={() => setIsAdding(true)}
              className="px-6 py-2.5 bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-gray-800 transition-all cursor-pointer shadow-md"
            >
              প্রথম ক্যাটাগরি তৈরি করুন
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div 
            onClick={() => setCategoryToDelete(null)}
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
          />
          <div className="bg-white border border-gray-200 p-8 rounded-3xl max-w-md w-full text-center relative shadow-2xl z-20 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-xs">
              <Trash2 size={28} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                '{categoryToDelete.name}' ক্যাটাগরি মুছে ফেলতে চান?
              </h3>
              <p className="text-gray-500 text-xs leading-relaxed">
                এই ক্যাটাগরি মুছে ফেললেও সংশ্লিষ্ট প্রোডাক্টগুলো ডিলিট হবে না, তবে সেগুলো আন-ক্যাটাগোরাইজড অবস্থায় থাকবে।
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-3.5 text-xs uppercase tracking-wider font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all rounded-2xl cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button 
                onClick={async () => {
                  await deleteCategory(categoryToDelete.id);
                  toast.success(`'${categoryToDelete.name}' ক্যাটাগরি মুছে ফেলা হয়েছে`);
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-3.5 text-xs uppercase tracking-wider font-bold bg-red-600 text-white hover:bg-red-700 transition-all rounded-2xl shadow-lg cursor-pointer"
              >
                হ্যাঁ, মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
