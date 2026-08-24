const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminFinance.tsx', 'utf8');

// Hide "Add New Bank Account" button
const regexAddAcc = /<button\s*onClick={\(\) => setShowAddAccountModal\(true\)}[\s\S]*?<\/button>/;
content = content.replace(regexAddAcc, (match) => {
  return `{isSabbirRahman && (\n${match}\n)}`;
});

// Hide row Edit/Delete for Bank Accounts
const regexAccActions = /<button\s*onClick={\(\) => handleEditAccount\(acc\)}[\s\S]*?<\/button>\s*<button\s*onClick={\(\) => {[\s\S]*?deleteBankAccount\(acc\.id\);\s*}}[\s\S]*?<\/button>/;
content = content.replace(regexAccActions, (match) => {
  return `{isSabbirRahman && (\n<>\n${match}\n</>\n)}`;
});

// Hide row Edit/Delete for Transactions (Wait, Finance might not list transactions directly or they use similar pattern)
const regexTxActions = /<button\s*onClick={\(\) => handleEditTx\(tx\)}[\s\S]*?<\/button>\s*<button\s*onClick={\(\) => {\s*setTxToDelete\(tx\);\s*setShowDeleteConfirmModal\(true\);\s*}}[\s\S]*?<\/button>/;
content = content.replace(regexTxActions, (match) => {
  return `{isSabbirRahman && (\n<>\n${match}\n</>\n)}`;
});

fs.writeFileSync('src/pages/admin/AdminFinance.tsx', content);
