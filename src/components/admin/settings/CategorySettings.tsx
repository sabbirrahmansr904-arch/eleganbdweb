import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Folder, 
  Save, 
  X, 
  Check,
  ChevronRight
} from 'lucide-react';
import { useCategories } from '../../../contexts/CategoryContext';
import { useProducts } from '../../../contexts/ProductContext';
import { Category } from '../../../types';
import toast from 'react-hot-toast';
import { cn } from '../../../lib/utils';

export default function CategorySettings() {
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
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
      const name = newCategoryName.trim();
      const id = Date.now().toString();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await addCategory({ id, name, slug });
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
      const catToUpdate = categories.find(c => c.id === id);
      if (!catToUpdate) return;
      const name = editCategoryName.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await updateCategory({ ...catToUpdate, name, slug });
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

  const getProductCount = (categoryName: string) => {
    return products.filter(p => p.category === categoryName).length;
  };

  return (
    <div className="space-y-12 max-w-4xl relative z-10 font-sans">
      <div className="space-y-8">
        <div className="flex justify-between items-center border-b border-gray-100 pb-6">
          <div className="space-y-1">
            <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Category Management</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Configure product collections and categories</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-black text-white px-6 py-3 text-[10px] uppercase tracking-widest font-black hover:bg-gray-800 transition-all flex items-center gap-2 rounded-xl shadow-lg cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Category</span>
          </button>
        </div>

        {isAdding && (
          <div className="bg-[#F8F9FD] border border-gray-200 p-8 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-300">
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
                className="flex-1 bg-white border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-sm font-medium text-gray-900"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button 
                onClick={handleAddCategory}
                className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest hover:bg-gray-800 transition-all shadow-md cursor-pointer"
              >
                Create Category
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-[#F8F9FD] border border-slate-200/75 rounded-3xl p-6 group hover:border-black/30 transition-all shadow-2xs flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-black shadow-3xs shrink-0">
                    <Folder size={20} />
                  </div>
                  {editingId === category.id ? (
                    <div className="flex gap-2 flex-1">
                      <input 
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-black text-gray-900"
                        autoFocus
                      />
                      <button onClick={() => handleUpdateCategory(category.id)} className="p-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all cursor-pointer">
                        <Check size={16} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 border border-gray-200 text-gray-400 hover:text-black rounded-xl transition-all cursor-pointer">
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
                </div>

                {!editingId && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => startEdit(category)}
                      className="p-2 text-gray-400 hover:text-black hover:bg-white rounded-lg transition-all cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => setCategoryToDelete(category.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="col-span-full py-24 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center text-center bg-[#F8F9FD]">
              <Folder size={48} className="text-gray-300 mb-6" />
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Inventory Directory Empty</h3>
              <p className="text-xs text-gray-400 mt-2">Initialize your first product collection</p>
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
          <div className="bg-[#F8F9FD] border border-gray-200 p-8 rounded-3xl max-w-sm w-full text-center relative shadow-2xl z-20">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100">
              <Trash2 size={28} />
            </div>
            <h3 className="text-base font-black text-black uppercase tracking-tight mb-2">Delete Collection?</h3>
            <p className="text-gray-500 text-[10px] leading-relaxed mb-8 uppercase tracking-widest font-bold">
              Are you sure? This will not delete products, but they will be un-categorized.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black bg-white text-gray-600 hover:text-black transition-all rounded-2xl border border-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  await deleteCategory(categoryToDelete);
                  toast.success('Collection purged');
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black bg-black text-white hover:bg-gray-800 transition-all rounded-2xl shadow-xl cursor-pointer"
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

