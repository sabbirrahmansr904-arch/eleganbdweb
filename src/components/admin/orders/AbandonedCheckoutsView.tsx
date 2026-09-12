import React, { useState, useEffect } from 'react';
import { AbandonedCheckout, Order } from '../../../types';
import { fetchAllAbandonedCheckouts, removeAbandonedCheckout, saveLocalAbandonedCheckouts } from '../../../utils/abandonedCartHelper';
import { useOrders } from '../../../contexts/OrderContext';
import { useCurrency } from '../../../contexts/CurrencyContext';
import { formatPrice } from '../../../lib/utils';
import { ShoppingBag, Phone, MessageSquare, Trash2, ArrowUpRight, CheckCircle2, Clock, User, AlertCircle, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AbandonedCheckoutsView() {
  const [list, setList] = useState<AbandonedCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const { addOrder, getNextOrderId } = useOrders();
  const { currency, rate } = useCurrency();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAbandonedCheckouts();
      setList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPotentialValue = list.filter(c => c.status === 'abandoned').reduce((acc, c) => acc + (c.total || 0), 0);
  const totalAbandonedCount = list.filter(c => c.status === 'abandoned').length;

  const handleWhatsAppRecovery = (checkout: AbandonedCheckout) => {
    const rawPhone = checkout.phone.replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.startsWith('88') ? rawPhone : `88${rawPhone}`;
    const productNames = checkout.items.map(i => `${i.name} (Size: ${i.selectedSize || 'Free'}, Qty: ${i.quantity})`).join(', ');

    const msg = `আসসালামু আলাইকুম ${checkout.customerName || 'সম্মানিত গ্রাহক'},

Elegan BD থেকে যোগাযোগ করছি। আপনি আমাদের ওয়েবসাইটে নিচের পণ্যটি অর্ডার করতে চেয়েছিলেন:
🛍️ ${productNames}
💰 সর্বমোট: ৳${checkout.total}

আপনার অর্ডারটি কি আমরা কনফার্ম করে পাঠাও কুরিয়ারে পাঠিয়ে দেব? 
আপনার সুবিধামতো জানালে আমরা দ্রুত পার্সেলটি পাঠিয়ে দেব। ধন্যবাদ!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleConvertToOrder = async (checkout: AbandonedCheckout) => {
    setConvertingId(checkout.id);
    try {
      const nextId = getNextOrderId ? await getNextOrderId() : `ORD-${Date.now().toString().slice(-6)}`;
      const newOrder: Order = {
        id: nextId,
        customerId: `cust_${checkout.phone.replace(/[^0-9]/g, '')}`,
        customerName: checkout.customerName,
        phone: checkout.phone,
        email: checkout.email || '',
        address: checkout.address || 'Not provided',
        city: checkout.city || 'Dhaka',
        thana: checkout.thana || '',
        items: checkout.items,
        deliveryCharge: checkout.deliveryCharge || 0,
        total: checkout.total,
        status: 'Pending',
        paymentMethod: 'cod',
        notes: `Recovered from Abandoned Cart. Original Lead ID: ${checkout.id}`,
        createdAt: new Date().toISOString()
      };

      await addOrder(newOrder);

      // Mark status as recovered
      const updated = list.map(c => c.id === checkout.id ? { ...c, status: 'recovered' as const } : c);
      setList(updated);
      saveLocalAbandonedCheckouts(updated);

      toast.success(`অর্ডার #${nextId} সফলভাবে তৈরি হয়েছে!`);
    } catch (err: any) {
      toast.error(`অর্ডার তৈরিতে ত্রুটি: ${err?.message || 'Error'}`);
    } finally {
      setConvertingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই রেকর্ডটি মুছে ফেলতে চান?')) return;
    await removeAbandonedCheckout(id);
    setList(prev => prev.filter(c => c.id !== id));
    toast.success('মুছে ফেলা হয়েছে');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">হারিয়ে যাওয়া অর্ডার (Abandoned)</span>
            <AlertCircle size={20} className="text-amber-200" />
          </div>
          <p className="text-3xl font-black mt-2">{totalAbandonedCount}</p>
          <p className="text-[11px] text-amber-100 mt-1">কাস্টমার ফর্ম পূরণ করে চলে গেছেন</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">সম্ভাব্য রিকভারি অ্যামাউন্ট</span>
            <Sparkles size={20} className="text-emerald-200" />
          </div>
          <p className="text-3xl font-black mt-2">{formatPrice(totalPotentialValue, currency, rate)}</p>
          <p className="text-[11px] text-emerald-100 mt-1">কল বা হোয়াটসঅ্যাপে রিকভার করার সুযোগ</p>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">অটো রিকভারি হেল্প</span>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2 leading-relaxed">
            কাস্টমার চেকআউট ফর্মে ফোন নম্বর লিখলেই সিস্টেম স্বয়ংক্রিয়ভাবে ডাটা এখানে সংরক্ষণ করে।
          </p>
        </div>
      </div>

      {/* Abandoned Orders List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
          <RefreshCw size={28} className="animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-500">লোড হচ্ছে...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-gray-200 space-y-3">
          <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
          <h4 className="font-bold text-gray-900 text-base">কোনো ড্রপড/হারিয়ে যাওয়া অর্ডার নেই!</h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            আপনার চেকআউট সফলতার হার দারুণ। কোনো কাস্টমার নাম-ফোন লিখে অর্ডার অসমাপ্ত রেখে চলে গেলে এখানে দেখা যাবে।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((checkout) => {
            const isRecovered = checkout.status === 'recovered';
            const dateStr = new Date(checkout.lastActiveAt || checkout.createdAt).toLocaleString('bn-BD', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={checkout.id}
                className={`bg-white border rounded-2xl p-4 md:p-5 transition-all shadow-sm ${
                  isRecovered ? 'border-emerald-200 bg-emerald-50/20' : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Customer Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-gray-900 text-base">{checkout.customerName || 'Valued Customer'}</span>
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                        <Phone size={11} />
                        {checkout.phone}
                      </span>
                      {isRecovered ? (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          Recovered (অর্ডার সম্পন্ন)
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock size={10} />
                          {dateStr}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      📍 {checkout.address ? `${checkout.address}, ${checkout.thana ? checkout.thana + ', ' : ''}${checkout.city || ''}` : 'ঠিকানা সম্পূর্ণ লিখেননি'}
                    </p>
                  </div>

                  {/* Items Preview */}
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {checkout.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-200/80 p-1.5 rounded-xl shrink-0">
                        <img
                          src={item.images?.[0] || 'https://via.placeholder.com/60'}
                          alt={item.name}
                          className="w-10 h-10 object-contain rounded-lg bg-white"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left pr-2">
                          <p className="text-[11px] font-bold text-gray-900 truncate max-w-[120px]">{item.name}</p>
                          <p className="text-[9px] text-gray-500 font-mono">
                            {item.selectedSize} × {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="pl-2 shrink-0 text-right">
                      <span className="text-[10px] font-bold uppercase text-gray-400 block">মোট মূল্য</span>
                      <span className="font-black text-sm text-gray-900 font-mono">
                        {formatPrice(checkout.total, currency, rate)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap lg:flex-nowrap">
                    {/* Call button */}
                    <a
                      href={`tel:${checkout.phone}`}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      title="Direct Call"
                    >
                      <Phone size={13} className="text-gray-600" />
                      কল দিন
                    </a>

                    {/* WhatsApp Recovery button */}
                    <button
                      onClick={() => handleWhatsAppRecovery(checkout)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      title="Send Recovery WhatsApp"
                    >
                      <MessageSquare size={13} />
                      WhatsApp রিকভারি
                    </button>

                    {/* Convert to Order */}
                    {!isRecovered && (
                      <button
                        onClick={() => handleConvertToOrder(checkout)}
                        disabled={convertingId === checkout.id}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                      >
                        {convertingId === checkout.id ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <ArrowUpRight size={13} />
                        )}
                        অর্ডারে কনভার্ট করুন
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(checkout.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
