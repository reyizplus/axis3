/**
 * PrusaSlicer G-Code başlığını (header) ayrıştıran saf fonksiyonlar.
 *
 * Ölçülen gerçek çıktı (20 mm küp, 0.2 mm katman, %20 doluluk):
 *   ; filament used [mm] = 1504.88
 *   ; filament used [cm3] = 3.62
 *   ; filament used [g] = 4.49
 *   ; total filament used [g] = 4.49
 *   ; estimated printing time (normal mode) = 19m 11s
 *
 * PrusaSlicer 2.5 "toplam katman sayısı" satırı yazmıyor; katman sayısı
 * `;LAYER_CHANGE` satırlarının sayısı + 1 olarak türetilir.
 */

/** `; filament used [g] = 4.49` — `; total filament used [g]` satırıyla eşleşmez. */
const GRAMS_RE = /^; filament used \[g\] = ([\d.]+)$/m;

/** `; filament used [mm] = 1504.88` */
const FILAMENT_MM_RE = /^; filament used \[mm\] = ([\d.]+)$/m;

/** `; estimated printing time (normal mode) = 19m 11s` */
const PRINT_TIME_RE = /^; estimated printing time \(normal mode\) = (.+)$/m;

/** Katman değişimi işaretleri. */
const LAYER_CHANGE_RE = /^;LAYER_CHANGE$/gm;

const DURATION_UNIT_SECONDS = { d: 86400, h: 3600, m: 60, s: 1 };

/**
 * `2d 3h 4m 5s`, `1h 2m`, `19m 11s`, `45s` gibi süreleri saniyeye çevirir.
 * Ayrıştırılamayan girdide 0 değil `null` döner (sessiz sıfır üretilmez).
 *
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseDuration(value) {
  if (typeof value !== 'string') return null;

  const text = value.trim().toLowerCase();
  if (text === '') return null;

  const partRe = /(\d+(?:\.\d+)?)\s*([dhms])/g;
  let total = 0;
  let parts = 0;
  let cursor = 0;
  let match;

  while ((match = partRe.exec(text)) !== null) {
    // Parçalar arasında yalnızca boşluk olabilir; "1h 2x" gibi artıklar reddedilir.
    if (text.slice(cursor, match.index).trim() !== '') return null;

    const amount = Number(match[1]);
    if (!Number.isFinite(amount)) return null;

    total += amount * DURATION_UNIT_SECONDS[match[2]];
    cursor = match.index + match[0].length;
    parts += 1;
  }

  if (parts === 0) return null;
  if (text.slice(cursor).trim() !== '') return null;

  return Math.round(total);
}

/**
 * G-Code başlığını özetler.
 *
 * Zorunlu alan: `grams` (filament satırı yoksa tüm sonuç `null`).
 * Diğer alanlar bulunamazsa `null` döner — asla 0 uydurulmaz.
 *
 * @param {unknown} text
 * @returns {{ grams: number, printSeconds: number | null, layerCount: number, filamentMm: number | null } | null}
 */
export function parseGcodeSummary(text) {
  if (typeof text !== 'string' || text === '') return null;

  const gramsMatch = GRAMS_RE.exec(text);
  if (!gramsMatch) return null;

  const grams = Number(gramsMatch[1]);
  if (!Number.isFinite(grams)) return null;

  const filamentMatch = FILAMENT_MM_RE.exec(text);
  const filamentMmValue = filamentMatch ? Number(filamentMatch[1]) : null;
  const filamentMm = Number.isFinite(filamentMmValue) ? filamentMmValue : null;

  const timeMatch = PRINT_TIME_RE.exec(text);
  const printSeconds = timeMatch ? parseDuration(timeMatch[1]) : null;

  const layerChanges = text.match(LAYER_CHANGE_RE)?.length ?? 0;

  return {
    grams,
    printSeconds,
    layerCount: layerChanges + 1,
    filamentMm,
  };
}
