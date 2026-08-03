
import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../lib/utils';

interface Review {
  id: string;
  rating: number;
  comment: string;
  author: string;
  date: string;
}

interface ReviewsProps {
  productId: string;
}

export const Reviews: React.FC<ReviewsProps> = ({ productId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [author, setAuthor] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(`reviews_${productId}`);
    if (saved) {
      setReviews(JSON.parse(saved));
    }
  }, [productId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !author.trim()) return;

    const newReview: Review = {
      id: Date.now().toString(),
      rating,
      comment,
      author,
      date: new Date().toLocaleDateString(),
    };

    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);
    localStorage.setItem(`reviews_${productId}`, JSON.stringify(updatedReviews));
    setComment('');
    setAuthor('');
    setRating(5);
  };

  return (
    <div className="mt-16 pt-16 border-t border-brand-ink/10">
      <h3 className="text-2xl font-serif mb-8">Customer Reviews</h3>
      
      <form onSubmit={handleSubmit} className="mb-12 p-6 bg-brand-muted/30 rounded-lg">
        <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Leave a Review</h4>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={20}
              className={cn("cursor-pointer", star <= rating ? "fill-brand-gold text-brand-gold" : "text-gray-300")}
              onClick={() => setRating(star)}
            />
          ))}
        </div>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Your Name"
          className="w-full mb-4 p-3 border border-brand-ink/10 bg-white text-xs outline-none focus:border-brand-gold"
          required
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Your Review"
          className="w-full mb-4 p-3 border border-brand-ink/10 bg-white text-xs outline-none focus:border-brand-gold h-24"
          required
        />
        <button type="submit" className="bg-brand-ink text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-brand-gold transition-colors">
          Submit Review
        </button>
      </form>

      <div className="space-y-6">
        {reviews.length === 0 && <p className="text-gray-400 italic">No reviews yet. Be the first to review!</p>}
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-brand-ink/5 pb-6">
            <div className="flex justify-between mb-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={14} className={cn(star <= review.rating ? "fill-brand-gold text-brand-gold" : "text-gray-300")} />
                ))}
              </div>
              <span className="text-xs text-gray-400">{review.date}</span>
            </div>
            <p className="text-sm font-bold mb-1">{review.author}</p>
            <p className="text-sm text-brand-ink/80">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
