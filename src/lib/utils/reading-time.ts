/**
 * Reading Time Calculator
 * Calculates estimated reading time for text content
 */

export function calculateReadingTime(text: string): number {
  // Average reading speed: 200 words per minute
  const wordsPerMinute = 200;
  
  // Remove HTML tags
  const plainText = text.replace(/<[^>]*>/g, '');
  
  // Count words (split by whitespace)
  const words = plainText.trim().split(/\s+/).length;
  
  // Calculate minutes
  const minutes = Math.ceil(words / wordsPerMinute);
  
  // Minimum 1 minute
  return Math.max(1, minutes);
}

export function formatReadingTime(minutes: number): string {
  if (minutes === 1) {
    return '1 dakika';
  }
  return `${minutes} dakika`;
}
