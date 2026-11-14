/**
 * PrusaSlicer G-Code → 3B önizleme verisi.
 *
 * Fiyat için üretilen G-Code atılmıyor; burada aynı dosyadan katman katman
 * takım yolları çıkarılıyor. Amaç, Bambu Studio benzeri bir önizlemede
 * duvarları, dolguyu, köprüleri ve **destek ayaklarını** gerçek koordinatlarıyla
 * göstermek. Hiçbir geometri uydurulmaz: her çizgi G-Code'daki bir G0/G1
 * hareketidir.
 *
 * Çıktı iki parçadır:
 *   meta   → JSON (istatistik, katmanlar, ayarlar, sınırlar, renk türleri)
 *   arrays → sıkıştırılmış ikili tampon (Int16 konum, Uint8 tür, katman, hız)
 *
 * İkili biçim (little-endian):
 *   0..3            : header JSON uzunluğu (uint32)
 *   4..4+len        : header JSON (UTF-8)
 *   align4          : Int16 konumlar (segment başına 6 değer: x1 y1 z1 x2 y2 z2)
 *   +12*count       : Uint8 tür indeksleri
 *   align4          : katman indeksleri (Uint16 veya Uint32)
 *   +layerBytes*count: Uint16 hız (mm/s × 10)
 *
 * Konumlar eksen başına [min,max] aralığına normalize edilir; istemci aynı
 * sınırlarla çözer. Böylece 1 mikron altı hassasiyet korunurken dosya küçülür.
 */

import { parseDuration, parseGcodeSummary } from './gcode-summary.mjs';

/* -------------------------------------------------------------------------- */
/* Türler                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Görüntüleyicideki renk türleri. Sıra, ikili dosyadaki `types` indeksiyle
 * birebir aynı olmalıdır; istemci bu listeyi başlıktan okur.
 */
export const PREVIEW_TYPES = [
  { id: 'travel', label: 'Yol', color: '#64748b', visible: false },
  { id: 'outer_wall', label: 'Dış duvar', color: '#f97316', visible: true },
  { id: 'inner_wall', label: 'İç duvar', color: '#facc15', visible: true },
  { id: 'sparse_infill', label: 'Seyrek dolgu', color: '#3b82f6', visible: true },
  { id: 'solid_infill', label: 'Dolgu', color: '#22c55e', visible: true },
  { id: 'top_solid_infill', label: 'Üst yüzey', color: '#10b981', visible: true },
  { id: 'bridge_infill', label: 'Köprü', color: '#ef4444', visible: true },
  { id: 'support', label: 'Destek', color: '#06b6d4', visible: true },
  { id: 'support_interface', label: 'Destek arayüzü', color: '#a78bfa', visible: true },
  { id: 'skirt_brim', label: 'Etek / brim', color: '#94a3b8', visible: true },
  { id: 'other', label: 'Diğer', color: '#e2e8f0', visible: true },
];

/** `;TYPE:` etiketlerini görüntüleyici türlerine eşler. */
const TYPE_MAP = {
  'External perimeter': 'outer_wall',
  'Perimeter': 'inner_wall',
  'Overhang perimeter': 'outer_wall',
  'Internal infill': 'sparse_infill',
  'Solid infill': 'solid_infill',
  'Top solid infill': 'top_solid_infill',
  'Bridge infill': 'bridge_infill',
  'Support material': 'support',
  'Support material interface': 'support_interface',
  'Skirt/Brim': 'skirt_brim',
  'Custom': 'other',
};

function typeIndexFor(label) {
  const id = TYPE_MAP[label] ?? 'other';
  const index = PREVIEW_TYPES.findIndex((t) => t.id === id);
  return index >= 0 ? index : PREVIEW_TYPES.length - 1;
}

/* -------------------------------------------------------------------------- */
/* Başlık ayrıştırma                                                           */
/* -------------------------------------------------------------------------- */

