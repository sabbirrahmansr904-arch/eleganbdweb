import React from 'react';
import { motion } from 'framer-motion';

export default function ProductSkeleton() {
  return (
    <div className="flex gap-4 p-4 border border-white/10 rounded-xl">
      <div className="w-20 h-24 bg-white/5 rounded-lg shrink-0 animate-pulse" />
      <div className="flex flex-col justify-center gap-2 flex-1">
        <div className="w-16 h-3 bg-white/10 rounded animate-pulse" />
        <div className="w-32 h-4 bg-white/20 rounded animate-pulse" />
        <div className="w-20 h-4 bg-white/10 rounded animate-pulse" />
      </div>
    </div>
  );
}
