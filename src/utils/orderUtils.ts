export const isCancelledStatus = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toString().trim().toLowerCase();
  return (
    s === 'cancelled' ||
    s === 'canceled' ||
    s === 'cancel' ||
    s === 'pick up cancel' ||
    s === 'pickup cancel' ||
    s === 'pickup_cancel' ||
    s === 'pick_up_cancel' ||
    s.includes('cancel') ||
    s.includes('বাতিল')
  );
};

export const canChangeOrderStatus = (status?: string): boolean => {
  if (!status) return true;
  const s = status.toUpperCase().trim();
  return (
    s === 'ORDER PLACED' ||
    s === 'PENDING' ||
    s === 'PRINTED' ||
    s === 'PREPARING' ||
    s === 'PROCESSING' ||
    s === 'READY' ||
    s === 'READY TO SHIP' ||
    s === 'READY_TO_SHIP' ||
    s === 'READY FOR SHIPMENT' ||
    s === 'READY_FOR_SHIPMENT' ||
    s === 'READY FOR PICKUP' ||
    s === 'READY_FOR_PICKUP' ||
    s === 'READY TO DELIVER' ||
    s === 'READY_TO_DELIVER' ||
    s === 'PACKED' ||
    s === 'QC' ||
    s === 'PICK UP CANCEL' ||
    s === 'PICKUP CANCEL' ||
    s === 'PICKUP_CANCEL' ||
    s === 'PICK_UP_CANCEL' ||
    s === 'CANCELLED' ||
    s === 'CANCELED' ||
    s === 'CANCEL' ||
    s.startsWith('READY')
  );
};

export const isDeliveredOrSuccess = (status?: string, courierStatus?: string): boolean => {
  if (!status && !courierStatus) return false;
  const s = (status || '').toLowerCase().trim();
  const cs = (courierStatus || '').toLowerCase().trim();

  // Partial Delivery or Exchange from Pathao counts as SUCCESS
  if (
    cs.includes('partial') ||
    cs.includes('exchange') ||
    cs === 'partial_delivery' ||
    cs === 'partial_delivered' ||
    cs === 'partial delivery' ||
    cs === 'partial_delivery_return' ||
    cs === 'exchange' ||
    cs === 'exchange_delivered' ||
    cs === 'exchange_completed' ||
    cs === 'exchange_order' ||
    s.includes('partial') ||
    s.includes('exchange') ||
    s === 'partial delivery' ||
    s === 'exchange'
  ) {
    return true;
  }

  // "Jeigulo at to Delivery hub ba assign for delivery emon kisu thakle seta success dhora jabe na..."
  // If courier status explicitly mentions transit, hub, assign, hold, return, cancel, out for delivery, it is NOT delivered!
  if (
    cs.includes('hub') ||
    cs.includes('assign') ||
    cs.includes('transit') ||
    cs.includes('pickup') ||
    cs.includes('hold') ||
    cs.includes('return') ||
    cs.includes('cancel') ||
    cs.includes('out for') ||
    cs.includes('progress') ||
    cs.includes('pending')
  ) {
    return false;
  }

  if (
    s.includes('assigned') ||
    s.includes('assign') ||
    s.includes('hub') ||
    s.includes('transit') ||
    s.includes('pickup') ||
    s.includes('hold') ||
    s.includes('return') ||
    s.includes('cancel') ||
    s.includes('shipped') ||
    s.includes('pending')
  ) {
    return false;
  }

  return (
    s === 'delivered' ||
    s === 'success' ||
    s === 'delivered / success' ||
    s === 'delivered/success' ||
    s === 'delivery_complete' ||
    s === 'delivery complete' ||
    s === 'completed' ||
    s === 'partial delivery' ||
    cs === 'delivered' ||
    cs === 'success' ||
    cs === 'successful' ||
    cs.includes('partial')
  );
};

export const isOfficeSaleOrder = (order?: any): boolean => {
  if (!order) return false;
  const invBy = String(order.invoiceBy || '').toLowerCase().trim();
  const notes = String(order.notes || '').toLowerCase();
  return invBy === 'office sale' || notes.includes('office sale');
};

export const isExchangeOrder = (order?: any): boolean => {
  if (!order) return false;
  const status = String(order.status || '').toLowerCase().trim();
  const cs = String(order.courierStatus || '').toLowerCase().trim();
  const notes = String(order.notes || '').toLowerCase();
  const issueType = String(order.issueType || '').toLowerCase();
  return (
    cs === 'exchange' ||
    status === 'exchange' ||
    issueType === 'exchange' ||
    notes.includes('exchange') ||
    order.isExchange === true
  );
};

