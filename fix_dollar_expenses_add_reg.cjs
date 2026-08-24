const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminDollarExpenses.tsx', 'utf8');

const regex = /<button[^>]*>\s*<Plus[^>]*>\s*নতুন ডলার লেনদেন\s*<\/button>/g;
content = content.replace(regex, (match) => {
  return `{isSabbirRahman && (\n${match}\n)}`;
});
fs.writeFileSync('src/pages/admin/AdminDollarExpenses.tsx', content);
