const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

// Remove useEffect restriction
content = content.replace(/if \(!isSabbirRahman\) {\s*setLoading\(false\);\s*return;\s*}/, '');

// Fix canEditAccounts - let any admin with access edit. 
// However, maybe only let them edit if they have permissions, but since they can reach this page, they should have permission.
// Wait, the user said "sobai sob kicui edit korte parbe, ekhn ,, porobotite kawke admin hisebe dewa hole take jei option gulo select kore access dewa hobe se sudhu matro sei guloi dekhte parbe ebong edit kaj korte parbe"
// This implies ANYONE who reaches this page can edit. So `canEditAccounts = true;` or we can just remove the variable and assume true. Let's just set `canEditAccounts = true;`
content = content.replace(/const canEditAccounts = isSabbirRahman \|\| \[\s*'sabbirrahmansr904@gmail\.com',\s*'eleganbd\.ltd@gmail\.com'\s*\]\.includes\(userEmail\);/, 'const canEditAccounts = true;');

// Remove the `if (!isSabbirRahman) { return <div Access Restricted...` block entirely
content = content.replace(/if \(!isSabbirRahman\) {\s*return \(\s*<div className="flex-1[\s\S]*?<\/div>\s*\);\s*}/, '');

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
