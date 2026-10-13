import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(kg: number | string | null | undefined): string {
  const num = Number(kg) || 0;
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num) + ' kg';
}

export function formatWeightTonnes(kg: number | string | null | undefined): string {
  const tonnes = (Number(kg) || 0) / 1000;
  return `${tonnes.toFixed(2)} t`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  const now = Date.now();
  const past = new Date(dateString).getTime();
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  return `${diffDays}d ago`;
}

export function isDeviceOnline(lastSeenAt: string | null | undefined, thresholdMin = 15): boolean {
  if (!lastSeenAt) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs < thresholdMin * 60 * 1000;
}

export function getLoadCategory(percent: number): 'safe' | 'warning' | 'overloaded' {
  if (percent > 100) return 'overloaded';
  if (percent >= 90) return 'warning';
  return 'safe';
}
