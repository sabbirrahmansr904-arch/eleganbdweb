/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ruler } from 'lucide-react';

export default function SizeGuide() {
  const navigate = useNavigate();

  return (
    <div className="pt-32 pb-24 px-6 md:px-12 max-w-5xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-xs uppercase tracking-widest mb-12 hover:text-brand-gold transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Go Back</span>
      </button>

      <div className="text-center mb-16">
        <Ruler size={48} className="mx-auto text-brand-gold mb-6" strokeWidth={1} />
        <h1 className="text-5xl font-serif mb-6">Size Guide</h1>
      </div>

      <div className="bg-white border border-brand-ink/5 p-4 md:p-12 shadow-2xl overflow-hidden mb-16">
        <div className="text-center mb-8">
            <h2 className="text-2xl font-serif mb-4">Formal Pant Size Guide</h2>
            <div className="mx-auto w-full max-w-sm">
                <table className="w-full text-left uppercase text-xs tracking-widest font-bold">
                    <thead>
                        <tr className="border-b border-brand-ink/10">
                            <th className="pb-4">Size</th>
                            <th className="pb-4">Waist (Inch)</th>
                            <th className="pb-4">Length (Inch)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr><td className="py-3">30</td><td className="py-3">30</td><td className="py-3">40</td></tr>
                        <tr><td className="py-3">32</td><td className="py-3">32</td><td className="py-3">40</td></tr>
                        <tr><td className="py-3">34</td><td className="py-3">34</td><td className="py-3">41</td></tr>
                        <tr><td className="py-3">36</td><td className="py-3">36</td><td className="py-3">41</td></tr>
                        <tr><td className="py-3">38</td><td className="py-3">38</td><td className="py-3">41</td></tr>
                        <tr><td className="py-3">40</td><td className="py-3">40</td><td className="py-3">41</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}
