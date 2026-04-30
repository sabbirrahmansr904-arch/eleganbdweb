import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SecurePayment() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-[0_4px_24px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mb-6">
            <ShieldCheck size={40} strokeWidth={2} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-4">শতভাগ নিরাপদ পেমেন্ট</h1>
          <p className="text-slate-500 font-medium">100% Secure & Trusted</p>
        </div>

        <div className="space-y-6 text-slate-700 leading-relaxed text-lg">
          <p>
            আপনার পেমেন্ট তথ্য আমাদের কাছে সম্পূর্ণ নিরাপদ। আমরা আপনার অনলাইন লেনদেন সুরক্ষিত রাখতে উন্নত এনক্রিপশন প্রযুক্তি ব্যবহার করি।
          </p>
          <p>
            <strong>আমাদের পেমেন্ট সিস্টেম কেন নিরাপদ?</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>এন্ড-টু-এন্ড এনক্রিপশন (SSL):</strong> আপনার সমস্ত ডেটা এনক্রিপ্ট করা হয় যাতে তৃতীয় কোনো পক্ষ এটি পড়তে না পারে।</li>
            <li><strong>নির্ভরযোগ্য পেমেন্ট গেটওয়ে:</strong> আমরা বাংলাদেশের সবচেয়ে জনপ্রিয় ও নিরাপদ পেমেন্ট গেটওয়ে ব্যবহার করে থাকি (যেমন বিকাশ, নগদ, রকেট এবং কার্ড)।</li>
            <li><strong>কোনো কার্ড ইনফরমেশন সেভ করা হয় না:</strong> আপনার ক্রেডিট বা ডেবিট কার্ডের কোনো পূর্ণাঙ্গ তথ্য আমাদের সিস্টেমে সংরক্ষিত থাকে না।</li>
          </ul>
          <p>
            আপনি নিশ্চিন্তে আমাদের প্ল্যাটফর্ম থেকে কেনাকাটা করতে পারেন।
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center">
          <Link to="/" className="px-8 py-4 bg-slate-900 text-white font-bold uppercase tracking-widest text-sm rounded-full hover:bg-slate-800 transition-colors">
            হোম পেজে ফিরে যান
          </Link>
        </div>
      </div>
    </div>
  );
}
