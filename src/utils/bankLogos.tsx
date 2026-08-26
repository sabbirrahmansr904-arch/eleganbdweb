import React, { useState } from 'react';
import { Wallet, Building2, Banknote, Upload, Image as ImageIcon } from 'lucide-react';

export interface BankPreset {
  id: string;
  name: string;
  accountType: string;
  logoUrl: string;
  brandColor: string;
  bgColor: string;
  textColor: string;
  category: 'mfs' | 'bank' | 'cash';
}

// 1. Native React SVG Brand Logos (Zero external network dependencies, 100% crisp & reliable)
export const BkashLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#E2136E" />
    <path d="M60 16 L98 46 L78 100 L42 100 L22 46 Z" fill="#FFFFFF" fillOpacity="0.18" />
    <path d="M58 18 L94 48 L68 48 L58 18 Z" fill="#FFFFFF" />
    <path d="M28 48 L64 48 L46 96 L28 48 Z" fill="#FFFFFF" />
    <path d="M64 52 L94 52 L76 96 L58 96 Z" fill="#FFFFFF" />
    <circle cx="88" cy="32" r="7" fill="#FFFFFF" />
  </svg>
);

export const NagadLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#F97316" />
    <path d="M60 14 C82 28 98 56 90 82 C84 100 62 106 50 102 C34 96 26 80 32 58 C38 40 52 26 60 14 Z" fill="#FFFFFF" />
    <circle cx="60" cy="72" r="15" fill="#F97316" />
    <path d="M60 34 C72 46 78 62 72 76" stroke="#EA580C" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

export const RocketLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#8C3494" />
    <path d="M60 20 C60 20 78 38 78 62 L70 74 L60 68 L50 74 L42 62 C42 38 60 20 60 20 Z" fill="#FFFFFF" />
    <path d="M60 70 L68 92 L60 86 L52 92 Z" fill="#F59E0B" />
    <circle cx="60" cy="46" r="8" fill="#8C3494" />
  </svg>
);

export const SonaliLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#00873D" />
    <circle cx="60" cy="60" r="42" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="5" />
    <circle cx="60" cy="60" r="28" fill="#00873D" />
    <path d="M60 40 L65 52 L78 52 L68 60 L72 72 L60 64 L48 72 L52 60 L42 52 L55 52 Z" fill="#F59E0B" />
  </svg>
);

export const DBBLLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#006A4E" />
    <path d="M60 24 C75 24 88 36 88 52 C88 68 74 82 60 92 C46 82 32 68 32 52 C32 36 45 24 60 24 Z" fill="#FFFFFF" />
    <path d="M60 34 C70 34 78 42 78 52 C78 62 68 72 60 80 C52 72 42 62 42 52 C42 42 50 34 60 34 Z" fill="#E11D48" />
    <circle cx="60" cy="52" r="8" fill="#FFFFFF" />
  </svg>
);

export const IBBLLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#008037" />
    <circle cx="60" cy="60" r="40" fill="#FFFFFF" />
    <path d="M60 30 L84 80 L36 80 Z" fill="#008037" />
    <circle cx="60" cy="55" r="10" fill="#FFFFFF" />
  </svg>
);

export const BRACLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#004B87" />
    <rect x="30" y="30" width="26" height="26" rx="6" fill="#F97316" />
    <rect x="64" y="30" width="26" height="26" rx="6" fill="#FFFFFF" />
    <rect x="30" y="64" width="26" height="26" rx="6" fill="#FFFFFF" />
    <rect x="64" y="64" width="26" height="26" rx="6" fill="#F97316" />
  </svg>
);

export const CityLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#ED1C24" />
    <circle cx="60" cy="60" r="38" fill="#FFFFFF" />
    <rect x="46" y="46" width="28" height="28" transform="rotate(45 60 60)" fill="#ED1C24" />
  </svg>
);

export const CashLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#059669" />
    <rect x="28" y="38" width="64" height="44" rx="8" fill="#FFFFFF" stroke="#059669" strokeWidth="4" />
    <circle cx="60" cy="60" r="12" fill="#059669" />
    <circle cx="42" cy="60" r="4" fill="#059669" />
    <circle cx="78" cy="60" r="4" fill="#059669" />
  </svg>
);

