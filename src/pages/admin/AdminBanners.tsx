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
    <div className="space-y-8 font-sans">
      <div className="flex justify-between items-end bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:bg-gray-100/50">
        <div>
          <h2 className="text-4xl font-black text-black italic tracking-tighter uppercase mb-2">Display Vanguard</h2>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Manage Homepage Visual Architectures</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="group bg-black text-white px-8 py-4 text-[10px] uppercase tracking-[0.3em] font-black hover:bg-gray-800 transition-all flex items-center gap-3 shadow-xl rounded-2xl transform-gpu active:scale-95"
          >
            <Plus size={16} className="transition-transform group-hover:rotate-90" />
            <span>Initialize Banner</span>
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white border border-gray-100 p-10 rounded-3xl shadow-sm relative overflow-hidden max-w-4xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 blur-[100px] -mr-32 -mt-32 rounded-full" />
          
          <div className="flex justify-between items-center mb-10 pb-6 border-b border-gray-100 relative z-10">
            <h3 className="text-2xl font-black text-black italic tracking-tighter uppercase">{editingId ? 'Modify Manifest' : 'New Visual Identity'}</h3>
            <button onClick={cancelAdd} className="p-2 bg-gray-50 text-gray-400 hover:text-black rounded-xl transition-colors border border-gray-100">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-12 relative z-10">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Banner Nomenclature</label>
                  <input 
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. SUMMER COLLECTION"
                    className="w-full bg-gray-50 border border-gray-100 px-6 py-4 text-sm font-black italic tracking-tighter text-black outline-none focus:border-black transition-all rounded-2xl"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Architectural Target (Link)</label>
                  <input 
                    type="text"
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="/category/men"
                    className="w-full bg-gray-50 border border-gray-100 px-6 py-4 text-sm font-bold text-black outline-none focus:border-black transition-all rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Visual Asset Payload</label>
                <div className="relative group/upload">
                  <div className="aspect-[1920/600] bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl flex items-center justify-center overflow-hidden transition-all group-hover/upload:border-black/30 shadow-sm">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover/upload:scale-105" />
                    ) : (
                      <div className="text-center p-12">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 text-brand-gold border border-gray-100 shadow-sm">
                          <Upload size={32} />
                        </div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em]">Inject primary artifact (1920x600 recommended)</p>
                      </div>
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/80 opacity-0 group-hover/upload:opacity-100 transition-all flex items-center justify-center cursor-pointer rounded-3xl backdrop-blur-sm">
                    <span className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl">Replace Architectural Visual</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-8 border-t border-gray-100">
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                    className={cn(
                      "w-14 h-7 rounded-full transition-all relative flex items-center px-1 border-2",
                      formData.active ? "bg-black border-black shadow-lg" : "bg-gray-200 border-gray-300"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                      formData.active ? "translate-x-7" : "translate-x-0"
                    )} />
                  </button>
                  <span className={cn(
                    "text-[10px] uppercase tracking-[0.2em] font-black italic",
                    formData.active ? "text-brand-gold" : "text-gray-400"
                  )}>
                    {formData.active ? 'Operational Status: ACTIVE' : 'Operational Status: INERT'}
                  </span>
                </div>

                <div className="flex gap-6">
                  <button 
                    type="button"
                    onClick={cancelAdd}
                    className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-all"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    className="bg-black text-white px-12 py-4 text-[10px] uppercase tracking-[0.3em] font-black hover:bg-gray-800 transition-all flex items-center justify-center gap-3 min-w-[240px] rounded-2xl shadow-xl transform-gpu active:scale-95"
                  >
                    <Save size={16} />
                    <span>{editingId ? 'Push Manifest Update' : 'Synchronize Identity'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {banners.map((banner) => (
          <div key={banner.id} className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden group shadow-sm transition-all hover:border-black/10 relative">
            <div className="aspect-[1920/600] relative overflow-hidden">
              <img 
                src={banner.image} 
                alt={banner.title}
                className={cn(
                  "w-full h-full object-cover duration-1000 transition-all group-hover:scale-110",
                  !banner.active && "grayscale opacity-30 blur-sm"
                )}
              />
              <div className="absolute top-6 left-6">
                <span className={cn(
                  "px-4 py-2 text-[8px] uppercase tracking-[0.3em] font-black text-white rounded-lg shadow-xl",
                  banner.active ? "bg-black" : "bg-gray-400"
                )}>
                  {banner.active ? 'ACTIVE STATE' : 'INERT STATE'}
                </span>
              </div>
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center space-x-6 backdrop-blur-sm">
                <button 
                  onClick={() => startEdit(banner)}
                  className="w-14 h-14 bg-white text-black flex items-center justify-center rounded-2xl hover:bg-brand-gold hover:text-white transition-all shadow-2xl group/btn"
                  title="Edit Banner"
                >
                  <Edit2 size={20} className="transition-transform group-hover/btn:scale-110" />
                </button>
                <button 
                  onClick={() => updateBanner(banner.id, { active: !banner.active })}
                  className="w-14 h-14 bg-white text-black flex items-center justify-center rounded-2xl hover:bg-brand-gold hover:text-white transition-all shadow-2xl group/btn"
                  title={banner.active ? 'Deactivate' : 'Activate'}
                >
                  {banner.active ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <button 
                  onClick={() => setBannerToDelete(banner.id)}
                  className="w-14 h-14 bg-white text-red-500 flex items-center justify-center rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-2xl group/btn"
                  title="Delete Banner"
                >
                  <Trash2 size={20} className="transition-transform group-hover/btn:rotate-12" />
                </button>
              </div>
            </div>
            <div className="p-8">
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-black italic">{banner.title || 'ARCHITECTURAL NULL'}</h4>
                <div className="flex items-center text-[10px] text-gray-400 uppercase tracking-[0.2em] font-black">
                   <div className="w-1.5 h-1.5 bg-brand-gold rounded-full mr-3 animate-pulse" />
                   <span>Target Architectural Endpoint: {banner.link}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && !isAdding && (
          <div className="lg:col-span-2 py-32 text-center border-2 border-dashed border-gray-100 rounded-[3rem] bg-gray-50">
            <ImageIcon className="mx-auto text-gray-200 mb-8 animate-bounce" size={64} />
            <p className="text-3xl font-black text-black italic tracking-tighter uppercase">No visual anchors detected</p>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-4">Initialize your brand identity matrix</p>
            <button 
              onClick={() => setIsAdding(true)}
              className="mt-10 bg-black text-white px-10 py-4 text-[10px] uppercase tracking-[0.3em] font-black hover:bg-gray-800 transition-all inline-flex items-center gap-3 shadow-xl rounded-2xl"
            >
              <Plus size={16} />
              <span>Initialize Branding Matrix</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {bannerToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBannerToDelete(null)}
              className="absolute inset-0 bg-white/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white border border-gray-100 p-12 rounded-[2.5rem] max-w-sm w-full text-center relative shadow-2xl"
            >
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-sm border border-red-100">
                <Trash2 size={40} />
              </div>
              <h3 className="text-3xl font-black text-black italic tracking-tighter uppercase mb-4">Deconstruct Identity?</h3>
              <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-black leading-relaxed mb-12">
                Are you sure you want to permanently purge this visual architectural anchor? This operation is irreversible.
              </p>
              <div className="flex gap-6">
                <button 
                  onClick={() => setBannerToDelete(null)}
                  className="flex-1 py-5 text-[10px] uppercase tracking-[0.3em] font-black bg-gray-50 text-gray-400 hover:text-black transition-all rounded-2xl border border-gray-100"
                >
                  ABORT
                </button>
                <button 
                  onClick={async () => {
                    await deleteBanner(bannerToDelete);
                    toast.success('Asset Purged');
                    setBannerToDelete(null);
                  }}
                  className="flex-1 py-5 text-[10px] uppercase tracking-[0.3em] font-black bg-black text-white hover:bg-gray-800 transition-all rounded-2xl shadow-xl transform-gpu active:scale-95"
                >
                  PURGE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

  );
}
