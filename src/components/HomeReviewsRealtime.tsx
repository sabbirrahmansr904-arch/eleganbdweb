import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Star, 
  CheckCircle2, 
  MessageSquarePlus, 
  X, 
  Sparkles, 
  ArrowRight,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export interface HomeReviewItem {
  id: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  productName?: string;
  images?: string[];
  createdAt: number;
  isVerified?: boolean;
  isAdmin?: boolean;
}

function formatTimeAgo(timestamp: number) {
  if (!timestamp) return 'Recent';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 2) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeReviewsRealtime() {
  const [firestoreReviews, setFirestoreReviews] = useState<HomeReviewItem[]>([]);
  const [localReviews, setLocalReviews] = useState<HomeReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | '5' | '4' | 'photos'>('all');

  // Lightbox modal for customer photos
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Load custom local reviews
  useEffect(() => {
    try {
      const cached = localStorage.getItem('eleganbd_custom_reviews');
      if (cached) {
        setLocalReviews(JSON.parse(cached));
      }
    } catch (e) {
      console.error('Error loading local custom reviews:', e);
    }
  }, []);

  // Real-time Firestore sync - ONLY actual live database reviews
  useEffect(() => {
    try {
      const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items: HomeReviewItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            userName: data.userName || data.name || 'সম্মানিত ক্রেতা',
            userEmail: data.userEmail || '',
            rating: Number(data.rating) || 5,
            comment: data.comment || data.text || '',
            productName: data.productName || data.product || 'All Collections',
            images: Array.isArray(data.images) ? data.images : (data.photo ? [data.photo] : []),
            createdAt: data.createdAt || Date.now(),
            isVerified: data.isVerified ?? true,
            isAdmin: data.isAdmin ?? false,
          });
        });
        setFirestoreReviews(items);
        setLoading(false);
      }, (err) => {
        console.warn('Realtime reviews error:', err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch {
      setLoading(false);
    }
  }, []);

  // Combine local reviews and Firestore reviews
  const combinedMap = new Map<string, HomeReviewItem>();
  firestoreReviews.forEach(r => combinedMap.set(r.id, r));
  localReviews.forEach(r => combinedMap.set(r.id, r));

  const allReviews = Array.from(combinedMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    if (selectedFilter === '5') return allReviews.filter(r => r.rating === 5);
    if (selectedFilter === '4') return allReviews.filter(r => r.rating === 4);
    if (selectedFilter === 'photos') return allReviews.filter(r => r.images && r.images.length > 0);
    return allReviews;
  }, [allReviews, selectedFilter]);

  // Average Rating
  const totalReviewsCount = allReviews.length;
  const avgRating = totalReviewsCount > 0
    ? (allReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalReviewsCount).toFixed(1)
    : '5.0';

  return (
    <section className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 lg:px-8 pb-16">
      <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
        {/* Decorative subtle background accents */}
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-blue-50/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-amber-50/50 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Customer Reviews & Feedback</span>
              <Sparkles size={22} className="text-amber-500 fill-amber-500" />
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 font-medium max-w-xl">
              Real-time authentic feedback and experiences from verified Elegan BD customers.
            </p>
          </div>

          {/* Right Action: Write Review Button (Navigates to Reviews Page) & Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3.5 py-2 rounded-2xl">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-black text-gray-900">{avgRating}/5</span>
              <span className="text-[10px] text-gray-400 font-bold">({totalReviewsCount} {totalReviewsCount === 1 ? 'Review' : 'Reviews'})</span>
            </div>

            <Link
              to="/write-review"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <MessageSquarePlus size={16} />
              <span>Write a Review</span>
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-6 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 flex items-center gap-1 mr-1">
              <Filter size={12} /> Filter:
            </span>
            <button
              onClick={() => setSelectedFilter('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                selectedFilter === 'all'
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All Reviews ({firestoreReviews.length})
            </button>
            <button
              onClick={() => setSelectedFilter('5')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                selectedFilter === '5'
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <span>5 Stars</span>
              <Star size={12} className="fill-current" />
            </button>
            <button
              onClick={() => setSelectedFilter('4')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                selectedFilter === '4'
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <span>4 Stars</span>
              <Star size={12} className="fill-current" />
            </button>
            <button
              onClick={() => setSelectedFilter('photos')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer",
                selectedFilter === 'photos'
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ImageIcon size={12} />
              <span>With Photos</span>
            </button>
          </div>

          <Link
            to="/reviews"
            className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 flex items-center gap-1 tracking-wider group"
          >
            <span>View All Reviews</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Real-time Review Grid */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="w-24 h-3 bg-gray-200 rounded-md" />
                    <div className="w-16 h-2.5 bg-gray-200 rounded-md" />
                  </div>
                </div>
                <div className="w-full h-12 bg-gray-200 rounded-md" />
              </div>
            ))
          ) : filteredReviews.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
              <p className="text-sm font-bold text-gray-700">No reviews submitted yet.</p>
              <p className="text-xs text-gray-500 font-medium">Be the first customer to leave a review and inspire others!</p>
              <Link
                to="/write-review"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <MessageSquarePlus size={14} />
                <span>Write First Review</span>
              </Link>
            </div>
          ) : (
            filteredReviews.map((review) => {
              const initials = review.userName.slice(0, 2).toUpperCase() || 'CU';
              const isRecent = Date.now() - review.createdAt < 1000 * 60 * 60 * 2; // under 2 hours

              return (
                <div
                  key={review.id}
                  className="bg-gray-50/80 hover:bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 relative group"
                >
                  {/* Top: Avatar, Name, Verified Badge, Time, Rating */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-black text-xs sm:text-sm text-gray-900 truncate">
                              {review.userName}
                            </h4>
                            {review.isVerified && (
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" title="Verified Customer" />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 block truncate">
                            {formatTimeAgo(review.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Star Rating Badge */}
                      <div className="flex flex-col items-end shrink-0">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              className={cn(i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200")}
                            />
                          ))}
                        </div>
                        {isRecent && (
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Name Tag */}
                    {review.productName && (
                      <div className="inline-block bg-white border border-gray-200/80 px-2 py-0.5 rounded-md text-[10px] font-bold text-gray-600 truncate max-w-full">
                        📦 {review.productName}
                      </div>
                    )}

                    {/* Review Text */}
                    <p className="text-xs sm:text-[13px] text-gray-700 font-medium leading-relaxed italic">
                      "{review.comment}"
                    </p>
                  </div>

                  {/* Customer Uploaded Photos */}
                  {review.images && review.images.length > 0 && (
                    <div className="pt-1 flex items-center gap-2 overflow-x-auto pb-1">
                      {review.images.map((img, imgIdx) => (
                        <button
                          key={imgIdx}
                          type="button"
                          onClick={() => setPreviewImage(img)}
                          className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 shrink-0 hover:scale-105 transition-transform cursor-pointer"
                        >
                          <img
                            src={img}
                            alt="Customer review photo"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </button>
                      ))}
                      <span className="text-[10px] text-gray-400 font-bold pl-1">
                        ({review.images.length} {review.images.length === 1 ? 'photo' : 'photos'})
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Bar */}
        <div className="relative z-10 mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-gray-500 font-medium">
            💡 Purchased from Elegan BD? Share your honest experience to help other shoppers.
          </p>

          <div className="flex items-center gap-3">
            <Link
              to="/write-review"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              ✍️ Share Feedback
            </Link>
            <Link
              to="/reviews"
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-xs font-bold transition-all"
            >
              All Reviews Page →
            </Link>
          </div>
        </div>
      </div>

      {/* PHOTO PREVIEW LIGHTBOX */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in"
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Full preview"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </section>
  );
}
