import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, User, MapPin, Truck, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { useCurrency } from '../contexts/CurrencyContext';
import { useOrders } from '../contexts/OrderContext';
import { useProducts } from '../contexts/ProductContext';
import { useBranding } from '../contexts/BrandingContext';
import { formatPrice, cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface QuickOrderModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickOrderModal({ product, isOpen, onClose }: QuickOrderModalProps) {
  const { currency, rate } = useCurrency();
  const { addOrder } = useOrders();
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
    city: 'Dhaka'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSize) {
      toast.error(isBag ? 'Please select QN' : 'Please select a size');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate order placement
    const isInsideDhaka = formData.city === 'Dhaka';
    const baseShipping = isInsideDhaka ? shippingInsideDhaka : shippingOutsideDhaka;
    const shipping = (shippingFreeAfter > 0 && product.price >= shippingFreeAfter) ? 0 : baseShipping;
    const total = product.price + shipping;

    const newOrder = {
      id: `QORD-${Math.floor(Math.random() * 9000) + 1000}`,
      customerId: `GUEST-${Math.floor(Math.random() * 1000)}`,
      customerName: formData.name,
      phone: formData.phone,
      address: formData.location,
      city: formData.city,
      items: [{ ...product, selectedSize, quantity: 1 }],
      deliveryCharge: shipping,
      total: total,
      status: 'Pending',
      paymentMethod: 'cod',
      createdAt: new Date().toISOString(),
      invoiceBy: 'Website order'
    };

    setTimeout(() => {
      addOrder(newOrder as any);
      
      // Update stock
      const updatedSizeStock = { ...product.sizeStock };
      updatedSizeStock[selectedSize] = Math.max(0, (updatedSizeStock[selectedSize] || 0) - 1);
      updateProduct({
        ...product,
        sizeStock: updatedSizeStock,
        stock: Object.values(updatedSizeStock).reduce((sum: number, val: number) => sum + val, 0)
      });

      setIsSubmitting(false);
      setStep('success');
    }, 1500);
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
                    <div>
                        <select
                           value={formData.city}
                           onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                           className="w-full px-4 py-3 bg-gray-50 border border-gray-100 outline-none focus:border-brand-gold text-sm font-medium"
                        >
                            <option value="Dhaka">Inside Dhaka (70 TK)</option>
                            <option value="Outside Dhaka">Outside Dhaka (130 TK)</option>
                        </select>
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
