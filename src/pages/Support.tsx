import React from 'react';
import { Headset } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Support() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-[0_4px_24px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-fuchsia-50 text-fuchsia-500 rounded-3xl flex items-center justify-center mb-6">
            <Headset size={40} strokeWidth={2} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-4">২৪/৭ কাস্টমার সাপোর্ট</h1>
          <p className="text-slate-500 font-medium">Dedicated Help & Support</p>
        </div>

        <div className="space-y-6 text-slate-700 leading-relaxed text-lg">
          <p>
            যেকোনো প্রয়োজনে আমরা সব সময় আপনার পাশে আছি। আমাদের ডেডিকেটেড সাপোর্ট টিম ২৪ ঘন্টা, সপ্তাহের ৭ দিনই আপনার প্রশ্নের উত্তর দিতে প্রস্তুত।
          </p>
          <p>
            <strong>কীভাবে আমাদের সাথে যোগাযোগ করবেন?</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>হটলাইন:</strong> আমাদের হটলাইন নাম্বারে কল করে সরাসরি কথা বলতে পারেন।</li>
            <li><strong>লাইভ চ্যাট:</strong> ওয়েবসাইটের মেসেঞ্জার বা চ্যাট অপশন ব্যবহার করে দ্রুত সমাধান নিন।</li>
            <li><strong>ইমেইল:</strong> আপনার যেকোনো পরামর্শ বা অভিযোগের জন্য আমাদের ইমেইল করতে পারেন।</li>
          </ul>
          <p>
            আমরা আন্তরিকভাবে চেষ্টা করি আপনার যেকোনো সমস্যার দ্রুততম সমাধান নিশ্চিত করতে।
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
