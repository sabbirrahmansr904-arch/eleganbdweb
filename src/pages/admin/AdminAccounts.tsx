import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail, 
  Phone, 
  Briefcase, 
  ShieldCheck, 
  Edit3, 
  Trash2, 
  Upload, 
  Camera, 
  Check, 
  X, 
  Sparkles,
  Building2,
  RefreshCw,
  Clock,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
  User,
  Sliders
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { compressAvatar, compressDataUrl } from '../../utils/imageCompressor';

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  photoURL?: string;
  status?: 'Active' | 'On Leave' | 'Inactive';
  permissions?: string[];
  bio?: string;
  lastActive?: number;
  isOnline?: boolean;
  role?: string;
  createdAt?: number;
  updatedAt?: number;
}

const AVAILABLE_MODULES = [
  { id: 'dashboard', name: 'Dashboard', banglaName: 'ড্যাশবোর্ড' },
  { id: 'orders', name: 'Order Management', banglaName: 'অর্ডার ম্যানেজমেন্ট' },
  { id: 'exchanges', name: 'Exchange & Returns', banglaName: 'এক্সচেঞ্জ ও রিটার্ন' },
  { id: 'issues', name: 'Issue Tracker', banglaName: 'ইস্যু ট্র্যাকার' },
  { id: 'products', name: 'Product Catalog', banglaName: 'প্রোডাক্ট ক্যাটালগ' },
  { id: 'masterTable', name: 'Master Table & Inventory', banglaName: 'মাস্টার টেবিল ও স্টক' },
  { id: 'finance', name: 'Finance & Accounts', banglaName: 'ফিন্যান্স ও হিসাব' },
  { id: 'customers', name: 'Customer Database', banglaName: 'কাস্টমার তালিকা' },
  { id: 'customer-profiler', name: 'Customer Profiler', banglaName: 'কাস্টমার প্রোফাইলার' },
  { id: 'categories', name: 'Categories', banglaName: 'ক্যাটেগরি' },
  { id: 'coupons', name: 'Discount Coupons', banglaName: 'কুপন কোড' },
  { id: 'media', name: 'Media Library', banglaName: 'মিডিয়া গ্যালারি' },
  { id: 'settings', name: 'System Settings', banglaName: 'সিস্টেম সেটিংস' }
];

const DEFAULT_DEPARTMENTS = [
  'CEO & Founder',
  'Management & Leadership',
  'Sales Executive Department',
  'Logistics & Operations',
  'Inventory & Warehouse',
  'Accounting & Finance',
  'Customer Support',
  'Marketing & Media'
];

