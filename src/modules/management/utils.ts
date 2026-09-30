export function formatSecondsToHoursMinutes(seconds: number): string {
  if (seconds === 0) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours === 0) parts.push(`${minutes}m`);
  
  return parts.join(" ");
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${formatNumber(value, decimals)}%`;
}

export function formatShortDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short'
  }).format(parsed);
}
