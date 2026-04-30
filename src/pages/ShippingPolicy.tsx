import React from 'react';
import { Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-6">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-[0_4px_24px_rgb(0,0,0,0.04)]">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mb-6">
            <Truck size={40} strokeWidth={2} />
          </div>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-slate-900 mb-4">ফ্রি শিপিং (Free Shipping)</h1>
          <p className="text-slate-500 font-medium">Over ৳5000</p>
        </div>

        <div className="space-y-6 text-slate-700 leading-relaxed text-lg">
          <p>
            আমাদের স্টোর থেকে ৫০০০ টাকা বা তার বেশি মূল্যের কেনাকাটা করলে আপনি পেয়ে যাচ্ছেন একদম ফ্রি শিপিং সুবিধা! 
          </p>
          <p>
            <strong>কীভাবে এই অফার পাবেন?</strong><br />
            খুবই সহজ! আপনার কার্টে ৫০০০ টাকা বা তার বেশি মূল্যের প্রোডাক্ট যোগ করুন এবং চেকআউট করার সময় অটোমেটিক্যালি ডেলিভারি চার্জ শূন্য (০) হয়ে যাবে। 
          </p>
          <p>
            <strong>শর্তাবলী:</strong>
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>এই অফারটি সারা বাংলাদেশের জন্য প্রযোজ্য।</li>
            <li>অফারটি নির্দিষ্ট সময়ের জন্য বা যেকোনো সময় পরিবর্তন হতে পারে।</li>
            <li>যেকোনো রিটার্ন বা এক্সচেঞ্জের ক্ষেত্রে আমাদের সাধারণ পলিসি প্রযোজ্য হবে।</li>
          </ul>
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
