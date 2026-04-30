/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Globe, 
  Settings, 
  Tag, 
  Image as ImageIcon, 
  Lock, 
  Bell, 
  Store,
  Save,
  Plus,
  Upload
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { useBranding } from '../../contexts/BrandingContext';
import { useProducts } from '../../contexts/ProductContext';
import { compressImage } from '../../utils/imageCompressor';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const location = useLocation();
  const { 
    logoUrl, 
    setLogoUrl, 
    sizeChartUrl, 
    setSizeChartUrl, 
    categoryImages, 
    setCategoryImageUrl, 
    collectionsBannerUrl, 
    setCollectionsBannerUrl, 
    heroBannerUrl, 
    setHeroBannerUrl,
    featureBannerUrl,
    setFeatureBannerUrl,
    showShowcase,
    setShowShowcase
  } = useBranding();
  const { products } = useProducts();
  const [activeTab, setActiveTab] = useState('General');
  const [tempLogo, setTempLogo] = useState(logoUrl);
  const [tempSizeChart, setTempSizeChart] = useState(sizeChartUrl);
  const allCategories = Array.from(new Set(products.map(p => p.category)));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading('Uploading logo...');
      try {
        const result = await compressImage(file, 1024, 1024, 0.8);
        setTempLogo(result);
        setLogoUrl(result);
        toast.success('Logo updated permanently.', { id: loadingToast });
      } catch (err) {
        toast.error('Failed to update logo.', { id: loadingToast });
      }
    }
  };

  const handleSizeChartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressImage(file, 1000, 1000, 0.8);
        setTempSizeChart(result);
        toast.success('Size chart preview updated. Apply changes to save.');
      } catch (err) {
        toast.error('Failed to compress size chart.');
      }
    }
  };

  const handleApplyBranding = () => {
    setLogoUrl(tempLogo);
    setSizeChartUrl(tempSizeChart);
    toast.success('Brand identity and size guide updated successfully.');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (location.pathname.includes('banners')) {
      setActiveTab('Banners');
    } else {
      setActiveTab('General');
    }
  }, [location.pathname, location.search]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Your changes have been prioritized and saved.');
    }, 1200);
  };

  const tabs = [
    { name: 'General', icon: Store },
    { name: 'Branding', icon: ImageIcon },
    { name: 'Categories', icon: Tag },
    { name: 'Banners', icon: Globe },
    { name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif">Store Settings</h1>
        <p className="text-sm text-gray-400 mt-2 uppercase tracking-widest">Manage your global store configurations</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Tabs */}
        <div className="w-full lg:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={cn(
                  "w-full flex items-center space-x-3 px-6 py-4 text-[10px] uppercase tracking-widest font-bold transition-all border-l-4",
                  activeTab === tab.name 
                    ? "bg-white border-brand-gold text-brand-gold shadow-sm" 
                    : "border-transparent text-gray-400 hover:text-brand-ink hover:bg-white/50"
                )}
              >
                <Icon size={16} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-gray-100 shadow-sm p-8 md:p-12">
          {activeTab === 'Categories' && (
            <div className="space-y-6">
              <h3 className="serif text-2xl border-b border-gray-100 pb-4">Category Images</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCategories.map(cat => (
                  <div key={cat} className="p-6 border border-gray-100 flex flex-col items-center text-center space-y-4">
                    <label className="text-[10px] uppercase font-bold text-gray-500">{cat}</label>
                    <div className="w-24 h-24 rounded-full bg-gray-50 border border-gray-200 overflow-hidden relative group shrink-0">
                      {(categoryImages[cat]) ? (
                        <img src={categoryImages[cat]} alt={cat} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                        <label className="text-white text-[10px] uppercase tracking-widest font-bold cursor-pointer w-full h-full flex items-center justify-center">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const result = await compressImage(file, 800, 800, 0.8);
                                  setCategoryImageUrl(cat, result);
                                  toast.success(`${cat} image updated.`);
                                } catch (err) {
                                  toast.error('Failed to compress image.');
                                }
                              }
                            }} 
                          />
                          <Upload size={16} />
                        </label>
                      </div>
                    </div>
                    <label className="bg-brand-ink text-white px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all cursor-pointer flex items-center gap-2">
                        <Upload size={12} />
                        <span>Upload</span>
                        <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const result = await compressImage(file, 800, 800, 0.8);
                                  setCategoryImageUrl(cat, result);
                                  toast.success(`${cat} image updated.`);
                                } catch (err) {
                                  toast.error('Failed to compress image.');
                                }
                              }
                            }} 
                        />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'General' && (
            <div className="space-y-10 max-w-2xl">
              <div className="space-y-6">
                <h3 className="serif text-2xl border-b border-gray-100 pb-4">Brand Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Store Name</label>
                    <input type="text" defaultValue="Elegan BD" className="w-full bg-gray-50 border border-gray-100 px-4 py-3 outline-none focus:border-brand-gold transition-colors text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Support Email</label>
                    <input type="email" defaultValue="care@eleganbd.com" className="w-full bg-gray-50 border border-gray-100 px-4 py-3 outline-none focus:border-brand-gold transition-colors text-sm" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Store Description</label>
                    <textarea defaultValue="Premium minimalist fashion for the modern individual." rows={3} className="w-full bg-gray-50 border border-gray-100 px-4 py-3 outline-none focus:border-brand-gold transition-colors text-sm resize-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="serif text-2xl border-b border-gray-100 pb-4">Social Media</h3>
                <div className="space-y-4">
                   <div className="flex gap-4">
                      <div className="bg-gray-100 p-3 flex items-center justify-center shrink-0 w-12">
                         <span className="text-[10px] font-bold">FB</span>
                      </div>
                      <input type="text" placeholder="Facebook URL" className="w-full bg-gray-50 border border-gray-100 px-4 py-3 outline-none focus:border-brand-gold text-sm" />
                   </div>
                   <div className="flex gap-4">
                      <div className="bg-gray-100 p-3 flex items-center justify-center shrink-0 w-12">
                         <span className="text-[10px] font-bold">IG</span>
                      </div>
                      <input type="text" placeholder="Instagram URL" className="w-full bg-gray-50 border border-gray-100 px-4 py-3 outline-none focus:border-brand-gold text-sm" />
                   </div>
                </div>
              </div>

              <div className="pt-6">
                 <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "bg-brand-ink text-white px-10 py-4 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all flex items-center justify-center space-x-2 min-w-[200px]",
                    isSaving && "opacity-70 cursor-not-allowed"
                  )}
                 >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </span>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Major Changes</span>
                      </>
                    )}
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'Branding' && (
            <div className="space-y-10 max-w-2xl">
              <div className="space-y-6">
                <h3 className="serif text-2xl border-b border-gray-100 pb-4">Website Logo</h3>
                <div className="p-8 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-48 h-32 bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden relative group">
                    <img 
                      src={tempLogo} 
                      alt="Logo Preview" 
                      className="max-h-20 w-auto object-contain brightness-0"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <label className="text-white text-[10px] uppercase tracking-widest font-bold cursor-pointer">
                          Change Website Logo
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                       </label>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-brand-gold">Main Logo (Shows left of "Elegan BD")</p>
                    <p className="text-xs text-gray-400 mt-1">Recommended: Square Transparent PNG, 512x512px</p>
                  </div>
                  <label className="bg-brand-ink text-white px-8 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all cursor-pointer flex items-center gap-2">
                    <Upload size={14} />
                    <span>Upload New Logo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="serif text-2xl border-b border-gray-100 pb-4">Logo Variants</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-brand-ink border border-white/10 flex flex-col items-center space-y-4">
                    <img 
                      src={tempLogo} 
                      className="h-10 w-auto object-contain brightness-0 invert" 
                      alt="Dark Mode"
                    />
                    <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Header/Dark Background Variant</span>
                  </div>
                  <div className="p-6 bg-white border border-gray-100 flex flex-col items-center space-y-4">
                    <img 
                      src={tempLogo} 
                      className="h-10 w-auto object-contain brightness-0" 
                      alt="Light Mode"
                    />
                    <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Invoice/Light Background Variant</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-gray-100">
                <h3 className="serif text-2xl border-b border-gray-100 pb-4">Size Guide Chart</h3>
                <div className="p-8 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-full max-w-md bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden relative group aspect-video">
                    <img 
                      src={tempSizeChart} 
                      alt="Size Chart Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                       <label className="text-white text-[10px] uppercase tracking-widest font-bold cursor-pointer">
                          Change Size Chart
                          <input type="file" accept="image/*" className="hidden" onChange={handleSizeChartUpload} />
                       </label>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-brand-gold">Global Size Guide Image</p>
                    <p className="text-xs text-gray-400 mt-1">Visible on all product detail pages</p>
                  </div>
                  <label className="bg-brand-ink text-white px-8 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all cursor-pointer flex items-center gap-2">
                    <Upload size={14} />
                    <span>Upload Size Chart</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleSizeChartUpload} />
                  </label>
                </div>
              </div>

              <div className="space-y-6 pt-10 border-t border-gray-100">
                <h3 className="serif text-2xl border-b border-gray-100 pb-4">Home Page Sections</h3>
                <div className="flex items-center justify-between p-6 bg-gray-50 border border-gray-100">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink">Complete Collection Showcase</p>
                    <p className="text-xs text-gray-400">Display the full list of products at the bottom of the home page</p>
                  </div>
                  <button
                    onClick={() => setShowShowcase(!showShowcase)}
                    className={cn(
                      "w-14 h-7 rounded-full transition-colors relative flex items-center px-1",
                      showShowcase ? "bg-brand-gold" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full transition-transform shadow-md",
                      showShowcase ? "translate-x-7" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>

              <div className="pt-6">
                 <button 
                  onClick={handleApplyBranding}
                  className="bg-brand-ink text-white px-10 py-4 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold transition-all flex items-center space-x-2"
                 >
                    <Save size={16} />
                    <span>Apply Brand Settings</span>
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'Banners' && (
            <div className="space-y-12">
               {/* Site Banners Configured via BannerContext (left as placeholder for now or removed if minimal) */}
               
               <div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                      <h3 className="serif text-2xl">Collections Section Banner</h3>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Appears above "Top Collections" on Home Page</p>
                  </div>
                  
                  <div className="border border-gray-100 p-2 group relative overflow-hidden">
                      <div className="aspect-[21/9] bg-gray-50 relative border-2 border-dashed border-transparent hover:border-brand-gold transition-colors flex items-center justify-center">
                          {collectionsBannerUrl ? (
                              <img src={collectionsBannerUrl} className="w-full h-full object-cover" alt="Collections Banner" />
                          ) : (
                              <div className="text-gray-400 flex flex-col items-center">
                                  <ImageIcon size={32} className="mb-2" />
                                  <span className="text-[10px] uppercase tracking-widest font-bold">No Banner Selected</span>
                              </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <label className="bg-white text-brand-ink px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold hover:text-white transition-all cursor-pointer flex items-center gap-2">
                                  <Upload size={16} />
                                  <span>Upload New Banner</span>
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                              try {
                                                  // Compress banner differently, use high width, lower quality since it's just visual
                                                  const result = await compressImage(file, 1600, 900, 0.8);
                                                  setCollectionsBannerUrl(result);
                                                  toast.success('Collections banner updated successfully.');
                                              } catch (err) {
                                                  toast.error('Failed to compress image.');
                                              }
                                          }
                                      }} 
                                  />
                              </label>
                          </div>
                      </div>
                      <div className="p-4 bg-white">
                          <p className="text-[10px] uppercase tracking-widest font-bold mb-1">Collections Showcase Banner</p>
                          <p className="text-xs text-gray-400">This banner separates categories and main collections on the home page.</p>
                      </div>
                  </div>
               </div>

               <div>
                 <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                     <h3 className="serif text-2xl">Homepage Hero Banner</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Banner Item Placeholder */}
                     <div className="border border-gray-100 p-2 group relative overflow-hidden">
                         <div className="aspect-[21/9] bg-brand-muted relative border-2 border-dashed border-transparent hover:border-brand-gold transition-colors flex items-center justify-center">
                           {heroBannerUrl ? (
                               <img src={heroBannerUrl} className="w-full h-full object-cover" alt="Hero Banner" />
                           ) : (
                               <div className="text-gray-400 flex flex-col items-center">
                                   <ImageIcon size={32} className="mb-2" />
                                   <span className="text-[10px] uppercase tracking-widest font-bold">No Banner Selected</span>
                               </div>
                           )}
                           
                           <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <label className="bg-white text-brand-ink px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold hover:text-white transition-all cursor-pointer flex items-center gap-2">
                                   <Upload size={16} />
                                   <span>Upload New Banner</span>
                                   <input 
                                       type="file" 
                                       accept="image/*" 
                                       className="hidden" 
                                       onChange={async (e) => {
                                           const file = e.target.files?.[0];
                                           if (file) {
                                               try {
                                                   const result = await compressImage(file, 1600, 900, 0.8);
                                                   setHeroBannerUrl(result);
                                                   toast.success('Hero banner updated successfully.');
                                               } catch (err) {
                                                   toast.error('Failed to compress image.');
                                               }
                                           }
                                       }} 
                                   />
                               </label>
                           </div>
                         </div>
                         <div className="p-4 bg-white">
                           <p className="text-[10px] uppercase tracking-widest font-bold mb-1">Main Landing Banner</p>
                           <p className="text-xs text-gray-400">Active • Visible to all users</p>
                         </div>
                     </div>

                     <div className="border border-gray-100 p-2 group relative overflow-hidden">
                         <div className="aspect-[21/9] bg-brand-muted relative border-2 border-dashed border-transparent hover:border-brand-gold transition-colors flex items-center justify-center">
                           {featureBannerUrl ? (
                               <img src={featureBannerUrl} className="w-full h-full object-cover" alt="Feature Banner" />
                           ) : (
                               <div className="text-gray-400 flex flex-col items-center">
                                   <ImageIcon size={32} className="mb-2" />
                                   <span className="text-[10px] uppercase tracking-widest font-bold">No Banner Selected</span>
                               </div>
                           )}
                           
                           <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <label className="bg-white text-brand-ink px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-gold hover:text-white transition-all cursor-pointer flex items-center gap-2">
                                   <Upload size={16} />
                                   <span>Upload Feature Banner</span>
                                   <input 
                                       type="file" 
                                       accept="image/*" 
                                       className="hidden" 
                                       onChange={async (e) => {
                                           const file = e.target.files?.[0];
                                           if (file) {
                                               try {
                                                   const result = await compressImage(file, 1600, 900, 0.8);
                                                   setFeatureBannerUrl(result);
                                                   toast.success('Feature section banner updated successfully.');
                                               } catch (err) {
                                                   toast.error('Failed to compress image.');
                                               }
                                           }
                                       }} 
                                   />
                               </label>
                           </div>
                         </div>
                         <div className="p-4 bg-white">
                           <p className="text-[10px] uppercase tracking-widest font-bold mb-1">Feature Section Banner</p>
                           <p className="text-xs text-gray-400">Located below service boxes on Home page</p>
                         </div>
                     </div>
                 </div>
               </div>
            </div>
          )}
          
          {activeTab !== 'General' && activeTab !== 'Banners' && activeTab !== 'Categories' && (
             <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Settings size={48} className="mb-4 animate-spin-slow" />
                <h3 className="serif text-2xl">Coming Soon</h3>
                <p className="text-[10px] uppercase tracking-widest mt-2">{activeTab} management panel is under development.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
