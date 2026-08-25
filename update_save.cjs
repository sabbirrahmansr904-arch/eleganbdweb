const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminAccounts.tsx', 'utf8');

const oldUpdate = `const updated = profiles.some(p => p.email.toLowerCase() === cleanEmail)
        ? profiles.map(p => p.email.toLowerCase() === cleanEmail ? { ...p, ...payload } : p)
        : [...profiles, payload];

      setProfiles(updated);
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(updated));`;

const newUpdate = `setProfiles(prev => {
        const updated = prev.some(p => p.email.toLowerCase() === cleanEmail)
          ? prev.map(p => p.email.toLowerCase() === cleanEmail ? { ...p, ...payload } : p)
          : [...prev, payload];
        localStorage.setItem('elegan_admin_profiles', JSON.stringify(updated));
        return updated;
      });`;

content = content.replace(oldUpdate, newUpdate);
content = content.replace(oldUpdate, newUpdate);

fs.writeFileSync('src/pages/admin/AdminAccounts.tsx', content);
