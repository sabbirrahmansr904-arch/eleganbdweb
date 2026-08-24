import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Building2, 
  Upload, 
  Camera, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Key, 
  RefreshCw,
  Clock,
  CheckCircle2,
  Crown,
  Calendar,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { VerifiedBadge } from '../../components/admin/VerifiedBadge';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { compressAvatar, compressDataUrl } from '../../utils/imageCompressor';
import { autoSaveToMediaLibrary } from '../../utils/mediaLibrary';
import { AdminProfile } from './AdminAccounts';

export default function AdminMyAccount() {
  const { currentUser, isSuperAdmin, isCEO, department: authDept, permissions } = useAuth();
  
  const userEmail = currentUser?.email || 'admin@eleganbd.com';
  const cleanEmail = userEmail.toLowerCase().trim();
  const emailDocKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

  // Check if current user is Sabbir or Elegan BD for editing permissions
  const canEdit = [
    'sabbirrahmansr904@gmail.com',
    'eleganbd.ltd@gmail.com'
  ].includes(cleanEmail);

  const isMasterAdmin = canEdit;

  const [profile, setProfile] = useState<AdminProfile>({
    id: emailDocKey,
    name: currentUser?.displayName || userEmail.split('@')[0],
    email: userEmail,
    phone: '',
    position: isCEO ? 'CEO & Founder' : 'Sales Executive',
    department: authDept || (isCEO ? 'CEO & Founder' : 'Sales Executive Department'),
    photoURL: currentUser?.photoURL || '',
    status: 'Active',
    bio: '',
    createdAt: Date.now()
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) return;

    let unsubProfile: (() => void) | null = null;
    let unsubPerm: (() => void) | null = null;

    const fetchInitialData = async () => {
      try {
        // 1. Try fetching from admin_profiles
        const profRef = doc(db, 'admin_profiles', emailDocKey);
        const profSnap = await getDoc(profRef);

        if (profSnap.exists()) {
          const data = profSnap.data() as AdminProfile;
          setProfile(prev => ({
            ...prev,
            ...data,
            id: profSnap.id,
            email: userEmail,
            name: data.name || prev.name,
            position: data.position || prev.position,
            department: data.department || prev.department,
            photoURL: data.photoURL || prev.photoURL || '',
            phone: data.phone || prev.phone || '',
            bio: data.bio || prev.bio || ''
          }));
        } else {
          // 2. Fallback to admin_permissions or admin_invites if admin_profiles doesn't exist yet
          const permRef = doc(db, 'admin_permissions', userEmail.toLowerCase().trim());
          const permSnap = await getDoc(permRef);
          if (permSnap.exists()) {
            const pData = permSnap.data();
            setProfile(prev => ({
              ...prev,
              name: pData.name || prev.name,
              department: pData.department || prev.department,
              position: pData.position || (pData.department ? `${pData.department.split(' ')[0]} Officer` : prev.position),
              permissions: pData.permissions || prev.permissions
            }));
          }
        }
      } catch (err) {
        console.warn('Initial admin profile load fallback:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Setup real-time listener for live sync
    try {
      const docRef = doc(db, 'admin_profiles', emailDocKey);
      unsubProfile = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as AdminProfile;
          setProfile(prev => ({
            ...prev,
            ...data,
            id: docSnap.id,
            email: userEmail
          }));
        }
      });
    } catch (e) {}

    return () => {
      if (unsubProfile) unsubProfile();
      if (unsubPerm) unsubPerm();
    };
  }, [userEmail, emailDocKey]);

  // Handle Photo Upload from local device
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) {
      toast.error('অনুমতি নেই: শুধুমাত্র সাব্বির রহমান ও এলিগান বিডি (Sabbir & Elegan BD) প্রোফাইল ছবি পরিবর্তন করতে পারবেন।');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    try {
      toast.loading('Processing image...', { id: 'avatar-compress-my' });
      const compressed = await compressAvatar(file);
      setProfile(prev => ({ ...prev, photoURL: compressed }));
      autoSaveToMediaLibrary(compressed, {
        name: `Profile Picture - ${profile.name || userEmail}`,
        category: 'Staff Profiles',
        source: 'uploaded',
        uploadedBy: userEmail
      });
      toast.success('Photo ready!', { id: 'avatar-compress-my' });
    } catch (err) {
      toast.error('Failed to process image', { id: 'avatar-compress-my' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      toast.error('অনুমতি নেই: শুধুমাত্র সাব্বির রহমান ও এলিগান বিডি (Sabbir & Elegan BD) প্রোফাইল এডিট করতে পারবেন।');
      return;
    }
    if (!profile.name?.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);

    let safePhotoURL = profile.photoURL || '';
    if (safePhotoURL && safePhotoURL.startsWith('data:image')) {
      try {
        safePhotoURL = await compressDataUrl(safePhotoURL, 400, 400, 0.8);
      } catch (err) {
        console.warn('Image compression fallback:', err);
      }
    }

    const payload: AdminProfile = {
      ...profile,
      photoURL: safePhotoURL,
      id: emailDocKey,
      email: userEmail.toLowerCase().trim(),
      updatedAt: Date.now()
    };

    try {
      // 1. Save to admin_profiles collection
      await setDoc(doc(db, 'admin_profiles', emailDocKey), payload, { merge: true });
      
      // 2. Sync to admin_permissions
      await setDoc(doc(db, 'admin_permissions', userEmail.toLowerCase().trim()), {
        email: userEmail.toLowerCase().trim(),
        name: payload.name,
        department: payload.department,
        position: payload.position,
        updatedAt: Date.now()
      }, { merge: true });

      // Update local storage
      const localProfiles = localStorage.getItem('elegan_admin_profiles');
      let list: AdminProfile[] = [];
      if (localProfiles) {
        try { list = JSON.parse(localProfiles); } catch (e) {}
      }
      const updatedList = [...list.filter(p => p.email.toLowerCase() !== userEmail.toLowerCase()), payload];
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(updatedList));

      toast.success('Your account profile has been saved successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      // Fallback local save
      const localProfiles = localStorage.getItem('elegan_admin_profiles');
      let list: AdminProfile[] = [];
      if (localProfiles) {
        try { list = JSON.parse(localProfiles); } catch (e) {}
      }
      const updatedList = [...list.filter(p => p.email.toLowerCase() !== userEmail.toLowerCase()), payload];
      localStorage.setItem('elegan_admin_profiles', JSON.stringify(updatedList));
      toast.success('Profile saved successfully!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 pb-12 font-sans">
      {!canEdit && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl flex items-center gap-3 text-xs font-medium shadow-2xs">
          <ShieldAlert size={20} className="text-amber-600 shrink-0" />
          <div>
            <span className="font-bold">নোট (Read-only):</span> এই পেজটি আপনার প্রোফাইল ভিউ করার জন্য। শুধুমাত্র সাব্বির রহমান এবং এলিগান বিডি (Sabbir & Elegan BD) প্রোফাইল তথ্য এডিট করতে পারবেন।
          </div>
        </div>
      )}

      {/* Top Banner - Full Width */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold shadow-2xs shrink-0">
            <User size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">My Account Profile</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {profile.position || 'Admin Account'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              আপনার ব্যক্তিগত তথ্য, ছবি, পদবি ও মোবাইল নম্বর রিয়েল-টাইম পরিচালনা করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isCEO ? (
            <>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                <Crown size={14} className="text-amber-700 fill-amber-500" /> CEO Executive
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <VerifiedBadge size={15} /> Verified
              </span>
            </>
          ) : isSuperAdmin ? (
            <>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1.5">
                <ShieldCheck size={13} /> Super Admin
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <VerifiedBadge size={15} /> Verified
              </span>
            </>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Admin
            </span>
          )}
        </div>
      </div>

      {/* Full Box 2-Column Responsive Layout */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Profile Card & Photo Management (4 cols on lg) */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col items-center text-center space-y-4">
            
            {/* Avatar with Camera Icon */}
            <div className="relative group/avatar">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-3xl shadow-md border-4 border-white ring-2 ring-slate-100 overflow-hidden">
                {profile.photoURL ? (
                  <img 
                    src={profile.photoURL} 
                    alt={profile.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{profile.name?.slice(0, 2).toUpperCase() || 'AD'}</span>
                )}
              </div>
              <label 
                htmlFor="device-photo-upload" 
                className="absolute -bottom-2 -right-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 border-2 border-white"
                title="Device থেকে ছবি আপলোড করুন"
              >
                <Camera size={18} />
              </label>
              <input 
                id="device-photo-upload"
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">{profile.name || userEmail}</h2>
              <p className="text-xs font-semibold text-blue-600">{profile.position || 'Admin'}</p>
              <p className="text-[11px] text-slate-400">{profile.department || 'Administration'}</p>
            </div>

            {/* Photo Upload Button */}
            <div className="w-full pt-2">
              <label 
                htmlFor="device-photo-upload"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Upload size={14} className="text-slate-300" />
                <span>Upload New Picture</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                JPG, PNG supported • Auto-compressed
              </p>
            </div>

            {/* Account Quick Info List */}
            <div className="w-full pt-3 border-t border-slate-100 space-y-2.5 text-left text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Mail size={13} /> Email
                </span>
                <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={userEmail}>
                  {userEmail}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Phone size={13} /> Phone
                </span>
                <span className="font-semibold text-slate-800">
                  {profile.phone || 'Not set'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <CheckCircle2 size={13} /> Status
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {profile.status || 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Personal & Work Profile Form (8 cols on lg) */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900">Personal & Work Profile Information</h2>
                <p className="text-xs text-slate-400 mt-0.5">আপনার সকল অফিশিয়াল তথ্য ও ডেজিগনেশন সেটিংস</p>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={profile.name || ''}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Your Full Name"
                  className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 text-slate-900 transition-all"
                />
              </div>

              {/* Email (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Gmail / Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    readOnly
                    value={profile.email || ''}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed"
                  />
                  <Mail size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <p className="text-[10px] text-slate-400">লগইন জিমেইল পরিবর্তনযোগ্য নয়</p>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">Phone / Mobile Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+880 1700-000000"
                    className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 text-slate-900 transition-all"
                  />
                  <Phone size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">Position / Designation</label>
                  {!isMasterAdmin && (
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Lock size={10} /> CEO Managed
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly={!isMasterAdmin}
                    disabled={!isMasterAdmin}
                    value={profile.position || ''}
                    onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                    placeholder="e.g. Sales Executive, Logistics Manager"
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none text-slate-900 border transition-all",
                      !isMasterAdmin 
                        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" 
                        : "bg-[#F8F9FD] border-slate-200 focus:bg-white focus:border-blue-500"
                    )}
                  />
                  {isMasterAdmin ? (
                    <Briefcase size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  ) : (
                    <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                </div>
                {!isMasterAdmin && (
                  <p className="text-[10px] text-slate-400">পদবি শুধুমাত্র সিইও / সুপার এডমিন পরিবর্তন করতে পারেন</p>
                )}
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">Department</label>
                  {!isMasterAdmin && (
                    <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Lock size={10} /> CEO Managed
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly={!isMasterAdmin}
                    disabled={!isMasterAdmin}
                    value={profile.department || ''}
                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    placeholder="e.g. Sales Executive Department"
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none text-slate-900 border transition-all",
                      !isMasterAdmin 
                        ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" 
                        : "bg-[#F8F9FD] border-slate-200 focus:bg-white focus:border-blue-500"
                    )}
                  />
                  {isMasterAdmin ? (
                    <Building2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  ) : (
                    <Lock size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                </div>
                {!isMasterAdmin && (
                  <p className="text-[10px] text-slate-400">ডিপার্টমেন্ট শুধুমাত্র সিইও / সুপার এডমিন পরিবর্তন করতে পারেন</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 block">Work Status</label>
                  {!isMasterAdmin && (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <Lock size={10} /> Locked
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(['Active', 'On Leave', 'Inactive'] as const).map((st) => (
                    <button
                      type="button"
                      key={st}
                      disabled={!isMasterAdmin}
                      onClick={() => setProfile({ ...profile, status: st })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                        profile.status === st
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-[#F8F9FD] text-slate-600 border-slate-200 hover:bg-slate-100",
                        !isMasterAdmin && "cursor-not-allowed opacity-90"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">About Me / Bio & Remarks</label>
              <textarea
                rows={3}
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Write a short summary about your role, responsibilities, or notes..."
                className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-blue-500 text-slate-900 resize-none transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={15} /> : <Check size={15} />}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
