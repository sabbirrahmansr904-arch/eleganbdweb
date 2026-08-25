const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

const regex = /,\s*\{\s*id:\s*'sohelmiah332004_gmail_com'[\s\S]*?mainTasks:\s*'[^']*'\s*\}/g;
content = content.replace(regex, '');

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