/** Görüntüleyicide gösterilecek PrusaSlicer ayarları. */
const CONFIG_KEYS = [
  'layer_height',
  'first_layer_height',
  'perimeters',
  'top_solid_layers',
  'bottom_solid_layers',
  'fill_density',
  'fill_pattern',
  'nozzle_diameter',
  'filament_type',
  'filament_density',
  'temperature',
  'first_layer_temperature',
  'bed_temperature',
  'first_layer_bed_temperature',
  'perimeter_speed',
  'external_perimeter_speed',
  'infill_speed',
  'solid_infill_speed',
  'travel_speed',
  'max_volumetric_speed',
  'support_material',
  'support_material_angle',
  'support_material_threshold',
  'printer_model',
  'printer_variant',
];

function readConfig(text) {
  const start = text.indexOf('; prusaslicer_config = begin');
  const end = text.indexOf('; prusaslicer_config = end');
  if (start < 0 || end < start) return {};

  const config = {};
  for (const line of text.slice(start, end).split('\n')) {
    const match = /^; ([a-z0-9_]+) = (.*)$/.exec(line.trim());
    if (!match) continue;
    const [, key, value] = match;
    if (CONFIG_KEYS.includes(key)) config[key] = value;
  }
  return config;
}

function readHeaderNumber(text, pattern) {
  const match = pattern.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

/* -------------------------------------------------------------------------- */
/* Ana ayrıştırıcı                                                             */
/* -------------------------------------------------------------------------- */

const MOVE_RE = /^G[01]\b/;

/** `X1.5` / `Y-2` / `E0.123` / `F1800` / `Z0.2` alanlarını okur. */
function readWord(code, letter) {
  const match = new RegExp(`(?:^|\\s)${letter}(-?\\d+(?:\\.\\d+)?)`).exec(code);
  return match ? Number(match[1]) : null;
}

function round(value, decimals = 4) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * G-Code metnini önizleme verisine çevirir.
 *
 * @param {string} text
 * @param {{ maxSegments?: number }} [options]
 * @returns {{
 *   meta: Record<string, any>,
 *   positions: Int16Array,
 *   types: Uint8Array,
 *   layers: Uint16Array | Uint32Array,
 *   speeds: Uint16Array,
 *   segmentCount: number,
 * }}
 */
export function buildGcodePreview(text, options = {}) {
  if (typeof text !== 'string' || text === '') {
    throw new Error('G-Code metni boş');
  }

  const summary = parseGcodeSummary(text);
  if (!summary) {
    throw new Error('G-Code başlığından gram bilgisi okunamadı');
  }

  const maxSegments = Number.isFinite(options.maxSegments)
    ? Math.max(1, Math.floor(options.maxSegments))
    : 2_500_000;

  const lines = text.split('\n');

  let absoluteE = true;
  let lastE = 0;
  let x = 0;
  let y = 0;
  let z = 0;
  let feedMmMin = 0;
  /** İlk X/Y hareketine kadar başlangıç noktası bilinmez (G28 sonrası). */
  let positionKnown = false;

  /** @type {{z:number,height:number,seconds:number,filamentMm:number,supportMm:number,object:boolean}[]} */
  const layers = [];
  /** Aynı Z'deki destek bloklarını aynı katmana bağlamak için son Z. */
  let lastZ = null;
  let currentLayer = -1;
  /** `;Z:` satırından sonra gelen `;HEIGHT:` değeri. */
  let pendingHeight = 0;
  let typeLabel = 'Custom';
  let typeIndex = typeIndexFor(typeLabel);

  const positions = [];
  const segmentTypes = [];
  const segmentLayers = [];
  const segmentSpeeds = [];

  const typeStats = PREVIEW_TYPES.map((type) => ({
    id: type.id,
    label: type.label,
    color: type.color,
    visible: type.visible,
    extrusionMm: 0,
    travelMm: 0,
    seconds: 0,
  }));

  let totalExtrusionMm = 0;
  let supportExtrusionMm = 0;
  let droppedSegments = 0;

  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  /** Kamera ve tabla yerleşimi için yalnızca ekstrüzyon sınırları. */
  const printMin = [Infinity, Infinity, Infinity];
  const printMax = [-Infinity, -Infinity, -Infinity];

  const includePoint = (px, py, pz) => {
    if (px < min[0]) min[0] = px;
    if (py < min[1]) min[1] = py;
    if (pz < min[2]) min[2] = pz;
    if (px > max[0]) max[0] = px;
    if (py > max[1]) max[1] = py;
    if (pz > max[2]) max[2] = pz;
  };

  const includePrintPoint = (px, py, pz) => {
    if (px < printMin[0]) printMin[0] = px;
    if (py < printMin[1]) printMin[1] = py;
    if (pz < printMin[2]) printMin[2] = pz;
    if (px > printMax[0]) printMax[0] = px;
    if (py > printMax[1]) printMax[1] = py;
    if (pz > printMax[2]) printMax[2] = pz;
  };

  const pushSegment = (x1, y1, z1, x2, y2, z2, layer, type, speedMmS) => {
    const length = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    if (length < 0.005) return;

    if (positions.length / 6 >= maxSegments) {
      droppedSegments += 1;
      return;
    }

    positions.push(x1, y1, z1, x2, y2, z2);
    segmentTypes.push(type);
    segmentLayers.push(layer);
    segmentSpeeds.push(Math.min(6553.5, Math.max(0, speedMmS * 10)));
    includePoint(x1, y1, z1);
    includePoint(x2, y2, z2);
  };

  for (const rawLine of lines) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    if (line.startsWith(';Z:')) {
      z = Number(line.slice(3));
      if (!Number.isFinite(z)) continue;

      // Destek, PrusaSlicer'da aynı Z için ayrı bir LAYER_CHANGE bloğu üretir.
      // Bunlar tek görüntüleme katmanında birleştirilir.
      if (lastZ !== null && Math.abs(z - lastZ) < 0.0005) {
        // aynı katman
      } else {
        layers.push({
          z: round(z, 3),
          height: pendingHeight > 0 ? round(pendingHeight, 3) : 0,
          seconds: 0,
          filamentMm: 0,
          supportMm: 0,
          object: false,
        });
        currentLayer = layers.length - 1;
        lastZ = z;
      }
      continue;
    }

    if (line.startsWith(';HEIGHT:')) {
      pendingHeight = Number(line.slice(8));
      if (currentLayer >= 0 && Number.isFinite(pendingHeight) && pendingHeight > 0) {
        layers[currentLayer].height = round(pendingHeight, 3);
      }
      continue;
    }

    if (line.startsWith(';TYPE:')) {
      typeLabel = line.slice(';TYPE:'.length).trim();
      typeIndex = typeIndexFor(typeLabel);
      continue;
    }

    if (line.startsWith('M82')) {
      absoluteE = true;
      continue;
    }
    if (line.startsWith('M83')) {
      absoluteE = false;
      continue;
    }
    if (line.startsWith('G92')) {
      const e = readWord(line, 'E');
      if (e !== null) lastE = e;
      continue;
    }

    if (!MOVE_RE.test(line)) continue;

    // Yorumdan sonraki kısmı işle; `;` içindeki sayılar alan sanılmasın.
    const code = line.split(';', 1)[0];

    const nx = readWord(code, 'X');
    const ny = readWord(code, 'Y');
    const nz = readWord(code, 'Z');
    const e = readWord(code, 'E');
    const f = readWord(code, 'F');

    if (f !== null && f > 0) feedMmMin = f;

    const px = x;
    const py = y;
    const pz = z;

    if (nx !== null) x = nx;
    if (ny !== null) y = ny;
    if (nz !== null) z = nz;

    let deltaE = 0;
    if (e !== null) {
      deltaE = absoluteE ? e - lastE : e;
      if (absoluteE) lastE = e;
    }

    const dx = x - px;
    const dy = y - py;
    const dz = z - pz;
    const xyDistance = Math.hypot(dx, dy);
    const distance = Math.hypot(dx, dy, dz);
    if (distance < 0.0005) continue;

    const speedMmS = feedMmMin > 0 ? feedMmMin / 60 : 0;
    const seconds = speedMmS > 0 ? distance / speedMmS : 0;

    // İlk `;Z:` satırından önceki hareketler (homing, ısınma) modele aittir
    // değildir; önizlemeye katılmaz.
    if (currentLayer < 0) continue;

    // İlk X/Y hareketinin başlangıcı bilinmiyor (0,0 varsaymak modele sahte
    // bir çizgi ekler). Yalnızca konum kaydedilir, segment üretilmez.
    if (!positionKnown) {
      if (nx !== null || ny !== null) positionKnown = true;
      continue;
    }

    const layer = currentLayer;

    if (deltaE > 0 && xyDistance > 0) {
      // Gerçek ekstrüzyon: takım yolu.
      const isSupport = typeIndex === 7 || typeIndex === 8;
      pushSegment(px, py, pz, x, y, z, layer, typeIndex, speedMmS);
      includePrintPoint(px, py, pz);
      includePrintPoint(x, y, z);
      typeStats[typeIndex].extrusionMm += deltaE;
      typeStats[typeIndex].seconds += seconds;
      totalExtrusionMm += deltaE;
      if (isSupport) supportExtrusionMm += deltaE;

      if (currentLayer >= 0) {
        const current = layers[currentLayer];
        current.filamentMm += deltaE;
        current.seconds += seconds;
        if (isSupport) current.supportMm += deltaE;
        else current.object = true;
      }
    } else if (eq(deltaE, 0) && xyDistance > 0) {
      // Seyahat: varsayılan olarak gizli, açılabilir.
      pushSegment(px, py, pz, x, y, z, layer, 0, speedMmS);
      typeStats[0].travelMm += xyDistance;
      typeStats[0].seconds += seconds;
      if (currentLayer >= 0) layers[currentLayer].seconds += seconds;
    }
  }

  const segmentCount = segmentTypes.length;
  if (segmentCount === 0) {
    throw new Error('G-Code içinde görüntülenecek hareket bulunamadı');
  }

  // Gram dağılımı: toplam gram başlıktan, türlere ekstrüzyon uzunluğuyla
  // oranlanır. Böylece görüntüleyicideki toplam fiyatla aynı gram çıkar.
  const gramScale = totalExtrusionMm > 0 ? summary.grams / totalExtrusionMm : 0;
  const supportScale = totalExtrusionMm > 0 ? summary.supportGrams / totalExtrusionMm : 0;

  for (const stats of typeStats) {
    stats.grams = round(stats.extrusionMm * gramScale, 3);
    stats.seconds = round(stats.seconds, 1);
    stats.extrusionMm = round(stats.extrusionMm, 1);
    stats.travelMm = round(stats.travelMm, 1);
  }

  // Bireysel süreler ivme/deceleration kaynaklı sapabilir; toplam başlık
  // süresine ölçeklenir ki paneldeki süre fiyat süresiyle aynı olsun.
  const measuredSeconds = layers.reduce((sum, layer) => sum + layer.seconds, 0);
  const timeScale = measuredSeconds > 0 ? summary.printSeconds / measuredSeconds : 0;

  for (const layer of layers) {
    layer.seconds = round(layer.seconds * timeScale, 1);
    layer.filamentMm = round(layer.filamentMm, 1);
    layer.grams = round(layer.filamentMm * gramScale, 3);
    layer.supportGrams = round(layer.supportMm * supportScale, 3);
    delete layer.supportMm;
  }

  for (const stats of typeStats) {
    stats.seconds = round(stats.seconds * timeScale, 1);
  }

  const objectLayers = layers.filter((layer) => layer.object).length;

  // Boş (hareketsiz) katmanlar kalmasın: katman indeksleri kaydırılır.
  const usedLayers = [];
  const layerRemap = new Map();
  for (let i = 0; i < layers.length; i += 1) {
    layerRemap.set(i, usedLayers.length);
    usedLayers.push(layers[i]);
  }

  for (let i = 0; i < segmentLayers.length; i += 1) {
    segmentLayers[i] = layerRemap.get(segmentLayers[i]) ?? 0;
  }

  const safeMin = min.map((value) => (Number.isFinite(value) ? value : 0));
  const safeMax = max.map((value) => (Number.isFinite(value) ? value : 0));
  const printSafeMin = printMin.map((value, axis) => (Number.isFinite(value) ? value : safeMin[axis]));
  const printSafeMax = printMax.map((value, axis) => (Number.isFinite(value) ? value : safeMax[axis]));

  const layerBytes = usedLayers.length > 65535 ? 4 : 2;
  const layerArray = layerBytes === 2 ? new Uint16Array(segmentCount) : new Uint32Array(segmentCount);
  layerArray.set(segmentLayers);

  const positionsArray = new Int16Array(segmentCount * 6);
  for (let i = 0; i < segmentCount; i += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      const span = safeMax[axis] - safeMin[axis];
      const q = (value) => {
        if (span <= 0) return 0;
        const normalized = ((value - safeMin[axis]) / span) * 2 - 1;
        return Math.max(-32767, Math.min(32767, Math.round(normalized * 32767)));
      };
      positionsArray[i * 6 + axis] = q(positions[i * 6 + axis]);
      positionsArray[i * 6 + 3 + axis] = q(positions[i * 6 + 3 + axis]);
    }
  }

  const typesArray = new Uint8Array(segmentTypes);
  const speedsArray = new Uint16Array(segmentCount);
  for (let i = 0; i < segmentCount; i += 1) {
    speedsArray[i] = Math.round(segmentSpeeds[i]);
  }

  const config = readConfig(text);
  const generatedBy =
    /^; generated by (.+)$/m.exec(text)?.[1]?.trim() ?? null;
  const filamentCost = readHeaderNumber(text, /^; total filament cost = ([\d.]+)$/m);

  const headerStats = {
    grams: summary.grams,
    supportGrams: summary.supportGrams,
    printSeconds: summary.printSeconds ?? 0,
    layerCount: objectLayers || summary.layerCount,
    filamentMm: summary.filamentMm ?? 0,
    filamentCost,
  };

  const meta = {
    version: 1,
    engine: 'prusaslicer',
    generatedBy,
    stats: headerStats,
    config,
    types: PREVIEW_TYPES.map((type, index) => ({
      ...type,
      ...typeStats[index],
    })),
    layers: usedLayers,
    bounds: { min: safeMin.map((v) => round(v, 3)), max: safeMax.map((v) => round(v, 3)) },
    printBounds: {
      min: printSafeMin.map((v) => round(v, 3)),
      max: printSafeMax.map((v) => round(v, 3)),
    },
    segmentCount,
    layerIndexBytes: layerBytes,
    droppedSegments,
    summary: {
      grams: summary.grams,
      supportGrams: summary.supportGrams,
      printSeconds: summary.printSeconds,
      layerCount: summary.layerCount,
      filamentMm: summary.filamentMm,
    },
  };

  return {
    meta,
    positions: positionsArray,
    types: typesArray,
    layers: layerArray,
    speeds: speedsArray,
    segmentCount,
  };
}

