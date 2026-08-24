const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminSettings.tsx', 'utf8');
const regex = /<button[^>]*>\s*<Plus[^>]*>\s*পেমেন্ট মেথড যোগ করুন\s*<\/button>/g;
content = content.replace(regex, (match) => {
  return `{isSabbirRahman && (\n${match}\n)}`;
});
fs.writeFileSync('src/pages/admin/AdminSettings.tsx', content);
