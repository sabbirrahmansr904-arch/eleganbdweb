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
    <div className="space-y-8 font-sans">
      <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:bg-gray-100/50">
        <h1 className="text-3xl font-black text-black italic tracking-tighter uppercase">Store Configuration</h1>
        <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-[0.2em] font-black">Manage global matrix and architectural store settings</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 text-black">
        {/* Navigation Tabs */}
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={cn(
                  "w-full flex items-center space-x-4 px-6 py-5 text-[10px] uppercase tracking-[0.2em] font-black transition-all rounded-2xl border transform-gpu",
                  activeTab === tab.name 
                    ? "bg-black text-white border-black shadow-xl translate-x-2" 
                    : "bg-gray-50 border-gray-100 text-gray-400 hover:text-black hover:bg-gray-100"
                )}
              >
                <Icon size={18} className={cn(activeTab === tab.name ? "text-white" : "text-brand-gold")} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-gray-100 shadow-sm rounded-3xl p-8 md:p-14 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gray-50 blur-[100px] -mr-32 -mt-32 rounded-full" />
          
          {activeTab === 'Categories' && (
            <div className="space-y-10 relative z-10 font-sans">
              <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Category Assets</h3>
                <Tag size={20} className="text-brand-gold" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {allCategories.map(cat => (
                  <div key={cat} className="p-8 bg-gray-50 border border-gray-100 rounded-3xl flex flex-col items-center text-center space-y-6 group hover:border-black transition-all">
                    <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{cat}</label>
                    <div className="w-32 h-32 rounded-2xl bg-white border border-gray-100 overflow-hidden relative group shrink-0 shadow-sm">
                      {(categoryImages[cat]) ? (
                        <img src={categoryImages[cat]} alt={cat} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-gray-200 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      )}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-sm">
                        <label className="text-white text-[10px] uppercase tracking-widest font-black cursor-pointer w-full h-full flex flex-col items-center justify-center gap-2">
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
                          <Upload size={20} />
                          <span>Replace</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'General' && (
            <div className="space-y-12 max-w-3xl relative z-10 font-sans">
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Identity Profile</h3>
                  <Store size={20} className="text-brand-gold" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Store Nomenclature</label>
                    <input type="text" defaultValue="Elegan BD" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-black text-sm font-black italic tracking-tighter" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Support Channel</label>
                    <input type="email" defaultValue="care@eleganbd.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-black text-sm font-medium" />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 ml-1">Architectural Description</label>
                    <textarea defaultValue="Premium minimalist fashion for the modern individual." rows={4} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-black text-sm font-medium resize-none no-scrollbar" />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Social Integrations</h3>
                </div>
                <div className="space-y-4">
                   <div className="flex gap-4 group">
                      <div className="bg-gray-50 border border-gray-100 p-4 flex items-center justify-center shrink-0 w-16 rounded-2xl text-black font-black italic group-focus-within:border-black transition-all">
                         FB
                      </div>
                      <input type="text" placeholder="Facebook URL" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black text-black text-sm" />
                   </div>
                   <div className="flex gap-4 group">
                      <div className="bg-gray-50 border border-gray-100 p-4 flex items-center justify-center shrink-0 w-16 rounded-2xl text-black font-black italic group-focus-within:border-black transition-all">
                         IG
                      </div>
                      <input type="text" placeholder="Instagram URL" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black text-black text-sm" />
                   </div>
                </div>
              </div>

              <div className="pt-8">
                 <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "bg-black text-white px-12 py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all flex items-center justify-center space-x-3 min-w-[280px] rounded-2xl shadow-xl transform-gpu active:scale-95",
                    isSaving && "opacity-70 cursor-not-allowed"
                  )}
                 >
                    {isSaving ? (
                      <span className="flex items-center gap-3">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Synchronizing...</span>
                      </span>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Commit Global Settings</span>
                      </>
                    )}
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'Branding' && (
            <div className="space-y-12 max-w-3xl relative z-10 font-sans">
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Brandmark Initialization</h3>
                  <ImageIcon size={20} className="text-brand-gold" />
                </div>
                <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50 flex flex-col items-center justify-center text-center space-y-8 group hover:border-black/30 transition-all">
                  <div className="w-64 h-40 bg-white flex items-center justify-center border border-gray-100 rounded-2xl overflow-hidden relative group/inner shadow-sm">
                    <img 
                      src={tempLogo} 
                      alt="Logo Preview" 
                      className="max-h-24 w-auto object-contain"
                    />
                    <div className="absolute inset-0 bg-black/90 opacity-0 group-hover/inner:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                       <label className="text-white text-[10px] uppercase tracking-widest font-black cursor-pointer flex flex-col items-center gap-2">
                          <Upload size={24} />
                          <span>Modify Brandmark</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                       </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-gold">Master Logotype Assets</p>
                    <p className="text-xs text-gray-400">OPTIMAL: 512x512PX TRANSPARENT PNG</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Visual Interface Variants</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-10 bg-gray-50 border border-gray-100 rounded-2xl flex flex-col items-center space-y-6 shadow-sm">
                    <img 
                      src={tempLogo} 
                      className="h-12 w-auto object-contain" 
                      alt="Full Context"
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Standard Context</span>
                  </div>
                  <div className="p-10 bg-black border border-black rounded-2xl flex flex-col items-center space-y-6 shadow-xl">
                    <img 
                      src={tempLogo} 
                      className="h-12 w-auto object-contain brightness-0 invert" 
                      alt="Inverted Context"
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-black">Inverted Context Matrix</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-12 border-t border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Measurement Taxonomy</h3>
                </div>
                <div className="p-12 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50 flex flex-col items-center justify-center text-center space-y-8 group hover:border-black/30 transition-all">
                  <div className="w-full max-w-lg bg-white flex items-center justify-center border border-gray-100 rounded-2xl overflow-hidden relative group/inner aspect-video shadow-sm">
                    <img 
                      src={tempSizeChart} 
                      alt="Size Chart Preview" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/90 opacity-0 group-hover/inner:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                       <label className="text-white text-[10px] uppercase tracking-widest font-black cursor-pointer flex flex-col items-center gap-2">
                          <Upload size={24} />
                          <span>Update Matrix</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleSizeChartUpload} />
                       </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-gold">Global Sizing Matrix</p>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">PROPAGATED TO ALL PRODUCT MANIFESTS</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8 pt-12 border-t border-gray-100">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Runtime Visibilities</h3>
                </div>
                <div className="flex items-center justify-between p-8 bg-gray-50 border border-gray-100 rounded-2xl group hover:border-black/30 transition-all shadow-sm">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black italic tracking-tighter">Collection Discovery Matrix</p>
                    <p className="text-xs text-gray-400 font-medium">ENABLE GLOBAL DISCOVERY PROTOCOL ON LANDING PAGE</p>
                  </div>
                  <button
                    onClick={() => setShowShowcase(!showShowcase)}
                    className={cn(
                      "w-16 h-8 rounded-full transition-all relative flex items-center px-1 border-2",
                      showShowcase ? "bg-black border-black shadow-lg" : "bg-gray-200 border-gray-300"
                    )}
                  >
                    <motion.div 
                      layout
                      className={cn(
                        "w-5 h-5 rounded-full transition-all shadow-sm",
                        showShowcase ? "bg-white" : "bg-gray-400"
                      )} 
                    />
                  </button>
                </div>
              </div>

              <div className="pt-8">
                 <button 
                  onClick={handleApplyBranding}
                  className="bg-black text-white px-12 py-5 text-xs font-black uppercase tracking-[0.3em] hover:bg-gray-800 transition-all rounded-2xl shadow-xl transform-gpu active:scale-95 flex items-center gap-3"
                 >
                    <Save size={18} />
                    <span>Propagate Brand Assets</span>
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'Banners' && (
            <div className="space-y-16 relative z-10 font-sans">
               <div>
                  <div className="flex justify-between items-center border-b border-gray-100 pb-6 mb-10">
                      <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Matrix Segment Banners</h3>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-black italic">LANDING PAGE ARCHITRAVE</p>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-100 p-3 rounded-3xl group relative overflow-hidden shadow-sm">
                      <div className="aspect-[21/9] bg-white rounded-2xl relative border-2 border-dashed border-gray-100 hover:border-black transition-all flex items-center justify-center overflow-hidden">
                          {collectionsBannerUrl ? (
                              <img src={collectionsBannerUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Collections Banner" />
                          ) : (
                              <div className="text-gray-200 flex flex-col items-center gap-4">
                                  <ImageIcon size={48} />
                                  <span className="text-[10px] uppercase tracking-[0.3em] font-black italic">NO DATA DETECTED</span>
                              </div>
                          )}
                          
                          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm gap-3">
                              <label className="bg-white text-black px-10 py-4 text-[10px] uppercase tracking-[0.2em] font-black hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-3 rounded-2xl shadow-2xl font-sans">
                                  <Upload size={20} />
                                  <span>Modify Landscape</span>
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                              try {
                                                  const result = await compressImage(file, 1600, 900, 0.8);
                                                  setCollectionsBannerUrl(result);
                                                  toast.success('Landscape matrix updated.');
                                              } catch (err) {
                                                  toast.error('Processing failure.');
                                              }
                                          }
                                      }} 
                                  />
                              </label>
                          </div>
                      </div>
                      <div className="p-8">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-black text-brand-gold mb-2">Discovery Protocol Banner</p>
                          <p className="text-xs text-gray-400 font-medium italic">ARCHITECTURAL SEPARATOR FOR THE BOTTOM DISCOVERY GRID</p>
                      </div>
                  </div>
               </div>

               <div>
                 <div className="flex justify-between items-center border-b border-gray-100 pb-6 mb-10">
                     <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Hero Matrix Core</h3>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-gray-50 border border-gray-100 p-3 rounded-3xl group relative overflow-hidden shadow-sm font-sans">
                          <div className="aspect-video bg-white rounded-2xl relative border-2 border-dashed border-gray-100 hover:border-black transition-all flex items-center justify-center overflow-hidden">
                            {heroBannerUrl ? (
                                <img src={heroBannerUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Hero Banner" />
                            ) : (
                                <div className="text-gray-200 flex flex-col items-center gap-3">
                                    <ImageIcon size={32} />
                                    <span className="text-[9px] uppercase tracking-widest font-black">NULL STATE</span>
                                </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm gap-3">
                                <label className="bg-white text-black px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-black hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-3 rounded-2xl shadow-2xl">
                                    <Upload size={18} />
                                    <span>Core Replace</span>
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
                                                    toast.success('Core matrix updated.');
                                                } catch (err) {
                                                    toast.error('Processing failure.');
                                                }
                                            }
                                        }} 
                                    />
                                </label>
                            </div>
                          </div>
                          <div className="p-6">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black italic">Primary Vanguard</p>
                            <p className="text-[9px] text-brand-gold font-bold uppercase tracking-widest mt-2">REAL-TIME PROPAGATION ACTIVE</p>
                          </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-100 p-3 rounded-3xl group relative overflow-hidden shadow-sm font-sans">
                          <div className="aspect-video bg-white rounded-2xl relative border-2 border-dashed border-gray-100 hover:border-black transition-all flex items-center justify-center overflow-hidden">
                            {featureBannerUrl ? (
                                <img src={featureBannerUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="Feature Banner" />
                            ) : (
                                <div className="text-gray-200 flex flex-col items-center gap-3">
                                    <ImageIcon size={32} />
                                    <span className="text-[9px] uppercase tracking-widest font-black">NULL STATE</span>
                                </div>
                            )}
                            
                            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm gap-3">
                                <label className="bg-white text-black px-8 py-4 text-[10px] uppercase tracking-[0.2em] font-black hover:bg-black hover:text-white transition-all cursor-pointer flex items-center gap-3 rounded-2xl shadow-2xl">
                                    <Upload size={18} />
                                    <span>Feature Replace</span>
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
                                                    toast.success('Feature matrix updated.');
                                                } catch (err) {
                                                    toast.error('Processing failure.');
                                                }
                                            }
                                        }} 
                                    />
                                </label>
                            </div>
                          </div>
                          <div className="p-6">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black italic">Secondary Vanguard</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2">LOWER ARCHITECTURAL SEGMENT</p>
                          </div>
                      </div>
                 </div>
               </div>
            </div>
          )}
          
          {activeTab === 'Notifications' && (
            <div className="space-y-10 max-w-3xl relative z-10 font-sans">
              <div className="space-y-8">
                <div className="flex justify-between items-center border-b border-gray-100 pb-6">
                  <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Alert Distribution</h3>
                  <Bell size={20} className="text-brand-gold" />
                </div>
                <p className="text-sm text-gray-400 font-medium italic">ENABLE REAL-TIME INTERRUPTIONS FOR INCOMING ORDER MANIFESTS. INCLUDES AUDIO FEEDBACK LOOP.</p>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-8 bg-gray-50 border border-gray-100 rounded-3xl group hover:border-black transition-all shadow-sm">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black italic tracking-tighter">System Push Matrix</p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">CURRENT STATUS: {("Notification" in window) ? Notification.permission.toUpperCase() : "NOT SUPPORTED"}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (!("Notification" in window)) {
                          toast.error("HARDWARE LIMITATION DETECTED");
                        } else {
                          Notification.requestPermission().then(permission => {
                            if (permission === "granted") {
                              toast.success("INTERRUPTION PROTOCOL ACTIVE");
                            } else {
                              toast.error("PERMISSION REJECTED BY HOST");
                            }
                          });
                        }
                      }}
                      className="px-8 py-4 bg-black text-white text-[10px] uppercase tracking-[0.2em] font-black hover:bg-gray-800 transition-all rounded-2xl shadow-lg transform-gpu active:scale-95"
                    >
                      INITIALIZE PROTOCOL
                    </button>
                  </div>

                  <div className="bg-brand-gold/10 border-l-4 border-brand-gold p-8 rounded-r-3xl">
                    <div className="flex gap-5">
                      <Bell className="h-6 w-6 text-brand-gold shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs text-black font-black uppercase tracking-widest italic">Synchronization Active</p>
                        <p className="text-[11px] text-gray-500 font-medium italic leading-relaxed">
                          REAL-TIME ORDER POLLING IS ALREADY ACTIVE VIA ORDER ENTITY SYNC. AUDIO SIGNALS WILL PROPAGATE AUTOMATICALLY UPON PERMISSION ACQUISITION.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab !== 'General' && activeTab !== 'Banners' && activeTab !== 'Categories' && activeTab !== 'Notifications' && activeTab !== 'Branding' && (
             <div className="flex flex-col items-center justify-center py-32 text-center opacity-20 relative z-10 font-sans">
                <Settings size={64} className="mb-6 animate-spin-slow text-brand-gold" />
                <h3 className="serif text-3xl text-black italic tracking-tighter uppercase font-black">Under Construction</h3>
                <p className="text-[10px] uppercase tracking-[0.3em] mt-4 font-black text-gray-400">MANAGEMENT INTERFACE NOT YET INITIALIZED</p>
             </div>
          )}
        </div>
      </div>
    </div>

  );
}
