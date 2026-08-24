import React from 'react';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  title?: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 16, className = '', title = 'Verified Account' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      title={title}
    >
      <path
        d="M12 2L14.5 3.5L17.5 3L19 5.5L22 7L21.5 10L23 12.5L21 15L21.5 18L18.5 19.5L17 22L14 21.5L11.5 23L9 21L6.5 21.5L5 19L2 17.5L2.5 14.5L1 12L3 9.5L2.5 6.5L5.5 5L7 2L10 2.5L12 2Z"
        fill="#1D9BF0"
      />
      <path
        d="M9.5 13.5L7 11L5.5 12.5L9.5 16.5L18.5 7.5L17 6L9.5 13.5Z"
        fill="white"
      />
    </svg>
  );
};
