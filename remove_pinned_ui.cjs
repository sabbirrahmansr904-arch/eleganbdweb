const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

const regex = /\{\s*isSabbir\s*&&\s*\(\s*<span className="px-2 py-0\.5 rounded-full text-\[10px\] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">\s*<Pin size=\{10\} className="text-amber-700 fill-amber-500" \/> Pinned\s*<\/span>\s*\)\s*\}/g;

content = content.replace(regex, '');

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
