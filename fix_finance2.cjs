const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminFinance.tsx', 'utf8');

const regexAccActions = /<button\s*onClick={\(\) => handleEditAccountClick\(acc\)}[\s\S]*?<\/button>\s*<button\s*onClick={\(\) => {[\s\S]*?deleteBankAccount\(acc\.id\);\s*}}[\s\S]*?<\/button>/;
content = content.replace(regexAccActions, (match) => {
  return `{isSabbirRahman && (\n<>\n${match}\n</>\n)}`;
});

const regexTxActions = /<button\s*onClick={\(\) => handleEditTxClick\(tx\)}[\s\S]*?<\/button>\s*<button\s*onClick={\(\) => {\s*setTxToDelete\(tx\);\s*setShowDeleteConfirmModal\(true\);\s*}}[\s\S]*?<\/button>/;
content = content.replace(regexTxActions, (match) => {
  return `{isSabbirRahman && (\n<>\n${match}\n</>\n)}`;
});

fs.writeFileSync('src/pages/admin/AdminFinance.tsx', content);