export const isOrderDeliveredOrEligible = (order?: any): boolean => {
  if (!order) return false;
  const s = String(order.status || '').toLowerCase().trim();
  const cs = String(order.courierStatus || '').toLowerCase().trim();

  // Cancelled or returned orders can NEVER be counted
  if (s.includes('cancel') || s.includes('return') || cs.includes('cancel') || cs.includes('return')) {
    return false;
  }

  // Office Sale orders are counted
  if (isOfficeSaleOrder(order)) return true;

  // Exchange orders are counted
  if (isExchangeOrder(order)) return true;

  // Strictly Delivered orders
  return isDeliveredOrSuccess(order.status, order.courierStatus);
};

export const getOrderInvoiceNum = (order: any): number => {
  if (!order) return 0;
  if (typeof order.invoiceNo === 'number' && !isNaN(order.invoiceNo) && order.invoiceNo > 0) {
    return order.invoiceNo;
  }
  const cleanId = String(order.id || '').replace(/[^0-9]/g, '');
  if (cleanId) {
    const num = parseInt(cleanId, 10);
    // Ignore extreme unix timestamps (e.g. > 10 billion)
    if (!isNaN(num) && num < 10000000000) {
      return num;
    }
  }
  return 0;
};

export const formatInvoiceNumber = (order?: any): string => {
  if (!order) return '';
  if (order.invoiceNo !== undefined && order.invoiceNo !== null && String(order.invoiceNo).trim() !== '') {
    return String(order.invoiceNo);
  }
  if (order.id) {
    return String(order.id).replace(/^ORD-?/i, '').replace(/^#/, '');
  }
  return '';
};

export const compareOrdersByInvoice = (a: any, b: any, direction: 'desc' | 'asc' = 'desc'): number => {
  const numA = getOrderInvoiceNum(a);
  const numB = getOrderInvoiceNum(b);

  if (numA > 0 && numB > 0 && numA !== numB) {
    return direction === 'desc' ? numB - numA : numA - numB;
  }

  // If one has numeric invoice and other doesn't
  if (numA > 0 && numB === 0) return direction === 'desc' ? -1 : 1;
  if (numB > 0 && numA === 0) return direction === 'desc' ? 1 : -1;

  // Fallback to createdAt or updatedAt timestamp
  const timeA = new Date(a?.createdAt || 0).getTime() || (typeof a?.updatedAt === 'number' ? a.updatedAt : 0) || 0;
  const timeB = new Date(b?.createdAt || 0).getTime() || (typeof b?.updatedAt === 'number' ? b.updatedAt : 0) || 0;
  return direction === 'desc' ? timeB - timeA : timeA - timeB;
};

/**
 * Format order date in Bangladesh Standard Time (BST, UTC+6)
 */
export const formatOrderDate = (dateStr?: any): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  } catch {
    return String(dateStr);
  }
};

/**
 * Format order time in Bangladesh Standard Time (BST, UTC+6) with AM/PM
 */
export const formatOrderTime = (dateStr?: any): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
};

/**
 * Combined date and time object in Dhaka timezone
 */
export const formatOrderDateTime = (dateStr?: any): { date: string; time: string } => {
  return {
    date: formatOrderDate(dateStr),
    time: formatOrderTime(dateStr)
  };
};

/**
 * Checks if order or courier status indicates a return
 */
export const isReturnedStatus = (status?: string, courierStatus?: string, pathaoStatus?: string): boolean => {
  if (!status && !courierStatus && !pathaoStatus) return false;
  const s = (status || '').toLowerCase().trim();
  const cs = (courierStatus || '').toLowerCase().trim();
  const ps = (pathaoStatus || '').toLowerCase().trim();

  // If partial delivery or exchange, not a pure return
  if (cs.includes('partial') || cs.includes('exchange') || s.includes('exchange')) {
    return false;
  }

  return (
    s === 'returned' ||
    s === 'return' ||
    s.includes('return') ||
    s.includes('রিটার্ন') ||
    cs === 'returned' ||
    cs === 'return' ||
    cs.includes('return') ||
    cs.includes('returned') ||
    ps === 'returned' ||
    ps.includes('return') ||
    ps.includes('returned')
  );
};

export const isOrderReturned = (order?: any): boolean => {
  if (!order) return false;
  return isReturnedStatus(order.status, order.courierStatus, order.pathaoStatus);
};

/**
 * Calculates the exact advance paid for an order (Store Pickup or Advance Payment)
 */
