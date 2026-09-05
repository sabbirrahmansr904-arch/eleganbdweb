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
