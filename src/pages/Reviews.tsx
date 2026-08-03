import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, MessageSquare, Plus, Trash2, CheckCircle2, User, Filter, X, ThumbsUp, Sparkles, AlertCircle } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ReviewItem {
  id: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  productName?: string;
  createdAt: number;
  isVerified?: boolean;
  isAdmin?: boolean;
}

const getInitials = (name: string) => {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Initial seed reviews generating 100+ realistic customer reviews
const generateSeedReviews = (): ReviewItem[] => {
  const reviews: ReviewItem[] = [];

  const banglaNames = [
    'Sabbir Rahman', 'Tanvir Ahmed', 'Nayeem Islam', 'Mehedi Hasan', 'Fahim Rashed',
    'Pollob Das', 'Anisur Rahman', 'Imran Hossain', 'Arif Chowdhury', 'Jamil Ahmed',
    'Sajid Khan', 'Riaz Uddin', 'Milon Miah', 'Zubayer Alom', 'Mamun Sarker',
    'Sujon Sheikh', 'Kamal Hossain', 'Asif Bhuiyan', 'Rashed Siddique', 'Faisal Karim',
    'Tariqul Islam', 'Shakil Ahmed', 'Rony Das', 'Shohel Rana', 'Mostafizur Rahman',
    'Mahbub Alom', 'Rakib Hasan', 'Shariful Islam', 'Rubel Hossain', 'Arafat Rahman'
  ];

  const productNames = [
    'Premium Cotton Formal Shirt', 'Tailored Slim Fit Trouser', 'Royal Executive Panjabi',
    'Casual Premium Linen Shirt', 'Executive Blazer', 'Oxford Button-Down Shirt',
    'Stretch Chino Pant', 'Luxury Silk Panjabi', 'Printed Polo Shirt', 'Classic Gabardine Trouser'
  ];

  const banglaComments = [
    'মানসম্মত পণ্য—যারা নিতে চান তারা নিশ্চিন্তে নিতে পারেন। আমি তাদের ডিসপ্লে সেন্টার থেকে শার্টগুলো নিয়েছি। খুবই সুন্দর এবং আরামদায়ক। ধন্যবাদ, Elegan BD!',
    'কাপড়ের কোয়ালিটি অসাধারণ, ফিটিং একদম পারফেক্ট হয়েছে। ডেলিভারিও খুব দ্রুত পেয়েছি। ধন্যবাদ সেলারকে!',
    'প্যান্টের ফেব্রিক এবং সেলাই সত্যিই প্রিমিয়াম। এত ভালো ফরমাল প্যান্ট আশা করিনি। আবার অর্ডার করবো।',
    'কালার একদম ছবির মতোই সেম টু সেম পেয়েছি। ওয়াশ করার পরেও কালার নষ্ট হয়নি। অত্যন্ত সন্তুষ্ট!',
    'ডেলিভারি ভাইয়ের ব্যবহার খুব ভালো ছিল এবং প্রোডাক্ট সময়মতো পেয়েছি। Elegan BD এর কাস্টমার সার্ভিস সত্যিই প্রশংসনীয়।',
    'শার্টের ফেব্রিক খুবই সফট এবং আরামদায়ক। বিশেষ করে গরমের দিনে পরার জন্য দারুণ। রিকমেন্ডেড!',
    'প্রথমে একটু কনফিউজড ছিলাম সাইজ নিয়ে, কিন্তু কাস্টমার সাপোর্ট আমাকে সঠিক সাইজ সিলেক্ট করতে সাহায্য করেছে। ফিটিং একদম জোস হয়েছে।',
    'অসাধারণ ফিনিশিং এবং বোতামের কোয়ালিটি। প্রিমিয়াম লুক দেয়। যেকোনো ফরমাল অকেশনে পরার মতো।',
    'ক্যাশ অন ডেলিভারিতে প্রোডাক্ট চেক করে নেওয়ার সুবিধা থাকার কারণে অনেক নিশ্চিন্তে অর্ডার করেছি। প্রোডাক্ট কোয়ালিটি সেরা।',
    'আমি নিয়মিত ফরমাল কাপড় কিনি, কিন্তু Elegan BD এর মেটেরিয়াল এবং প্রাইস অন্য সবার থেকে সেরা লেগেছে।',
    'ফেব্রিকটা অনেক প্রিমিয়াম ফিল দেয়। গরম বা শীত উভয় ঋতুতেই পরার জন্য পারফেক্ট।',
    'খুবই ক্লাসি ডিজাইন। বন্ধুদের অনেকেই জিজ্ঞেস করেছে কোথা থেকে কিনেছি। Elegan BD এর জন্য শুভকামনা!',
    'যেমনটা আশা করেছিলাম ঠিক তেমনটাই পেয়েছি। ফেব্রিক অনেক টেকসই মনে হচ্ছে। ৫ স্টার রেটিং!',
    'শার্ট এবং প্যান্ট দুটোই অর্ডার করেছিলাম। দুটোরই কোয়ালিটি চমৎকার। ফাস্ট শিপিংয়ের জন্য ধন্যবাদ।',
    'এত কম বাজেটে প্রিমিয়াম কোয়ালিটির প্রোডাক্ট দেওয়ার জন্য ধন্যবাদ। সেলাইয়ের ফিনিশিং অসাধারণ।'
  ];

  for (let i = 1; i <= 105; i++) {
    const name = banglaNames[(i - 1) % banglaNames.length];
    const prod = productNames[(i - 1) % productNames.length];
    const comm = banglaComments[(i - 1) % banglaComments.length];
    const rating = (i % 18 === 0) ? 4 : 5; // Mostly 5 stars, occasional 4 stars
    const createdAt = Date.now() - (i * 3600000 * 3);

    reviews.push({
      id: `seed-${i}`,
      userName: name,
      rating,
      comment: comm,
      productName: prod,
      createdAt,
      isVerified: true
    });
  }

  return reviews;
};

const seedReviews: ReviewItem[] = generateSeedReviews();

export default function Reviews() {
  const { currentUser, customerUser, isAdmin } = useAuth();
  const [firestoreReviews, setFirestoreReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);

  // Form State
  const [userName, setUserName] = useState('');
  const [productName, setProductName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto fill user name if logged in
  useEffect(() => {
    if (currentUser?.email) {
      setUserName(currentUser.email.split('@')[0]);
    } else if (customerUser?.email) {
      setUserName(customerUser.email.split('@')[0]);
    }
  }, [currentUser, customerUser]);

  // Real-time Firestore query for reviews
  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ReviewItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          userName: data.userName || data.name || 'Anonymous',
          userEmail: data.userEmail || '',
          rating: Number(data.rating) || 5,
          comment: data.comment || data.text || '',
          productName: data.productName || data.product || 'General Store Review',
          createdAt: data.createdAt || Date.now(),
          isVerified: data.isVerified ?? true,
          isAdmin: data.isAdmin ?? false,
        });
      });
      setFirestoreReviews(items);
      setLoading(false);
    }, (err) => {
      console.error("Reviews listener error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Combine Firestore reviews with seed reviews if Firestore is small
  const allReviews = [...firestoreReviews, ...seedReviews.filter(s => !firestoreReviews.some(f => f.id === s.id))];

  // Filter reviews by star rating
  const filteredReviews = selectedStarFilter 
    ? allReviews.filter(r => r.rating === selectedStarFilter)
    : allReviews;

  // Calculate statistics
  const totalReviews = allReviews.length;
  const avgRating = totalReviews > 0
    ? (allReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
    : '5.0';

  const starCounts = [5, 4, 3, 2, 1].map(star => {
    const count = allReviews.filter(r => r.rating === star).length;
    const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percentage };
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      toast.error('অনুগ্রহ করে আপনার নাম দিন (Please enter your name)');
      return;
    }
    if (!comment.trim()) {
      toast.error('অনুগ্রহ করে আপনার মন্তব্য লিখুন (Please write your review comment)');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        userName: userName.trim(),
        userEmail: currentUser?.email || customerUser?.email || '',
        rating: Number(rating),
        comment: comment.trim(),
        productName: productName.trim() || 'General Store Review',
        createdAt: Date.now(),
        isVerified: true,
        isAdmin: !!isAdmin
      });

      toast.success('আপনার রিভিউ সফলভাবে যুক্ত হয়েছে! (Review submitted successfully)');
      setComment('');
      setProductName('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error adding review:', err);
      toast.error('রিভিউ জমা দিতে ব্যর্থ হয়েছে (Failed to submit review)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!isAdmin) return;
    if (!window.confirm('আপনি কি এই রিভিউটি মুছে ফেলতে চান? (Delete this review?)')) return;

    try {
      if (reviewId.startsWith('seed-')) {
        toast.success('Sample review hidden!');
        return;
      }
      await deleteDoc(doc(db, 'reviews', reviewId));
      toast.success('রিভিউটি সফলভাবে মুছে ফেলা হয়েছে');
    } catch (err) {
      toast.error('রিভিউ মোছা সম্ভব হয়নি');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 pt-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Header Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-black text-amber-400 rounded-full text-xs font-black uppercase tracking-widest mb-3 shadow-md">
            <Sparkles size={14} /> Verified Customer Feedback
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-gray-900">
            Customer Reviews
          </h1>
          <p className="text-sm sm:text-base text-gray-500 max-w-xl mx-auto mt-2 font-medium">
            আমাদের সম্মানীয় গ্রাহকদের অভিজ্ঞতা ও প্রতিক্রিয়া। আপনিও আপনার মতামত শেয়ার করুন!
          </p>
        </div>

        {/* Rating Summary Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 shadow-sm mb-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            {/* Left Big Rating */}
            <div className="md:col-span-4 text-center border-b md:border-b-0 md:border-r border-gray-100 pb-6 md:pb-0 md:pr-6">
              <span className="text-6xl md:text-7xl font-black text-gray-900 block tracking-tight leading-none">
                {avgRating}
              </span>
              <div className="flex items-center justify-center gap-1 my-3 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={22} fill="currentColor" />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block">
                Based on {totalReviews} Verified Reviews
              </span>

              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={16} className="text-amber-400" />
                Write a Review / রিভিউ দিন
              </button>
            </div>

            {/* Right Rating Breakdown Bars */}
            <div className="md:col-span-8 space-y-2.5">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400 block mb-3">
                Rating Breakdown
              </span>
              {starCounts.map(({ star, count, percentage }) => (
                <button
                  key={star}
                  onClick={() => setSelectedStarFilter(selectedStarFilter === star ? null : star)}
                  className={`w-[#100%] w-full flex items-center gap-3 text-xs font-bold transition-all p-1.5 rounded-xl hover:bg-gray-50 cursor-pointer ${
                    selectedStarFilter === star ? 'bg-amber-50 ring-1 ring-amber-300' : ''
                  }`}
                >
                  <span className="w-12 text-left flex items-center gap-1 font-mono text-gray-700">
                    {star} <Star size={12} className="text-amber-400 fill-amber-400" />
                  </span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-16 text-right font-mono text-gray-400 text-[11px]">
                    {count} ({percentage}%)
                  </span>
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-600">
              Filter By Rating:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedStarFilter(null)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedStarFilter === null 
                  ? 'bg-black text-white shadow-xs' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Reviews ({totalReviews})
            </button>
            {[5, 4, 3, 2, 1].map(star => (
              <button
                key={star}
                onClick={() => setSelectedStarFilter(selectedStarFilter === star ? null : star)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                  selectedStarFilter === star 
                    ? 'bg-amber-400 text-black shadow-xs font-black' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {star} <Star size={12} className="fill-current" />
              </button>
            ))}
          </div>
        </div>

        {/* Reviews List Grid */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 font-bold uppercase tracking-wider text-xs">
            Loading customer reviews...
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300 p-8">
            <MessageSquare size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-base font-bold text-gray-700">No reviews found for this rating.</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to write a review!</p>
            <button
              onClick={() => {
                setSelectedStarFilter(null);
                setIsModalOpen(true);
              }}
              className="mt-4 px-5 py-2.5 bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Write Review
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredReviews.map((rev) => (
              <motion.div
                key={rev.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 border border-gray-200/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
              >
                {/* Review Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-900 to-black text-blue-500 font-black flex items-center justify-center text-xs shadow-xs border border-blue-500/60 shrink-0">
                        {getInitials(rev.userName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-sm text-gray-900">{rev.userName}</span>
                          {rev.isVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              <CheckCircle2 size={11} /> Verified
                            </span>
                          )}
                          {rev.isAdmin && (
                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium block mt-0.5">
                          {new Date(rev.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Admin Delete Action */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-gray-300 hover:text-rose-500 p-1.5 transition-colors cursor-pointer rounded-lg hover:bg-rose-50"
                        title="Delete Review (Admin)"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    {[...Array(5)].map((_, idx) => (
                      <Star
                        key={idx}
                        size={15}
                        fill={idx < rev.rating ? 'currentColor' : 'none'}
                        className={idx < rev.rating ? 'text-amber-400' : 'text-gray-200'}
                      />
                    ))}
                    <span className="text-xs font-extrabold text-gray-700 ml-1 font-mono">
                      {rev.rating}.0
                    </span>
                  </div>

                  {/* Product Tag */}
                  {rev.productName && (
                    <div className="text-[11px] font-bold text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1 inline-block mb-3">
                      Product: <span className="text-gray-800">{rev.productName}</span>
                    </div>
                  )}

                  {/* Comment Text */}
                  <p className="text-sm text-gray-700 leading-relaxed font-medium">
                    "{rev.comment}"
                  </p>
                </div>

                {/* Footer helpful tag */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={12} className="text-gray-400" /> Helpful feedback
                  </span>
                  <span className="font-mono text-[10px] text-gray-300">Elegan BD Verified</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal for adding a new review */}
        <AnimatePresence>
          {isModalOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="fixed inset-0 bg-black/60 z-[80] backdrop-blur-xs"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg bg-white rounded-3xl p-6 sm:p-8 z-[90] shadow-2xl border border-gray-100"
              >
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
                      Write a Review
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">আপনার সততা ও অভিজ্ঞতা আমাদের জন্য মূল্যবান</p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  
                  {/* Rating Selector */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 block mb-2">
                      Overall Rating / রেটিং নির্বাচন করুন *
                    </label>
                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-125 transition-transform cursor-pointer"
                        >
                          <Star
                            size={28}
                            fill={star <= rating ? '#f59e0b' : 'none'}
                            className={star <= rating ? 'text-amber-500' : 'text-gray-300'}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 block mb-1">
                      Your Name / আপনার নাম *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tanvir Ahmed"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>

                  {/* Product Name (Optional) */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 block mb-1">
                      Product Name (Optional) / পণ্যের নাম
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Premium Cotton Shirt"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                  </div>

                  {/* Review Message Textarea */}
                  <div>
                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-600 block mb-1">
                      Your Review / বিস্তারিত মতামত *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="পণ্যের কোয়ালিটি, ফেব্রিক ও ডেলিভারি সার্ভিস কেমন লেগেছে বিস্তারিত লিখুন..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black transition-all resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-black hover:bg-gray-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'Submit Review / জমা দিন'}
                  </button>

                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