/** Kayan nokta karşılaştırması (E deltası için). */
function eq(value, target) {
  return Math.abs(value - target) < 1e-9;
}

/**
 * Önizlemeyi tek bir ikili tampona yazar.
 *
 * @param {ReturnType<typeof buildGcodePreview>} preview
 * @returns {Buffer}
 */
export function encodeGcodePreview(preview) {
  const headerBytes = Buffer.from(JSON.stringify(preview.meta), 'utf8');
  const arraysStart = align4(4 + headerBytes.length);
  const positionsStart = arraysStart;
  const typesStart = positionsStart + preview.segmentCount * 12;
  const layersStart = align4(typesStart + preview.segmentCount);
  const speedsStart = layersStart + preview.segmentCount * preview.meta.layerIndexBytes;
  const totalLength = speedsStart + preview.segmentCount * 2;

  const buffer = Buffer.alloc(totalLength);

  buffer.writeUInt32LE(headerBytes.length, 0);
  headerBytes.copy(buffer, 4);

  writeInt16(buffer, preview.positions, positionsStart);
  buffer.set(preview.types, typesStart);

  if (preview.meta.layerIndexBytes === 2) {
    writeUint16(buffer, preview.layers, layersStart);
  } else {
    writeUint32(buffer, preview.layers, layersStart);
  }

  writeUint16(buffer, preview.speeds, speedsStart);

  return buffer;
}

function align4(value) {
  return (value + 3) & ~3;
}

function writeInt16(buffer, array, offset) {
  for (let i = 0; i < array.length; i += 1) {
    buffer.writeInt16LE(array[i], offset + i * 2);
  }
}

function writeUint16(buffer, array, offset) {
  for (let i = 0; i < array.length; i += 1) {
    buffer.writeUInt16LE(array[i], offset + i * 2);
  }
}

function writeUint32(buffer, array, offset) {
  for (let i = 0; i < array.length; i += 1) {
    buffer.writeUInt32LE(array[i], offset + i * 4);
  }
}