export const RedotpayLogo = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="28" fill="#E60028" />
    <rect x="20" y="22" width="80" height="76" rx="16" fill="#FFFFFF" fillOpacity="0.12" />
    {/* Clean stylized R & Dollar Card glyph */}
    <path d="M40 34 H68 C78 34 85 41 85 51 C85 61 78 68 68 68 H54 V86 H40 V34 Z M54 46 V56 H67 C70.5 56 73 53.5 73 51 C73 48.5 70.5 46 67 46 H54 Z" fill="#FFFFFF" />
    <path d="M64 64 L80 86 H66 L52 68 Z" fill="#FFFFFF" />
    <circle cx="86" cy="34" r="5" fill="#FFD700" />
    <text x="60" y="104" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="900" letterSpacing="1" fontFamily="sans-serif">USD CARD</text>
  </svg>
);

export const BANK_PRESETS: BankPreset[] = [
  {
    id: 'redotpay',
    name: 'RedotPay USD (ডলার কার্ড)',
    accountType: 'ডলার অ্যাকাউন্ট (USD)',
    logoUrl: 'preset:redotpay',
    brandColor: '#E60028',
    bgColor: '#FEF2F2',
    textColor: '#DC2626',
    category: 'mfs'
  },
  {
    id: 'bkash',
    name: 'bKash Personal',
    accountType: 'ব্যক্তিগত',
    logoUrl: 'preset:bkash',
    brandColor: '#E2136E',
    bgColor: '#FFF0F5',
    textColor: '#E2136E',
    category: 'mfs'
  },
  {
    id: 'bkash_agent',
    name: 'bKash Merchant',
    accountType: 'মার্চেন্ট / এজেন্ট',
    logoUrl: 'preset:bkash',
    brandColor: '#E2136E',
    bgColor: '#FFF0F5',
    textColor: '#E2136E',
    category: 'mfs'
  },
  {
    id: 'nagad',
    name: 'Nagad Personal',
    accountType: 'ব্যক্তিগত',
    logoUrl: 'preset:nagad',
    brandColor: '#F7941D',
    bgColor: '#FFF7ED',
    textColor: '#EA580C',
    category: 'mfs'
  },
  {
    id: 'nagad_merchant',
    name: 'Nagad Merchant',
    accountType: 'মার্চেন্ট',
    logoUrl: 'preset:nagad',
    brandColor: '#F7941D',
    bgColor: '#FFF7ED',
    textColor: '#EA580C',
    category: 'mfs'
  },
  {
    id: 'rocket',
    name: 'Rocket (DBBL MFS)',
    accountType: 'ব্যক্তিগত',
    logoUrl: 'preset:rocket',
    brandColor: '#8C3494',
    bgColor: '#FAF5FF',
    textColor: '#7E22CE',
    category: 'mfs'
  },
  {
    id: 'sonali',
    name: 'Sonali Bank',
    accountType: 'ব্যক্তিগত',
    logoUrl: 'preset:sonali',
    brandColor: '#00873D',
    bgColor: '#F0FDF4',
    textColor: '#15803D',
    category: 'bank'
  },
  {
    id: 'dbbl',
    name: 'Dutch-Bangla Bank (DBBL)',
    accountType: 'কারেন্ট / সেভিংস',
    logoUrl: 'preset:dbbl',
    brandColor: '#006A4E',
    bgColor: '#ECFDF5',
    textColor: '#047857',
    category: 'bank'
  },
  {
    id: 'ibbl',
    name: 'Islami Bank Bangladesh',
    accountType: 'সেভিংস',
    logoUrl: 'preset:ibbl',
    brandColor: '#008037',
    bgColor: '#F0FDF4',
    textColor: '#166534',
    category: 'bank'
  },
  {
    id: 'brac',
    name: 'BRAC Bank',
    accountType: 'কারেন্ট / সেভিংস',
    logoUrl: 'preset:brac',
    brandColor: '#004B87',
    bgColor: '#EFF6FF',
    textColor: '#1D4ED8',
    category: 'bank'
  },
  {
    id: 'city',
    name: 'City Bank',
    accountType: 'কারেন্ট / সেভিংস',
    logoUrl: 'preset:city',
    brandColor: '#ED1C24',
    bgColor: '#FEF2F2',
    textColor: '#B91C1C',
    category: 'bank'
  },
  {
    id: 'cash',
    name: 'Hand Cash / নগদ ক্যাশ',
    accountType: 'ক্যাশ বক্স',
    logoUrl: 'preset:cash',
    brandColor: '#10B981',
    bgColor: '#ECFDF5',
    textColor: '#047857',
    category: 'cash'
  }
];

