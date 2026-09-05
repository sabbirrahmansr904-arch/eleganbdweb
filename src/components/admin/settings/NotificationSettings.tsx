import React, { useMemo, useState, useEffect } from 'react';
import { useOrders } from '../../../contexts/OrderContext';
import { useProducts } from '../../../contexts/ProductContext';
import { useCurrency } from '../../../contexts/CurrencyContext';
import { 
  ShoppingBag, Package, Bell, Clock, CheckSquare, AlertCircle, Eye, EyeOff, Check, RotateCcw, 
  X, ExternalLink, Mail, Phone, MapPin, DollarSign, Tag, Archive, MessageSquare, AlertTriangle 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatPrice, cn } from '../../../lib/utils';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export default function NotificationSettings() {
  const { orders } = useOrders();
  const { products } = useProducts();
  const { currency, rate } = useCurrency();
  const navigate = useNavigate();

  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('eleganbd_read_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);

  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [primaryEmail, setPrimaryEmail] = useState('eleganbd.ltd@gmail.com');
  const [secondaryEmail, setSecondaryEmail] = useState('sabbirrahmansr904@gmail.com');
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  // Telegram states
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramBotToken, setTelegramBotToken] = useState('8960670685:AAFk4BurwHSvoO-Ydga9A_iAbGGehboXMPs');
  const [telegramChatId, setTelegramChatId] = useState('7986746414');
  const [isTelegramTesting, setIsTelegramTesting] = useState(false);
  const [isTelegramSaving, setIsTelegramSaving] = useState(false);

  // Load configuration from Firestore on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configRef = doc(db, 'config', 'notification_settings');
        const configDoc = await getDoc(configRef);
        if (configDoc.exists()) {
          const data = configDoc.data();
          setEmailAlertsEnabled(data.emailAlertsEnabled !== false);
          setPrimaryEmail(data.primaryEmail || 'eleganbd.ltd@gmail.com');
          setSecondaryEmail(data.secondaryEmail || 'sabbirrahmansr904@gmail.com');
        }

        const tgRef = doc(db, 'config', 'telegram');
        const tgDoc = await getDoc(tgRef);
        if (tgDoc.exists()) {
          const data = tgDoc.data();
          setTelegramEnabled(data.enabled !== false);
          if (data.botToken) setTelegramBotToken(data.botToken);
          if (data.chatId) setTelegramChatId(data.chatId);
        }
      } catch (error) {
        console.error('Error fetching notification configuration:', error);
      } finally {
        setIsConfigLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSaveConfig = async () => {
    setIsConfigSaving(true);
    try {
      const configRef = doc(db, 'config', 'notification_settings');
      await setDoc(configRef, {
        emailAlertsEnabled,
        primaryEmail,
        secondaryEmail,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Email Notification Settings saved successfully!');
    } catch (error) {
      console.error('Error saving notification configuration:', error);
      toast.error('Failed to save settings.');
    } finally {
      setIsConfigSaving(false);
    }
  };

  const handleSaveTelegramConfig = async () => {
    setIsTelegramSaving(true);
    try {
      const tgRef = doc(db, 'config', 'telegram');
      await setDoc(tgRef, {
        enabled: telegramEnabled,
        botToken: telegramBotToken.trim(),
        chatId: telegramChatId.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Telegram configuration saved successfully!');
    } catch (error) {
      console.error('Error saving telegram config:', error);
      toast.error('Failed to save Telegram settings.');
    } finally {
      setIsTelegramSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toast.error('Please enter Bot Token and Chat ID first.');
      return;
    }
    setIsTelegramTesting(true);
    try {
      const res = await safeApiFetch('/api/telegram/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: telegramBotToken, chatId: telegramChatId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Test message sent successfully to Telegram!');
      } else {
        toast.error(data.error || 'Failed to send test message.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Connection test failed.');
    } finally {
      setIsTelegramTesting(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('eleganbd_read_notifications', JSON.stringify(readIds));
  }, [readIds]);

  const notifications = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      message: string;
      time: Date;
      icon: React.ElementType;
      color: string;
      type: 'order' | 'qc' | 'issue' | 'product';
      referenceId: string;
    }> = [];

    (orders || []).forEach(order => {
      if (!order) return;
      const orderId = order.id ? String(order.id) : '';
      const orderShortId = orderId ? orderId.slice(-6).toUpperCase() : 'UNKNOWN';
      const itemsCount = Array.isArray(order.items) ? order.items.length : 0;
      const orderTotal = typeof order.total === 'number' ? order.total : 0;
      const orderTime = order.createdAt ? new Date(order.createdAt) : new Date();

      items.push({
        id: `order-${orderId || Math.random()}`,
        title: `New Order Received`,
        message: `Order #${orderShortId} placed for ${itemsCount} items totaling ${formatPrice(orderTotal, currency, rate)}.`,
        time: orderTime,
        icon: ShoppingBag,
        color: 'bg-blue-50 text-blue-600 border-blue-100',
        type: 'order',
        referenceId: orderId,
      });

      if (order.status === 'QC') {
        items.push({
          id: `order-qc-${orderId || Math.random()}`,
          title: `Order QC Passed`,
          message: `Order #${orderShortId} (${order.customerName || 'Customer'}) has successfully passed Quality Check (QC). Ready for shipment packaging.`,
          time: order.updatedAt ? new Date(order.updatedAt) : orderTime,
          icon: CheckSquare,
          color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          type: 'qc',
          referenceId: orderId,
        });
      }

      if (order.issueType) {
        const latestReply = Array.isArray(order.issueReplies) && order.issueReplies.length > 0 
          ? order.issueReplies[order.issueReplies.length - 1]?.message 
          : 'No description provided';
        items.push({
          id: `order-issue-${orderId || Math.random()}`,
          title: `Order Issue: ${order.issueType}`,
          message: `Internal discussion raised for Order #${orderShortId} (${order.customerName || 'Customer'}). Status: ${order.issueStatus?.toUpperCase() || 'OPEN'}. Latest: "${latestReply}"`,
          time: order.updatedAt ? new Date(order.updatedAt) : orderTime,
          icon: AlertCircle,
          color: 'bg-rose-50 text-rose-600 border-rose-100',
          type: 'issue',
          referenceId: orderId,
        });
      }
    });

    (products || []).forEach(product => {
      if (!product) return;
      const productTime = (product as any).createdAt ? new Date((product as any).createdAt) : new Date();
      items.push({
        id: `product-${product.id || Math.random()}`,
        title: `Product Added/Updated`,
        message: `${product.name || 'Product'} was recently added or updated in the catalog.`,
        time: productTime,
        icon: Package,
        color: 'bg-amber-50 text-amber-600 border-amber-100',
        type: 'product',
        referenceId: product.id || '',
      });
    });

    return items.sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [orders, products, currency, rate]);

  const selectedEntity = useMemo(() => {
    if (!selectedNotification) return null;
    const { type, referenceId } = selectedNotification;
    if (type === 'product') {
      return products.find(p => p.id === referenceId);
    } else {
      return orders.find(o => o.id === referenceId);
    }
  }, [selectedNotification, orders, products]) as any;

  const toggleNotification = (id: string) => {
    if (readIds.includes(id)) {
      setReadIds(prev => prev.filter(item => item !== id));
      toast.success('Notification marked as unread.');
    } else {
      setReadIds(prev => [...prev, id]);
      toast.success('Notification marked as read.');
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!readIds.includes(notification.id)) {
      setReadIds(prev => [...prev, notification.id]);
    }
    setSelectedNotification(notification);
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
    toast.success('All notifications marked as read.');
  };

  const markAllAsUnread = () => {
    setReadIds([]);
    toast.success('All notifications marked as unread.');
  };

  const unreadCount = notifications.filter(n => !readIds.includes(n.id)).length;

  return (
    <div className="space-y-12 max-w-4xl relative z-10 font-sans">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-8">
          <div className="space-y-1">
            <h3 className="serif text-2xl text-black italic tracking-tighter uppercase">Alert Distribution Matrix</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">System updates and latest architectural interactions</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={markAllAsRead}
              disabled={notifications.length === 0}
              className="px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Check size={14} />
              Mark All Read
            </button>
            <button 
              onClick={markAllAsUnread}
              disabled={notifications.length === 0}
              className="px-6 py-3 border border-gray-100 bg-gray-50 text-gray-400 hover:text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw size={14} />
              Mark All Unread
            </button>
          </div>
        </div>

        {/* Email Order Alerts Control Panel */}
        <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden p-8 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pb-4 border-b border-gray-50">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black text-brand-gold tracking-[0.2em] flex items-center gap-1.5">
                <Mail size={12} className="text-brand-gold animate-bounce" />
                Live Email Dispatcher Node
              </span>
              <h2 className="serif text-xl italic font-black text-black uppercase tracking-tight">Order Email Dispatcher Settings</h2>
              <p className="text-xs text-gray-400">Receive real-time alerts to your Gmail inbox when someone makes an order on the website.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase">Alert Status:</span>
              <button
                type="button"
                onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  emailAlertsEnabled ? "bg-black" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    emailAlertsEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <span className={cn("text-xs font-black uppercase tracking-wider", emailAlertsEnabled ? "text-emerald-600 animate-pulse" : "text-gray-400")}>
                {emailAlertsEnabled ? "ACTIVE" : "DISABLED"}
              </span>
            </div>
          </div>

          {isConfigLoading ? (
            <div className="py-4 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">Loading settings...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 block">Primary Alert Destination Gmail</label>
                <input
                  type="email"
                  value={primaryEmail}
                  onChange={(e) => setPrimaryEmail(e.target.value)}
                  placeholder="eleganbd.ltd@gmail.com"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:bg-white focus:border-black transition-all text-xs font-bold text-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 block">Secondary Alert Destination Gmail (Optional)</label>
                <input
                  type="email"
                  value={secondaryEmail}
                  onChange={(e) => setSecondaryEmail(e.target.value)}
                  placeholder="sabbirrahmansr904@gmail.com"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:bg-white focus:border-black transition-all text-xs font-bold text-black"
                />
              </div>

              <div className="md:col-span-2 pt-2 flex justify-between items-center gap-4">
                <div className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed max-w-lg">
                  💡 Note: To send emails, ensure `EMAIL_USER` and `EMAIL_PASS` secrets are configured in developer credentials/settings.
                </div>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isConfigSaving}
                  className="bg-black text-white px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all rounded-xl shadow-md cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isConfigSaving ? "Saving Config..." : "Save Configuration"}
                </button>
              </div>

              {/* Step-by-step Connection Guide Accordion */}
              <div className="md:col-span-2 bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4">
                <h4 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink size={14} className="text-brand-gold shrink-0" />
                  How to link Google SMTP (Gmail App Password Guide)
                </h4>
                <div className="text-[11px] text-gray-500 leading-relaxed space-y-2">
                  <p>To authorize our system to send email alerts on your behalf from your Gmail address:</p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium">
                    <li>Go to your <a href="https://myaccount.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold hover:text-blue-700">Google Account dashboard</a>.</li>
                    <li>Navigate to <b>Security</b> and turn on <b>2-Step Verification</b>.</li>
                    <li>Search or scroll down to find <b>App Passwords</b>.</li>
                    <li>Choose "Mail" as app type, "Other (Custom name)" as "EleganBD Web", and click <b>Generate</b>.</li>
                    <li>Copy the <b>16-digit yellow app password</b>.</li>
                    <li>Navigate to your Hosting Env / Dev settings and add:</li>
                  </ol>
                  <div className="bg-gray-100 rounded-xl p-3 font-mono text-[10px] text-slate-700 space-y-1 border border-gray-200">
                    <p><span className="text-indigo-600 font-black">EMAIL_USER</span>=eleganbd.ltd@gmail.com <span className="text-gray-400"># Your sender Gmail</span></p>
                    <p><span className="text-indigo-600 font-black">EMAIL_PASS</span>=abcd efgh ijkl mnop <span className="text-gray-400"># The 16-character generated app password</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Telegram Bot Integration Settings Control Panel */}
        <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden p-8 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pb-4 border-b border-gray-50">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black text-sky-600 tracking-[0.2em] flex items-center gap-1.5">
                <MessageSquare size={12} className="text-sky-600 animate-pulse" />
                Telegram Bot API Dispatcher Node
              </span>
              <h2 className="serif text-xl italic font-black text-black uppercase tracking-tight">Telegram Instant Order Alerts</h2>
              <p className="text-xs text-gray-400">Instantly receive order details (Customer Name, Address, Phone, Product Qty & Size) to your Telegram Bot when an order is placed.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase">Telegram Status:</span>
              <button
                type="button"
                onClick={() => setTelegramEnabled(!telegramEnabled)}
                className={cn(
                  "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  telegramEnabled ? "bg-black" : "bg-gray-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    telegramEnabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <span className={cn("text-xs font-black uppercase tracking-wider", telegramEnabled ? "text-emerald-600 animate-pulse" : "text-gray-400")}>
                {telegramEnabled ? "ACTIVE" : "DISABLED"}
              </span>
            </div>
          </div>

          {isConfigLoading ? (
            <div className="py-4 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">Loading telegram settings...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 block">Telegram Bot Token</label>
                <input
                  type="text"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:bg-white focus:border-black transition-all text-xs font-mono font-bold text-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.15em] font-black text-gray-400 block">Telegram Chat ID / Group ID</label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. -1001234567890 or 987654321"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:bg-white focus:border-black transition-all text-xs font-mono font-bold text-black"
                />
              </div>

              <div className="md:col-span-2 pt-2 flex flex-wrap justify-between items-center gap-4">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTelegramTesting || !telegramBotToken || !telegramChatId}
                  className="bg-sky-600 text-white px-6 py-3.5 text-xs font-black uppercase tracking-[0.15em] hover:bg-sky-700 transition-all rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Bell size={14} />
                  {isTelegramTesting ? "Sending Test..." : "Test Telegram Alert"}
                </button>

                <button
                  type="button"
                  onClick={handleSaveTelegramConfig}
                  disabled={isTelegramSaving}
                  className="bg-black text-white px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all rounded-xl shadow-md cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isTelegramSaving ? "Saving..." : "Save Telegram Config"}
                </button>
              </div>

              {/* Telegram Bot Setup Guide */}
              <div className="md:col-span-2 bg-sky-50/50 rounded-2xl p-6 border border-sky-100 space-y-3">
                <h4 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink size={14} className="text-sky-600 shrink-0" />
                  Telegram Bot Setup Guide (কিভাবে Telegram API ও Bot Token পাবেন)
                </h4>
                <div className="text-[11px] text-gray-600 leading-relaxed space-y-2">
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium">
                    <li>Telegram অ্যাপে গিয়ে সার্চ করুন <b className="text-sky-700">@BotFather</b> লিখে এবং চ্যাট শুরু করুন।</li>
                    <li><code className="bg-white px-1.5 py-0.5 rounded border border-sky-200 font-mono text-xs">/newbot</code> কমান্ড পাঠান এবং আপনার বটের নাম ও ইউজারনেম (যেমন: <code className="text-xs font-mono">MyStoreOrderBot</code>) সেট করুন।</li>
                    <li>BotFather আপনাকে একটি <b className="text-black">HTTP API Token</b> দেবে (যেমন: <code className="text-xs font-mono">712345678:AAH...</code>)। সেটি উপরে <b>Telegram Bot Token</b> বক্সে দিন।</li>
                    <li>আপনার বটের সাথে একটি চ্যাট করুন অথবা বটটিকে আপনার টেলিগ্রাম গ্রুপে অ্যাড করুন।</li>
                    <li>আপনার ব্যক্তিগত Chat ID অথবা Group Chat ID পাওয়ার জন্য <b className="text-sky-700">@userinfobot</b> বা <b className="text-sky-700">@RawDataBot</b> ব্যবহার করুন এবং Chat ID সংগ্রহ করে উপরে দিন।</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-[32px] shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-8 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-gray-400 italic">Historical Event Stream</h2>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  {unreadCount} UNREAD UNITS
                </span>
              )}
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-32 flex flex-col items-center justify-center text-gray-400 text-center space-y-4">
              <Bell size={64} className="opacity-10 animate-spin-slow" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] italic text-gray-300">NULL STATE: NO ARCHITECTURAL DATA DETECTED</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.slice(0, 50).map((notification) => {
                const Icon = notification.icon;
                const isRead = readIds.includes(notification.id);
                
                return (
                  <div 
                    key={notification.id} 
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "p-8 md:p-10 hover:bg-gray-50 transition-all flex gap-8 group cursor-pointer relative",
                      !isRead ? "bg-amber-50/5" : "opacity-50"
                    )}
                  >
                    {!isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-black" />
                    )}

                    <div className={cn(
                      "w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center border shadow-xs transition-transform group-hover:scale-110 duration-500",
                      notification.color
                    )}>
                      <Icon size={24} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <p className={cn(
                            "text-sm tracking-tight uppercase font-black italic",
                            !isRead ? "text-black" : "text-gray-400"
                          )}>
                            {notification.title}
                          </p>
                        </div>

                        <div className="flex items-center text-[9px] text-gray-400 uppercase tracking-widest font-black gap-2">
                          <Clock size={10} className="text-brand-gold" />
                          <span>{formatDistanceToNow(notification.time, { addSuffix: true })}</span>
                        </div>
                      </div>
                      
                      <p className={cn(
                        "text-[13px] mt-2 leading-relaxed font-medium",
                        !isRead ? "text-gray-600" : "text-gray-400"
                      )}>
                        {notification.message}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-gold opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleNotification(notification.id);
                          }}
                          className="flex items-center gap-2 hover:text-black transition-colors"
                        >
                          {isRead ? (
                            <>
                              <EyeOff size={12} /> Mark Unread Protocol
                            </>
                          ) : (
                            <>
                              <Eye size={12} /> Mark Read Protocol
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal Overlay */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="absolute inset-0" onClick={() => setSelectedNotification(null)} />
          
          <div className="relative w-full max-w-2xl md:max-w-3xl bg-white rounded-[24px] border border-gray-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-6 md:p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm",
                  selectedNotification.color
                )}>
                  {React.createElement(selectedNotification.icon, { size: 20 })}
                </div>
                <div>
                  <h3 className="serif text-xl text-black italic tracking-tight uppercase leading-tight">
                    {selectedNotification.title}
                  </h3>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black mt-0.5">
                    Event Log: {formatDistanceToNow(selectedNotification.time, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNotification(null)}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-black bg-white transition-all shadow-xs cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              
              {!selectedEntity ? (
                <div className="py-12 text-center text-gray-400 space-y-3">
                  <AlertCircle size={40} className="mx-auto text-gray-300" />
                  <p className="text-xs font-black uppercase tracking-wider">Related details could not be loaded</p>
                  <p className="text-xs text-gray-400 font-medium">The associated product or order might have been deleted from the catalog.</p>
                </div>
              ) : selectedNotification.type === 'product' ? (
                /* ================= PRODUCT NOTIFICATION DETAIL ================= */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Catalog Image</span>
                    <div className="aspect-square w-full rounded-2xl border border-gray-100 overflow-hidden bg-gray-50/50 flex items-center justify-center relative">
                      {selectedEntity.images && selectedEntity.images[0] ? (
                        <img 
                          src={selectedEntity.images[0]} 
                          alt={selectedEntity.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Package size={48} className="text-gray-300 stroke-[1.5]" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Product Catalog Data</span>
                      <h4 className="text-lg font-black text-gray-900 mt-1">{selectedEntity.name}</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-50 py-4">
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Regular Price</span>
                        <span className="text-sm font-bold text-gray-900 font-mono-numbers">
                          {formatPrice(selectedEntity.price, currency, rate)}
                        </span>
                      </div>
                      {selectedEntity.sku && (
                        <div>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">SKU Code</span>
                          <span className="text-xs font-bold text-gray-700 font-mono">
                            {selectedEntity.sku}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Category</span>
                        <span className="text-xs font-bold text-slate-700 capitalize bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit block mt-1">
                          {selectedEntity.category}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Total Stock</span>
                        <span className="text-xs font-bold text-emerald-600 font-mono-numbers">
                          {selectedEntity.stock} units
                        </span>
                      </div>
                    </div>

                    {selectedEntity.sizeStock && Object.keys(selectedEntity.sizeStock).length > 0 && (
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Size Stock Breakdown</span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedEntity.sizeStock).map(([size, qty]: any) => (
                            <span key={size} className="bg-gray-50 border border-gray-150 rounded-lg px-2.5 py-1 text-[11px] font-bold text-gray-700 font-mono-numbers">
                              {size}: <span className="font-extrabold text-black">{qty}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedEntity.description && (
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Catalog Description</span>
                        <p className="text-xs text-gray-500 leading-relaxed max-h-32 overflow-y-auto font-medium">
                          {selectedEntity.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedNotification.type === 'issue' ? (
                /* ================= ORDER ISSUE DISCUSSION DETAIL ================= */
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-rose-50/30 border border-rose-100/50 rounded-2xl p-4">
                    <div>
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block">Issue Status</span>
                      <span className="text-xs font-extrabold text-rose-600 capitalize block mt-1">
                        {selectedEntity.issueStatus || 'Open'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Urgency</span>
                      <span className="text-xs font-black text-red-600 uppercase block mt-1">
                        {selectedEntity.issueUrgency || 'High'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Customer</span>
                      <span className="text-xs font-bold text-gray-900 block truncate mt-1">
                        {selectedEntity.customerName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Order ID</span>
                      <span className="text-xs font-mono font-bold text-blue-600 block mt-1">
                        #{selectedEntity.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-gray-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-400">
                        <Phone size={14} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Phone Number</span>
                        <span className="text-xs font-semibold text-gray-900">{selectedEntity.phone}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-400">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Delivery Address</span>
                        <span className="text-xs font-semibold text-gray-900 block max-w-[250px] truncate" title={selectedEntity.address}>
                          {selectedEntity.address}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className="text-rose-500" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Internal Thread / Conversation History</span>
                    </div>
                    <div className="border border-gray-100 bg-gray-50/30 rounded-2xl p-4 max-h-60 overflow-y-auto space-y-4">
                      {selectedEntity.issueReplies && selectedEntity.issueReplies.length > 0 ? (
                        selectedEntity.issueReplies.map((reply: any, idx: number) => {
                          const isAdminSender = reply.sender === 'admin';
                          return (
                            <div key={idx} className={cn(
                              "flex flex-col max-w-[85%] space-y-1",
                              isAdminSender ? "ml-auto items-end" : "mr-auto items-start"
                            )}>
                              <div className={cn(
                                "px-4 py-2.5 rounded-2xl text-xs font-semibold",
                                isAdminSender 
                                  ? "bg-black text-white rounded-tr-none" 
                                  : "bg-white border border-gray-150 text-gray-800 rounded-tl-none"
                              )}>
                                {reply.message}
                              </div>
                              <span className="text-[8px] font-semibold text-gray-400 px-1 font-mono-numbers">
                                {reply.timestamp ? new Date(reply.timestamp).toLocaleString() : ''}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-6 text-center text-gray-400 text-xs font-semibold italic">
                          No replies in thread. Dispute category: {selectedEntity.issueType}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ================= ORDER & QC DETAILS ================= */
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border border-gray-100 bg-gray-50/50 rounded-2xl p-4">
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Order Identifier</span>
                      <span className="text-xs font-bold text-gray-900 font-mono-numbers block mt-1">
                        #{selectedEntity.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Status Status</span>
                      <span className={cn(
                        "inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5",
                        selectedEntity.status === 'QC' 
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                          : "bg-blue-50 text-blue-600 border border-blue-100"
                      )}>
                        {selectedEntity.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Payment Mode</span>
                      <span className="text-xs font-extrabold text-slate-700 uppercase block mt-1">
                        {selectedEntity.paymentMethod}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Order Date</span>
                      <span className="text-xs font-bold text-slate-600 block mt-1">
                        {new Date(selectedEntity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-5">
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Customer Info</span>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <span className="text-gray-400 font-normal">Name:</span> {selectedEntity.customerName}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <span className="text-gray-400 font-normal">Phone:</span> {selectedEntity.phone}
                        </div>
                        {selectedEntity.email && (
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                            <span className="text-gray-400 font-normal">Email:</span> {selectedEntity.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Delivery Address</span>
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {selectedEntity.address}, {selectedEntity.city}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Items List ({selectedEntity.items?.length || 0})</span>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-wider">Product Name</th>
                            <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-wider text-center">Size</th>
                            <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-wider text-center">Qty</th>
                            <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-wider text-right">Price</th>
                            <th className="py-2.5 px-4 text-[9px] font-black text-gray-400 uppercase tracking-wider text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {selectedEntity.items?.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50/50">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {item.name}
                                {item.sku && <span className="block text-[10px] text-blue-600 font-mono mt-0.5">{item.sku}</span>}
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-slate-600 font-mono">
                                {item.selectedSize || 'Free'}
                              </td>
                              <td className="py-3 px-4 text-center font-extrabold text-slate-800">
                                {item.quantity}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-slate-700 font-mono-numbers">
                                {formatPrice(item.price, currency, rate)}
                              </td>
                              <td className="py-3 px-4 text-right font-black text-slate-900 font-mono-numbers">
                                {formatPrice(item.price * item.quantity, currency, rate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-3 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-4">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Logistics details</span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-semibold">Courier Partner:</span>
                          <span className="font-extrabold text-slate-800">{selectedEntity.courier || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-semibold">Tracking ID:</span>
                          <span className="font-mono font-bold text-indigo-600">{selectedEntity.trackingId || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 space-y-2.5 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between">
                        <span>Items Subtotal:</span>
                        <span className="font-bold text-slate-900 font-mono-numbers">
                          {formatPrice((selectedEntity.items || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0), currency, rate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Charge:</span>
                        <span className="font-bold text-slate-900 font-mono-numbers">
                          {formatPrice(selectedEntity.deliveryCharge || 0, currency, rate)}
                        </span>
                      </div>
                      {selectedEntity.advancePayment && selectedEntity.advancePayment > 0 ? (
                        <div className="flex justify-between text-emerald-600">
                          <span>Advance Payment:</span>
                          <span className="font-bold font-mono-numbers">
                            -{formatPrice(selectedEntity.advancePayment, currency, rate)}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between border-t border-gray-200/50 pt-2 text-sm font-black text-slate-950">
                        <span>Grand Total:</span>
                        <span className="font-mono-numbers text-orange-600 text-base">
                          {formatPrice(selectedEntity.total, currency, rate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedEntity.notes && (
                    <div className="bg-amber-50/30 border border-amber-100/50 rounded-xl p-3.5">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest block mb-1">Customer / Internal Order Notes</span>
                      <p className="text-xs text-slate-600 font-medium">{selectedEntity.notes}</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-4 justify-between items-center shrink-0">
              <button
                onClick={() => {
                  toggleNotification(selectedNotification.id);
                }}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-black border border-gray-200 hover:border-gray-400 bg-white rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                {readIds.includes(selectedNotification.id) ? (
                  <>
                    <EyeOff size={14} />
                    Mark Unread Protocol
                  </>
                ) : (
                  <>
                    <Eye size={14} />
                    Mark Read Protocol
                  </>
                )}
              </button>

              <div className="flex gap-3">
                {selectedEntity && (
                  <button
                    onClick={() => {
                      setSelectedNotification(null);
                      if (selectedNotification.type === 'product') {
                        navigate('/admin/products');
                      } else if (selectedNotification.type === 'issue') {
                        navigate('/admin/issues');
                      } else {
                        navigate('/admin/orders');
                      }
                    }}
                    className="px-6 py-2.5 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    {selectedNotification.type === 'product' ? 'Manage Catalog' : selectedNotification.type === 'issue' ? 'Open Thread' : 'Open Orders Panel'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-5 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close View
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

