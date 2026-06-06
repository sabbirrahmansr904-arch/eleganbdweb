import React, { useState, useMemo } from 'react';
import { useProducts } from '../../contexts/ProductContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice, cn } from '../../lib/utils';
import { 
  Search, 
  ExternalLink, 
  Eye, 
  Copy, 
  Grid, 
  List, 
  RefreshCw, 
  CloudUpload, 
  Image as ImageIcon,
  Check,
  X,
  Sparkles,
  Tag,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MediaItem {
  id: string; // unique item id
  url: string;
  filename: string;
  productName: string;
  productCategory: string;
  productId: string;
  productSku: string;
  productPrice: number;
}

export default function AdminMedia() {
  const { products, loading } = useProducts();
  const { currency, rate } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Derive media items dynamically from products
  const mediaItems = useMemo(() => {
    const items: MediaItem[] = [];
    if (!products) return items;

    products.forEach((product) => {
      if (product.images && Array.isArray(product.images)) {
        product.images.forEach((url, imgIndex) => {
          if (!url) return;
          
          // Generate file name from URL for display
          let filename = 'product_img.webp';
          try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart) {
              filename = lastPart.substring(0, 24);
              if (!filename.includes('.')) {
                filename += '.webp';
              }
            } else if (urlObj.searchParams.get('photo')) {
              filename = `photo_${urlObj.searchParams.get('photo')}.webp`;
            }
          } catch (e) {
            // Fallback for relative paths or mock strings
            const parts = url.split('/');
            filename = parts[parts.length - 1] || 'image.webp';
          }

          // Clean filename from query params if any
          if (filename.includes('?')) {
            filename = filename.split('?')[0];
          }

          items.push({
            id: `${product.id}-${imgIndex}`,
            url,
            filename,
            productName: product.name,
            productCategory: product.category,
            productId: product.id,
            productSku: product.sku || product.id.slice(0, 8),
            productPrice: product.price
          });
        });
      }
    });

    return items;
  }, [products]);

  // Apply search query
  const filteredMedia = useMemo(() => {
    if (!searchQuery) return mediaItems;
    const query = searchQuery.toLowerCase();
    return mediaItems.filter(item => 
      item.filename.toLowerCase().includes(query) ||
      item.productName.toLowerCase().includes(query) ||
      item.productCategory.toLowerCase().includes(query) ||
      item.productSku.toLowerCase().includes(query)
    );
  }, [mediaItems, searchQuery]);

  const handleSync = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Media index successfully synchronized with database assets');
    }, 700);
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('Direct URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const triggerUploadMock = () => {
    toast.error('Local device image uploading is handled directly inside the Product Editor');
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 font-sans p-2">
      
      {/* Premium Header Layout matching the Screenshot exactly */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0C1421] leading-none mb-1">
            Media Library
          </h1>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 leading-none">
            Manage all uploaded product images and assets
          </p>
        </div>

        {/* Buttons matching design style */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={triggerUploadMock}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5850EC] hover:bg-[#4A43D0] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0"
          >
            <CloudUpload size={13} />
            UPLOAD
          </button>
          
          <button 
            onClick={handleSync}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-[#4A5568] border border-gray-100 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0"
          >
            <RefreshCw size={11} className={cn(isRefreshing ? "animate-spin" : "")} />
            SYNC FILES
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.01)] flex flex-col overflow-hidden p-6 space-y-6">
        
        {/* Search, Stats, and Layout Switcher bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
          
          {/* Searching Input */}
          <div className="relative w-full sm:max-w-md group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#5850EC] transition-colors" size={15} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search media by filename..."
              className="w-full pl-10 pr-24 py-2.5 bg-gray-50 border border-gray-150 rounded-xl text-xs text-[#0C1421] font-semibold focus:bg-white focus:border-[#5850EC] outline-none transition-all placeholder:text-gray-400 placeholder:font-normal"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-gray-400 hover:text-black transition-colors"
              >
                Clear
              </button>
            )}
            
            {/* Quick stats indicator tucked in search bar */}
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-400 font-bold bg-white px-2 py-0.5 rounded-md border border-gray-100">
              {filteredMedia.length}
            </span>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            {/* Storage capacity context representation */}
            <span className="text-[10px] font-extrabold tracking-wider text-gray-400 uppercase font-mono">
              EST. SCALE: {(filteredMedia.length * 0.12).toFixed(1)} MB STORAGE
            </span>

            {/* Layout switchers for ultimate premium admin feel */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'grid' 
                    ? "bg-white text-[#5850EC] shadow-3xs" 
                    : "text-gray-400 hover:text-black"
                )}
                title="Grid Layout"
              >
                <Grid size={13} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-1.5 rounded-lg transition-all",
                  viewMode === 'list' 
                    ? "bg-white text-[#5850EC] shadow-3xs" 
                    : "text-gray-400 hover:text-black"
                )}
                title="List Details Layout"
              >
                <List size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Loading and Empty State handling */}
        {loading ? (
          <div className="h-[450px] flex flex-col items-center justify-center text-center text-[#9CA3AF]">
            <RefreshCw className="animate-spin text-[#5850EC] mb-23" size={32} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Loading Product Media Assets...</span>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="h-[450px] flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-gray-100 mb-4 shadow-3xs">
              <ImageIcon size={26} className="text-gray-300" />
            </div>
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">NO IMAGES CONFIGURED</h3>
            <p className="text-[10px] text-gray-400 leading-normal max-w-xs font-semibold">
              {searchQuery ? "Your search query matched no currently indexed files." : "Add image URLs in your products to sync or manage them here."}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Premium rounded Grid view showing visual catalog matches user screenshot look */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {filteredMedia.map((item) => (
              <div 
                key={item.id} 
                className="group relative aspect-square bg-[#FAFAFA] border border-gray-100/60 rounded-[1.8rem] overflow-hidden hover:border-semibold shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                {/* Referrer-policy no referrer for fast external host rendering safely */}
                <img 
                  src={item.url} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  alt={item.productName || "Media asset"} 
                />

                {/* Hover interface for detail zooms + quick copy features */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-4.5 duration-300">
                  
                  {/* Top quick tag */}
                  <div className="flex gap-1 justify-between items-center w-full">
                    <span className="bg-white/95 text-[7px] font-black text-black uppercase tracking-widest px-2.5 py-1 rounded-full truncate max-w-[100px]">
                      {item.productSku}
                    </span>
                  </div>

                  {/* Center zoom eye and link copies */}
                  <div className="flex items-center justify-center gap-2.5 my-auto">
                    <button 
                      onClick={() => setSelectedMedia(item)}
                      className="p-2.5 bg-white text-[#0C1421] hover:bg-black hover:text-white rounded-2xl transition-all shadow-md transform hover:scale-110" 
                      title="Preview Image Detail"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={() => handleCopyLink(item.url)}
                      className="p-2.5 bg-white text-[#5850EC] hover:bg-[#5850EC] hover:text-white rounded-2xl transition-all shadow-md transform hover:scale-110" 
                      title="Copy Direct URL"
                    >
                      {copiedUrl === item.url ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="p-2.5 bg-white text-[#4A5568] hover:bg-black hover:text-white rounded-2xl transition-all shadow-md transform hover:scale-110 flex items-center justify-center"
                      title="Launch Original"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>

                  {/* Text details in tiny card inside hover */}
                  <div className="bg-white/95 backdrop-blur-3xs rounded-xl p-2 select-none">
                    <p className="text-[9.5px]/none font-black text-[#0C1421] truncate">{item.productName}</p>
                    <p className="text-[7.5px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">{item.productCategory}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List Details Tab View for heavy precision and sorting */
          <div className="overflow-x-auto select-none border border-gray-100 rounded-2xl">
            <table className="w-full text-left border-collapse min-w-[700px] text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 h-10 text-gray-400 font-extrabold uppercase tracking-widest text-[9px]">
                  <th className="py-2.5 px-4 w-12">No</th>
                  <th className="py-2.5 px-4">Thumbnail</th>
                  <th className="py-2.5 px-4">Mapped Reference Product</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Linked SKU</th>
                  <th className="py-2.5 px-4">Filename Preview</th>
                  <th className="py-2.5 px-4 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-medium">
                {filteredMedia.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors h-14 text-stone-800">
                    <td className="px-4 font-mono text-[10px] text-gray-400 font-bold">{index + 1}</td>
                    <td className="px-4">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                        <img src={item.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Thumb" />
                      </div>
                    </td>
                    <td className="px-4">
                      <span className="font-extrabold text-[#0C1421] text-xs block">{item.productName}</span>
                      <span className="text-[10px] text-[#5850EC] font-bold block mt-0.5">{formatPrice(item.productPrice, currency, rate)}</span>
                    </td>
                    <td className="px-4 text-[10.5px] text-gray-500 font-bold uppercase tracking-wider">{item.productCategory}</td>
                    <td className="px-4">
                      <span className="px-2.5 py-1 bg-stone-50 border border-stone-150 text-[10px] font-mono font-bold text-stone-600 rounded-md">
                        {item.productSku}
                      </span>
                    </td>
                    <td className="px-4 max-w-[160px] truncate font-mono text-[10.5px] text-stone-500">{item.filename}</td>
                    <td className="px-4 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setSelectedMedia(item)}
                          className="p-2 bg-white border border-gray-100 text-stone-700 hover:text-black hover:border-stone-400 rounded-lg transition-all"
                          title="Open Quick Lightbox"
                        >
                          <Eye size={12.5} />
                        </button>
                        <button 
                          onClick={() => handleCopyLink(item.url)}
                          className="px-2.5 py-2 bg-[#FAFBFF] border border-blue-50 text-[#5850EC] hover:bg-[#5850EC] hover:text-white rounded-lg transition-all text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1.5"
                        >
                          {copiedUrl === item.url ? <Check size={10} /> : <Copy size={10} />}
                          COPY LINK
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Lightbox Modal Module */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
            
            {/* Visual canvas placeholder (Left pane) */}
            <div className="flex-1 bg-[#121212] flex items-center justify-center p-6 relative min-h-[300px] md:min-h-[450px]">
              <img 
                src={selectedMedia.url} 
                referrerPolicy="no-referrer"
                className="max-h-[60vh] max-w-full object-contain rounded-2xl shadow-xl border border-white/5" 
                alt="Fullscreen preview" 
              />
              <button 
                onClick={() => setSelectedMedia(null)}
                className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/80 text-white rounded-full transition-all md:hidden z-10"
              >
                <X size={18} />
              </button>
            </div>

            {/* Details Meta sidebar (Right pane) */}
            <div className="w-full md:w-80 bg-white p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-gray-100 text-left">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[8px] font-black tracking-widest text-[#5850EC] uppercase bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
                      ASSET DETAIL PREVIEW
                    </span>
                    <h2 className="text-[17px] font-extrabold text-[#0C1421] tracking-tight mt-2.5">
                      {selectedMedia.productName}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setSelectedMedia(null)}
                    className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all hidden md:block"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="border-t border-gray-50 pt-4 space-y-3.5 text-xs text-stone-700">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Linked SKU</span>
                    <span className="font-mono font-black text-black">{selectedMedia.productSku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Category</span>
                    <span className="font-bold text-black uppercase tracking-wide text-[10px]">{selectedMedia.productCategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Price point</span>
                    <span className="font-extrabold text-[#5850EC]">{formatPrice(selectedMedia.productPrice, currency, rate)}</span>
                  </div>
                  
                  <div className="pt-2">
                    <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px] block mb-1.5">Direct image path</label>
                    <div className="flex gap-1.5 bg-gray-50 p-2 border border-gray-100 rounded-xl">
                      <span className="font-mono text-[9px] text-[#4A5568] break-all truncate flex-1 select-all h-6 leading-6">
                        {selectedMedia.url}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action feet inside details */}
              <div className="mt-8 pt-4 border-t border-gray-100 space-y-2">
                <button 
                  onClick={() => handleCopyLink(selectedMedia.url)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#5850EC] hover:bg-[#4A43D0] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-xs"
                >
                  <Copy size={12} />
                  Copy Asset Link
                </button>
                
                <a 
                  href={selectedMedia.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 border border-gray-100 text-[#4A5568] hover:text-black hover:bg-gray-100 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  <ExternalLink size={12} />
                  Launch Original Tab
                </a>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
