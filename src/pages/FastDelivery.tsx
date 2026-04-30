import React from 'react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FastDelivery() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-[0_4px_24px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mb-6">
            <Zap size={40} strokeWidth={2} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-4">দ্রুত ডেলিভারি</h1>
          <p className="text-slate-500 font-medium">Within 48 Hours</p>
        </div>

        <div className="space-y-6 text-slate-700 leading-relaxed text-lg">
          <p>
            আমরা বুঝতে পারি আপনি আপনার পছন্দের পণ্যটি যত দ্রুত সম্ভব হাতে পেতে চান। তাই আমরা দিচ্ছি ৪৮ ঘণ্টার মধ্যে দ্রুত ডেলিভারি সুবিধা (শর্ত প্রযোজ্য)।
          </p>
          <p>
            <strong>আমাদের ডেলিভারি প্রক্রিয়া:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>ঢাকার ভেতরে:</strong> সাধারণত ২৪ থেকে ৪৮ ঘণ্টার মধ্যে ডেলিভারি সম্পন্ন হয়ে থাকে।</li>
            <li><strong>ঢাকার বাইরে:</strong> কুরিয়ার সার্ভিসের উপর ভিত্তি করে ২-৩ কার্যদিবসের মধ্যে ডেলিভারি পৌঁছাবে।</li>
            <li><strong>প্রোডাক্ট ট্র্যাকিং:</strong> অর্ডার কনফার্ম হওয়ার পর আপনি সহজেই আপনার পণ্যের লাইভ স্ট্যাটাস জানতে পারবেন।</li>
          </ul>
          <p>
            <em>বিঃদ্রঃ আবহাওয়া, রাজনৈতিক পরিস্থিতি বা অপ্রত্যাশিত কারণে ডেলিভারি সময় কিছুটা পরিবর্তিত হতে পারে।</em>
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
