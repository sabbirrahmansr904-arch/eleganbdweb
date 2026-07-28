/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// Code 39 character mapping for numbers 0-9, uppercase A-Z, space, dash, and asterisk '*'
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
  'A': '110101001011',
  'B': '101101001011',
  'C': '110110100101',
  'D': '101011001011',
  'E': '110101100101',
  'F': '101101100101',
  'G': '101010110011',
  'H': '110101011001',
  'I': '101101011001',
  'J': '101011011001',
  'K': '110101010011',
  'L': '101101010011',
  'M': '110110101001',
  'N': '101011010011',
  'O': '110101101001',
  'P': '101101101001',
  'Q': '101010110011',
  'R': '110101011001',
  'S': '101101011001',
  'T': '101011011001',
  'U': '110010101011',
  'V': '100110101011',
  'W': '110011010101',
  'X': '100101101011',
  'Y': '110010110101',
  'Z': '100110110101',
  '-': '100101011011',
  ' ': '100110101101',
  '*': '100101101101',
};

interface BarcodeProps {
  value: string | number;
  height?: number;
  barWidth?: number;
  showText?: boolean;
  align?: 'left' | 'center';
  className?: string;
}

export const Barcode: React.FC<BarcodeProps> = ({
  value,
  height = 50,
  barWidth = 1.8,
  showText = true,
  align = 'left',
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
  const isLeft = align === 'left';
  const widthToUse = Math.min(totalWidth, 240);

  return (
    <div className={`flex flex-col ${isLeft ? 'items-start justify-start' : 'items-center justify-center'} bg-white p-1 rounded-lg ${className}`}>
      <div className="flex flex-col items-center justify-center" style={{ width: widthToUse }}>
        <svg
          style={{ width: widthToUse, height }}
          viewBox={`0 0 ${totalWidth} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="max-w-full block"
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
          <span className="w-full mt-1 font-mono text-[11px] font-bold tracking-[0.2em] text-black text-center pl-[0.2em]">
            {textValue}
          </span>
        )}
      </div>
    </div>
  );
};
