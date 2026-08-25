const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminMedia.tsx', 'utf8');

const newAdminProcessing = `
    // G. Live Admin Profile Pictures
    if (adminsMedia && Array.isArray(adminsMedia)) {
      adminsMedia.forEach((admin) => {
        const adminItemId = \`admin_\${admin.id}\`;
        if (admin.photoURL && !seenUrls.has(admin.photoURL) && !isExcluded(adminItemId, admin.photoURL)) {
          seenUrls.add(admin.photoURL);
          list.push({
            id: adminItemId,
            url: admin.photoURL,
            filename: extractFilename(admin.photoURL, \`admin_\${admin.id}.webp\`),
            title: admin.name || 'Admin Profile Photo',
            source: 'admin',
            category: 'Admin Profiles',
            createdAt: admin.updatedAt || admin.createdAt || Date.now(),
            uploadedBy: admin.email || 'Admin',
            fileSize: 'Avatar Scale',
            dimensions: 'Profile Sync',
            canDelete: false // Master admins usually don't delete other profiles via Media tab directly
          });
        }
      });
    }

    return list;
`;

content = content.replace("return list;\n  }, [directMedia, products, banners, branding, categories, reviewsMedia, isMasterAdmin, deletedIds]);", newAdminProcessing + "  }, [directMedia, products, banners, branding, categories, reviewsMedia, adminsMedia, isMasterAdmin, deletedIds]);");

content = content.replace(
  "all: allMediaItems.length,\n      uploaded: 0,\n      product: 0,\n      banner: 0,\n      branding: 0,\n      category: 0,\n      review: 0",
  "all: allMediaItems.length,\n      uploaded: 0,\n      product: 0,\n      banner: 0,\n      branding: 0,\n      category: 0,\n      review: 0,\n      admin: 0"
);

fs.writeFileSync('src/pages/admin/AdminMedia.tsx', content);
