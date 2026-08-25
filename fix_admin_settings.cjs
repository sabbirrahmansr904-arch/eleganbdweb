const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminSettings.tsx', 'utf8');

// handleSavePayments
content = content.replace(/if \(!isSabbirRahman\) {\s*toast\.error[^;]+;\s*return;\s*}/, '');

// useEffect Admin Access load
content = content.replace(/activeTab === 'Admin Access' && isSabbirRahman/g, "activeTab === 'Admin Access'");

// Tab param check
content = content.replace(/tabParam === 'Admin Access' && !isSabbirRahman/g, "false");

// UI: Admin Access rendering
content = content.replace(/\{activeTab === 'Admin Access' && isSabbirRahman && \(/g, "{activeTab === 'Admin Access' && (");

// UI: Payments restricted msg
content = content.replace(/\{!isSabbirRahman && \([\s\S]*?<\/p>\s*<\/div>\s*\)\}/, "");

// Save button disabled
content = content.replace(/disabled=\{!isSabbirRahman\}/g, "disabled={false}");
content = content.replace(/!isSabbirRahman \? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-\[\#5850ec\] hover:bg-\[\#4f46e5\] cursor-pointer'/g, "'bg-[#5850ec] hover:bg-[#4f46e5] cursor-pointer'");

fs.writeFileSync('src/pages/admin/AdminSettings.tsx', content);
