/**
 * G-Code Analiz Önbelleği (profil bazlı)
 *
 * Fiyat motoru G-Code verisini yalnızca (file_id, profile_hash) çiftiyle
 * eşleşen satırdan okur. Bu dosya o sözleşmenin tek uygulama noktasıdır:
 * okuma da yazma da hash'e bağlıdır.
 *
 * Neden hash şart: aynı STL farklı kalite/doluluk/nozul ile dilimlendiğinde
 * gram ve süre tamamen değişir. Hash olmadan "dosyanın en son analizi"
 * kullanılırsa kalite değişiminde eski veriyle fiyat verilir ve müşteriye
 * gösterilen tutar ile sunucunun hesapladığı tutar sessizce ayrışır.
 */

/** Önbellekten dönen, fiyatlamaya hazır analiz. */
export interface CachedAnalysis {
  grams: number;
  /** Destek payı (gram); toplam gramın içindedir, fiyatı etkilemez. */
  supportGrams: number;
  printSeconds: number;
  layerCount: number;
  filamentMm: number;
  profileHash: string;
  engine: string | null;
}

/** `sliceModel()` sonucunun bu katmanın ihtiyaç duyduğu alt kümesi. */
export interface AnalysisStats {
  grams: number;
  /** Destek payı (gram). Kırılım içindir; fiyat toplam gramdan hesaplanır. */
  supportGrams?: number | null;
  printSeconds: number;
  layerCount: number;
  filamentMm?: number;
  durationMs?: number;
  engine?: string;
}

export interface SaveAnalysisInput {
  fileId: string;
  profileHash: string;
  profileJson: unknown;
  stats: AnalysisStats;
  slicingJobId?: string | null;
}

/**
 * Supabase istemcisinin kullandığımız yüzeyi. Gerçek istemci (kullanıcı
 * oturumu veya service role) bu yapıya uyar; testler taklit eder.
 */
interface QueryBuilder {
  select(columns: string): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  limit(count: number): QueryBuilder;
  maybeSingle(): PromiseLike<{ data: unknown; error: unknown }>;
  upsert(
    row: Record<string, unknown>,
    options?: { onConflict?: string }
  ): PromiseLike<{ error: unknown }>;
}

export interface AnalysisCacheClient {
  from(table: string): QueryBuilder;
}

const ANALYSIS_COLUMNS = [
  'filament_weight_grams',
  'support_weight_grams',
  'actual_print_time_seconds',
  'actual_print_time_hours',
  'total_layer_count',
  'filament_length_mm',
  'raw_header',
  'profile_hash',
  'engine',
].join(', ');

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Eski kayıtlar simüle edilmiş çıktı içerebilir; onlarla asla fiyat verilmez. */
function isSimulated(rawHeader: unknown): boolean {
  if (!rawHeader) return false;
  try {
    return JSON.stringify(rawHeader).includes('SIMULATED');
  } catch {
    return false;
  }
}

/**
 * (fileId, profileHash) için önbellek kaydı. Yoksa, eşleşmiyorsa veya satır
 * kullanılamaz durumdaysa `null` döner — çağıran hacim tahminine düşer.
 */
export async function getCachedAnalysis(
  client: AnalysisCacheClient,
  fileId: string,
  profileHash: string
): Promise<CachedAnalysis | null> {
  if (!fileId || !profileHash) return null;

  const { data, error } = await client
    .from('gcode_analysis_results')
    .select(ANALYSIS_COLUMNS)
    .eq('file_id', fileId)
    .eq('profile_hash', profileHash)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;

  if (isSimulated(row.raw_header)) return null;

  const storedHash = typeof row.profile_hash === 'string' ? row.profile_hash : '';
  if (storedHash !== profileHash) return null;

  const grams = toNumber(row.filament_weight_grams);
  const secondsFromColumn = toNumber(row.actual_print_time_seconds);
  const secondsFromHours = toNumber(row.actual_print_time_hours) * 3600;
  const printSeconds = secondsFromColumn > 0 ? secondsFromColumn : secondsFromHours;

  // Eksik/bozuk satır fiyatlamaya girmemeli: sessizce 0 gram ile fiyat vermek
  // bedava iş üretir.
  if (!(grams > 0) || !(printSeconds > 0)) return null;

  return {
    grams: roundTo(grams, 4),
    supportGrams: roundTo(Math.min(grams, Math.max(0, toNumber(row.support_weight_grams))), 4),
    printSeconds: Math.round(printSeconds),
    layerCount: Math.max(1, Math.round(toNumber(row.total_layer_count))),
    filamentMm: roundTo(toNumber(row.filament_length_mm), 2),
    profileHash,
    engine: typeof row.engine === 'string' ? row.engine : null,
  };
}

/**
 * Analizi (file_id, profile_hash) anahtarıyla yazar. Aynı çift tekrar
 * dilimlenirse satır güncellenir; unique index son savunma hattıdır.
 */
export async function saveAnalysis(
  client: AnalysisCacheClient,
  input: SaveAnalysisInput
): Promise<void> {
  const { fileId, profileHash, profileJson, stats, slicingJobId } = input;

  if (!fileId || !profileHash) {
    throw new Error('saveAnalysis: fileId ve profileHash zorunlu');
  }
  if (!(stats.grams > 0) || !(stats.printSeconds > 0)) {
    throw new Error('saveAnalysis: geçersiz dilimleme sonucu (grams/printSeconds > 0 olmalı)');
  }

  const row: Record<string, unknown> = {
    file_id: fileId,
    slicing_job_id: slicingJobId ?? null,
    profile_hash: profileHash,
    profile_json: profileJson ?? null,
    engine: stats.engine ?? null,
    duration_ms: stats.durationMs != null ? Math.round(stats.durationMs) : null,
    filament_weight_grams: roundTo(stats.grams, 4),
    // Destek, toplam gramın içindedir; burada yalnızca kırılım için saklanır.
    // Ölçülemediyse 0 yazılır (fiyat toplam gramdan hesaplandığı için sapmaz).
    support_weight_grams:
      stats.supportGrams != null && Number.isFinite(stats.supportGrams)
        ? roundTo(Math.min(stats.grams, Math.max(0, stats.supportGrams)), 4)
        : 0,
    filament_length_mm: stats.filamentMm != null ? roundTo(stats.filamentMm, 2) : null,
    actual_print_time_seconds: Math.round(stats.printSeconds),
    actual_print_time_hours: roundTo(stats.printSeconds / 3600, 2),
    total_layer_count: Math.max(1, Math.round(stats.layerCount)),
    raw_header: {
      source: 'prusaslicer',
      engine: stats.engine ?? null,
      profileHash,
      durationMs: stats.durationMs ?? null,
    },
  };

  const { error } = await client
    .from('gcode_analysis_results')
    .upsert(row, { onConflict: 'file_id,profile_hash' });

  if (error) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'bilinmeyen hata';
    throw new Error(`saveAnalysis: analiz kaydedilemedi (${message})`);
  }
}
