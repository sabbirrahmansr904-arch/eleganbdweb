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
  Facebook,
  Instagram,
  Youtube,
  Video,
  Truck,
  FileText,
  Paintbrush,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBanners } from '../../contexts/BannerContext';
import { useBranding } from '../../contexts/BrandingContext';
import { Banner } from '../../types';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { compressImage } from '../../utils/imageCompressor';

export default function AdminBanners() {
  const [activeTab, setActiveTab] = useState<'design' | 'banners'>('design');

  // Original banner context properties
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

  // Branding context for Design configurations
  const {
    showAnnouncementBar, announcementMessage, setShowAnnouncementBar, setAnnouncementMessage,
    showCountdownBanner, setShowCountdownBanner,
    showHeroBanner, setShowHeroBanner,
    facebookUrl, instagramUrl, youtubeUrl, tiktokUrl,
    setFacebookUrl, setInstagramUrl, setYoutubeUrl, setTiktokUrl,
    shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter, primaryDeliveryDistrict, aboutText,
    setShippingInsideDhaka, setShippingOutsideDhaka, setShippingFreeAfter, setPrimaryDeliveryDistrict, setAboutText
  } = useBranding();

  // Local states for design configuration fields
  const [localShowAnnouncement, setLocalShowAnnouncement] = useState(showAnnouncementBar);
  const [localAnnouncementMessage, setLocalAnnouncementMessage] = useState(announcementMessage);

  const [localShowCountdown, setLocalShowCountdown] = useState(showCountdownBanner);
  const [localShowHero, setLocalShowHero] = useState(showHeroBanner);

  const [localFacebook, setLocalFacebook] = useState(facebookUrl);
  const [localInstagram, setLocalInstagram] = useState(instagramUrl);
  const [localYoutube, setLocalYoutube] = useState(youtubeUrl);
  const [localTiktok, setLocalTiktok] = useState(tiktokUrl);

  const [localPrimaryDeliveryDistrict, setLocalPrimaryDeliveryDistrict] = useState(primaryDeliveryDistrict);
  const [localShippingInside, setLocalShippingInside] = useState(shippingInsideDhaka);
  const [localShippingOutside, setLocalShippingOutside] = useState(shippingOutsideDhaka);
  const [localShippingFreeAfter, setLocalShippingFreeAfter] = useState(shippingFreeAfter);

  const [localAboutText, setLocalAboutText] = useState(aboutText);

  // Sync local state when values in context load/change
  useEffect(() => {
    setLocalShowAnnouncement(showAnnouncementBar);
  }, [showAnnouncementBar]);

  useEffect(() => {
    setLocalAnnouncementMessage(announcementMessage);
  }, [announcementMessage]);

  useEffect(() => {
    setLocalShowCountdown(showCountdownBanner);
  }, [showCountdownBanner]);

  useEffect(() => {
    setLocalShowHero(showHeroBanner);
  }, [showHeroBanner]);

  useEffect(() => {
    setLocalFacebook(facebookUrl);
    setLocalInstagram(instagramUrl);
    setLocalYoutube(youtubeUrl);
    setLocalTiktok(tiktokUrl);
  }, [facebookUrl, instagramUrl, youtubeUrl, tiktokUrl]);

  useEffect(() => {
    setLocalPrimaryDeliveryDistrict(primaryDeliveryDistrict);
    setLocalShippingInside(shippingInsideDhaka);
    setLocalShippingOutside(shippingOutsideDhaka);
    setLocalShippingFreeAfter(shippingFreeAfter);
  }, [primaryDeliveryDistrict, shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter]);

  useEffect(() => {
    setLocalAboutText(aboutText);
  }, [aboutText]);

  // Original banner handlers
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

  // Design save handlers
  const saveAnnouncement = () => {
    setShowAnnouncementBar(localShowAnnouncement);
    setAnnouncementMessage(localAnnouncementMessage);
    toast.success('Announcement bar updated successfully');
  };

  const saveCountdown = () => {
    setShowCountdownBanner(localShowCountdown);
    toast.success('Countdown banner updated successfully');
  };

  const saveHeroBanner = () => {
    setShowHeroBanner(localShowHero);
    toast.success('Hero banner toggle updated successfully');
  };

  const saveSocialMedia = () => {
    setFacebookUrl(localFacebook);
    setInstagramUrl(localInstagram);
    setYoutubeUrl(localYoutube);
    setTiktokUrl(localTiktok);
    toast.success('Social media settings saved successfully');
  };

  const saveShippingFees = () => {
    setPrimaryDeliveryDistrict(localPrimaryDeliveryDistrict);
    setShippingInsideDhaka(Number(localShippingInside));
    setShippingOutsideDhaka(Number(localShippingOutside));
    setShippingFreeAfter(Number(localShippingFreeAfter));
    toast.success('Shipping fee settings updated successfully');
  };

  const saveAboutText = () => {
    setAboutText(localAboutText);
    toast.success('About section updated successfully');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Elegan BD</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-1">Design & Visual Identity</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('design')}
          className={cn(
            "px-6 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'design' ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-900"
          )}
        >
          <Paintbrush size={14} />
          Design Settings
        </button>
        <button
          onClick={() => setActiveTab('banners')}
          className={cn(
            "px-6 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'banners' ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-900"
          )}
        >
          <Layout size={14} />
          Hero Carousel Banners
        </button>
      </div>

      {activeTab === 'design' ? (
        /* Design Settings Tab (Matches screenshot layout) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
          
          {/* Left Column Stack: Announcement, Countdown, Hero Banners */}
          <div className="space-y-6 flex flex-col justify-start">
            
            {/* Announcement bar card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Announcement bar</h3>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-semibold text-gray-700">Show announcement bar</span>
                <button
                  onClick={() => setLocalShowAnnouncement(!localShowAnnouncement)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer",
                    localShowAnnouncement ? "bg-violet-600" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                    localShowAnnouncement ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              {localShowAnnouncement && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Message</label>
                  <textarea
                    value={localAnnouncementMessage}
                    onChange={(e) => setLocalAnnouncementMessage(e.target.value)}
                    placeholder="Enter announcement message..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-sm rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveAnnouncement}
                  className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>Save changes</span>
                </button>
              </div>
            </div>

            {/* Countdown banner card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Countdown banner</h3>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-semibold text-gray-700">Show countdown banner</span>
                <button
                  onClick={() => setLocalShowCountdown(!localShowCountdown)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer",
                    localShowCountdown ? "bg-violet-600" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                    localShowCountdown ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveCountdown}
                  className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>Save changes</span>
                </button>
              </div>
            </div>

            {/* Hero banner card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Hero banner</h3>
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-semibold text-gray-700">Show hero banner</span>
                <button
                  onClick={() => setLocalShowHero(!localShowHero)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer",
                    localShowHero ? "bg-violet-600" : "bg-gray-200"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                    localShowHero ? "translate-x-5" : "translate-x-0"
                  )} />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveHeroBanner}
                  className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>Save changes</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column Stack: Social media, Shipping fees, About */}
          <div className="space-y-6 flex flex-col justify-start">
            
            {/* Social media URLs card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Social media</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1877F2]" />
                    Facebook
                  </label>
                  <input
                    type="url"
                    value={localFacebook}
                    onChange={(e) => setLocalFacebook(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E4405F]" />
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={localInstagram}
                    onChange={(e) => setLocalInstagram(e.target.value)}
                    placeholder="https://instagram.com/..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000]" />
                    YouTube
                  </label>
                  <input
                    type="url"
                    value={localYoutube}
                    onChange={(e) => setLocalYoutube(e.target.value)}
                    placeholder="https://youtube.com/..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#010101]" />
                    TikTok
                  </label>
                  <input
                    type="url"
                    value={localTiktok}
                    onChange={(e) => setLocalTiktok(e.target.value)}
                    placeholder="https://tiktok.com/@..."
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveSocialMedia}
                  className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>Save changes</span>
                </button>
              </div>
            </div>

            {/* Shipping Fees card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
                <Truck size={16} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">Shipping fees</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Primary delivery district</label>
                  <input
                    type="text"
                    value={localPrimaryDeliveryDistrict}
                    onChange={(e) => setLocalPrimaryDeliveryDistrict(e.target.value)}
                    placeholder="Dhaka"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inside Dhaka</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                      <input
                        type="number"
                        value={localShippingInside}
                        onChange={(e) => setLocalShippingInside(Number(e.target.value))}
                        placeholder="80"
                        className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outside Dhaka</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                      <input
                        type="number"
                        value={localShippingOutside}
                        onChange={(e) => setLocalShippingOutside(Number(e.target.value))}
                        placeholder="130"
                        className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Free delivery after order amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">৳</span>
                    <input
                      type="number"
                      value={localShippingFreeAfter}
                      onChange={(e) => setLocalShippingFreeAfter(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400">Set to 0 to disable free delivery thresholds.</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveShippingFees}
                  className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>Save changes</span>
                </button>
              </div>
            </div>

            {/* About text card */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
              <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
                <FileText size={16} className="text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900 tracking-tight">About</h3>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">About text</label>
                <textarea
                  value={localAboutText}
                  onChange={(e) => setLocalAboutText(e.target.value)}
                  placeholder="Enter About page description..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 text-xs rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500/40 outline-none transition-all shadow-sm"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveAboutText}
                  className="flex items-center gap-1.5 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  <Check size={12} strokeWidth={2.5} />
                  <span>Save changes</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* Original Carousel Banners tab */
        <div className="space-y-8">
          <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Carousel Banner Slider</h2>
              <p className="text-[10px] text-gray-400">Initialize and manage landing page carousel slides</p>
            </div>
            {!isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-black text-white px-5 py-2.5 text-[10px] uppercase tracking-wider font-bold hover:bg-gray-800 transition-all flex items-center gap-2 rounded-lg cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Banner</span>
              </button>
            )}
          </div>

          {isAdding && (
            <div className="bg-white border border-gray-100 p-8 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{editingId ? 'Edit Carousel Banner' : 'New Carousel Banner'}</h3>
                <button onClick={cancelAdd} className="p-1.5 bg-gray-50 text-gray-400 hover:text-black rounded-lg transition-colors border border-gray-100 cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Banner Title</label>
                    <input 
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. SUMMER COLLECTION"
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 text-xs text-black outline-none focus:border-black transition-all rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Link Target</label>
                    <input 
                      type="text"
                      value={formData.link}
                      onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                      placeholder="/category/men"
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 text-xs text-black outline-none focus:border-black transition-all rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Banner Type</label>
                    <select 
                      value={formData.type || 'other'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'hero' | 'other' }))}
                      className="w-full bg-gray-50 border border-gray-200 px-4 py-2.5 text-xs text-black outline-none focus:border-black transition-all rounded-lg"
                    >
                      <option value="hero">Hero Banner</option>
                      <option value="other">Other Banner</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Banner Image</label>
                  <div className="relative group/upload">
                    <div className="aspect-[1920/600] bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center overflow-hidden transition-all group-hover/upload:border-black/30 shadow-xs max-h-48">
                      {formData.image ? (
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-6">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 text-brand-gold border border-gray-100 shadow-xs">
                            <Upload size={20} />
                          </div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Upload image payload (1920x600 recommended)</p>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/80 opacity-0 group-hover/upload:opacity-100 transition-all flex items-center justify-center cursor-pointer rounded-xl backdrop-blur-xs">
                      <span className="bg-white text-black px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-md">Replace Image Asset</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                      className={cn(
                        "w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer",
                        formData.active ? "bg-black" : "bg-gray-200"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                        formData.active ? "translate-x-5" : "translate-x-0"
                      )} />
                    </button>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">
                      {formData.active ? 'Status: Active' : 'Status: Inert'}
                    </span>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={cancelAdd}
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-black transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="bg-black text-white px-6 py-2.5 text-[10px] uppercase tracking-wider font-bold hover:bg-gray-800 transition-all flex items-center gap-2 rounded-lg cursor-pointer"
                    >
                      <Save size={14} />
                      <span>{editingId ? 'Save Changes' : 'Add Banner'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden group shadow-sm transition-all hover:border-gray-200 relative">
                <div className="aspect-[1920/600] relative overflow-hidden max-h-40">
                  <img 
                    src={banner.image} 
                    alt={banner.title}
                    className={cn(
                      "w-full h-full object-cover duration-700 transition-all group-hover:scale-105",
                      !banner.active && "grayscale opacity-30 blur-xs"
                    )}
                  />
                  <div className="absolute top-4 left-4">
                    <span className={cn(
                      "px-3 py-1.5 text-[8px] uppercase tracking-wider font-black text-white rounded shadow-md",
                      banner.active ? "bg-black" : "bg-gray-400"
                    )}>
                      {banner.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center space-x-4 backdrop-blur-xs">
                    <button 
                      onClick={() => startEdit(banner)}
                      className="w-10 h-10 bg-white text-black flex items-center justify-center rounded-lg hover:bg-brand-gold hover:text-white transition-all shadow-md group/btn cursor-pointer"
                      title="Edit Banner"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => updateBanner(banner.id, { active: !banner.active })}
                      className="w-10 h-10 bg-white text-black flex items-center justify-center rounded-lg hover:bg-brand-gold hover:text-white transition-all shadow-md group/btn cursor-pointer"
                      title={banner.active ? 'Deactivate' : 'Activate'}
                    >
                      {banner.active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button 
                      onClick={() => setBannerToDelete(banner.id)}
                      className="w-10 h-10 bg-white text-red-500 flex items-center justify-center rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-md group/btn cursor-pointer"
                      title="Delete Banner"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-white">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-black">{banner.title || 'Untitled Banner'}</h4>
                    <div className="flex items-center text-[10px] text-gray-400">
                      <div className="w-1.5 h-1.5 bg-brand-gold rounded-full mr-2" />
                      <span>Target link: {banner.link}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {banners.length === 0 && !isAdding && (
              <div className="md:col-span-2 py-16 text-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50">
                <ImageIcon className="mx-auto text-gray-200 mb-4" size={40} />
                <p className="text-sm font-bold text-black uppercase tracking-wider">No visual banners detected</p>
                <p className="text-[10px] text-gray-400 mt-2">Initialize your carousel banners slider</p>
                <button 
                  onClick={() => setIsAdding(true)}
                  className="mt-6 bg-black text-white px-5 py-2.5 text-[10px] uppercase tracking-wider font-bold hover:bg-gray-800 transition-all inline-flex items-center gap-2 rounded-lg cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Initialize Carousel Banners</span>
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
                  className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-gray-100 p-8 rounded-xl max-w-sm w-full text-center relative shadow-xl"
                >
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-xs border border-red-100">
                    <Trash2 size={28} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider mb-2">Delete Banner slide?</h3>
                  <p className="text-gray-400 text-[10px] leading-relaxed mb-6">
                    Are you sure you want to permanently delete this slider banner image? This operation is irreversible.
                  </p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setBannerToDelete(null)}
                      className="flex-1 py-3 text-[10px] uppercase tracking-wider font-bold bg-gray-50 text-gray-400 hover:text-black transition-all rounded-lg border border-gray-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={async () => {
                        await deleteBanner(bannerToDelete);
                        toast.success('Asset Deleted');
                        setBannerToDelete(null);
                      }}
                      className="flex-1 py-3 text-[10px] uppercase tracking-wider font-bold bg-black text-white hover:bg-gray-800 transition-all rounded-lg shadow-sm cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
