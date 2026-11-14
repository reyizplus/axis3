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
 * PrusaSlicer 2.5 "toplam katman sayısı" satırı yazmıyor. Katman sayısı
 * `;LAYER_CHANGE` sayısıyla da türetilemez: destek açıkken PrusaSlicer desteği
 * ayrı bir katman olarak dilimler ve `;LAYER_CHANGE` sayısı ikiye katlanır
 * (gerçek model 280 katman → 532 işaret). Bu yüzden nesne katmanı, içinde
 * destek dışı en az bir `;TYPE:` bölümü bulunan `;LAYER_CHANGE` bloklarının
 * sayısıdır.
 *
 * Destek gramı da başlıktan okunamaz: `filament used [g]` desteği içerir ama
 * ayrıştırmaz. Bu yüzden gövdedeki `;TYPE:Support material` bölümlerinin
 * ekstrüzyon payı ölçülür ve toplam grama oranlanır. Yalnızca X/Y içeren
 * gerçek ekstrüzyon hareketleri sayılır; saf E hareketleri (retract/unretract)
 * başlıktaki `filament used [mm]` toplamına girmez, sayılırsa toplam şişer.
 */

/** `; filament used [g] = 4.49` — `; total filament used [g]` satırıyla eşleşmez. */
const GRAMS_RE = /^; filament used \[g\] = ([\d.]+)$/m;

/** `; filament used [mm] = 1504.88` */
const FILAMENT_MM_RE = /^; filament used \[mm\] = ([\d.]+)$/m;

/** `; estimated printing time (normal mode) = 19m 11s` */
const PRINT_TIME_RE = /^; estimated printing time \(normal mode\) = (.+)$/m;

/** Katman değişimi işaretleri. */
const LAYER_CHANGE_RE = /^;LAYER_CHANGE$/gm;

/** PrusaSlicer destek bölümleri: `Support material`, `Support material interface`. */
const SUPPORT_TYPE_PREFIX = 'Support material';

/** `G1 X1 Y2 E3.5` satırındaki E değeri. */
const E_VALUE_RE = /(?:^|\s)E(-?\d+(?:\.\d+)?)/;

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

/** Satırdaki E değerini okur; yoksa `null`. */
function parseEValue(line) {
  const match = E_VALUE_RE.exec(line);
  if (!match) return null;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/**
 * G-Code gövdesini tek geçişte tarar: toplam/destek ekstrüzyonu ve nesne
 * katman sayısı.
 *
 * Mutlak (`M82`) ve göreli (`M83`) ekstrüzyon modları desteklenir; `G92 E...`
 * sıfırlamaları takip edilir. Aksi halde katman başına sıfırlama sonrası
 * deltalar yanlış hesaplanır ve gram sapar.
 *
 * @param {string[]} lines
 */
function scanGcode(lines) {
  let relativeE = false;
  let lastE = 0;
  let totalMm = 0;
  let supportMm = 0;
  let type = null;
  let hasTypeMarker = false;
  let objectLayers = 0;
  let inLayer = false;
  let layerHasObject = false;

  const finishLayer = () => {
    if (inLayer && layerHasObject) objectLayers += 1;
  };

  for (const rawLine of lines) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    if (line.startsWith(';LAYER_CHANGE')) {
      finishLayer();
      inLayer = true;
      layerHasObject = false;
      continue;
    }

    if (line.startsWith(';TYPE:')) {
      type = line.slice(';TYPE:'.length).trim();
      hasTypeMarker = true;
      if (inLayer && !type.startsWith(SUPPORT_TYPE_PREFIX)) {
        layerHasObject = true;
      }
      continue;
    }

    if (line.startsWith('M82')) {
      relativeE = false;
      continue;
    }

    if (line.startsWith('M83')) {
      relativeE = true;
      continue;
    }

    if (line.startsWith('G92')) {
      const e = parseEValue(line);
      if (e !== null) lastE = e;
      continue;
    }

    if (!line.startsWith('G1')) continue;

    // Yorumlar atılır: `;` sonrası metin E değeri sanılmasın.
    const code = line.split(';', 1)[0];

    const e = parseEValue(code);
    if (e === null) continue;

    // E konumu her G1'de güncellenir (retract/unretract dahil), aksi halde
    // mutlak modda bir sonraki ekstrüzyon deltası yanlış hesaplanır. Toplama
    // ise yalnızca X/Y içeren gerçek ekstrüzyon hareketleri girer; saf E
    // hareketleri başlıktaki filament toplamında yoktur.
    const delta = relativeE ? e : e - lastE;
    if (!relativeE) lastE = e;

    if (!code.includes('X') && !code.includes('Y')) continue;
    if (!Number.isFinite(delta) || delta === 0) continue;

    totalMm += delta;
    if (type !== null && type.startsWith(SUPPORT_TYPE_PREFIX)) supportMm += delta;
  }

  finishLayer();

  return { totalMm, supportMm, objectLayers, hasTypeMarker };
}

/**
 * G-Code başlığını özetler.
 *
 * Zorunlu alan: `grams` (filament satırı yoksa tüm sonuç `null`).
 * Diğer alanlar bulunamazsa `null` döner — asla 0 uydurulmaz.
 *
 * `supportGrams` ölçülemezse (gövdede hiç ekstrüzyon yok) 0 döner; bu değer
 * yalnızca kırılım içindir, fiyat toplam gramdan hesaplanır.
 *
 * @param {unknown} text
 * @returns {{ grams: number, printSeconds: number | null, layerCount: number, filamentMm: number | null, supportGrams: number } | null}
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
  const scan = scanGcode(text.split('\n'));

  // Destek açıkken `;LAYER_CHANGE` sayısı desteğin ayrı katmanları yüzünden
  // ikiye katlanır; doğru sayı nesne bölümü içeren bloklardır. Eski/desteksiz
  // çıktılarda `;TYPE:` hiç yoksa eski yönteme düşülür.
  const layerCount =
    scan.objectLayers > 0 ? scan.objectLayers : layerChanges + 1;

  const supportRatio =
    scan.totalMm > 0 ? Math.min(1, Math.max(0, scan.supportMm / scan.totalMm)) : 0;
  const supportGrams = Math.round(grams * supportRatio * 10000) / 10000;

  return {
    grams,
    printSeconds,
    layerCount,
    filamentMm,
    supportGrams,
  };
}
