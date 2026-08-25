const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminFinance.tsx', 'utf8');

content = content.replace(/if \(!isSabbirRahman\) {\s*toast\.error[^;]+;\s*setShowDeleteConfirmModal[^;]+;\s*setTxToDelete[^;]+;\s*return;\s*}/, '');

fs.writeFileSync('src/pages/admin/AdminFinance.tsx', content);
