import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, User, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useOrders } from '../contexts/OrderContext';
import { useProducts } from '../contexts/ProductContext';
import { useBranding } from '../contexts/BrandingContext';
import { formatPrice, cn } from '../lib/utils';
import { DISTRICT_THANAS } from '../data/locations';
import toast from 'react-hot-toast';

interface QuickOrderModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickOrderModal({ product, isOpen, onClose }: QuickOrderModalProps) {
  const { currency, rate } = useCurrency();
  const { addOrder, getNextOrderId } = useOrders();
  const { updateProduct } = useProducts();
  const { shippingInsideDhaka, shippingOutsideDhaka, shippingFreeAfter } = useBranding();
  const isBag = (product.category || '').toLowerCase().includes('bag');
  
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    city: 'Dhaka',
    thana: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSize) {
      toast.error(isBag ? 'Please select QN' : 'Please select a size');
      return;
    }
    if (!formData.city) {
      toast.error('Please select a district');
      return;
    }
    if (!formData.thana) {
      toast.error('Please select a thana');
      return;
    }

    setIsSubmitting(true);
    
    // Determine shipping fee
    let baseShipping = shippingOutsideDhaka;
    const cityClean = formData.city.trim().toLowerCase();
    const thanaClean = (formData.thana || '').trim().toLowerCase();

    if (cityClean === 'dhaka') {
      const subKeywords = [
        'savar', 'ashulia', 'keraniganj', 'dhamrai', 'dohar', 'nawabganj',
        'baipail', 'jamgora', 'zirabo', 'zirani', 'hemayetpur', 'epz', 'nobinagar',
        'bipail', 'palli bidyut', 'pakiza', 'radio colony', 'rajashon', 'shimultola',
        'tenari savar', 'bolivodro', 'charabag', 'deogao', 'ganda', 'jahangirnagar',
        'katghora', 'kolatia', 'kolma', 'konakhola'
      ];
      const isSub = subKeywords.some(kw => thanaClean.includes(kw));
      baseShipping = isSub ? Math.min(110, shippingOutsideDhaka) : shippingInsideDhaka;
    } else if (cityClean === 'gazipur' || cityClean === 'narayanganj') {
      baseShipping = Math.min(110, shippingOutsideDhaka);
    } else {
      baseShipping = shippingOutsideDhaka;
    }

    const shipping = (shippingFreeAfter > 0 && product.price >= shippingFreeAfter) ? 0 : baseShipping;
    const total = product.price + shipping;

    const newOrder = {
      id: getNextOrderId(),
      customerId: `GUEST-${Math.floor(Math.random() * 1000)}`,
      customerName: formData.name,
      phone: formData.phone,
      address: formData.location,
      city: formData.city,
      thana: formData.thana,
      items: [{ ...product, selectedSize, quantity: 1 }],
      deliveryCharge: shipping,
      total: total,
      status: 'Pending',
      paymentMethod: 'cod',
      createdAt: new Date().toISOString(),
      invoiceBy: 'Website order'
    };

    try {
      await addOrder(newOrder as any);
      setIsSubmitting(false);
      setStep('success');
    } catch (err: any) {
      console.error("Quick order error:", err);
      setIsSubmitting(false);
      toast.error(`Order failed: ${err?.message || 'Please try again'}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md max-h-[90vh] bg-white z-[111] shadow-2xl overflow-hidden rounded-sm"
          >
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black italic uppercase tracking-tighter text-brand-black">
                  {step === 'form' ? 'Quick Order' : 'Order Placed'}
                </h2>
                <button onClick={onClose} className="text-gray-400 hover:text-brand-black">
                  <X size={20} />
                </button>
              </div>

              {step === 'form' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Product Summary */}
                  <div className="flex gap-4 p-3 bg-gray-50 rounded-sm">
                    <img 
                      src={product.images[0]} 
                      alt="" 
                      className="w-16 h-20 object-contain bg-white p-1"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-tight text-brand-black truncate w-48">
                        {product.name}
                      </h4>
                      <p className="text-sm font-black text-brand-gold mt-1">
                        {formatPrice(product.price, currency, rate)}
                      </p>
                    </div>
                  </div>

                  {/* Size Selector */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-2">{isBag ? 'Select QN' : 'Select Size'}</label>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setSelectedSize(size)}
                          className={cn(
                            "w-10 h-10 flex items-center justify-center text-xs font-bold border transition-all",
                            selectedSize === size ? "bg-brand-black text-white border-brand-black" : "bg-white text-brand-black border-gray-200"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        required
                        type="text"
                        placeholder="Your Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 outline-none focus:border-brand-gold text-sm font-medium"
                      />
                    </div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        required
                        type="tel"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 outline-none focus:border-brand-gold text-sm font-medium"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        required
                        type="text"
                        placeholder="Full Delivery Address"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 outline-none focus:border-brand-gold text-sm font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <select
                           required
                           value={formData.city}
                           onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value, thana: '' }))}
                           className="w-full px-3 py-3 bg-gray-50 border border-gray-100 outline-none focus:border-brand-gold text-xs font-medium cursor-pointer"
                        >
                            <option value="">Select District</option>
                            {Object.keys(DISTRICT_THANAS).map(district => (
                              <option key={district} value={district}>{district}</option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <select
                           required
                           value={formData.thana}
                           onChange={(e) => setFormData(prev => ({ ...prev, thana: e.target.value }))}
                           className="w-full px-3 py-3 bg-gray-50 border border-gray-100 outline-none focus:border-brand-gold text-xs font-medium cursor-pointer"
                        >
                            <option value="">Select Thana</option>
                            {formData.city && DISTRICT_THANAS[formData.city]?.map(thana => (
                              <option key={thana} value={thana}>{thana}</option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-center p-3 bg-brand-gold/10 border border-brand-gold/20 rounded-sm text-brand-black font-bold uppercase tracking-wider">
                    Bkash/Nagad Merchant: 01619835133
                  </div>

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full bg-brand-gold text-white py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-gold/20 hover:bg-brand-black transition-all"
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Order (Cash on Delivery)'}
                  </button>
                  
                  <p className="text-[8px] text-center text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <CheckCircle2 size={10} /> Fast delivery & authentic product
                  </p>
                </form>
              ) : (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-brand-black mb-2">Order Confirmed!</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-8">We will call you soon to confirm.</p>
                  <button
                    onClick={onClose}
                    className="w-full bg-brand-black text-white py-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-brand-gold transition-all"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
