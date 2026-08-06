export const isDeliveredOrSuccess = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return (
    s === 'delivered' ||
    s === 'success' ||
    s === 'delivered / success' ||
    s.includes('delivered') ||
    s.includes('success')
  );
};
