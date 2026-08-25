const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

content = content.replace(/setIsDeleting\(true\);\s*const emailKey = cleanEmail\.replace\(/, "setIsDeleting(true);\n    const cleanEmail = (deleteTarget.email || '').toLowerCase().trim();\n    const emailKey = cleanEmail.replace(");

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
