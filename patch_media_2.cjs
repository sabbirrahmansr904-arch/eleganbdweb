const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminMedia.tsx', 'utf8');

content = content.replace(
  "const [reviewsMedia, setReviewsMedia] = useState<any[]>([]);",
  "const [reviewsMedia, setReviewsMedia] = useState<any[]>([]);\n  const [adminsMedia, setAdminsMedia] = useState<any[]>([]);"
);

const newEffect = `
  // 2.5 Listen to real-time 'admin_profiles' collection for profile photos
  useEffect(() => {
    try {
      const adminsRef = collection(db, 'admin_profiles');
      const unsubscribe = onSnapshot(adminsRef, (snapshot) => {
        const items: any[] = [];
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (data.photoURL && typeof data.photoURL === 'string' && data.photoURL.length > 10) {
            items.push({ id: d.id, ...data });
          }
        });
        setAdminsMedia(items);
      }, (err) => {
        console.warn('Admins photo listener warning:', err);
      });

      return () => unsubscribe();
    } catch (e) {}
  }, []);
`;

content = content.replace(
  "// Helper to extract clean filename from URL",
  newEffect + "\n  // Helper to extract clean filename from URL"
);

fs.writeFileSync('src/pages/admin/AdminMedia.tsx', content);
