import React from 'react';
import { Order } from '../../types';
import { formatPrice } from '../../lib/utils';
import { useCurrency } from '../../contexts/CurrencyContext';
import { Barcode } from '../Barcode';

interface InvoiceProps {
  order: Order;
  preview?: boolean;
}

export default function InvoiceTemplate({ order, preview = false }: InvoiceProps) {
  const { currency, rate } = useCurrency();
  
  const subTotal = order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  
  // Format order/invoice ID
  const rawInvoiceNo = (order.invoiceNo && Number(order.invoiceNo) >= 2670000)
    ? String(order.invoiceNo)
    : (order.id && /^\d{6,}$/.test(order.id)
      ? order.id
      : String(order.invoiceNo || order.id || '2670000'));

  const formatDate = (dateInput: any) => {
    try {
      if (!dateInput) return '';
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div 
      id="invoice-to-print" 
      className={`bg-white text-black mx-auto select-none text-[11px] leading-relaxed box-border ${
        preview 
          ? "w-[148mm] min-h-[210mm] p-6 shadow-2xl border border-gray-200 rounded-2xl relative block scale-[0.95] md:scale-100 origin-top overflow-hidden" 
          : "hidden print:block w-[148mm] min-h-[210mm] overflow-hidden p-6"
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Dynamic Style Injection for print layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600;1,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700;800&display=swap');

        #invoice-to-print {
          font-family: 'Plus Jakarta Sans', sans-serif !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
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
            background: white !important;
          }
          body {
            visibility: hidden !important;
          }
          #invoice-to-print {
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 148mm !important;
            min-height: 210mm !important;
            margin: 0 !important;
            padding: 8mm 8mm 6mm 8mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
          }
          #invoice-to-print * {
            visibility: visible !important;
          }
        }
      ` }} />

      {/* Top Header Section */}
      <div className="flex justify-between items-start mb-2">
        {/* Left: Brand Name, Subtitle, Location, Phone, Barcode */}
        <div className="text-left flex-1">
          <h1 className="text-3xl font-black tracking-tight text-black uppercase leading-none">
            Elegan BD
          </h1>
          <p className="text-[9.5px] font-bold tracking-wider text-black uppercase mt-1">
            Fashion in everyday life make you stylist
          </p>
          <div className="mt-1 text-[9.5px] font-medium text-gray-600 leading-tight">
            <span>Mirpur-1, Dhaka, Bangladesh</span>
            <span className="mx-1">|</span>
            <span className="font-mono-numbers">01327772213</span>
          </div>

          {/* Barcode encoding the invoice number, aligned left under location */}
          <div className="mt-2 text-left">
            <Barcode 
              value={rawInvoiceNo} 
              height={36} 
              barWidth={1.3} 
              showText={true}
              align="left"
              className="!border-none !p-0 !bg-transparent"
            />
          </div>
        </div>
        
        {/* Right: Big Invoice Number & Date */}
        <div className="text-right">
          <p className="text-2xl font-black text-black tracking-tight font-mono-numbers">
            {rawInvoiceNo}
          </p>
          <p className="text-xs font-bold text-gray-500 mt-0.5 font-mono-numbers">
            {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Thick Divider Line */}
      <div className="w-full h-[2.5px] bg-black my-3.5" />

      {/* Customer Summary & Order Details */}
      <div className="grid grid-cols-2 gap-4 mb-4 items-start">
        {/* Left Column: Customer Summary */}
        <div className="text-left">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            CUSTOMER SUMMARY
          </span>
          <p className="text-sm font-black text-black leading-snug">{order.customerName}</p>
          <p className="text-xs font-semibold text-gray-800 font-mono-numbers mt-0.5">{order.phone}</p>
          <p className="text-[11px] font-medium text-gray-500 mt-0.5 leading-snug">
            {order.address}{order.thana ? `, ${order.thana}` : ''}{order.city ? `, ${order.city}` : ''}
          </p>
        </div>

        {/* Right Column: Order Details */}
        <div className="text-right">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            ORDER DETAILS
          </span>
          <p className="text-xs font-bold text-black font-mono-numbers">
            Ref: <span className="font-extrabold">{rawInvoiceNo}</span>
          </p>
          <p className="text-[11px] font-medium text-gray-600 mt-0.5">
            Partner: {order.courier || 'N/A'}
          </p>
          <p className="text-[11px] font-medium text-gray-600 italic mt-0.5">
            By: {order.invoiceBy || 'Abrar Shaekh'}
          </p>
        </div>
      </div>

      {/* Table Section */}
      <div className="border-t border-b border-black py-2 mb-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-[9px] font-extrabold text-gray-900 uppercase tracking-wider">
              <th className="pb-2 text-left">DESCRIPTION</th>
              <th className="pb-2 text-center w-14">QTY</th>
              <th className="pb-2 text-right w-24">PRICE</th>
              <th className="pb-2 text-right w-24">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item, index) => (
              <tr key={index} className="align-top">
                <td className="py-2.5 pr-2 text-left">
                  <p className="font-bold text-xs text-black leading-snug">{item.name}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">
                    Size: {item.selectedSize || 'Free'} | SKU: {item.sku || (item as any).code || '-'}
                  </p>
                </td>
                <td className="py-2.5 text-center font-bold text-xs text-black font-mono-numbers">
                  {item.quantity}
                </td>
                <td className="py-2.5 text-right font-semibold text-xs text-gray-600 font-mono-numbers">
                  {formatPrice(item.price, currency, rate)}
                </td>
                <td className="py-2.5 text-right font-bold text-xs text-black font-mono-numbers">
                  {formatPrice(item.price * item.quantity, currency, rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Calculations / Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1.5 text-xs">
          <div className="flex justify-between text-gray-600 font-medium">
            <span>Subtotal</span>
            <span className="font-mono-numbers text-gray-800">{formatPrice(subTotal, currency, rate)}</span>
          </div>
          <div className="flex justify-between text-gray-600 font-medium">
            <span>Delivery Charge (+)</span>
            <span className="font-mono-numbers text-gray-800">+{formatPrice(order.deliveryCharge || 0, currency, rate)}</span>
          </div>
          {order.discount ? (
            <div className="flex justify-between text-rose-600 font-bold">
              <span>Discount (-)</span>
              <span className="font-mono-numbers">-{formatPrice(order.discount, currency, rate)}</span>
            </div>
          ) : null}
          {order.advancePayment ? (
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Advance Payment (-) [{order.paymentMethod || 'bKash'}]</span>
              <span className="font-mono-numbers">-{formatPrice(order.advancePayment, currency, rate)}</span>
            </div>
          ) : null}

          <div className="border-t border-black pt-2 mt-2 flex justify-between items-baseline">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">COLLECTABLE</span>
            <span className="text-xl font-black text-black font-mono-numbers">
              {formatPrice(order.total, currency, rate)}
            </span>
          </div>
        </div>
      </div>

      {/* Elegant Footer Thank You Message */}
      <div className="mt-8 pt-4 border-t border-dashed border-gray-300 text-center space-y-0.5">
        <p className="text-sm font-bold text-gray-900 italic tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
          Thanks For Purchase
        </p>
        <p className="text-[8.5px] font-extrabold uppercase tracking-[0.25em] text-gray-400">
          Elegan BD — Fashion in everyday life make you stylist
        </p>
      </div>
    </div>
  );
}
