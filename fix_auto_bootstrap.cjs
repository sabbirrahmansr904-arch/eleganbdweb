const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

content = content.replace(
  /const cleanEmail = baseAcc\.email\.toLowerCase\(\)\.trim\(\);/,
  "const cleanEmail = baseAcc.email.toLowerCase().trim();\n        if (deletedEmailsRef.current.has(cleanEmail)) return;"
);

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
