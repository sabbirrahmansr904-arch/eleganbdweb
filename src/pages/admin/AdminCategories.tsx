import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  MoreHorizontal, 
  Plus, 
  Search, 
  X, 
  Edit2, 
  Trash2, 
  AlertTriangle
} from 'lucide-react';
import { useCategories } from '../../contexts/CategoryContext';
import { useProducts } from '../../contexts/ProductContext';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { Category } from '../../types';

export default function AdminCategories(): React.JSX.Element {
  const { categories, addCategory, updateCategory, deleteCategory, loading } = useCategories();
  const { products } = useProducts();

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown active menus by category ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    isMega: false
  });

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Slug auto-generation helper
  const handleNameChange = (nameValue: string) => {
    setFormData(prev => {
      const updated = { ...prev, name: nameValue };
      if (modalType === 'add') {
        updated.slug = nameValue
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-');
      }
      return updated;
    });
  };

  // Open modal for adding
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      isMega: true // default mega to true as shown in screenshot
    });
    setModalType('add');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      isMega: category.isMega ?? false
    });
    setModalType('edit');
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  // Submit form (add or edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    try {
      if (modalType === 'add') {
        const newId = `cat-${Date.now()}`;
        const newCategory: Category = {
          id: newId,
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim(),
          isMega: formData.isMega,
          order: categories.length
        };
        await addCategory(newCategory);
        toast.success('Category added successfully');
      } else if (modalType === 'edit' && editingCategory) {
        const updated: Category = {
          ...editingCategory,
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim(),
          isMega: formData.isMega
        };
        await updateCategory(updated);
        toast.success('Category updated successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to save category');
    }
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success('Category deleted successfully');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  // Sorted and filtered categories
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return sortedCategories.filter(cat => 
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedCategories, searchQuery]);

  // Handle reordering (Up/Down arrow)
  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedCategories.length) return;

    const currentCat = { ...sortedCategories[index] };
    const targetCat = { ...sortedCategories[targetIndex] };

    // Swap their order values
    const currentOrder = currentCat.order ?? index;
    const targetOrder = targetCat.order ?? targetIndex;

    currentCat.order = targetOrder;
    targetCat.order = currentOrder;

    try {
      await updateCategory(currentCat);
      await updateCategory(targetCat);
      toast.success('Category order updated');
    } catch (error) {
      toast.error('Failed to reorder categories');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 font-sans text-gray-900 px-4 md:px-8">
      
      {/* Brand & Page Header matching screenshot */}
      <div className="flex items-center justify-between pt-4 border-b border-gray-100 pb-4">
        <div className="flex flex-col">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Elegan BD</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Categories</p>
        </div>
      </div>

      {/* Main Layout Header containing title and 'Add Category' button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">All Categories</h2>
          <span className="flex items-center justify-center bg-violet-50 text-violet-600 font-bold text-xs px-2.5 py-0.5 rounded-full border border-violet-100 min-w-[24px]">
            {categories.length}
          </span>
        </div>

        <button 
          id="add-category-btn"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-[#6366F1]/10 active:scale-95 cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Category</span>
        </button>
      </div>

      {/* White outer container for Search and Table */}
      <div className="bg-white rounded-[24px] border border-gray-200 p-6 shadow-[0_4px_30px_rgba(0,0,0,0.015)] space-y-6">
        
        {/* Full-width Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 stroke-[2]" />
          <input 
            id="category-search-input"
            type="text"
            placeholder=""
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 text-sm font-medium rounded-xl placeholder-gray-400 text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-xs"
          />
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 h-14 bg-white select-none font-sans uppercase tracking-wider">
                <th className="py-3 px-6 w-12"></th>
                <th className="py-3 px-4 font-semibold text-left">Category</th>
                <th className="py-3 px-4 font-semibold text-left">Products</th>
                <th className="py-3 px-4 font-semibold text-center w-40">Reorder</th>
                <th className="py-3 px-6 font-semibold text-right w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-4">Loading categories...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-4 border border-gray-200">
                      <Folder className="w-5 h-5 stroke-[1.5]" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 uppercase">No Categories Found</p>
                    <p className="text-xs text-gray-400 mt-1 font-semibold">Try modifying your search or create a new category.</p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => {
                  const masterIndex = sortedCategories.findIndex(c => c.id === cat.id);
                  const isFirst = masterIndex === 0;
                  const isLast = masterIndex === sortedCategories.length - 1;

                  const productCount = products.filter(
                    p => p.category?.toLowerCase() === cat.name.toLowerCase()
                  ).length;

                  return (
                    <tr 
                      key={cat.id} 
                      className="hover:bg-gray-50/50 transition-colors group h-16 border-b border-gray-100"
                    >
                      {/* Drag Handle */}
                      <td className="py-4 px-6 text-gray-300 group-hover:text-gray-400 transition-colors">
                        <GripVertical size={18} className="cursor-grab active:cursor-grabbing" />
                      </td>

                      {/* Category Name & Slug */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-indigo-50/70 text-[#6366F1] border border-indigo-100/50 flex items-center justify-center shrink-0">
                            <Folder size={18} className="fill-indigo-50 text-[#6366F1]" />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-900 tracking-tight uppercase">
                                {cat.name}
                              </span>
                              {cat.isMega && (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-violet-50 border border-violet-100 text-violet-600 text-[9px] font-extrabold rounded-md tracking-wider uppercase">
                                  MEGA
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-450 font-medium mt-0.5">
                              /{cat.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Dynamic Products Count */}
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600 font-semibold">
                          {productCount} {productCount === 1 ? 'product' : 'products'}
                        </span>
                      </td>

                      {/* Reorder Up/Down circle buttons */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            id={`reorder-up-${cat.id}`}
                            onClick={() => handleReorder(masterIndex, 'up')}
                            disabled={isFirst}
                            title="Move Up"
                            className={cn(
                              "w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-3xs cursor-pointer",
                              isFirst 
                                ? "border-gray-100 bg-white text-gray-200 cursor-not-allowed" 
                                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 active:scale-95"
                            )}
                          >
                            <ArrowUp size={14} strokeWidth={2.5} />
                          </button>

                          <button
                            id={`reorder-down-${cat.id}`}
                            onClick={() => handleReorder(masterIndex, 'down')}
                            disabled={isLast}
                            title="Move Down"
                            className={cn(
                              "w-8 h-8 rounded-full border flex items-center justify-center transition-all shadow-3xs cursor-pointer",
                              isLast 
                                ? "border-gray-100 bg-white text-gray-200 cursor-not-allowed" 
                                : "border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 active:scale-95"
                            )}
                          >
                            <ArrowDown size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>

                      {/* Actions Menu */}
                      <td className="py-4 px-6 text-right relative">
                        <div className="flex items-center justify-end">
                          <button
                            id={`category-action-${cat.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === cat.id ? null : cat.id);
                            }}
                            className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all shadow-3xs cursor-pointer"
                          >
                            <MoreHorizontal size={14} />
                          </button>

                          {activeMenuId === cat.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-6 top-12 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 min-w-[120px] text-left z-20">
                                <button
                                  id={`edit-cat-${cat.id}`}
                                  onClick={() => handleOpenEdit(cat)}
                                  className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Edit2 size={12} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  id={`delete-cat-${cat.id}`}
                                  onClick={() => {
                                    setDeleteConfirmId(cat.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-[24px] border border-gray-200 w-full max-w-md p-6 shadow-xl relative">
            
            <button
              id="close-modal-btn"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              {modalType === 'add' ? 'Add New Category' : 'Edit Category'}
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
              {modalType === 'add' ? 'Define a new category to group your products.' : 'Modify the category properties below.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              
              {/* Category Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category Name</label>
                <input
                  id="modal-cat-name"
                  type="text"
                  required
                  placeholder="e.g. Formal Pant"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 text-sm font-semibold rounded-xl text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-3xs"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">URL Slug</label>
                <input
                  id="modal-cat-slug"
                  type="text"
                  required
                  placeholder="e.g. formal-pant"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 text-sm font-semibold rounded-xl text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-3xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  id="modal-cat-desc"
                  rows={3}
                  placeholder="Short description of this category..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 text-sm font-semibold rounded-xl text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-3xs resize-none"
                />
              </div>

              {/* Mega Badge Checkbox */}
              <div className="flex items-center gap-3 py-2">
                <input
                  id="modal-cat-mega"
                  type="checkbox"
                  checked={formData.isMega}
                  onChange={(e) => setFormData(prev => ({ ...prev, isMega: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-300 text-[#6366F1] focus:ring-[#6366F1]/30 cursor-pointer"
                />
                <div className="flex flex-col">
                  <label htmlFor="modal-cat-mega" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
                    Mega Menu Highlight
                  </label>
                  <span className="text-[10px] text-gray-400 font-semibold select-none">
                    Display a styled prominent badge and pin to header menus
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                  id="modal-cancel-btn"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  Cancel
                </button>
                <button
                  id="modal-submit-btn"
                  type="submit"
                  className="px-5 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-[#6366F1]/15 active:scale-95 cursor-pointer"
                >
                  {modalType === 'add' ? 'Add Category' : 'Save Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center z-50 p-4 transition-all animate-fade-in">
          <div className="bg-white rounded-[24px] border border-gray-200 w-full max-w-sm p-6 shadow-xl relative">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              Delete Category?
            </h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1 leading-relaxed">
              Are you sure you want to delete this category? This action is permanent. Products belonging to this category will become uncategorized.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
              <button
                id="delete-cancel-btn"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-3xs"
              >
                Cancel
              </button>
              <button
                id="delete-confirm-btn"
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-red-600/15 active:scale-95 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
