export function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp) return 'এই মাত্র';
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'এই মাত্র';
  } else if (diffMins < 60) {
    return `${diffMins} মিনিট আগে`;
  } else if (diffHours < 24) {
    return `${diffHours} ঘণ্টা আগে`;
  } else if (diffDays === 1) {
    return 'গতকাল';
  } else if (diffDays < 7) {
    return `${diffDays} দিন আগে`;
  } else {
    const d = new Date(timestamp);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}
