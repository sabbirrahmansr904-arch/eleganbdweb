import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  Upload,
  Save,
  X,
  Image as ImageIcon,
  Check,
  Layout,
  Paintbrush,
  Flame,
  Clock,
  Tag,
  Building2,
  MapPin,
  Sparkles,
  Laptop,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBanners } from '../../../contexts/BannerContext';
import { useBranding } from '../../../contexts/BrandingContext';
import { Banner } from '../../../types';
import toast from 'react-hot-toast';
import { cn } from '../../../lib/utils';
import { compressImage, compressBannerImage } from '../../../utils/imageCompressor';
import { autoSaveToMediaLibrary } from '../../../utils/mediaLibrary';

export default function BannerSettings() {
  const [activeTab, setActiveTab] = useState<'design' | 'banners' | 'promo'>('design');

  const { banners, addBanner, updateBanner, deleteBanner } = useBanners();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Omit<Banner, 'id'>>({
    image: '',
    title: '',
    link: '/shop',
    active: true,
    type: 'hero',
  });

  const {
    showAnnouncementBar, announcementMessage, setShowAnnouncementBar, setAnnouncementMessage,
    showHeroBanner, setShowHeroBanner,
    shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter, primaryDeliveryDistrict, aboutText,
    setShippingInsideDhaka, setShippingOutsideDhaka, setShippingFreeAfter, setPrimaryDeliveryDistrict, setAboutText,
    heroBannerUrl, setHeroBannerUrl,
    heroBannerMobileUrl, setHeroBannerMobileUrl,
    heroBanner2Url, setHeroBanner2Url,
    heroBanner2MobileUrl, setHeroBanner2MobileUrl,
    heroBanner3Url, setHeroBanner3Url,
    heroBanner3MobileUrl, setHeroBanner3MobileUrl,
    subHeroBannerUrl, setSubHeroBannerUrl,
    subHeroBannerMobileUrl, setSubHeroBannerMobileUrl,
    collectionsBannerUrl, setCollectionsBannerUrl,
    featureBannerUrl, setFeatureBannerUrl,
    poloBannerUrl, setPoloBannerUrl,
    ceoPhotoUrl, setCeoPhotoUrl
  } = useBranding();

  const [localShowAnnouncement, setLocalShowAnnouncement] = useState(showAnnouncementBar);
  const [localAnnouncementMessage, setLocalAnnouncementMessage] = useState(announcementMessage);
  const [localShowHero, setLocalShowHero] = useState(showHeroBanner);
  const [localPrimaryDeliveryDistrict, setLocalPrimaryDeliveryDistrict] = useState(primaryDeliveryDistrict);
  const [localShippingInside, setLocalShippingInside] = useState(shippingInsideDhaka);
  const [localShippingOutside, setLocalShippingOutside] = useState(shippingOutsideDhaka);
  const [localShippingFreeAfter, setLocalShippingFreeAfter] = useState(shippingFreeAfter);
  const [localAboutText, setLocalAboutText] = useState(aboutText);

  useEffect(() => {
    setLocalShowAnnouncement(showAnnouncementBar);
    setLocalAnnouncementMessage(announcementMessage);
    setLocalShowHero(showHeroBanner);
    setLocalPrimaryDeliveryDistrict(primaryDeliveryDistrict);
    setLocalShippingInside(shippingInsideDhaka);
    setLocalShippingOutside(shippingOutsideDhaka);
    setLocalShippingFreeAfter(shippingFreeAfter);
    setLocalAboutText(aboutText);
  }, [
    showAnnouncementBar, announcementMessage, showHeroBanner, 
    primaryDeliveryDistrict, shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter, aboutText
  ]);

  const handleStaticBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string, setter: (url: string) => void, isPortrait?: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const loadingToast = toast.loading(`Uploading & optimizing ${key}...`);
      try {
        const result = isPortrait 
          ? await compressImage(file, 800, 1000, 0.85)
          : await compressBannerImage(file, 1920, 1080, 0.92);
        setter(result);
        autoSaveToMediaLibrary(result, { name: `Banner: ${key}`, category: 'Banners & Sliders', source: 'banner' });
        toast.success(`${key} updated in Ultra-HD quality & saved to Media Library!`, { id: loadingToast });
      } catch (err) {
        toast.error(`Failed to process and upload banner.`, { id: loadingToast });
      }
    }
  };

  const handleRemoveStaticBanner = (key: string, setter: (url: string) => void) => {
    setter('');
    toast.success(`${key} removed successfully.`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await compressBannerImage(file, 1920, 1080, 0.92);
        setFormData(prev => ({ ...prev, image: result }));
        autoSaveToMediaLibrary(result, { name: `Hero Banner Slider: ${file.name.replace(/\.[^/.]+$/, "") || 'Slider'}`, category: 'Banners & Sliders', source: 'banner' });
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
        type: 'hero',
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
      type: banner.type || 'other',
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
      type: 'hero',
    });
  };

  const saveDesignSettings = () => {
    setShowAnnouncementBar(localShowAnnouncement);
    setAnnouncementMessage(localAnnouncementMessage);
    setShowHeroBanner(localShowHero);
    setPrimaryDeliveryDistrict(localPrimaryDeliveryDistrict);
    setShippingInsideDhaka(Number(localShippingInside));
    setShippingOutsideDhaka(Number(localShippingOutside));
    setShippingFreeAfter(Number(localShippingFreeAfter));
    setAboutText(localAboutText);
    toast.success('ডিজাইনের তথ্য সেভ করা হয়েছে!');
  };

  return (
    <div className="space-y-12 max-w-5xl relative z-10 font-sans">
      <div className="flex justify-between items-center border-b border-gray-100 pb-6">
        <div className="space-y-1">
          <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Visual Architecture</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Configure store front visuals, banners, and layout modules</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 p-1.5 bg-gray-50 border border-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('design')}
          className={cn(
            "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'design' ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"
          )}
        >
          <Paintbrush size={12} />
          Layout Matrix
        </button>
        <button
          onClick={() => setActiveTab('banners')}
          className={cn(
            "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'banners' ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"
          )}
        >
          <Layout size={12} />
          Carousel Banners
        </button>
        <button
          onClick={() => setActiveTab('promo')}
          className={cn(
            "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'promo' ? "bg-black text-white shadow-lg" : "text-gray-400 hover:text-black"
          )}
        >
          <ImageIcon size={12} />
          Promo Banners
        </button>
      </div>

      {activeTab === 'design' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
          <div className="space-y-8">
            <div className="bg-white border border-gray-100 p-8 rounded-[32px] shadow-sm space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-black border-b border-gray-50 pb-4">Global Visibility Modules</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span className="text-[11px] font-black uppercase text-gray-500 italic">Announcement Bar</span>
                  <button
                    onClick={() => setLocalShowAnnouncement(!localShowAnnouncement)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                      localShowAnnouncement ? "bg-black" : "bg-gray-300"
                    )}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", localShowAnnouncement ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>

                {localShowAnnouncement && (
                  <textarea
                    value={localAnnouncementMessage}
                    onChange={(e) => setLocalAnnouncementMessage(e.target.value)}
                    placeholder="Enter announcement text..."
                    rows={2}
                    className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-xs font-medium resize-none"
                  />
                )}

                <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <span className="text-[11px] font-black uppercase text-gray-500 italic">Hero Carousel Slider</span>
                  <button
                    onClick={() => setLocalShowHero(!localShowHero)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                      localShowHero ? "bg-black" : "bg-gray-300"
                    )}
                  >
                    <div className={cn("w-4 h-4 bg-white rounded-full transition-transform", localShowHero ? "translate-x-6" : "translate-x-0")} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white border border-gray-100 p-8 rounded-[32px] shadow-sm space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-black border-b border-gray-50 pb-4">Delivery Rates Configuration</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Inside Dhaka Fee (৳)</label>
                  <input
                    type="number"
                    value={localShippingInside}
                    onChange={(e) => setLocalShippingInside(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-3.5 outline-none focus:border-black transition-all text-xs font-bold"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Outside Dhaka Fee (৳)</label>
                  <input
                    type="number"
                    value={localShippingOutside}
                    onChange={(e) => setLocalShippingOutside(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-3.5 outline-none focus:border-black transition-all text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Free Delivery Threshold (৳) (0 to disable)</label>
                <input
                  type="number"
                  value={localShippingFreeAfter}
                  onChange={(e) => setLocalShippingFreeAfter(Number(e.target.value))}
                  placeholder="e.g. 2000"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-3.5 outline-none focus:border-black transition-all text-xs font-bold"
                />
              </div>
            </div>

            <div className="bg-white border border-gray-100 p-8 rounded-[32px] shadow-sm space-y-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-black border-b border-gray-50 pb-4">Content & About Matrix</h4>
              <textarea
                value={localAboutText}
                onChange={(e) => setLocalAboutText(e.target.value)}
                placeholder="Describe your brand architectural philosophy..."
                rows={6}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 outline-none focus:border-black transition-all text-xs font-medium resize-none no-scrollbar"
              />
            </div>
          </div>

          <div className="lg:col-span-2 pt-8 flex justify-center border-t border-gray-50 mt-12">
            <button 
              onClick={saveDesignSettings}
              className="bg-black text-white px-16 py-5 text-[11px] uppercase tracking-[0.3em] font-black rounded-2xl shadow-2xl hover:bg-gray-800 transition-all flex items-center gap-3 active:scale-95 transform-gpu"
            >
              <Save size={18} />
              <span>Propagate Interface Changes</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'banners' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden group hover:border-black/30 transition-all shadow-sm">
                <div className="aspect-[21/9] relative bg-gray-50">
                  <img src={banner.image} alt={banner.title} className={cn("w-full h-full object-cover", !banner.active && "opacity-30 grayscale")} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm gap-4">
                    <button onClick={() => startEdit(banner)} className="p-3 bg-white text-black rounded-xl hover:bg-brand-gold hover:text-white transition-all shadow-lg"><Edit2 size={16} /></button>
                    <button onClick={() => updateBanner(banner.id, { active: !banner.active })} className="p-3 bg-white text-black rounded-xl hover:bg-brand-gold hover:text-white transition-all shadow-lg">{banner.active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    <button onClick={() => setBannerToDelete(banner.id)} className="p-3 bg-white text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
                <div className="p-6 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-black uppercase text-black italic tracking-tighter">{banner.title || 'Untitled Slide'}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">LINK: {banner.link}</p>
                  </div>
                  <span className={cn("text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest", banner.active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-gray-50 text-gray-400 border border-gray-100")}>
                    {banner.active ? 'Active' : 'Inert'}
                  </span>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => setIsAdding(true)}
              className="aspect-[21/9] border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center text-gray-300 hover:border-black/30 hover:text-black transition-all bg-gray-50/30"
            >
              <Plus size={32} className="mb-2" />
              <span className="text-[10px] uppercase font-black tracking-widest">Append New Slide</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'promo' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 p-5 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-blue-950">Hero Banner Slider (২টি ব্যানার স্লাইডার)</h4>
                <p className="text-xs text-blue-800 font-medium">Hero Banner 1 এবং Hero Banner 2 আপলোড করলে হোমপেজে স্বয়ংক্রিয়ভাবে ২টি ব্যানারের স্লাইডার চালু হয়ে যাবে।</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white text-blue-700 text-xs font-black uppercase rounded-lg border border-blue-200 shadow-2xs">
                Slide 1 + Slide 2
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                id: 'heroBanner1',
                title: 'Hero Banner 1 (স্লাইড ১ - মূল ব্যানার)',
                description: 'হোম পেজের হিরো স্লাইডারের ১ম ব্যানার। আলাদা ডেস্কটপ এবং মোবাইল ইমেজ সেট করুন যাতে সব ডিভাইসে পারফেক্ট দেখায়।',
                desktopUrl: heroBannerUrl,
                desktopSetter: setHeroBannerUrl,
                mobileUrl: heroBannerMobileUrl,
                mobileSetter: setHeroBannerMobileUrl,
                badge: 'Slide 1 (Desktop & Mobile)',
              },
              {
                id: 'heroBanner2',
                title: 'Hero Banner 2 (স্লাইড ২ - দ্বিতীয় ব্যানার)',
                description: 'হোম পেজের হিরো স্লাইডারের ২য় ব্যানার। আলাদা ডেস্কটপ এবং মোবাইল ইমেজ সেট করুন।',
                desktopUrl: heroBanner2Url,
                desktopSetter: setHeroBanner2Url,
                mobileUrl: heroBanner2MobileUrl,
                mobileSetter: setHeroBanner2MobileUrl,
                badge: 'Slide 2 (Desktop & Mobile)',
              },
              {
                id: 'heroBanner3',
                title: 'Hero Banner 3 (স্লাইড ৩ - অতিরিক্ত ব্যানার)',
                description: 'হোম পেজের হিরো স্লাইডারের ৩য় ব্যানার (অপশনাল)।',
                desktopUrl: heroBanner3Url,
                desktopSetter: setHeroBanner3Url,
                mobileUrl: heroBanner3MobileUrl,
                mobileSetter: setHeroBanner3MobileUrl,
                badge: 'Optional Slide 3',
              },
              {
                id: 'subHeroBanner',
                title: 'Sub-Hero Banner (প্রমোশনাল ব্যানার)',
                description: 'হোম পেজের প্রোডাক্ট সেকশনের নিচে প্রদর্শিত বড় প্রোমো ব্যানার।',
                desktopUrl: subHeroBannerUrl,
                desktopSetter: setSubHeroBannerUrl,
                mobileUrl: subHeroBannerMobileUrl,
                mobileSetter: setSubHeroBannerMobileUrl,
                badge: 'Promo Banner',
              },
              {
                id: 'collectionsBannerUrl',
                title: 'Collections Section Banner',
                description: 'Promotional graphic featured in the collections layout.',
                desktopUrl: collectionsBannerUrl,
                desktopSetter: setCollectionsBannerUrl,
                mobileUrl: '',
                mobileSetter: () => {},
                badge: 'Collections',
              },
            ].map((pBanner) => (
              <div key={pBanner.id} className="bg-white border border-gray-100 p-6 sm:p-8 rounded-[32px] shadow-sm flex flex-col justify-between space-y-6 group hover:border-black/30 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black uppercase tracking-wider text-black">{pBanner.title}</h4>
                    {pBanner.badge && (
                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-md bg-black text-white">
                        {pBanner.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">{pBanner.description}</p>
                </div>

                {/* Desktop Banner Section */}
                <div className="space-y-3 p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900 flex items-center gap-1.5">
                      <Laptop size={13} /> Desktop Responsive (1920 × 900 px)
                    </span>
                  </div>
                  <div className="aspect-[21/9] w-full rounded-xl bg-white border border-gray-200 overflow-hidden relative flex items-center justify-center shadow-3xs">
                    {pBanner.desktopUrl ? (
                      <img src={pBanner.desktopUrl} alt="Desktop Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-center p-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">ডেস্কটপ ইমেজ সেট করা নেই</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      placeholder="ডেস্কটপ ইমেজ লিংক..."
                      value={pBanner.desktopUrl || ''}
                      onChange={(e) => pBanner.desktopSetter(e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-800 outline-none focus:border-black font-medium shadow-3xs"
                    />
                    <label className="px-4 py-2 text-[10px] uppercase tracking-wider font-black bg-black text-white hover:bg-gray-800 transition-all rounded-xl shadow-sm text-center cursor-pointer flex items-center gap-1.5">
                      <Upload size={12} />
                      <span>Upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleStaticBannerUpload(e, `${pBanner.title} (Desktop)`, pBanner.desktopSetter, false)} />
                    </label>
                  </div>
                </div>

                {/* Mobile Banner Section */}
                {pBanner.mobileSetter !== undefined && pBanner.mobileSetter.toString() !== '() => {}' && (
                  <div className="space-y-3 p-4 bg-gray-50/70 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-950 flex items-center gap-1.5">
                        <Smartphone size={13} /> Mobile Responsive (1080 × 650 px / 5:3)
                      </span>
                    </div>
                    <div className="aspect-[5/3] w-full max-w-[280px] mx-auto rounded-xl bg-white border border-gray-200 overflow-hidden relative flex items-center justify-center shadow-3xs">
                      {pBanner.mobileUrl ? (
                        <img src={pBanner.mobileUrl} alt="Mobile Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-center p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-300">মোবাইল ইমেজ সেট করা নেই (অপশনাল)</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="url"
                        placeholder="মোবাইল ইমেজ লিংক..."
                        value={pBanner.mobileUrl || ''}
                        onChange={(e) => pBanner.mobileSetter(e.target.value)}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-800 outline-none focus:border-black font-medium shadow-3xs"
                      />
                      <label className="px-4 py-2 text-[10px] uppercase tracking-wider font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all rounded-xl shadow-sm text-center cursor-pointer flex items-center gap-1.5">
                        <Upload size={12} />
                        <span>Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleStaticBannerUpload(e, `${pBanner.title} (Mobile)`, pBanner.mobileSetter, false)} />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forms & Modals logic would go here, simplified for this migration */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={cancelAdd} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-100 p-10 rounded-[32px] max-w-2xl w-full relative shadow-2xl z-20">
              <div className="flex justify-between items-center mb-10 border-b border-gray-50 pb-6">
                <h3 className="serif text-2xl text-black italic font-black uppercase tracking-tighter">{editingId ? 'Modify Slide' : 'Initialize Slide'}</h3>
                <button onClick={cancelAdd} className="p-2 bg-gray-50 text-gray-400 hover:text-black rounded-xl border border-gray-100"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-gray-400 ml-1">Labeling</label>
                    <input type="text" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="e.g. SUMMER 26" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black italic tracking-tighter outline-none focus:border-black" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-gray-400 ml-1">Discovery Path</label>
                    <input type="text" value={formData.link} onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))} placeholder="/shop" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-medium outline-none focus:border-black" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-widest font-black text-gray-400 ml-1">Payload Asset</label>
                  <label className="aspect-[21/9] bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-black/30 transition-all relative">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center flex flex-col items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center text-brand-gold shadow-sm"><Upload size={20} /></div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">UPLOAD VISUAL UNIT</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-black text-white py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-3">
                    <Save size={18} />
                    <span>Synchronize Asset</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal simplified */}
      {bannerToDelete && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-6">
          <div onClick={() => setBannerToDelete(null)} className="absolute inset-0 bg-black/40 backdrop-blur-xs" />
          <div className="bg-white border border-gray-100 p-10 rounded-[32px] max-w-sm w-full text-center relative shadow-2xl z-20">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100"><Trash2 size={28} /></div>
            <h3 className="text-base font-black text-black uppercase tracking-tight mb-2">Purge Slide?</h3>
            <p className="text-gray-400 text-[10px] leading-relaxed mb-10 font-bold uppercase tracking-widest">This visual asset will be permanently removed from the carousel matrix.</p>
            <div className="flex gap-4">
              <button onClick={() => setBannerToDelete(null)} className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black bg-gray-50 text-gray-400 hover:text-black transition-all rounded-2xl border border-gray-100">Cancel</button>
              <button onClick={async () => { await deleteBanner(bannerToDelete); toast.success('Asset purged'); setBannerToDelete(null); }} className="flex-1 py-4 text-[10px] uppercase tracking-widest font-black bg-black text-white hover:bg-gray-800 transition-all rounded-2xl shadow-xl">Confirm Purge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