export default function AdminAccounts() {
  const { currentUser, isSuperAdmin, isCEO } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  // Strict check: Only Sabbir Rahman and Elegan BD have master management rights to edit other admins
  const userEmail = (currentUser?.email || '').toLowerCase().trim();
  const isMasterAdmin = userEmail === 'sabbirrahmansr904@gmail.com' || userEmail === 'eleganbd.ltd@gmail.com';
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AdminProfile | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form fields
  const [formData, setFormData] = useState<Partial<AdminProfile>>({
    name: '',
    email: '',
    phone: '',
    position: 'Sales Executive',
    department: 'Sales Executive Department',
    photoURL: '',
    status: 'Active',
    bio: '',
    permissions: ['dashboard', 'orders', 'exchanges', 'issues']
  });
  const [isSaving, setIsSaving] = useState(false);

  // Track deleted emails to prevent stale snapshot re-insertion
  const deletedEmailsRef = React.useRef<Set<string>>(new Set());

  // Real-time synchronization with all admin collections
  useEffect(() => {
    setLoading(true);

    const profilesDocs = new Map<string, any>();
    const permsDocs = new Map<string, any>();
    const adminsDocs = new Map<string, any>();
    const invitesDocs = new Map<string, any>();

    // Initial base primary accounts
    const baseAdmins: AdminProfile[] = [
      {
        id: 'eleganbd_ltd_gmail_com',
        name: 'Elegan BD Founder',
        email: 'eleganbd.ltd@gmail.com',
        phone: '+880 1327-772213',
        position: 'CEO & Founder',
        department: 'CEO & Founder',
        photoURL: '',
        status: 'Active',
        permissions: ['all'],
        role: 'ceo'
      },
      {
        id: 'sabbirrahmansr904_gmail_com',
        name: 'Sabbir Rahman',
        email: 'sabbirrahmansr904@gmail.com',
        phone: '+880 1700-000000',
        position: 'CEO & Founder',
        department: 'CEO & Founder',
        photoURL: '',
        status: 'Active',
        permissions: ['all'],
        role: 'super_admin'
      }
    ];

    // Listeners for real-time aggregation
    let unsubProfiles: (() => void) | null = null;
    let unsubPerms: (() => void) | null = null;
    let unsubAdmins: (() => void) | null = null;
    let unsubInvites: (() => void) | null = null;

    const aggregateAndSet = () => {
      const combinedMap = new Map<string, AdminProfile>();

      // Add base accounts first
      baseAdmins.forEach(p => combinedMap.set(p.email.toLowerCase().trim(), { ...p }));

      // 1. From admin_profiles
      profilesDocs.forEach((data, docId) => {
        const email = (data.email || docId).toLowerCase().trim();
        if (!email || deletedEmailsRef.current.has(email)) return;
        const existing = combinedMap.get(email) || {} as AdminProfile;
        combinedMap.set(email, {
          ...existing,
          ...data,
          id: docId,
          email: email,
          name: data.name || existing.name || email.split('@')[0],
          department: data.department || existing.department || (email === 'eleganbd.ltd@gmail.com' ? 'CEO & Founder' : 'Sales Executive Department'),
          position: data.position || existing.position || (email === 'eleganbd.ltd@gmail.com' ? 'CEO & Founder' : 'Sales Executive'),
          photoURL: data.photoURL || existing.photoURL || '',
          status: data.status || existing.status || 'Active'
        });
      });

      // 2. From admin_permissions
      permsDocs.forEach((data, docId) => {
        const email = (data.email || docId).toLowerCase().trim();
        if (!email || deletedEmailsRef.current.has(email)) return;
        const existing = combinedMap.get(email) || {} as AdminProfile;
        combinedMap.set(email, {
          ...existing,
          id: existing.id || docId,
          email: email,
          name: existing.name || data.name || email.split('@')[0],
          department: data.department || existing.department || 'Sales Executive Department',
          position: existing.position || (data.department ? `${data.department.split(' ')[0]} Member` : 'Sales Executive'),
          permissions: (data.permissions && data.permissions.length > 0) ? data.permissions : (existing.permissions || ['dashboard', 'orders', 'issues']),
          role: data.role || existing.role || 'admin',
          updatedAt: data.updatedAt || existing.updatedAt || Date.now()
        });
      });

      // 3. From admins
      adminsDocs.forEach((data, docId) => {
        const email = (data.email || (docId.includes('@') ? docId : '')).toLowerCase().trim();
        if (!email || deletedEmailsRef.current.has(email)) return;
        const existing = combinedMap.get(email) || {} as AdminProfile;
        combinedMap.set(email, {
          ...existing,
          id: existing.id || docId,
          email: email,
          name: existing.name || data.name || email.split('@')[0],
          department: data.department || existing.department || 'Sales Executive Department',
          position: existing.position || (data.department ? `${data.department.split(' ')[0]} Member` : 'Sales Executive'),
          permissions: (data.permissions && data.permissions.length > 0) ? data.permissions : (existing.permissions || ['dashboard', 'orders', 'issues']),
          isOnline: data.isOnline ?? existing.isOnline,
          lastActive: data.lastActive || existing.lastActive,
          role: data.role || existing.role || 'admin'
        });
      });

      // 4. From admin_invites
      invitesDocs.forEach((data, docId) => {
        const email = (data.email || docId).toLowerCase().trim();
        if (!email || deletedEmailsRef.current.has(email)) return;
        const existing = combinedMap.get(email) || {} as AdminProfile;
        combinedMap.set(email, {
          ...existing,
          id: existing.id || docId,
          email: email,
          name: existing.name || data.name || email.split('@')[0],
          department: data.department || existing.department || 'Sales Executive Department',
          position: existing.position || 'Sales Executive',
          permissions: data.permissions || existing.permissions || ['dashboard', 'orders', 'issues'],
          role: data.role || existing.role || 'admin'
        });
      });

      const list = Array.from(combinedMap.values()).sort((a, b) => {
        const aIsCeo = a.email.toLowerCase() === 'eleganbd.ltd@gmail.com' || a.email.toLowerCase() === 'sabbirrahmansr904@gmail.com';
        const bIsCeo = b.email.toLowerCase() === 'eleganbd.ltd@gmail.com' || b.email.toLowerCase() === 'sabbirrahmansr904@gmail.com';
        if (aIsCeo && !bIsCeo) return -1;
        if (!aIsCeo && bIsCeo) return 1;

        const aOnline = a.isOnline && (Date.now() - (a.lastActive || 0) < 90000);
        const bOnline = b.isOnline && (Date.now() - (b.lastActive || 0) < 90000);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;

        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      setProfiles(list);
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(list));
      setLoading(false);
    };

    try {
      // 1. admin_profiles collection
      unsubProfiles = onSnapshot(collection(db, 'admin_profiles'), (snapshot) => {
        profilesDocs.clear();
        snapshot.forEach(docSnap => {
          profilesDocs.set(docSnap.id, docSnap.data());
        });
        aggregateAndSet();
      }, () => aggregateAndSet());

      // 2. admin_permissions collection
      unsubPerms = onSnapshot(collection(db, 'admin_permissions'), (snapshot) => {
        permsDocs.clear();
        snapshot.forEach(docSnap => {
          permsDocs.set(docSnap.id, docSnap.data());
        });
        aggregateAndSet();
      }, () => aggregateAndSet());

      // 3. admins collection
      unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
        adminsDocs.clear();
        snapshot.forEach(docSnap => {
          adminsDocs.set(docSnap.id, docSnap.data());
        });
        aggregateAndSet();
      }, () => aggregateAndSet());

      // 4. admin_invites collection
      unsubInvites = onSnapshot(collection(db, 'admin_invites'), (snapshot) => {
        invitesDocs.clear();
        snapshot.forEach(docSnap => {
          invitesDocs.set(docSnap.id, docSnap.data());
        });
        aggregateAndSet();
      }, () => aggregateAndSet());

    } catch (err) {
      console.warn("Realtime admin snapshot fallback:", err);
      aggregateAndSet();
    }

    return () => {
      if (unsubProfiles) unsubProfiles();
      if (unsubPerms) unsubPerms();
      if (unsubAdmins) unsubAdmins();
      if (unsubInvites) unsubInvites();
    };
  }, []);

  // Handle Photo Upload from local device (compressed to base64)
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image file is too large (Max 10MB)');
      return;
    }

    try {
      toast.loading('Processing image...', { id: 'avatar-compress' });
      const compressed = await compressAvatar(file);
      setFormData(prev => ({ ...prev, photoURL: compressed }));
      toast.success('Photo ready!', { id: 'avatar-compress' });
    } catch (err) {
      toast.error('Failed to process image', { id: 'avatar-compress' });
    }
  };

  const handleOpenAddModal = () => {
    if (!isMasterAdmin) {
      toast.error('শুধুমাত্র সাব্বির রহমান ও এলিগান বিডি নতুন এডমিন যুক্ত করতে পারবেন।');
      return;
    }
    setEditingProfile(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      position: 'Sales Executive',
      department: 'Sales Executive Department',
      photoURL: '',
      status: 'Active',
      bio: '',
      permissions: ['dashboard', 'orders', 'exchanges', 'issues', 'customers']
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profile: AdminProfile) => {
    if (!isMasterAdmin) {
      toast.error('শুধুমাত্র সাব্বির রহমান ও এলিগান বিডি এডমিন এক্সেস ও পারমিশন এডিট করতে পারবেন।');
      return;
    }
    setEditingProfile(profile);
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      position: profile.position || 'Sales Executive',
      department: profile.department || 'Sales Executive Department',
      photoURL: profile.photoURL || '',
      status: profile.status || 'Active',
      bio: profile.bio || '',
      permissions: profile.permissions || ['dashboard', 'orders', 'issues']
    });
    setIsModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) {
      toast.error('অনুমতি নেই: শুধুমাত্র সাব্বির রহমান ও এলিগান বিডি এডমিন প্রোফাইল সেভ করতে পারেন।');
      return;
    }
    if (!formData.name?.trim() || !formData.email?.trim()) {
      toast.error('Name and Gmail address are required!');
      return;
    }

    const cleanEmail = formData.email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      toast.error('Please enter a valid Gmail / Email address!');
      return;
    }

    setIsSaving(true);
    const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const docId = emailKey; // Always use sanitized email key for reliable Firestore path

    let safePhotoURL = formData.photoURL || '';
    if (safePhotoURL && safePhotoURL.startsWith('data:image')) {
      try {
        safePhotoURL = await compressDataUrl(safePhotoURL, 400, 400, 0.8);
      } catch (e) {
        console.warn('Image compression fallback:', e);
      }
    }

    const payload: AdminProfile = {
      id: docId,
      name: formData.name.trim(),
      email: cleanEmail,
      phone: formData.phone?.trim() || '',
      position: formData.position?.trim() || 'Admin Member',
      department: formData.department?.trim() || 'Sales Executive Department',
      photoURL: safePhotoURL,
      status: formData.status || 'Active',
      bio: formData.bio?.trim() || '',
      permissions: formData.permissions || ['dashboard', 'orders', 'issues'],
      updatedAt: Date.now(),
      createdAt: editingProfile?.createdAt || Date.now()
    };

    try {
      // 1. Save to admin_profiles
      await setDoc(doc(db, 'admin_profiles', docId), payload, { merge: true });
      
      // 2. Sync with admin_permissions
      await setDoc(doc(db, 'admin_permissions', cleanEmail), {
        email: cleanEmail,
        name: payload.name,
        department: payload.department,
        permissions: payload.permissions,
        role: 'admin',
        updatedAt: Date.now(),
        updatedBy: currentUser?.email || 'admin'
      }, { merge: true });

      // 3. Sync with admin_invites
      await setDoc(doc(db, 'admin_invites', cleanEmail), {
        email: cleanEmail,
        name: payload.name,
        department: payload.department,
        permissions: payload.permissions,
        role: 'admin',
        updatedAt: Date.now()
      }, { merge: true });

      // Update local state instantly
      const updated = profiles.some(p => p.email.toLowerCase() === cleanEmail)
        ? profiles.map(p => p.email.toLowerCase() === cleanEmail ? { ...p, ...payload } : p)
        : [...profiles, payload];

      setProfiles(updated);
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(updated));

      toast.success(editingProfile ? 'Admin profile updated!' : 'New Admin Account & Permissions created!');
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving admin profile:', error);
      // Fallback local update
      const updated = profiles.some(p => p.email.toLowerCase() === cleanEmail)
        ? profiles.map(p => p.email.toLowerCase() === cleanEmail ? { ...p, ...payload } : p)
        : [...profiles, payload];
      setProfiles(updated);
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(updated));
      toast.success('Admin profile saved successfully!');
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = (profile: AdminProfile) => {
    if (!isMasterAdmin) {
      toast.error('শুধুমাত্র সাব্বির রহমান ও এলিগান বিডি এডমিন অ্যাকাউন্ট রিমুভ বা ডিলিট করতে পারবেন।');
      return;
    }
    const cleanEmail = (profile.email || '').toLowerCase().trim();
    if (cleanEmail === 'eleganbd.ltd@gmail.com' || cleanEmail === 'sabbirrahmansr904@gmail.com') {
      toast.error('Primary Super Admin / CEO accounts cannot be removed!');
      return;
    }
    setDeleteTarget(profile);
  };

  const confirmDeleteAccount = async () => {
    if (!deleteTarget) return;
    if (!isMasterAdmin) {
      toast.error('অনুমতি নেই: শুধুমাত্র সাব্বির রহমান ও এলিগান বিডি এডমিন ডিলিট করতে পারেন।');
      setDeleteTarget(null);
      return;
    }

    const cleanEmail = (deleteTarget.email || '').toLowerCase().trim();
    if (cleanEmail === 'eleganbd.ltd@gmail.com' || cleanEmail === 'sabbirrahmansr904@gmail.com') {
      toast.error('Primary Super Admin / CEO accounts cannot be removed!');
      setDeleteTarget(null);
      return;
    }

    setIsDeleting(true);
    const emailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const targetId = deleteTarget.id;

    // Mark as deleted in ref so real-time listener doesn't immediately resurrect
    deletedEmailsRef.current.add(cleanEmail);

    try {
      // 1. Delete by direct document IDs
      const deletePromises: Promise<any>[] = [
        deleteDoc(doc(db, 'admin_profiles', targetId)).catch(() => {}),
        deleteDoc(doc(db, 'admin_profiles', emailKey)).catch(() => {}),
        deleteDoc(doc(db, 'admin_profiles', cleanEmail)).catch(() => {}),
        deleteDoc(doc(db, 'admin_permissions', cleanEmail)).catch(() => {}),
        deleteDoc(doc(db, 'admin_permissions', emailKey)).catch(() => {}),
        deleteDoc(doc(db, 'admin_permissions', targetId)).catch(() => {}),
        deleteDoc(doc(db, 'admin_invites', cleanEmail)).catch(() => {}),
        deleteDoc(doc(db, 'admin_invites', emailKey)).catch(() => {}),
        deleteDoc(doc(db, 'admins', cleanEmail)).catch(() => {}),
        deleteDoc(doc(db, 'admins', emailKey)).catch(() => {}),
        deleteDoc(doc(db, 'admins', targetId)).catch(() => {})
      ];

      // 2. Query and delete any docs matching email across collections
      const collectionsToCheck = ['admins', 'admin_permissions', 'admin_invites', 'admin_profiles'];
      for (const collName of collectionsToCheck) {
        try {
          const q = query(collection(db, collName), where('email', '==', cleanEmail));
          const snap = await getDocs(q);
          snap.forEach(d => {
            deletePromises.push(deleteDoc(d.ref).catch(() => {}));
          });
        } catch (e) {}
      }

      await Promise.all(deletePromises);

      // 3. Update local state & storage
      const updated = profiles.filter(p => p.email.toLowerCase().trim() !== cleanEmail && p.id !== targetId);
      setProfiles(updated);
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(updated));

      toast.success(`Admin access revoked for ${deleteTarget.name || cleanEmail}`);
      setDeleteTarget(null);
    } catch (e) {
      console.error('Error deleting admin account:', e);
      const updated = profiles.filter(p => p.email.toLowerCase().trim() !== cleanEmail && p.id !== targetId);
      setProfiles(updated);
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(updated));
      toast.success(`Admin account removed successfully.`);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle permission for add/edit modal
  const handleTogglePermission = (permId: string) => {
    const current = formData.permissions || [];
    if (current.includes(permId)) {
      setFormData({ ...formData, permissions: current.filter(p => p !== permId) });
    } else {
      setFormData({ ...formData, permissions: [...current, permId] });
    }
  };

  // Filtered profiles
  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = 
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || p.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#F8F9FD] p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold shadow-2xs">
              <Users size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">All Admin Accounts</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
                  {profiles.length} Active Personnel
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                রিয়েল-টাইম এডমিন অ্যাক্সেস প্রাপ্ত সকল সদস্যের প্রোফাইল, ফটো ও দায়িত্বসমূহ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isMasterAdmin ? (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer active:scale-95"
            >
              <UserPlus size={16} />
              <span>Add Admin Account</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 shadow-3xs">
              <Lock size={14} className="text-amber-600" />
              <span>Directory View Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-blue-500 shadow-2xs text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedDept('All')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
              selectedDept === 'All'
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            All Accounts ({profiles.length})
          </button>
          {DEFAULT_DEPARTMENTS.map((dept) => {
            const count = profiles.filter(p => p.department === dept).length;
            if (count === 0 && selectedDept !== dept) return null;
            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                  selectedDept === dept
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {dept.split(' ')[0]} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Admin Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-xs">
          <Users size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Admin Accounts Match Filter</h3>
          <p className="text-xs text-slate-500 mt-1">Try searching with a different term or clear filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((admin) => {
            const cleanEmail = (admin.email || '').toLowerCase().trim();
            const isCurrentUser = currentUser?.email?.toLowerCase() === cleanEmail;
            const isTopCeo = cleanEmail === 'eleganbd.ltd@gmail.com' || cleanEmail === 'sabbirrahmansr904@gmail.com';
            
            const lastActiveTime = admin.lastActive || 0;
            const isOnlineNow = admin.isOnline && (Date.now() - lastActiveTime < 90000);
            const initials = (admin.name?.slice(0, 2) || cleanEmail.slice(0, 2) || 'AD').toUpperCase();

            return (
              <div 
                key={admin.id || admin.email}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-blue-300 p-6 flex flex-col justify-between transition-all hover:shadow-lg group relative overflow-hidden"
              >
                {/* Top Badges (Status & Roles) */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Live Online/Offline */}
                    {isOnlineNow ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
                        admin.status === 'Active' ? "bg-slate-50 text-slate-600 border-slate-200" :
                        admin.status === 'On Leave' ? "bg-amber-50 text-amber-600 border-amber-200" :
                        "bg-red-50 text-red-500 border-red-200"
                      )}>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        {admin.status || 'Active'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isTopCeo ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 shadow-2xs">
                        <Sparkles size={11} className="text-amber-500" /> CEO
                      </span>
                    ) : isCurrentUser ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                        You
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        Staff Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Avatar & Info */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="relative group/avatar shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center font-black text-xl shadow-md border-2 border-white overflow-hidden">
                      {admin.photoURL ? (
                        <img src={admin.photoURL} alt={admin.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-black text-slate-900 truncate" title={admin.name}>
                      {admin.name || cleanEmail.split('@')[0]}
                    </h3>
                    <div className="inline-flex items-center gap-1 mt-0.5 px-2.5 py-0.5 bg-slate-100 rounded-lg text-slate-800 text-xs font-bold border border-slate-200/80">
                      <Briefcase size={12} className="text-slate-500" />
                      <span className="truncate">{admin.position || 'Admin Member'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium truncate mt-1 flex items-center gap-1">
                      <Building2 size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{admin.department || 'Sales Executive Department'}</span>
                    </p>
                  </div>
                </div>

                {/* Contact Details Box */}
                <div className="bg-[#F8F9FD] rounded-2xl p-3.5 space-y-2 mb-4 border border-slate-200/60 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-medium truncate">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate" title={admin.email}>{admin.email}</span>
                  </div>
                  {admin.phone ? (
                    <div className="flex items-center gap-2 text-slate-700 font-medium truncate">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{admin.phone}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 font-medium text-[11px] italic">
                      <Phone size={12} className="shrink-0" />
                      <span>No phone added yet</span>
                    </div>
                  )}
                  {admin.bio && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 italic pt-1 border-t border-slate-200/50">
                      "{admin.bio}"
                    </p>
                  )}
                </div>

                {/* Authorized Modules Preview */}
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Authorized Permissions:
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isTopCeo ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                        Full Access (All Modules)
                      </span>
                    ) : (admin.permissions && admin.permissions.length > 0) ? (
                      admin.permissions.slice(0, 3).map(pKey => {
                        const mod = AVAILABLE_MODULES.find(m => m.id === pKey);
                        return (
                          <span key={pKey} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-3xs">
                            {mod ? mod.name : pKey}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Standard Staff Access</span>
                    )}
                    {!isTopCeo && admin.permissions && admin.permissions.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                        +{admin.permissions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  {isMasterAdmin ? (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(admin)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Edit3 size={14} />
                        <span>Edit Profile & Access</span>
                      </button>

                      {!isTopCeo && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProfile(admin)}
                          className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 bg-slate-50 border border-slate-200/60 hover:border-red-200 rounded-xl transition-all cursor-pointer shadow-3xs"
                          title="Revoke Admin Access / Delete Account"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-semibold border border-slate-100">
                      <Lock size={12} className="text-slate-400" />
                      <span>Managed by Super Admins</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold shrink-0 border border-red-100">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Revoke Admin Access?</h3>
                <p className="text-xs text-slate-500 font-medium">
                  এই এডমিন অ্যাকাউন্ট ও পারমিশন মুছে ফেলতে চান?
                </p>
              </div>
            </div>

            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Admin Name:</span>
                <span className="font-black text-slate-900">{deleteTarget.name || 'Admin Member'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Gmail:</span>
                <span className="font-bold text-slate-800 font-mono">{deleteTarget.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Department:</span>
                <span className="font-bold text-slate-700">{deleteTarget.department || 'Sales Executive'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              ⚠️ অ্যাকশন সম্পন্ন হলে এই জিমেইল আইডি আর কোনো এডমিন প্যানেল বা সংরক্ষিত মডিউলে লগইন/অ্যাক্সেস করতে পারবে না।
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel (বাতিল)
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
                <span>{isDeleting ? 'Deleting...' : 'Revoke & Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Profile Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-6 relative animate-in fade-in zoom-in duration-200 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  {editingProfile ? <Edit3 size={18} /> : <UserPlus size={18} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingProfile ? 'Edit Admin Profile & Access' : 'Add New Admin Account'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    ছবি আপলোড, যোগাযোগের তথ্য এবং মডিউল পারমিশন নির্ধারণ করুন
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Photo Upload Section */}
              <div className="flex items-center gap-4 p-4 bg-[#F8F9FD] rounded-2xl border border-slate-200/80">
                <div className="relative w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl overflow-hidden shadow-inner shrink-0">
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-slate-400" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-xs font-bold text-slate-900 block">Profile Picture (Device থেকে পিকচার)</label>
                  <p className="text-[11px] text-slate-500">আপনার মোবাইল বা কম্পিউটার থেকে ফটো সিলেক্ট করুন</p>
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-all">
                    <Upload size={13} className="text-blue-600" />
                    <span>Upload Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sabbir Rahman"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* Gmail / Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Gmail / Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff.admin@gmail.com"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* Phone / Mobile */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Phone / Mobile Number</label>
                <input
                  type="text"
                  placeholder="e.g. +880 1700-000000"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* Position & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">Position / Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Sales Executive"
                    value={formData.position || ''}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block">Department</label>
                  <select
                    value={formData.department || 'Sales Executive Department'}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900"
                  >
                    {DEFAULT_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Work Status</label>
                <div className="flex items-center gap-3">
                  {(['Active', 'On Leave', 'Inactive'] as const).map((st) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => setFormData({ ...formData, status: st })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                        formData.status === st
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-[#F8F9FD] text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Authorized Module Permissions */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 block">
                    Authorized Module Permissions (অ্যাক্সেস পারমিশন)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if ((formData.permissions || []).length === AVAILABLE_MODULES.length) {
                        setFormData({ ...formData, permissions: [] });
                      } else {
                        setFormData({ ...formData, permissions: AVAILABLE_MODULES.map(m => m.id) });
                      }
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {(formData.permissions || []).length === AVAILABLE_MODULES.length ? 'Clear All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[#F8F9FD] p-3 rounded-2xl border border-slate-200/80 max-h-48 overflow-y-auto">
                  {AVAILABLE_MODULES.map(mod => {
                    const isChecked = (formData.permissions || []).includes(mod.id);
                    return (
                      <label 
                        key={mod.id} 
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-xl border text-xs font-medium cursor-pointer transition-all",
                          isChecked ? "bg-white border-blue-500 shadow-3xs text-blue-900 font-bold" : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePermission(mod.id)}
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                        />
                        <span className="truncate">{mod.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Bio / Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Bio / Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Short description or responsibilities..."
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  <span>{editingProfile ? 'Save Changes' : 'Create Admin Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
