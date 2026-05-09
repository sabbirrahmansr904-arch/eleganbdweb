import React from 'react';
import { ImageIcon, CloudUpload, Search, Trash2, ExternalLink } from 'lucide-react';

const AdminMedia = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter text-black">Media Library</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">Manage your uploaded images and assets</p>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl rounded-xl">
            <CloudUpload size={16} /> Upload New
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Search images by name..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-black focus:border-black outline-none transition-all placeholder:text-gray-300"
            />
          </div>
          <div className="flex items-center gap-4 text-gray-400 text-xs font-bold uppercase tracking-widest">
            <span>Storage: 45.2 MB / 500 MB</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="group relative aspect-square bg-gray-50 border border-gray-100 rounded-xl overflow-hidden hover:border-black transition-all shadow-sm hover:-translate-y-1">
              <img 
                src={`https://images.unsplash.com/photo-${1598033129183 + i}-c4f50c7176c8?q=80&w=400`} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Media" 
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button className="p-2 bg-white text-black rounded-lg hover:bg-black hover:text-white transition-all shadow-sm" title="View Source">
                  <ExternalLink size={16} />
                </button>
                <button className="p-2 bg-white text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Delete Image">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 w-full p-2 bg-white/80 backdrop-blur-sm border-t border-gray-100">
                <p className="text-[8px] font-bold text-black truncate text-center uppercase tracking-tighter">IMG_2026_0{i+1}.webp</p>
              </div>
            </div>
          ))}
          
          <div className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center space-y-2 hover:border-black hover:bg-gray-50 cursor-pointer transition-all shadow-sm">
            <CloudUpload className="text-gray-400 group-hover:text-black" size={24} />
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black">Add Image</span>
          </div>
        </div>
        
        <div className="mt-12 flex justify-center">
            <button className="px-8 py-3 bg-gray-50 border border-gray-100 text-black text-[10px] font-black uppercase tracking-widest hover:border-black hover:bg-white transition-all shadow-sm rounded-xl">
                Load More Assets
            </button>
        </div>
      </div>
    </div>

  );
};

export default AdminMedia;
