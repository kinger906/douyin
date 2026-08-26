/** Format counts the Douyin way: 1200 -> 1200, 22000 -> 2.2万 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0';
  if (value < 10_000) return String(Math.floor(value));
  const wan = value / 10_000;
  if (wan < 100) {
    const text = wan >= 10 ? wan.toFixed(0) : wan.toFixed(1).replace(/\.0$/, '');
    return `${text}万`;
  }
  return `${Math.floor(wan)}万`;
}
