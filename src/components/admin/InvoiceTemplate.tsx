import React from 'react';
import { Order } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';

interface InvoiceProps {
  order: Order;
  preview?: boolean;
}

export default function InvoiceTemplate({ order, preview = false }: InvoiceProps) {
  const { currency, rate } = useCurrency();
  
  const subTotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Format order ID for ON field
  const orderNumber = order.id.slice(-6).toUpperCase();
  const onCode = order.id.slice(-3).toUpperCase();

  const formatDate = (dateInput: any) => {
    try {
      if (!dateInput) return '';
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
    } catch (e) {
      return '';
    }
  };

  return (
    <div 
      id="invoice-to-print" 
      className={`bg-white text-gray-900 mx-auto p-8 select-none text-[11px] leading-relaxed ${
        preview 
          ? "w-[148mm] min-h-[210mm] shadow-2xl border border-gray-200 rounded-2xl relative block scale-[0.95] md:scale-100 origin-top" 
          : "hidden print:block w-[148mm] min-h-[210mm]"
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Dynamic Style Injection for premium typography and print options */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

        #invoice-to-print {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .font-serif-luxury {
          font-family: 'Cormorant Garamond', serif !important;
        }

        .font-mono-numbers {
          font-family: 'JetBrains Mono', monospace !important;
        }

        @media print {
          @page {
            size: A5 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            background: white !important;
          }
          body {
            visibility: hidden !important;
          }
          /* Show only our portal container */
          #invoice-to-print {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 148mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 12mm 10mm 10mm 10mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          /* Ensure all nested elements are visible */
          #invoice-to-print * {
            visibility: visible !important;
          }
        }
      ` }} />

      {/* Top Border Accent */}
      <div className="h-1 bg-gray-900 w-full mb-5 rounded-full" />

      {/* Header section */}
      <div className="flex justify-between items-start mb-4">
        <div className="text-left flex-1">
          <h1 className="text-3xl font-black tracking-[0.18em] text-gray-900 uppercase leading-none">INVOICE</h1>
          <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mt-1.5 font-mono-numbers">#EB-{orderNumber}</p>
          <div className="mt-3 text-gray-500 font-medium text-[9.5px] leading-relaxed max-w-xs">
            <p>202/2, Ahmmed Nagar, PaikPara, Senpara</p>
            <p>Parbata, Madrasha Road, Mirpur-1, Dhaka</p>
          </div>
        </div>
        
        <div className="text-right flex-1">
          <h2 className="text-3xl font-serif-luxury font-bold italic tracking-tight text-gray-900 leading-none">Elegan BD</h2>
          <div className="text-[9.5px] font-serif-luxury italic font-semibold text-gray-500 leading-snug mt-1.5">
            <p>Fashion in everyday life makes</p>
            <p>you stylish</p>
          </div>
        </div>
      </div>
      
      {/* Hotline & Social Section */}
      <div className="mt-4 mb-5">
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 flex justify-between items-center">
          <span className="font-extrabold text-[9.5px] text-gray-700 tracking-wider uppercase">Hotline: <span className="font-mono-numbers text-indigo-600 ml-1">01631496122</span></span>
          <span className="font-extrabold text-[9px] text-gray-400 tracking-widest uppercase">EleganBD.com</span>
        </div>
      </div>
      
      {/* Bill To & Metadata Section */}
      <div className="grid grid-cols-12 gap-4 mb-5 items-start">
        {/* Bill To Column */}
        <div className="col-span-7 text-left pr-2">
          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 block mb-2">Recipient / Bill To</span>
          <div className="space-y-1 bg-gray-50/50 rounded-2xl p-4 border border-gray-100/70">
            <p className="text-sm font-black text-gray-900 tracking-tight">{order.customerName}</p>
            <p className="text-xs font-bold text-indigo-600 font-mono-numbers tracking-tight mt-0.5">{order.phone}</p>
            <div className="text-[10px] font-medium leading-relaxed text-gray-500 mt-1 line-clamp-2">
              {order.address}, {order.city}
            </div>
          </div>
        </div>
        
        {/* Metadata Column */}
        <div className="col-span-5 flex flex-col justify-between h-full min-h-[95px] pl-2">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-extrabold uppercase tracking-widest text-gray-400 text-[8.5px]">Date</span>
              <span className="font-bold text-gray-800 font-mono-numbers">{formatDate(order.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-extrabold uppercase tracking-widest text-gray-400 text-[8.5px]">Invoice#</span>
              <span className="font-extrabold text-gray-800 font-mono-numbers">{orderNumber}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-extrabold uppercase tracking-widest text-gray-400 text-[8.5px]">Online Code</span>
              <span className="font-extrabold text-indigo-600 font-mono-numbers">{onCode}</span>
            </div>
          </div>
          
          {/* Barcode representation */}
          <div className="mt-auto pt-2">
            <div className="flex justify-end gap-[1.5px] h-7 overflow-hidden items-end">
              {[2, 3, 1, 4, 2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 2, 4, 1, 3].map((w, i) => (
                <div key={i} className="h-full bg-gray-900" style={{ width: `${w}px` }} />
              ))}
            </div>
            <span className="text-[7.5px] font-mono-numbers tracking-[0.4em] text-gray-400 uppercase block text-right mt-1 mr-[-0.4em]">
              *EB-{orderNumber}*
            </span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden mb-5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="p-2.5 uppercase font-black text-left pl-4 text-[9px] text-gray-400 tracking-wider w-1/2">Item Description</th>
              <th className="p-2.5 uppercase font-black text-center text-[9px] text-gray-400 tracking-wider w-16">Size</th>
              <th className="p-2.5 uppercase font-black text-center text-[9px] text-gray-400 tracking-wider w-16">Qty</th>
              <th className="p-2.5 uppercase font-black text-right pr-4 text-[9px] text-gray-400 tracking-wider w-24">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item, index) => (
              <tr key={index} className="h-9">
                <td className="p-2.5 pl-4 font-bold text-[10.5px] text-left uppercase tracking-tight text-gray-800">
                  {item.name}
                </td>
                <td className="p-2.5 text-center font-extrabold text-[10.5px] text-gray-600">
                  <span className="inline-block px-1.5 py-0.5 rounded-md border border-gray-150 bg-gray-50 text-[9px]">
                    {item.selectedSize || '-'}
                  </span>
                </td>
                <td className="p-2.5 text-center font-bold text-[10.5px] text-gray-500 font-mono-numbers">
                  {item.quantity}
                </td>
                <td className="p-2.5 text-right pr-4 font-bold text-[10.5px] text-gray-800 font-mono-numbers">
                  {formatPrice(item.price * item.quantity, currency, rate)}
                </td>
              </tr>
            ))}
            
            {/* Filler rows to ensure minimum table height */}
            {[...Array(Math.max(0, 4 - order.items.length))].map((_, i) => (
              <tr key={`filler-${i}`} className="h-9 bg-white">
                <td className="p-2.5" />
                <td className="p-2.5" />
                <td className="p-2.5" />
                <td className="p-2.5" />
              </tr>
            ))}

            {/* Calculations and Totals */}
            <tr className="border-t border-gray-200 bg-gray-50/40">
              <td colSpan={3} className="p-2 text-right font-extrabold text-[9px] uppercase tracking-wider text-gray-400">Sub Total</td>
              <td className="p-2 text-right pr-4 font-bold text-[10px] text-gray-700 font-mono-numbers">{formatPrice(subTotal, currency, rate)}</td>
            </tr>
            <tr className="bg-gray-50/40">
              <td colSpan={3} className="p-2 text-right font-extrabold text-[9px] uppercase tracking-wider text-gray-400">Delivery Charge</td>
              <td className="p-2 text-right pr-4 font-bold text-[10px] text-gray-700 font-mono-numbers">+{formatPrice(order.deliveryCharge || 0, currency, rate)}</td>
            </tr>
            {order.advancePayment ? (
              <tr className="bg-gray-50/40">
                <td colSpan={3} className="p-2 text-right font-extrabold text-[9px] uppercase tracking-wider text-emerald-600">Advance Payment</td>
                <td className="p-2 text-right pr-4 font-bold text-[10px] text-emerald-600 font-mono-numbers">-{formatPrice(order.advancePayment || 0, currency, rate)}</td>
              </tr>
            ) : null}
            {order.discount ? (
              <tr className="bg-gray-50/40">
                <td colSpan={3} className="p-2 text-right font-extrabold text-[9px] uppercase tracking-wider text-rose-500">Discount</td>
                <td className="p-2 text-right pr-4 font-bold text-[10px] text-rose-500 font-mono-numbers">-{formatPrice(order.discount || 0, currency, rate)}</td>
              </tr>
            ) : null}
            <tr className="border-t border-gray-200 bg-gray-900 text-white font-black h-10">
              <td colSpan={3} className="p-2.5 text-right text-[10px] uppercase tracking-widest pl-4">TOTAL COLLECTABLE</td>
              <td className="p-2.5 text-right pr-4 text-[12px] font-mono-numbers font-black tracking-tight text-white">
                {formatPrice(order.total, currency, rate)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Note, Invoice By, & Authorized Signature section */}
      <div className="grid grid-cols-12 gap-4 text-left items-end">
        {/* Notes & Staff column */}
        <div className="col-span-7 space-y-3.5">
          <div>
            <span className="text-[8.5px] font-black uppercase tracking-[0.15em] text-gray-400 block mb-1">Invoice Issued By</span>
            <p className="font-extrabold text-[10px] text-indigo-600 uppercase tracking-wider">
              {order.invoiceBy || 'Sabbir'}
            </p>
          </div>
          
          <div>
            <span className="text-[8.5px] font-black uppercase tracking-[0.15em] text-gray-400 block mb-1">Staff Notes</span>
            <div className="border border-gray-150 rounded-xl p-3 bg-gray-50/30 text-[9.5px] font-medium text-gray-600 italic leading-normal min-h-[36px]">
              {order.notes || "No standard notes attached to this record."}
            </div>
          </div>
        </div>

        {/* Signature Line column */}
        <div className="col-span-5 text-right pb-1">
          <div className="w-36 ml-auto mr-1 space-y-1.5">
            {/* Elegant tiny line representation */}
            <div className="border-b border-gray-300 w-full pt-12" />
            <span className="text-[8.5px] font-black uppercase tracking-[0.15em] text-gray-400 block text-center">
              Authorized Sign
            </span>
          </div>
        </div>
      </div>

      {/* Return policy footer matching screenshot */}
      <div className="text-center mt-7 pt-4 border-t border-dashed border-gray-200 space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50/40 border border-indigo-100/40 rounded-full">
          <span className="font-black text-[8.5px] text-indigo-600 uppercase tracking-[0.15em]">3 Days Exchange & Return Available</span>
        </div>
        <p className="text-xs font-serif-luxury italic font-bold text-gray-500 mt-1">Thanks For Choosing Elegan BD</p>
      </div>
    </div>
  );
}
