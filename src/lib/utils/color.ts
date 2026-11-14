/**
 * Renk yardımcıları (3B önizleme).
 *
 * Sepet/sipariş kayıtlarında renk serbest metin olarak tutulur: yükleme
 * sihirbazı İngilizce değerler (`White`), stok/admin ekranları Türkçe adlar
 * (`Beyaz`) yazar. Görüntüleyici her iki biçimi ve doğrudan `#rrggbb`
 * değerlerini aynı şekilde çözebilmeli; aksi hâlde seçilen renk sessizce
 * "Natural"a düşüyor ve model arka plandan ayrışmıyordu.
 */

const NAMED_COLORS: Record<string, string> = {
  natural: '#f5f5dc',
  white: '#ffffff',
  black: '#1a1a1a',
  red: '#ef4444',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#eab308',
  orange: '#ea580c',
  purple: '#9333ea',
  gray: '#6b7280',
  grey: '#6b7280',
  pink: '#ec4899',
  cyan: '#06b6d4',
  brown: '#92400e',
  gold: '#d4af37',
  silver: '#c0c0c0',
  transparent: '#e0e0e0',
  clear: '#e0e0e0',
  // Türkçe adlar (stok ve admin ekranları)
  doğal: '#f5f5dc',
  beyaz: '#ffffff',
  siyah: '#1a1a1a',
  kırmızı: '#ef4444',
  mavi: '#2563eb',
  yeşil: '#16a34a',
  sarı: '#eab308',
  turuncu: '#ea580c',
  mor: '#9333ea',
  gri: '#6b7280',
  pembe: '#ec4899',
  turkuaz: '#06b6d4',
  kahverengi: '#92400e',
  altın: '#d4af37',
  gümüş: '#c0c0c0',
  şeffaf: '#e0e0e0',
};

const FALLBACK_COLOR = NAMED_COLORS.natural;

/** `#rgb`, `#rrggbb` ve `rrggbb` biçimlerini `#rrggbb`ye çevirir. */
export function normalizeHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (!value) return null;

  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(value)) return `#${value.toLowerCase()}`;

  return null;
}

/** Renk adı veya hex → `#rrggbb`. Bilinmeyen değer "Natural" olur. */
export function resolveColorHex(input: string | null | undefined): string {
  const hex = normalizeHex(input);
  if (hex) return hex;

  const key = input?.trim().toLocaleLowerCase('tr-TR');
  if (key && NAMED_COLORS[key]) return NAMED_COLORS[key];

  return FALLBACK_COLOR;
}

/** `#rrggbb` → three.js'in beklediği 0xRRGGBB tam sayısı. */
export function hexToInt(hex: string): number {
  const normalized = normalizeHex(hex) ?? FALLBACK_COLOR;
  return Number.parseInt(normalized.slice(1), 16);
}

function channelToInt(hex: string, offset: number): number {
  return Number.parseInt(hex.slice(1 + offset * 2, 3 + offset * 2), 16);
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * İki rengi karıştırır. `amount=0` kaynak, `amount=1` hedef renktir.
 * Koyu/açık temada okunabilirlik için palet renklerini kaydırmakta kullanılır.
 */
export function mixHex(from: string, to: string, amount: number): string {
  const a = normalizeHex(from) ?? FALLBACK_COLOR;
  const b = normalizeHex(to) ?? FALLBACK_COLOR;
  const t = Math.max(0, Math.min(1, amount));

  const channels = [0, 1, 2].map((index) =>
    clampChannel(channelToInt(a, index) * (1 - t) + channelToInt(b, index) * t)
  );

  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** 0 = siyah, 1 = beyaz. Arka planla kontrast kararı için yeterli. */
export function relativeLuminance(hex: string): number {
  const value = normalizeHex(hex) ?? FALLBACK_COLOR;
  const [r, g, b] = [0, 1, 2].map((index) => {
    const channel = channelToInt(value, index) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Takım yolu renkleri koyu arka plan için seçilmiş parlak tonlardır. Açık
 * temada beyaz zemin üzerinde kaybolmamaları için biraz koyulaştırılır; koyu
 * temada renk olduğu gibi kalır.
 */
export function toolpathColor(hex: string, isDark: boolean): string {
  return isDark ? resolveColorHex(hex) : mixHex(resolveColorHex(hex), '#0f172a', 0.38);
}