// Helper to determine preset key or custom image
export function getBankBrandKey(bankName: string, logoUrl?: string): string | null {
  if (logoUrl?.startsWith('preset:')) {
    return logoUrl.replace('preset:', '');
  }
  const cleanName = (bankName || '').toLowerCase();
  if (cleanName.includes('redotpay') || cleanName.includes('redot') || cleanName.includes('রেডটপে') || cleanName.includes('রেডট পে')) return 'redotpay';
  if (cleanName.includes('bkash') || cleanName.includes('বিকাশ')) return 'bkash';
  if (cleanName.includes('nagad') || cleanName.includes('নগদ')) return 'nagad';
  if (cleanName.includes('rocket') || cleanName.includes('রকেট')) return 'rocket';
  if (cleanName.includes('sonali') || cleanName.includes('সোনালী')) return 'sonali';
  if (cleanName.includes('dbbl') || cleanName.includes('dutch') || cleanName.includes('ডাচ')) return 'dbbl';
  if (cleanName.includes('islami') || cleanName.includes('ibbl') || cleanName.includes('ইসলামী')) return 'ibbl';
  if (cleanName.includes('brac') || cleanName.includes('ব্র্যাক')) return 'brac';
  if (cleanName.includes('city') || cleanName.includes('সিটি')) return 'city';
  if (cleanName.includes('cash') || cleanName.includes('ক্যাশ')) return 'cash';
  return null;
}

interface BankLogoBadgeProps {
  bankName: string;
  logoUrl?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const BankLogoBadge: React.FC<BankLogoBadgeProps> = ({
  bankName,
  logoUrl,
  className = '',
  size = 'md'
}) => {
  const [imgError, setImgError] = useState(false);
  const brandKey = getBankBrandKey(bankName, logoUrl);
  const isCustomUploaded = Boolean(logoUrl && !logoUrl.startsWith('preset:') && !logoUrl.includes('rupomsoft') && (logoUrl.startsWith('data:image') || logoUrl.startsWith('http')));

  const sizeClasses = {
    xs: 'w-6 h-6 rounded-lg p-0.5',
    sm: 'w-8 h-8 rounded-xl p-0.5',
    md: 'w-12 h-12 rounded-2xl p-1',
    lg: 'w-16 h-16 rounded-[22px] p-1',
    xl: 'w-20 h-20 rounded-[26px] p-1.5'
  };

  const isBkash = (bankName || '').toLowerCase().includes('bkash') || (bankName || '').toLowerCase().includes('বিকাশ');
  const isNagad = (bankName || '').toLowerCase().includes('nagad') || (bankName || '').toLowerCase().includes('নগদ');
  const isRocket = (bankName || '').toLowerCase().includes('rocket') || (bankName || '').toLowerCase().includes('রকেট');

  // 1. If user uploaded a custom image from device / URL (and no error), render it!
  if (isCustomUploaded && !imgError) {
    return (
      <div className={`bg-transparent border border-gray-200/40 shadow-2xs flex items-center justify-center overflow-hidden shrink-0 transition-transform duration-200 ${sizeClasses[size]} ${className}`}>
        <img
          src={logoUrl}
          alt={bankName}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`w-full h-full object-contain ${
            isBkash ? 'scale-135' : isNagad ? 'scale-135' : isRocket ? 'scale-120' : 'scale-110'
          } transition-transform duration-200`}
        />
      </div>
    );
  }

  // 2. Render Native High-Res Vector SVG for Bangladesh Banks & MFS
  if (brandKey) {
    return (
      <div className={`flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 ${sizeClasses[size]} ${className}`}>
        {brandKey === 'redotpay' && <RedotpayLogo />}
        {brandKey === 'bkash' && <BkashLogo />}
        {brandKey === 'nagad' && <NagadLogo />}
        {brandKey === 'rocket' && <RocketLogo />}
        {brandKey === 'sonali' && <SonaliLogo />}
        {brandKey === 'dbbl' && <DBBLLogo />}
        {brandKey === 'ibbl' && <IBBLLogo />}
        {brandKey === 'brac' && <BRACLogo />}
        {brandKey === 'city' && <CityLogo />}
        {brandKey === 'cash' && <CashLogo />}
      </div>
    );
  }

  // 3. Fallback for generic accounts
  return (
    <div className={`bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-sm shrink-0 ${sizeClasses[size]} ${className}`}>
      <Building2 className="w-1/2 h-1/2" />
    </div>
  );
};

