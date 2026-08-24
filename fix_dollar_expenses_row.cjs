const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminDollarExpenses.tsx', 'utf8');

const regexEditDeleteBlock = /<button[^>]*>\s*<Edit2[^>]*>\s*<\/button>\s*<button[^>]*>\s*<Trash2[^>]*>\s*<\/button>/g;
content = content.replace(regexEditDeleteBlock, (match) => {
  return `{isSabbirRahman && (\n<>\n${match}\n</>\n)}`;
});
fs.writeFileSync('src/pages/admin/AdminDollarExpenses.tsx', content);
