const fs = require('fs');

const filesToFix = [
  'src/pages/admin/AdminTransactionList.tsx',
  'src/pages/admin/AdminDollarExpenses.tsx',
  'src/pages/admin/AdminFinance.tsx',
  'src/pages/admin/AdminPartnership.tsx'
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove if (!isSabbirRahman) { ... toast.error ... return; }
    // It spans multiple lines, so we use a regex
    content = content.replace(/if \(!isSabbirRahman\) {\s*toast\.error\([^)]+\);\s*(?:set[^;]+;\s*)?return;\s*}/g, '');
    
    // There are some places where it might just return or do something else
    content = content.replace(/if \(!isSabbirRahman\) {\s*alert\([^)]+\);\s*return;\s*}/g, '');
    
    // UI elements wrapped in {isSabbirRahman && (...)}
    // Let's replace {isSabbirRahman && with {true &&
    content = content.replace(/\{isSabbirRahman && \(/g, '{true && (');
    
    fs.writeFileSync(file, content);
  }
}
console.log('Fixed restrictions in transaction, dollar, finance, partnership.');
