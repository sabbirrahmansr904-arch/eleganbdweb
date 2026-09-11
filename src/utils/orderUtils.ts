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
    cs === 'delivered' ||
    cs === 'success' ||
    cs === 'successful'
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

