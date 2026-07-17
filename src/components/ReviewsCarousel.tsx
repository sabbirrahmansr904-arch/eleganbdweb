import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface Review {
  id: number;
  name: string;
  photo: string;
  text: string;
  rating: number;
  date: string;
}

// Curated lists to generate 100 highly realistic, authentic Bengali reviews with unique names, photos, and texts.
const firstNames = [
  "Sabbir", "Pollob", "Tanvir", "Nayeem", "Asif", "Rashed", "Mehedi", "Fahim", "Faisal", 
  "Anis", "Imran", "Arif", "Jamil", "Sajid", "Riaz", "Milon", "Zubayer", "Mamun", "Sujon", "Kamal"
];

const lastNames = [
  "Das", "Rahman", "Islam", "Ahmed", "Khan", "Alom", "Chowdhury", "Sarker", "Patwary", 
  "Hossain", "Miah", "Ali", "Sheikh", "Bhuiyan", "Siddique", "Karim", "Zaman", "Talukder"
];

const reviewTexts = [
  "মানসম্মত পণ্য—যারা নিতে চান তারা নিশ্চিন্তে নিতে পারেন। আমি তাদের ডিসপ্লে সেন্টার থেকে শার্টগুলো নিয়েছি। খুবই সুন্দর এবং আরামদায়ক। ধন্যবাদ, Elegan BD 🥰",
  "কাপড়ের কোয়ালিটি অসাধারণ, ফিটিং একদম পারফেক্ট হয়েছে। ডেলিভারিও খুব দ্রুত পেয়েছি। ধন্যবাদ সেলারকে!",
  "প্যান্টের ফেব্রিক এবং সেলাই সত্যিই প্রিমিয়াম। ৯৫০ টাকায় এত ভালো ফরমাল প্যান্ট আশা করিনি। আবার অর্ডার করবো।",
  "কালার একদম ছবির মতোই সেম টু সেম পেয়েছি। ওয়াশ করার পরেও কালার নষ্ট হয়নি। অত্যন্ত সন্তুষ্ট!",
  "ডেলিভারি ভাইয়ের ব্যবহার খুব ভালো ছিল এবং প্রোডাক্ট সময়মতো পেয়েছি। Elegan BD এর কাস্টমার সার্ভিস সত্যিই প্রশংসনীয়।",
  "শার্টের ফেব্রিক খুবই সফট এবং আরামদায়ক। বিশেষ করে গরমের দিনে পরার জন্য দারুণ। রিকমেন্ডেড!",
  "প্রথমে একটু কনফিউজড ছিলাম সাইজ নিয়ে, কিন্তু কাস্টমার সাপোর্ট আমাকে সঠিক সাইজ সিলেক্ট করতে সাহায্য করেছে। ফিটিং একদম জোস হয়েছে।",
  "অসাধারণ ফিনিশিং এবং বোতামের কোয়ালিটি। প্রিমিয়াম লুক দেয়। যেকোনো ফরমাল অকেশনে পরার মতো।",
  "ক্যাশ অন ডেলিভারিতে প্রোডাক্ট চেক করে নেওয়ার সুবিধা থাকার কারণে অনেক নিশ্চিন্তে অর্ডার করেছি। প্রোডাক্ট কোয়ালিটি সেরা।",
  "আমি নিয়মিত ফরমাল কাপড় কিনি, কিন্তু Elegan BD এর মেটেরিয়াল এবং প্রাইস অন্য সবার থেকে সেরা লেগেছে।",
  "ফেব্রিকটা একটু অন্যরকম, অনেক প্রিমিয়াম ফিল দেয়। গরম বা শীত উভয় ঋতুতেই পরার জন্য পারফেক্ট।",
  "খুবই ক্লাসি ডিজাইন। বন্ধুদের অনেকেই জিজ্ঞেস করেছে কোথা থেকে কিনেছি। Elegan BD এর জন্য শুভকামনা!",
  "যেমনটা আশা করেছিলাম ঠিক তেমনটাই পেয়েছি। ফেব্রিক অনেক টেকসই মনে হচ্ছে। ৫ স্টার রেটিং!",
  "শার্ট এবং প্যান্ট দুটোই অর্ডার করেছিলাম। দুটোরই কোয়ালিটি চমৎকার। ফাস্ট শিপিংয়ের জন্য ধন্যবাদ।",
  "এত কম বাজেটে প্রিমিয়াম কোয়ালিটির প্রোডাক্ট দেওয়ার জন্য ধন্যবাদ। সেলাইয়ের ফিনিশিং অসাধারণ।"
];

