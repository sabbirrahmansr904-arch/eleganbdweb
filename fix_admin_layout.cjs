const fs = require('fs');
let content = fs.readFileSync('src/components/admin/AdminLayout.tsx', 'utf8');

content = content.replace(/const isPermitted = \(key: string\) => {[\s\S]*?if \(!permissions \|\| permissions\.length === 0\) return false;/g, `const isPermitted = (key: string) => {
    if (isSuperAdmin) return true;
    if (key === 'my-account') return true;
    if (!permissions || permissions.length === 0) return false;`);

fs.writeFileSync('src/components/admin/AdminLayout.tsx', content);
