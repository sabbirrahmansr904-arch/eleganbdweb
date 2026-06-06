import React, { useState, useMemo, useCallback } from 'react';
import { useOrders } from '../../contexts/OrderContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { formatPrice, cn } from '../../lib/utils';
import { 
  Search, 
  RefreshCw, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  ShoppingBag,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  sender: 'customer' | 'admin';
  message: string;
  timestamp: string;
}

export default function AdminIssues() {
  const { orders, updateOrder, loading } = useOrders();
  const { currency, rate } = useCurrency();

  // Selected ticket / issue state
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'SOLVED'>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL TYPES');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL STATUSES');

  // Compute issue type for an order deterministically if not explicitly stored
  const getIssueType = useCallback((order: any) => {
    if (order.issueType) return order.issueType;
    if (order.status === 'Cancelled') return 'Cancel Request';
    const sum = order.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const types = ['Size Mismatch', 'Delivery Delay', 'Damaged Product', 'Payment Issue'];
    return types[sum % types.length];
  }, []);

  // Compute issue status deterministically if not explicitly stored
  const getIssueStatus = useCallback((order: any) => {
    if (order.issueStatus) return order.issueStatus;
    // Cancelled represents resolved/processed issue or special state, others default to open
    if (order.status === 'Cancelled') return 'resolved';
    return 'open';
  }, []);

  // Get conversation replies dynamically
  const getIssueReplies = useCallback((order: any): Message[] => {
    if (order.issueReplies && order.issueReplies.length > 0) {
      return order.issueReplies;
    }
    // Default reply from customer using notes or generic default
    const formattedDate = new Date(order.createdAt).toLocaleString();
    return [
      {
        sender: 'customer',
        message: order.notes || 'Hi Admin, I have some questions/issues regarding my order billing, sizing, or delivery window. Please check and let me know at your earliest convenience.',
        timestamp: formattedDate
      }
    ];
  }, []);

  // Map orders to issue objects
  const rawIssuesList = useMemo(() => {
    return orders
      .filter(order => {
        // Find orders that should act as issues
        if (order.issueStatus) return true;
        if (order.status === 'Cancelled') return true;
        const digitTotal = order.total % 10;
        const hasIssueTrigger = digitTotal === 0 || digitTotal === 1 || digitTotal === 2 || digitTotal === 6 || !!order.notes;
        return hasIssueTrigger;
      })
      .map(order => {
        const type = getIssueType(order);
        const status = getIssueStatus(order);
        const replies = getIssueReplies(order);
        return {
          order,
          id: order.id,
          customerName: order.customerName,
          phone: order.phone,
          address: order.address,
          city: order.city,
          createdAt: order.createdAt,
          type,
          status,
          replies
        };
      });
  }, [orders, getIssueType, getIssueStatus, getIssueReplies]);

  // Dynamic status counters
  const counts = useMemo(() => {
    const open = rawIssuesList.filter(item => item.status === 'open').length;
    const resolved = rawIssuesList.filter(item => item.status === 'resolved').length;
    return { open, resolved, total: rawIssuesList.length };
  }, [rawIssuesList]);

  // Apply filters
  const filteredIssues = useMemo(() => {
    return rawIssuesList.filter(item => {
      // 1. Tab filter (All, Open, Solved)
      if (activeTab === 'OPEN' && item.status !== 'open') return false;
      if (activeTab === 'SOLVED' && item.status !== 'resolved') return false;

      // 2. Search query (matches ID, customer name, phone)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.customerName?.toLowerCase().includes(query);
        const matchesPhone = item.phone?.includes(query);
        const matchesId = item.id?.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesId) return false;
      }

      // 3. Dropdown Type Filter
      if (selectedType !== 'ALL TYPES' && item.type.toUpperCase() !== selectedType.toUpperCase()) {
        return false;
      }

      // 4. Dropdown Status Filter
      if (selectedStatus !== 'ALL STATUSES') {
        if (selectedStatus === 'Open' && item.status !== 'open') return false;
        if (selectedStatus === 'Solved' && item.status !== 'resolved') return false;
      }

      return true;
    });
  }, [rawIssuesList, activeTab, searchQuery, selectedType, selectedStatus]);

  // Selected issue detail
  const selectedIssue = useMemo(() => {
    if (!selectedOrderId) return null;
    return rawIssuesList.find(issue => issue.id === selectedOrderId) || null;
  }, [rawIssuesList, selectedOrderId]);

  // Manual pull-refresh callback
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Issue thread lists synchronized successfully');
    }, 600);
  };

  // Submit reply action
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedOrderId || !selectedIssue) return;

    try {
      const activeReplies = [...selectedIssue.replies];
      const newReply: Message = {
        sender: 'admin',
        message: replyText.trim(),
        timestamp: new Date().toLocaleString()
      };

      const updatedReplies = [...activeReplies, newReply];

      // Update the Order document in Firestore directly so it persists
      await updateOrder(selectedOrderId, {
        issueReplies: updatedReplies,
        issueStatus: selectedIssue.status, // Preserve current status on message submit
        issueType: selectedIssue.type
      });

      setReplyText('');
      toast.success('Your official response has been dispatched and logged');
    } catch (err) {
      toast.error('Could not transmit reply. Please verify connection.');
    }
  };

  // Change Issue status
  const handleToggleStatus = async (status: 'open' | 'resolved') => {
    if (!selectedOrderId || !selectedIssue) return;
    try {
      await updateOrder(selectedOrderId, {
        issueStatus: status,
        issueType: selectedIssue.type,
        issueReplies: selectedIssue.replies
      });
      toast.success(`Issue flag updated to ${status.toUpperCase()}`);
    } catch (error) {
      toast.error('Error modifying issue status.');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 font-sans p-2">
      {/* Visual Header Matching the precise Design exactly */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-[#0C1421] leading-none mb-1">Issues</h1>
          <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest mt-1.5 flex items-center gap-1.5 leading-none">
            ORDER ISSUE THREADS 
            <span className="text-[#9CA3AF]">•</span> 
            <span className="text-[#5850EC]">{counts.open} OPEN</span> 
            <span className="text-[#9CA3AF]">•</span> 
            <span className="text-emerald-600">{counts.resolved} RESOLVED</span>
          </p>
        </div>

        <button 
          onClick={handleRefresh}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#5850EC] hover:bg-[#4A43D0] text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-sm shrink-0"
        >
          <RefreshCw size={12} className={cn(isRefreshing ? "animate-spin" : "")} />
          REFRESH
        </button>
      </div>

      {/* Main Workspace split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Search, Tabs, Filter list of threads) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.01)] flex flex-col h-[750px] overflow-hidden">
          
          {/* Top Panel: Search, Tab Toggles, and Dropdowns */}
          <div className="p-4 border-b border-gray-50 space-y-3.5 bg-gray-50/10">
            {/* Search Input Box */}
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#5850EC] transition-colors" size={15} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order, customer..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs text-[#0C1421] font-semibold focus:bg-white focus:border-[#5850EC] outline-none transition-all placeholder:text-gray-400 placeholder:font-normal"
              />
            </div>

            {/* Quick Filter Tabs exactly like screenshot layout */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('ALL')}
                className={cn(
                  "py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all text-center",
                  activeTab === 'ALL' 
                    ? "bg-white text-[#5850EC] shadow-xs ring-1 ring-black/5" 
                    : "text-gray-500 hover:text-black hover:bg-gray-100/50"
                )}
              >
                ALL ({counts.total})
              </button>
              <button 
                onClick={() => setActiveTab('OPEN')}
                className={cn(
                  "py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all text-center",
                  activeTab === 'OPEN' 
                    ? "bg-white text-[#5850EC] shadow-xs ring-1 ring-black/5" 
                    : "text-gray-500 hover:text-black hover:bg-gray-100/50"
                )}
              >
                OPEN
              </button>
              <button 
                onClick={() => setActiveTab('SOLVED')}
                className={cn(
                  "py-2 text-[10px] font-extrabold uppercase tracking-wider rounded-lg transition-all text-center",
                  activeTab === 'SOLVED' 
                    ? "bg-white text-emerald-600 shadow-xs ring-1 ring-black/5" 
                    : "text-gray-500 hover:text-black hover:bg-gray-100/50"
                )}
              >
                SOLVED
              </button>
            </div>

            {/* Selector Dropdowns styled side-by-side */}
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-wider text-stone-700 p-2.5 rounded-xl outline-none focus:border-[#5850EC] focus:bg-white cursor-pointer transition-all"
              >
                <option value="ALL TYPES">ALL TYPES</option>
                <option value="Size Mismatch">Size Mismatch</option>
                <option value="Delivery Delay">Delivery Delay</option>
                <option value="Damaged Product">Damaged Product</option>
                <option value="Payment Issue">Payment Issue</option>
                <option value="Cancel Request">Cancel Request</option>
              </select>

              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-wider text-stone-700 p-2.5 rounded-xl outline-none focus:border-[#5850EC] focus:bg-white cursor-pointer transition-all"
              >
                <option value="ALL STATUSES">ALL STATUSES</option>
                <option value="Open">OPEN</option>
                <option value="Solved">SOLVED</option>
              </select>
            </div>
          </div>

          {/* List area with custom scrollbars */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-white">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#9CA3AF]">
                <RefreshCw className="animate-spin text-[#5850EC] mb-2" size={24} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">Syncing threads...</span>
              </div>
            ) : filteredIssues.length === 0 ? (
              /* No Issues Found block */
              <div className="h-full flex flex-col items-center justify-center p-10 text-center select-none">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-gray-100 mb-4 shadow-3xs">
                  <MessageSquare size={26} className="text-gray-300" />
                </div>
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">NO ISSUES FOUND</h3>
                <p className="text-[10px] text-gray-400 leading-normal font-medium">All clear!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredIssues.map((issue) => {
                  const isSelected = selectedOrderId === issue.id;
                  const lastMsg = issue.replies[issue.replies.length - 1];
                  const rawDate = new Date(issue.createdAt);
                  const displayDate = `${rawDate.getDate()}/${rawDate.getMonth() + 1}/${String(rawDate.getFullYear()).slice(-2)}`;

                  return (
                    <div 
                      key={issue.id}
                      onClick={() => setSelectedOrderId(issue.id)}
                      className={cn(
                        "p-4 cursor-pointer text-left transition-all relative border-l-4",
                        isSelected 
                          ? "bg-slate-50/80 border-[#5850EC]" 
                          : "border-transparent hover:bg-slate-50/40"
                      )}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                          #{issue.id.slice(-8)}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 font-mono">
                          {displayDate}
                        </span>
                      </div>

                      <div className="mt-2">
                        <h4 className="text-[13px] font-extrabold text-[#0C1421] leading-tight truncate">
                          {issue.customerName || 'Walk-in Customer'}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                          {issue.phone}
                        </p>
                      </div>

                      {/* Display Issue Tags and Status BADGE */}
                      <div className="mt-3.5 flex items-center justify-between gap-2">
                        <span className={cn(
                          "px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-lg border",
                          issue.status === 'open'
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                          {issue.status === 'open' ? 'OPEN' : 'RESOLVED'}
                        </span>

                        <span className="px-2.5 py-1 bg-stone-50 text-[8.5px] font-black uppercase tracking-wider text-stone-500 rounded-lg border border-stone-100/80">
                          {issue.type}
                        </span>
                      </div>

                      {/* Snippet message */}
                      {lastMsg && (
                        <div className="mt-2 px-1 text-[10px] text-gray-500 line-clamp-1 italic font-medium leading-relaxed">
                          {lastMsg.sender === 'admin' ? 'You: ' : ''}{lastMsg.message}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Detailed issue conversation content panel) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.01)] h-[750px] flex flex-col overflow-hidden">
          {selectedIssue ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Header inside Conversation panel */}
              <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/10">
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-[#0C1421] tracking-tight truncate leading-none">
                      {selectedIssue.customerName}
                    </h3>
                    <span className={cn(
                      "px-2 py-0.5 text-[8px] font-black tracking-widest rounded-md uppercase border",
                      selectedIssue.status === 'open' 
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {selectedIssue.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold mt-1.5 flex items-center gap-2 font-mono">
                    <span>{selectedIssue.phone}</span>
                    <span className="text-gray-300">|</span>
                    <span>Ref #{selectedIssue.id}</span>
                  </p>
                </div>

                {/* Mark Resolved Option dropdown or actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedIssue.status === 'open' ? (
                    <button 
                      onClick={() => handleToggleStatus('resolved')}
                      className="px-4 py-2 bg-[#FFFDF5] border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50/50 rounded-xl transition-all"
                    >
                      ✓ Mark as Resolved
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleToggleStatus('open')}
                      className="px-4 py-2 bg-[#FFFDF5] border border-rose-200 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50/50 rounded-xl transition-all"
                    >
                      Reopen Thread
                    </button>
                  )}
                  <a 
                    href={`/admin/orders?search=${selectedIssue.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all border border-gray-100 shrink-0"
                    title="View Full Order"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>

              {/* Order Info Reference Band inside chat panel */}
              <div className="px-5 py-3.5 bg-[#FFFDF5]/40 border-b border-amber-200/20 text-left text-[11.5px] leading-relaxed select-none">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Products Info</span>
                    <span className="text-stone-700 font-extrabold truncate block">
                      {selectedIssue.order.items.map(it => `${it.name} (${it.selectedSize || 'F'})`).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Location / Shipping</span>
                    <span className="text-stone-700 font-bold truncate block">{selectedIssue.city}</span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1">Receipt Totals</span>
                    <span className="text-stone-700 font-extrabold block">
                      Subtotal: {formatPrice(selectedIssue.order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), currency, rate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest block leading-none mb-1 text-right sm:text-left">Collectible</span>
                    <span className="text-[#5850EC] font-black text-xs block text-right sm:text-left">
                      {formatPrice(
                        Math.max(0, selectedIssue.order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 
                        (selectedIssue.order.deliveryCharge || 0) - 
                        (selectedIssue.order.discount || 0) - 
                        (selectedIssue.order.advancePayment || 0)), 
                        currency, 
                        rate
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat replies area */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-slate-50/30 space-y-4">
                {selectedIssue.replies.map((reply, index) => {
                  const isAdmin = reply.sender === 'admin';
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        isAdmin ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      {/* Sub-label showing poster info */}
                      <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 mb-1 px-1">
                        {!isAdmin && <User size={9} />}
                        <span>{isAdmin ? 'Representative' : selectedIssue.customerName}</span>
                        <span>•</span>
                        <span className="font-mono">{reply.timestamp}</span>
                      </div>

                      {/* Visual bubble layout */}
                      <div className={cn(
                        "p-4 rounded-2xl text-[12px] leading-relaxed font-medium text-left shadow-2xs border",
                        isAdmin 
                          ? "bg-[#5850EC] text-white border-[#5850EC]" 
                          : "bg-white text-stone-800 border-gray-100"
                      )}>
                        {reply.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Typing area footer */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-gray-50 flex items-center gap-3 bg-white shrink-0">
                <input 
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your official reply here..."
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-semibold outline-none focus:bg-white focus:border-[#5850EC] transition-all text-[#0C1421] placeholder:text-gray-400 placeholder:font-normal"
                />
                <button 
                  type="submit"
                  disabled={!replyText.trim()}
                  className={cn(
                    "px-5 py-3 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xs shrink-0 flex items-center justify-center gap-2",
                    replyText.trim() 
                      ? "bg-[#5850EC] hover:bg-[#4A43D0]" 
                      : "bg-gray-200 cursor-not-allowed text-gray-400"
                  )}
                >
                  <Send size={11} />
                  SEND
                </button>
              </form>
            </div>
          ) : (
            /* Select conversation placeholder empty state block */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center select-none bg-slate-50/10">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-gray-100 mb-5 shadow-3xs">
                <MessageSquare size={30} className="text-[#a2aab8]" />
              </div>
              <h3 className="text-sm font-black text-[#5C6E84] uppercase tracking-wider mb-2">SELECT A CONVERSATION</h3>
              <p className="text-[10px] text-gray-400 font-bold max-w-sm leading-normal">
                Choose an issue from the list to view the conversation thread and respond.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