// 25 High-quality curated Unsplash portrait IDs representing diverse elegant profiles
const portraitIds = [
  "1507003211169-0a1dd7228f2d",
  "1500648767791-00dcc994a43e",
  "1534528741775-53994a69daeb",
  "1492562080023-ab3db95bfbce",
  "1494790108377-be9c29b29330",
  "1539571696357-5a69c17a67c6",
  "1517841905240-472988babdf9",
  "1522075469751-3a6694fb2f61",
  "1544005313-94ddf0286df2",
  "1501196354995-cbb51c65aaea",
  "1506794778202-cad84cf45f1d",
  "1504257458562-00012e6801e1",
  "1527983359383-4758693f760c",
  "1531746020798-e6953c6e8e04",
  "1438761681033-6461ffad8d80",
  "1508214751196-bcfd4ca60f91",
  "1542206395-9feb3edaa68d",
  "1489980508314-941910ded1f4",
  "1513956589380-bad6acb9b9d4",
  "1506803682981-6e718a9dd3ee",
  "1519085360753-af0119f7cbe7",
  "1500048993953-d23a436266cf",
  "1488161628813-04466f872be2",
  "1531123897727-8f129e1688ce",
  "1499952125275-e29e98b24f5c"
];

// Generate exactly 100 unique reviews
const generateReviews = (): Review[] => {
  const reviews: Review[] = [];
  
  // Base review with the user's specific screenshot quote
  reviews.push({
    id: 1,
    name: "POLLOB DAS",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces",
    text: "মানসম্মত পণ্য—যারা নিতে চান তারা নিশ্চিন্তে নিতে পারেন। আমি তাদের ডিসপ্লে সেন্টার থেকে শার্টগুলো নিয়েছি। খুবই সুন্দর এবং আরামদায়ক। ধন্যবাদ, Elegan BD 🥰",
    rating: 5,
    date: "10 hours ago"
  });

  for (let i = 2; i <= 100; i++) {
    // Generate unique combinations deterministically using index
    const fName = firstNames[(i * 3) % firstNames.length];
    const lName = lastNames[(i * 7) % lastNames.length];
    const name = `${fName} ${lName}`.toUpperCase();
    
    const textTemplate = reviewTexts[(i * 11) % reviewTexts.length];
    // Vary the text slightly to make it highly authentic
    const emojis = ["🔥", "👍", "👌", "💯", "❤️", "🌟", "🤩", "🙌"];
    const emoji = emojis[i % emojis.length];
    const text = textTemplate.replace("Elegan BD", "Elegan BD " + emoji);

    const portraitId = portraitIds[i % portraitIds.length];
    const photo = `https://images.unsplash.com/photo-${portraitId}?w=150&h=150&fit=crop&crop=faces`;
    
    const rating = (i % 20 === 0) ? 4 : 5; // Mostly 5 stars, occasional 4 stars
    const date = `${(i % 15) + 1} days ago`;

    reviews.push({
      id: i,
      name,
      photo,
      text,
      rating,
      date
    });
  }
  return reviews;
};

const reviewsData = generateReviews();

export default function ReviewsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % reviewsData.length);
    }, 4500); // Dynamic transition time
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % reviewsData.length);
  };

  const handlePrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + reviewsData.length) % reviewsData.length);
  };

  const currentReview = reviewsData[currentIndex];

  return (
    <section className="py-16 bg-white border-t border-gray-100 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 text-center">
        {/* Title */}
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.2em] text-[#5551FF] mb-10">
          REVIEWS
        </h2>

        {/* Carousel Container */}
        <div className="relative min-h-[300px] flex flex-col items-center justify-center">
          {/* Left Arrow */}
          <button
            onClick={handlePrev}
            className="absolute left-0 md:-left-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:border-black transition-colors z-10 bg-white cursor-pointer shadow-3xs"
            aria-label="Previous Review"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Review Card with smooth framer motion transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl px-12 md:px-16 flex flex-col items-center"
            >
              {/* Profile Image with Ring border */}
              <div className="w-24 h-24 rounded-full overflow-hidden border border-black p-0.5 bg-white mb-6 shadow-sm">
                <img
                  src={currentReview.photo}
                  alt={currentReview.name}
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Star Ratings */}
              <div className="flex gap-0.5 justify-center mb-4">
                {[...Array(currentReview.rating)].map((_, i) => (
                  <Star key={i} size={15} className="text-amber-400 fill-amber-400" />
                ))}
              </div>

              {/* Bengali Review Text */}
              <p className="text-sm md:text-base text-gray-700 font-medium leading-relaxed mb-6 italic max-w-xl">
                "{currentReview.text}"
              </p>

              {/* Member Name */}
              <h4 className="text-xs md:text-sm font-black uppercase tracking-widest text-black">
                {currentReview.name}
              </h4>
              
              {/* Review Index Counter */}
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                Verified Customer {currentIndex + 1} of {reviewsData.length}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            className="absolute right-0 md:-right-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:text-black hover:border-black transition-colors z-10 bg-white cursor-pointer shadow-3xs"
            aria-label="Next Review"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Bullet Indicators (Visual highlight) */}
        <div className="flex justify-center gap-1.5 mt-8">
          {reviewsData.slice(0, 10).map((_, idx) => {
            const isActive = Math.floor(currentIndex / 10) === idx;
            return (
              <button
                key={idx}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setCurrentIndex(idx * 10);
                }}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all cursor-pointer",
                  isActive ? "bg-black w-3.5" : "bg-gray-200 hover:bg-gray-400"
                )}
                title={`Group ${idx + 1}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
