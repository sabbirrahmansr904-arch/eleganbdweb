const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

const oldCode = `baseAdmins.forEach(p => combinedMap.set(p.email.toLowerCase().trim(), { ...p }));`;
const newCode = `baseAdmins.forEach(p => {
        const ce = p.email.toLowerCase().trim();
        if (!deletedEmailsRef.current.has(ce)) {
          combinedMap.set(ce, { ...p });
        }
      });`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
