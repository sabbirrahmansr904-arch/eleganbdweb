const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

const oldUpdate1 = `const updated = profiles.filter(p => p.email.toLowerCase().trim() !== cleanEmail && p.id !== targetId);
      setProfiles(updated);
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(updated));`;

const newUpdate1 = `setProfiles(prev => {
        const updated = prev.filter(p => p.email.toLowerCase().trim() !== cleanEmail && p.id !== targetId);
        localStorage.setItem('elegan_admin_profiles', JSON.stringify(updated));
        return updated;
      });`;

content = content.replace(oldUpdate1, newUpdate1);
content = content.replace(oldUpdate1, newUpdate1); // doing it twice in case it doesn't match both

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
