const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

// Add state
const stateInsert = `  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);`;
content = content.replace(/  \/\/ Delete modal state\n  const \[deleteTarget, setDeleteTarget\] = useState<AdminProfile \| null>\(null\);\n  const \[isDeleting, setIsDeleting\] = useState\(false\);/, stateInsert);

// Add cursor-pointer and onClick to img
const imgRegex = /<img src=\{admin\.photoURL\} alt=\{admin\.name\} className="w-full h-full object-cover" \/>/;
const newImg = `<img src={admin.photoURL} alt={admin.name} className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300" onClick={() => setFullScreenImage(admin.photoURL || null)} />`;
content = content.replace(imgRegex, newImg);

// Add modal at the end before closing div
const modalStr = `      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFullScreenImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={fullScreenImage} 
              alt="Full Screen Profile" 
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>`;
content = content.replace(/    <\/div>\n  \);\n}/, modalStr + '\n  );\n}');

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
