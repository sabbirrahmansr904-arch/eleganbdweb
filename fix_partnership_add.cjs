const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminPartnership.tsx', 'utf8');

const regexAddNew = /<button\s*onClick={\(\) => handleOpenAddForPartner\('partner_1',\s*'investment'\)}[\s\S]*?<\/button>/;
content = content.replace(regexAddNew, (match) => {
  return `{isSabbirRahman && (\n${match}\n)}`;
});

const regexFooterActions = /<div className="p-4 bg-slate-50\/50 border-t border-slate-100 flex items-center gap-2">[\s\S]*?<\/div>/g;
content = content.replace(regexFooterActions, (match) => {
  return `{isSabbirRahman && (\n${match}\n)}`;
});

const regexRowEdit = /<button\s*onClick={\(\) => handleOpenEdit\(tx\)}[\s\S]*?<\/button>\s*<button\s*onClick={\(\) => {\s*setDeleteConfirmId\(tx\.id\);\s*}}[\s\S]*?<\/button>/g;
content = content.replace(regexRowEdit, (match) => {
  return `{isSabbirRahman && (\n<>\n${match}\n</>\n)}`;
});

fs.writeFileSync('src/pages/admin/AdminPartnership.tsx', content);
