/**
 * Axis3 - Utility Functions
 * 
 * Common utility functions used across the application.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency (Turkish Lira)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date to Turkish locale
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(dateObj);
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

/**
 * Generate random UUID (client-side)
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Debounce function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep/delay function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Safe JSON parse
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeJsonParse<T = any>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Turkish phone number
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+90|0)?5\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Format Turkish phone number
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('90')) {
    return `+90 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`;
  }
  
  if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9, 11)}`;
  }
  
  return phone;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Apply discount
 */
export function applyDiscount(price: number, discountPercentage: number): number {
  return price * (1 - discountPercentage / 100);
}

/**
 * Calculate tax (KDV 18%)
 */
export function calculateTax(amount: number, taxRate: number = 18): number {
  return amount * (taxRate / 100);
}

/**
 * Get order status color
 */
export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    payment_received: 'text-blue-600 bg-blue-50',
    preparing: 'text-purple-600 bg-purple-50',
    printing: 'text-indigo-600 bg-indigo-50',
    quality_check: 'text-cyan-600 bg-cyan-50',
    packaging: 'text-teal-600 bg-teal-50',
    shipped: 'text-green-600 bg-green-50',
    delivered: 'text-green-700 bg-green-100',
    cancelled: 'text-red-600 bg-red-50',
    refunded: 'text-gray-600 bg-gray-50',
  };
  
  return colors[status] || 'text-gray-600 bg-gray-50';
}

/**
 * Get order status label (Turkish)
 */
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Beklemede',
    payment_received: 'Ödeme Alındı',
    preparing: 'Hazırlanıyor',
    printing: 'Baskıda',
    quality_check: 'Kalite Kontrolü',
    packaging: 'Paketleniyor',
    shipped: 'Kargoda',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    refunded: 'İade Edildi',
  };
  
  return labels[status] || status;
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download file
 */
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
