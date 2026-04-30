import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Upload,
  Save,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBanners } from '../../contexts/BannerContext';
import { Banner } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

import { compressImage } from '../../utils/imageCompressor';

export default function AdminBanners() {
  const { banners, addBanner, updateBanner, deleteBanner } = useBanners();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Banner, 'id'>>({
    image: '',
    title: '',
    link: '/shop',
    active: true,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressImage(file, 1600, 900, 0.8);
        setFormData(prev => ({ ...prev, image: result }));
      } catch (err) {
        toast.error('Failed to compress image.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      toast.error('Please upload a banner image');
      return;
    }
    
    try {
      if (editingId) {
        await updateBanner(editingId, formData);
        toast.success('Banner updated successfully');
        setEditingId(null);
      } else {
        await addBanner(formData);
        toast.success('Banner added successfully');
        setIsAdding(false);
      }
      
      setFormData({
        image: '',
        title: '',
        link: '/shop',
        active: true,
      });
    } catch (err) {
      toast.error('Failed to save banner.');
    }
  };

  const startEdit = (banner: Banner) => {
    setFormData({
      image: banner.image,
      title: banner.title,
      link: banner.link,
      active: banner.active,
    });
    setEditingId(banner.id);
    setIsAdding(true);
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      image: '',
      title: '',
      link: '/shop',
      active: true,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="serif text-4xl mb-2">Banners</h2>
          <p className="text-gray-400 text-sm uppercase tracking-widest">Manage Homepage Visuals</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-brand-ink text-white px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            <span>Add New Banner</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white border border-gray-100 p-8 shadow-sm max-w-4xl">
          <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-50">
            <h3 className="serif text-2xl">{editingId ? 'Edit Banner' : 'New Banner'}</h3>
            <button onClick={cancelAdd} className="text-gray-400 hover:text-brand-ink transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Banner Image</label>
                <div className="relative group">
                  <div className="aspect-[1920/600] bg-gray-50 border-2 border-dashed border-gray-100 flex items-center justify-center overflow-hidden">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-6">
                        <Upload className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">1920x600 recommended</p>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <span className="text-white text-[10px] uppercase tracking-widest font-bold">Select Banner File</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative flex items-center px-1",
                      formData.active ? "bg-brand-gold" : "bg-gray-200"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full transition-transform",
                      formData.active ? "translate-x-6" : "translate-x-0"
                    )} />
                  </button>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                    {formData.active ? 'Active' : 'Draft'}
                  </span>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={cancelAdd}
                    className="px-8 py-4 text-[10px] uppercase tracking-widest font-bold hover:bg-gray-50 transition-all border border-gray-100"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-brand-ink text-white px-12 py-4 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all flex items-center justify-center gap-2 min-w-[200px]"
                  >
                    <Save size={14} />
                    <span>{editingId ? 'Save Changes' : 'Create Banner'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white border border-gray-100 overflow-hidden group shadow-sm">
            <div className="aspect-[1920/600] relative overflow-hidden">
              <img 
                src={banner.image} 
                alt={banner.title}
                className={cn(
                  "w-full h-full object-cover duration-700 transition-all group-hover:scale-105",
                  !banner.active && "grayscale opacity-50"
                )}
              />
              <div className="absolute top-4 left-4">
                <span className={cn(
                  "px-3 py-1 text-[8px] uppercase tracking-widest font-bold text-white",
                  banner.active ? "bg-brand-gold" : "bg-gray-400"
                )}>
                  {banner.active ? 'Active' : 'Draft'}
                </span>
              </div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-4">
                <button 
                  onClick={() => startEdit(banner)}
                  className="w-10 h-10 bg-white text-brand-ink flex items-center justify-center hover:bg-brand-gold hover:text-white transition-all shadow-lg"
                  title="Edit Banner"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => updateBanner(banner.id, { active: !banner.active })}
                  className="w-10 h-10 bg-white text-brand-ink flex items-center justify-center hover:bg-brand-gold hover:text-white transition-all shadow-lg"
                  title={banner.active ? 'Deactivate' : 'Activate'}
                >
                  {banner.active ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button 
                  onClick={() => setBannerToDelete(banner.id)}
                  className="w-10 h-10 bg-white text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-lg"
                  title="Delete Banner"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                 <ExternalLink size={10} className="mr-2" />
                 <span>Auto-linked to /shop</span>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && !isAdding && (
          <div className="lg:col-span-2 py-24 text-center border-2 border-dashed border-gray-100">
            <ImageIcon className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="serif text-2xl text-gray-400">No banners found</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-6 bg-brand-ink text-white px-8 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all inline-flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Add Your First Banner</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {bannerToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBannerToDelete(null)}
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
              <h3 className="text-2xl font-serif mb-4">Delete Banner?</h3>
              <p className="text-gray-400 text-xs uppercase tracking-widest leading-loose mb-10">
                Are you sure you want to delete this banner? This action is permanent.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setBannerToDelete(null)}
                  className="flex-1 py-4 text-[10px] uppercase tracking-widest font-bold bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    await deleteBanner(bannerToDelete);
                    toast.success('Banner deleted');
                    setBannerToDelete(null);
                  }}
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
