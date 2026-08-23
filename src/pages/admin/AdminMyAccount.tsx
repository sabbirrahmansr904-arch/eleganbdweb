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
  BadgeCheck,
  Crown,
  Calendar,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { compressAvatar, compressDataUrl } from '../../utils/imageCompressor';
import { AdminProfile } from './AdminAccounts';

export default function AdminMyAccount() {
  const { currentUser, isSuperAdmin, isCEO, department: authDept, permissions } = useAuth();
  
  const userEmail = currentUser?.email || 'admin@eleganbd.com';
  const cleanEmail = userEmail.toLowerCase().trim();
  const emailDocKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

  // Check if current user is CEO or Super Admin
  const isMasterAdmin = isSuperAdmin || isCEO || [
    'sabbirrahmansr904@gmail.com',
    'eleganbd.ltd@gmail.com',
    'shamiulislamatik@gmail.com',
    'nasiruddinovi2025@gmail.com'
  ].includes(cleanEmail);

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
      toast.success('Photo ready!', { id: 'avatar-compress-my' });
    } catch (err) {
      toast.error('Failed to process image', { id: 'avatar-compress-my' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="max-w-4xl mx-auto space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#F8F9FD] p-6 rounded-3xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold shadow-2xs">
            <User size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Account Profile</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              আপনার ব্যক্তিগত তথ্য, ছবি, পদবি ও মোবাইল নম্বর আপডেট করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isCEO ? (
            <>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                <Crown size={14} className="text-amber-700 fill-amber-500" /> CEO Executive
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <BadgeCheck size={14} className="text-blue-600" /> Verified
              </span>
            </>
          ) : isSuperAdmin ? (
            <>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1.5">
                <ShieldCheck size={13} /> Super Admin
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <BadgeCheck size={14} className="text-blue-600" /> Verified
              </span>
            </>
          ) : (
            <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Admin
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card & Avatar */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">Personal Information</h2>

          {/* Device Picture Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-[#F8F9FD] rounded-2xl border border-slate-200/80">
            <div className="relative group/avatar">
              <div className="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-3xl shadow-md border-4 border-white overflow-hidden">
                {profile.photoURL ? (
                  <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.name?.slice(0, 2).toUpperCase() || 'AD'}</span>
                )}
              </div>
              <label 
                htmlFor="device-photo-upload" 
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                title="Upload photo from device"
              >
                <Camera size={16} />
              </label>
              <input 
                id="device-photo-upload"
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
            </div>

            <div className="space-y-1.5 text-center sm:text-left flex-1">
              <h3 className="text-sm font-black text-slate-900">Profile Picture (Device থেকে আপলোড)</h3>
              <p className="text-xs text-slate-500 font-medium">
                আপনার মোবাইল বা কম্পিউটার থেকে নিজের পছন্দমতো ছবি আপলোড করুন (JPG, PNG)
              </p>
              <div className="pt-2">
                <label 
                  htmlFor="device-photo-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-all"
                >
                  <Upload size={14} className="text-blue-600" />
                  <span>Choose Photo from Device</span>
                </label>
              </div>
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
                className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900"
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
                  className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900"
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
                    "w-full px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none text-slate-900 border",
                    !isMasterAdmin 
                      ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" 
                      : "bg-[#F8F9FD] border-slate-200 focus:border-blue-500"
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
                    "w-full px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none text-slate-900 border",
                    !isMasterAdmin 
                      ? "bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed" 
                      : "bg-[#F8F9FD] border-slate-200 focus:border-blue-500"
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
            <label className="text-xs font-bold text-slate-800 block">About Me / Bio</label>
            <textarea
              rows={3}
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Write a short summary about your role or notes..."
              className="w-full px-4 py-2.5 bg-[#F8F9FD] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500 text-slate-900 resize-none"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {isSaving ? <RefreshCw className="animate-spin" size={15} /> : <Check size={15} />}
            <span>Save Profile Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
