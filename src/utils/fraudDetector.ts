import { Order } from '../types';

export interface CustomerTrustAnalysis {
  score: number; // 0 to 100
  level: 'trusted' | 'verified' | 'new' | 'warning' | 'high_risk';
  title: string;
  badgeColor: string;
  reasons: string[];
  successfulDeliveries: number;
  returnsOrCancels: number;
  totalOrdersCount: number;
}

export function analyzeCustomerTrust(order: Order, allOrders: Order[]): CustomerTrustAnalysis {
  const phone = (order.phone || '').replace(/[^0-9]/g, '');
  const name = (order.customerName || '').toLowerCase().trim();
  const address = (order.address || '').toLowerCase().trim();

  // Find all orders by this customer phone
  const customerOrders = phone.length >= 10
    ? allOrders.filter(o => (o.phone || '').replace(/[^0-9]/g, '').slice(-10) === phone.slice(-10))
    : [];

  const successfulDeliveries = customerOrders.filter(o =>
    ['Delivered', 'SUCCESS', 'PARTIAL DELIVERY'].includes(o.status)
  ).length;

  const returnsOrCancels = customerOrders.filter(o =>
    ['Cancelled', 'Returned', 'PICK UP CANCEL'].includes(o.status) && o.id !== order.id
  ).length;

  const reasons: string[] = [];
  let score = 70; // baseline for new customer

  // 1. Phone number validation (BD format 013, 014, 015, 016, 017, 018, 019)
  const isValidBdPhone = /^(01[3-9]\d{8})$/.test(phone);
  if (!isValidBdPhone) {
    score -= 30;
    reasons.push('অস্বাভাবিক ফোন নম্বর ফরম্যাট');
  } else {
    reasons.push('সঠিক ১১ ডিজিটের ফোন নম্বর');
  }

  // 2. Suspicious test names
  const testKeywords = ['test', 'asdf', 'fake', 'check', '123', 'demo', 'abcd', 'xyz'];
  if (testKeywords.some(k => name === k || name.includes('test order'))) {
    score -= 40;
    reasons.push('সন্দেহজনক টেস্ট নাম/অর্ডার');
  }

  // 3. Address completeness
  if (address.length < 6 || address === 'dhaka' || address === 'bangladesh' || address === 'na') {
    score -= 20;
    reasons.push('খুব ছোট বা অসম্পূর্ণ ঠিকানা');
  } else {
    score += 5;
  }

  // 4. Past delivery history
  if (successfulDeliveries > 0) {
    score += Math.min(successfulDeliveries * 15, 30);
    reasons.push(`পূর্বে ${successfulDeliveries}টি পার্সেল সফলভাবে গ্রহণ করেছেন`);
  }

  // 5. Past returns/cancellations
  if (returnsOrCancels > 0) {
    score -= returnsOrCancels * 25;
    reasons.push(`পূর্বে ${returnsOrCancels}টি অর্ডার বাতিল/রিটার্ন হয়েছিল`);
  }

  // Bound score 0 - 100
  score = Math.max(5, Math.min(100, score));

  let level: CustomerTrustAnalysis['level'] = 'new';
  let title = 'নতুন কাস্টমার (New)';
  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';

  if (successfulDeliveries >= 2 && returnsOrCancels === 0) {
    level = 'trusted';
    title = 'বিশ্বস্ত রেগুলার কাস্টমার (VIP)';
    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  } else if (successfulDeliveries >= 1 && returnsOrCancels === 0) {
    level = 'verified';
    title = 'ভেরিফাইড কাস্টমার (Verified)';
    badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
  } else if (score < 40 || returnsOrCancels >= 2) {
    level = 'high_risk';
    title = 'উচ্চ ঝুঁকি / ফেক অর্ডারের সম্ভাবনা (High Risk)';
    badgeColor = 'bg-rose-50 text-rose-800 border-rose-300';
  } else if (score < 60 || returnsOrCancels === 1) {
    level = 'warning';
    title = 'সতর্কতা / ভেরিফাই করে পাঠান (Warning)';
    badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
  }

  return {
    score,
    level,
    title,
    badgeColor,
    reasons,
    successfulDeliveries,
    returnsOrCancels,
    totalOrdersCount: customerOrders.length
  };
}
