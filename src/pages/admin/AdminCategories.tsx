import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Tag, Layout, Image as ImageIcon } from 'lucide-react';
import { useCategories } from '../../contexts/CategoryContext';
import { Category } from '../../types';
import toast from 'react-hot-toast';

const AdminCategories = () => {
  const { categories, addCategory, updateCategory, deleteCategory, loading } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    image: '',
    description: ''
  });

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        image: category.image || '',
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        image: '',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const slug = formData.name.toLowerCase().replace(/\s+/g, '-');
    
    if (editingCategory) {
      await updateCategory({
        ...editingCategory,
        name: formData.name,
        slug,
        image: formData.image,
        description: formData.description
      });
      toast.success('Category updated successfully');
    } else {
      const newCategory: Category = {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        slug,
        image: formData.image,
        description: formData.description
      };
      await addCategory(newCategory);
      toast.success('Category added successfully');
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      await deleteCategory(id);
      toast.success('Category deleted');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter text-black">Categories Matrix</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Manage global product architectural taxonomies</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-black text-white px-8 py-4 text-xs font-black uppercase tracking-widest hover:bg-brand-gold hover:text-white transition-all flex items-center justify-center gap-3 rounded-2xl shadow-xl transform-gpu active:scale-95"
        >
          <Plus size={18} /> Add Taxonomy
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-100 flex items-center gap-6">
          <div className="relative flex-1 max-w-xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-gold transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search taxonomy definitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-gray-100 outline-none focus:border-brand-gold text-black text-sm font-medium transition-all rounded-2xl placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Classification</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Route Slug</th>
                <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Manifest Data</th>
                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-10 py-12 text-center text-sm text-brand-gold font-black uppercase tracking-[0.3em] animate-pulse italic">Synchronizing...</td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-10 py-12 text-center text-sm text-gray-400 font-black uppercase tracking-[0.3em] italic">No definitions detected</td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-all group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg group-hover:border-brand-gold/50 transition-all transform group-hover:scale-105">
                          {cat.image ? (
                            <img src={cat.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Tag size={20} className="text-gray-400 group-hover:text-brand-gold transition-colors" />
                          )}
                        </div>
                        <span className="text-sm font-black text-black uppercase italic tracking-tighter group-hover:text-brand-gold transition-colors">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-[10px] font-black font-mono bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-3 py-1.5 rounded-lg">/{cat.slug}</span>
                    </td>
                    <td className="px-6 py-6 max-w-xs">
                      <p className="text-[11px] text-gray-400 font-bold tracking-tight line-clamp-1 italic">{cat.description || '-'}</p>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => handleOpenModal(cat)}
                          className="p-3 bg-gray-50 text-gray-400 hover:text-white border border-gray-100 rounded-xl hover:bg-brand-gold hover:border-brand-gold transition-all transform-gpu active:scale-90"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(cat.id)}
                          className="p-3 bg-gray-50 text-gray-400 hover:text-white border border-gray-100 rounded-xl hover:bg-red-500 hover:border-red-500 transition-all transform-gpu active:scale-90"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative bg-white w-full max-w-lg p-10 shadow-[0_0_50px_rgba(0,0,0,0.1)] rounded-3xl border border-gray-100 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold opacity-5 blur-[80px] -mr-16 -mt-16 rounded-full" />
            
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-black mb-8 border-b border-gray-100 pb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center italic text-sm">T</span>
              {editingCategory ? 'Update Taxonomy' : 'Global Definition'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block ml-1">Architectural Identity</label>
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-brand-gold text-black text-sm font-black italic tracking-tighter transition-all placeholder:text-gray-300"
                  placeholder="e.g. LUXURY APPAREL"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block ml-1">Visual Manifest URL</label>
                <div className="relative group">
                  <ImageIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-brand-gold transition-colors" size={18} />
                  <input 
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-brand-gold text-black text-sm font-medium transition-all placeholder:text-gray-300"
                    placeholder="EXTERNAL ASSET URL"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block ml-1">Contextual Description</label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-brand-gold text-black text-sm font-medium resize-none transition-all placeholder:text-gray-300 no-scrollbar"
                  placeholder="PROVIDE ARCHITECTURAL CONTEXT..."
                />
              </div>
              
              <div className="pt-6 flex flex-col gap-4">
                <button 
                  type="submit"
                  className="w-full bg-black text-white py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-brand-gold hover:text-white transition-all rounded-2xl shadow-xl transform-gpu active:scale-95"
                >
                  {editingCategory ? 'Commit Changes' : 'Initialize Taxonomy'}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full bg-gray-50 text-gray-400 py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-gray-100 hover:text-black transition-all rounded-2xl border border-gray-100"
                >
                  Abort Operation
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
