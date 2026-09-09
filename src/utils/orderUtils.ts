export const canChangeOrderStatus = (status?: string): boolean => {
  if (!status) return true;
  const s = status.toUpperCase().trim();
  return (
    s === 'ORDER PLACED' ||
    s === 'PENDING' ||
    s === 'PRINTED' ||
    s === 'PREPARING' ||
    s === 'PROCESSING' ||
    s === 'PICK UP CANCEL' ||
    s === 'PICKUP CANCEL' ||
    s === 'PICKUP_CANCEL' ||
    s === 'PICK_UP_CANCEL'
  );
};

export const isDeliveredOrSuccess = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  if (
    s.includes('assigned') ||
    s.includes('hub') ||
    s.includes('transit') ||
    s.includes('pickup') ||
    s.includes('hold') ||
    s.includes('return') ||
    s.includes('cancel')
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
    s === 'completed'
  );
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

