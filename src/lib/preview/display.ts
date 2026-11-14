/** Önizleme panelinde paylaşılan biçimlendirme yardımcıları. */

export type ToolpathColorMode = 'type' | 'speed';

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) return `${hours} sa ${minutes} dk`;
  if (minutes > 0) return `${minutes} dk ${secs} sn`;
  return `${secs} sn`;
}

export function formatGrams(value: number): string {
  return `${value.toFixed(2)} g`;
}
