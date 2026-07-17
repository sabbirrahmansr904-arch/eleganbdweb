import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Folder, 
  Save, 
  X, 
  Image as ImageIcon,
  Check,
  ChevronRight,
  Upload
} from 'lucide-react';
import { useCategories } from '../../../contexts/CategoryContext';
import { useBranding } from '../../../contexts/BrandingContext';
import { useProducts } from '../../../contexts/ProductContext';
import { Category } from '../../../types';
import toast from 'react-hot-toast';
import { cn } from '../../../lib/utils';
import { compressImage } from '../../../utils/imageCompressor';

export default function CategorySettings() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { categoryImages, setCategoryImageUrl } = useBranding();
  const { products } = useProducts();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }

    try {
      await addCategory({ name: newCategoryName.trim() });
      toast.success('Category added successfully');
      setNewCategoryName('');
      setIsAdding(false);
    } catch (err) {
      toast.error('Failed to add category');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      await updateCategory(id, { name: editCategoryName.trim() });
      toast.success('Category updated successfully');
      setEditingId(null);
      setEditCategoryName('');
    } catch (err) {
      toast.error('Failed to update category');
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditCategoryName(category.name);
  };

  const handleImageUpload = async (categoryName: string, file: File) => {
    try {
      const result = await compressImage(file, 800, 800, 0.7);
      setCategoryImageUrl(categoryName, result);
      toast.success(`${categoryName} banner updated`);
    } catch (err) {
      toast.error('Failed to upload image');
    }
  };

  const getProductCount = (categoryName: string) => {
    return products.filter(p => p.category === categoryName).length;
  };

  return (
    <div className="space-y-12 max-w-4xl relative z-10 font-sans">
      <div className="space-y-8">
        <div className="flex justify-between items-center border-b border-gray-100 pb-6">
          <div className="space-y-1">
            <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Category Management</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Configure product collections and visual banners</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-black text-white px-6 py-3 text-[10px] uppercase tracking-widest font-black hover:bg-gray-800 transition-all flex items-center gap-2 rounded-xl shadow-lg"
          >
            <Plus size={14} />
            <span>Add Category</span>
          </button>
        </div>

        {isAdding && (
          <div className="bg-gray-50 border border-gray-100 p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-xs font-black uppercase tracking-widest text-black">Create New Collection</h4>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-black">
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-4">
              <input 
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Formal Shirts"
                className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-sm font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button 
                onClick={handleAddCategory}
                className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-gray-800 transition-all shadow-md"
              >
                Create Category
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden group hover:border-black/30 transition-all shadow-sm flex flex-col h-full">
              {/* Category Image / Banner */}
              <div className="aspect-video relative overflow-hidden bg-gray-50 border-b border-gray-100">
                {categoryImages[category.name] ? (
                  <img 
                    src={categoryImages[category.name]} 
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                    <ImageIcon size={40} className="mb-2 opacity-20" />
                    <p className="text-[9px] uppercase tracking-widest font-black">No Banner Initialized</p>
                  </div>
                )}
                
                {/* Image Upload Overlay */}
                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm cursor-pointer">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Upload size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Update Banner</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(category.name, file);
                    }} 
                  />
                </label>
              </div>

              {/* Category Info */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex justify-between items-start">
                  {editingId === category.id ? (
                    <div className="flex gap-2 w-full">
                      <input 
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-black"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateCategory(category.id)} className="p-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 border border-gray-200 text-gray-400 hover:text-black rounded-xl transition-all">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h4 className="text-base font-black text-black uppercase tracking-tighter italic">{category.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {getProductCount(category.name)} ACTIVE PRODUCTS
                      </p>
                    </div>
                  )}

                  {!editingId && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => startEdit(category)}
                        className="p-2 text-gray-400 hover:text-black hover:bg-gray-50 rounded-lg transition-all"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => setCategoryToDelete(category.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full py-24 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center text-center">
              <Folder size={48} className="text-gray-200 mb-6" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Inventory Directory Empty</h3>
              <p className="text-xs text-gray-300 mt-2">Initialize your first product collection</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div 
            onClick={() => setCategoryToDelete(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="bg-white border border-gray-100 p-8 rounded-3xl max-w-sm w-full text-center relative shadow-2xl z-20">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
              <Trash2 size={28} />
            </div>
            <h3 className="text-base font-black text-black uppercase tracking-tight mb-2">Delete Collection?</h3>
            <p className="text-gray-400 text-[10px] leading-relaxed mb-8 uppercase tracking-widest font-bold">
              Are you sure? This will not delete products, but they will be un-categorized.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black bg-gray-50 text-gray-400 hover:text-black transition-all rounded-2xl border border-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await deleteCategory(categoryToDelete);
                  toast.success('Collection purged');
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black bg-black text-white hover:bg-gray-800 transition-all rounded-2xl shadow-xl"
              >
                Purge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
