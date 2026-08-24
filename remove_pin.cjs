const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

// Remove from list generation
const regex1 = /\s*\/\/ 1\. Sabbir Rahman is pinned permanently as #1 \(first\)\s*const aIsSabbir = isSabbirAccount\(a\);\s*const bIsSabbir = isSabbirAccount\(b\);\s*if \(aIsSabbir && !bIsSabbir\) return -1;\s*if \(!aIsSabbir && bIsSabbir\) return 1;/;
content = content.replace(regex1, '');

// Remove from filteredProfiles
const regex2 = /\.sort\(\(a, b\) => {\s*const aIsSabbir = isSabbirAccount\(a\);\s*const bIsSabbir = isSabbirAccount\(b\);\s*if \(aIsSabbir && !bIsSabbir\) return -1;\s*if \(!aIsSabbir && bIsSabbir\) return 1;\s*return 0;\s*}\)/;
content = content.replace(regex2, '');

// Adjust comments
content = content.replace('// Initial base primary accounts (Sabbir Rahman pinned #1)', '// Initial base primary accounts');
content = content.replace('// Filtered profiles (Sabbir Rahman always preserved at the very top)', '// Filtered profiles');

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
