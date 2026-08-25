const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminMedia.tsx', 'utf8');

content = content.replace(
  "export type MediaSource = 'uploaded' | 'product' | 'banner' | 'branding' | 'category' | 'review';",
  "export type MediaSource = 'uploaded' | 'product' | 'banner' | 'branding' | 'category' | 'review' | 'admin';"
);

content = content.replace(
  "import {\n  Search,",
  "import {\n  Users,\n  Search,"
);

content = content.replace(
  "{ id: 'review', label: 'Customer Reviews', icon: Info },",
  "{ id: 'review', label: 'Customer Reviews', icon: Info },\n  { id: 'admin', label: 'Admin Profiles', icon: Users },"
);

fs.writeFileSync('src/pages/admin/AdminMedia.tsx', content);
