/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// Code 39 character mapping for numbers 0-9 and asterisk '*'
const CODE39_PATTERNS: Record<string, string> = {
  '0': '101001101101',
  '1': '110100101011',
  '2': '101100101011',
  '3': '110110010101',
  '4': '101001101011',
  '5': '110100110101',
  '6': '101100110101',
  '7': '101001011011',
  '8': '110100101101',
  '9': '101100101101',
  '*': '100101101101',
};

interface BarcodeProps {
  value: string | number;
  height?: number;
  barWidth?: number;
  showText?: boolean;
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  height = 50,
  barWidth = 1.8,
  showText = true,
  className = '',
}) => {
  const textValue = String(value).toUpperCase();
  
  // Code 39 requires surrounding the data with '*' start/stop characters
  const formattedValue = `*${textValue}*`;
  
  // Construct binary representation
  let binaryString = '';
  for (let i = 0; i < formattedValue.length; i++) {
    const char = formattedValue[i];
    const pattern = CODE39_PATTERNS[char];
    
    if (pattern) {
      binaryString += pattern;
      // Add standard Code 39 inter-character gap (narrow space '0') except after the last character
      if (i < formattedValue.length - 1) {
        binaryString += '0';
      }
    }
  }

  if (!binaryString) {
    return <div className="text-red-500 font-bold text-xs">Invalid Barcode Data</div>;
  }

  // Calculate dimensions
  const totalWidth = binaryString.length * barWidth;

  return (
    <div className={`flex flex-col items-center justify-center bg-white p-2 rounded-xl border border-slate-200/50 ${className}`}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${totalWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full"
      >
        {binaryString.split('').map((char, index) => {
          if (char === '1') {
            return (
              <rect
                key={index}
                x={index * barWidth}
                y={0}
                width={barWidth + 0.1} // overlap slightly to prevent anti-aliasing gaps
                height={height}
                fill="black"
              />
            );
          }
          return null;
        })}
      </svg>
      {showText && (
        <span className="mt-1.5 font-mono text-[11px] font-black tracking-[0.25em] text-slate-800 text-center pl-[0.25em]">
          {textValue}
        </span>
      )}
    </div>
  );
};