export const getOrderAdvanceAmount = (order?: any): number => {
  if (!order) return 0;
  // Exclude cancelled/rejected orders
  if (order.status === 'Cancelled' || order.status === 'PICK UP CANCEL') return 0;

  const adv = Number(order.advancePayment) || Number(order.paidAmount) || 0;
  if (adv > 0) return adv;

  // If order is explicitly Store Pickup or Office Pickup and has a total
  if (isOfficeSaleOrStorePickup(order)) {
    return Number(order.total) || Number(order.subtotal) || 0;
  }

  return 0;
};

/**
 * Checks if an order is a Store Pickup / Office Sale / Advance Payment order
 */
export const isOfficeSaleOrStorePickup = (order?: any): boolean => {
  if (!order) return false;
  
  const city = String(order.city || order.shippingAddress?.city || order.deliveryArea || order.region || order.district || '').toLowerCase().trim();
  const deliveryMethod = String(order.deliveryMethod || '').toLowerCase().trim();
  const shippingMethod = String(order.shippingMethod || '').toLowerCase().trim();
  const courier = String(order.courier || order.partner || order.courierName || '').toLowerCase().trim();
  const invoiceBy = String(order.invoiceBy || '').toLowerCase().trim();
  const source = String(order.source || '').toLowerCase().trim();
  const orderType = String(order.orderType || '').toLowerCase().trim();
  const channel = String(order.channel || '').toLowerCase().trim();
  const notes = String(order.notes || order.note || order.internalNote || '').toLowerCase().trim();
  const address = String(order.address || order.shippingAddress?.address || '').toLowerCase().trim();

  // 1. Explicit Region/City selection of Store Pickup
  if (
    city.includes('store pickup') ||
    city.includes('office pickup') ||
    city.includes('pickup') ||
    city === 'store' ||
    city === 'pickup' ||
    city.includes('স্টোর পিকআপ') ||
    city.includes('অফিস পিকআপ') ||
    city.includes('পিকআপ')
  ) {
    return true;
  }

  // 2. Explicit Delivery or Shipping Method
  if (
    deliveryMethod.includes('pickup') ||
    deliveryMethod.includes('store') ||
    deliveryMethod.includes('office') ||
    shippingMethod.includes('pickup') ||
    shippingMethod.includes('store') ||
    shippingMethod.includes('office')
  ) {
    return true;
  }

  // 3. Explicit Courier / Partner marked as Store Pickup
  if (
    courier.includes('store pickup') ||
    courier.includes('office pickup') ||
    courier.includes('pickup') ||
    courier.includes('store') ||
    courier.includes('office') ||
    courier.includes('পিকআপ')
  ) {
    return true;
  }

  // 4. Explicit orderType, source, or channel
  if (
    orderType === 'store_pickup' ||
    orderType === 'pickup' ||
    orderType === 'office_sale' ||
    orderType === 'office_pickup' ||
    source === 'store_pickup' ||
    source === 'pickup' ||
    source === 'pos' ||
    channel === 'store_pickup' ||
    channel === 'pos' ||
    channel === 'store' ||
    channel === 'pickup'
  ) {
    return true;
  }

  // 5. Explicit invoiceBy containing Store Pickup or Office Sale
  if (
    invoiceBy.includes('store pickup') ||
    invoiceBy.includes('office sale') ||
    invoiceBy.includes('office pickup') ||
    invoiceBy.includes('স্টোর পিকআপ') ||
    invoiceBy.includes('অফিস সেল') ||
    invoiceBy.includes('পিকআপ') ||
    invoiceBy === 'store' ||
    invoiceBy === 'office'
  ) {
    return true;
  }

  // 6. Explicit note / address indicator
  if (
    notes.includes('store pickup') ||
    notes.includes('office pickup') ||
    notes.includes('office sale') ||
    notes.includes('স্টোর পিকআপ') ||
    notes.includes('অফিস সেল') ||
    notes.includes('পিকআপ') ||
    address.includes('store pickup') ||
    address.includes('office pickup') ||
    address.includes('office sale') ||
    address.includes('স্টোর পিকআপ') ||
    address.includes('অফিস পিকআপ') ||
    address.includes('পিকআপ')
  ) {
    return true;
  }

  // 7. Advance payment specified on order (advance payment given beforehand)
  if (Number(order.advancePayment) > 0 || Number(order.paidAmount) > 0) {
    return true;
  }

  // 8. Explicit flag
  if (order.isStorePickup === true || order.isPickup === true) {
    return true;
  }

  return false;
};

/**
 * Human readable order date & time string in Dhaka timezone
 */
export const formatOrderDateTimeStr = (dateStr?: any): string => {
  if (!dateStr) return '—';
  try {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return String(dateStr);
    return dateObj.toLocaleString('en-US', {
      timeZone: 'Asia/Dhaka',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateStr);
  }
};



