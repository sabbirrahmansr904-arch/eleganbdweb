const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminMedia.tsx', 'utf8');

// Replace isMasterAdmin logic
content = content.replace(/const isMasterAdmin =[\s\S]*?\]\.includes\((?:userEmail|currentUser\?\.email)\);/, 'const isMasterAdmin = true;');
content = content.replace(/const isMasterAdmin =\s*CEO_EMAILS\.includes\(userEmail\);/, 'const isMasterAdmin = true;');

fs.writeFileSync('src/pages/admin/AdminMedia.tsx', content);
