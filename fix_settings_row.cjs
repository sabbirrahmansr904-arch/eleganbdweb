const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminSettings.tsx', 'utf8');

const regexRowActions = /<button\s*onClick={\(\) => {\s*setEditMethod\(m\);\s*setShowPaymentMethodModal\(true\);\s*}}[\s\S]*?<\/button>\s*<button\s*onClick={\(\) => {\s*setMethodToDelete\(m\);\s*setShowDeleteMethodConfirm\(true\);\s*}}[\s\S]*?<\/button>/g;
content = content.replace(regexRowActions, (match) => {
  return `{isSabbirRahman && (\n<>\n${match}\n</>\n)}`;
});
fs.writeFileSync('src/pages/admin/AdminSettings.tsx', content);
