/**
 * POST /api/pricing/preview
 *
 * Fiyat için dilimlenen modelin **gerçek takım yollarını** döner: duvarlar,
 * dolgu, köprüler, destek ayakları. Girdi sözleşmesi `/api/pricing/slice` ile
 * aynıdır; çıktı fiyat özeti + imzalı önizleme URL'sidir.
 *
 *   { fileId, materialId, printSettingId?, nozzleSizeMm?, supportEnabled?, custom? }
 *     → { success, cached, profileHash, stats, preview: { url, ... } }
 *     → { success, stats, preview: null, previewError }   // önizleme üretilemedi
 *
 * Kurallar:
 * - Oturum zorunlu (K2); dosya sahipliği ayrıca kontrol edilir.
 * - Önizleme (file_id, profile_hash) anahtarıyla saklanır. Hash fiyat
 *   önbelleğiyle aynıdır: kalite/doluluk/nozul/destek değişirse önizleme de
 *   değişir, müşteri eski profilin geometrisini görmez.
 * - Önizleme ikincil çıktıdır: üretilemezse sipariş akışı kilitlenmez, yalnızca
 *   `preview: null` döner ve arayüz STL görünümüne düşer.
 * - SLA hacim tahmininde kalır (K3); takım yolu yoktur.
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { saveAnalysis } from '@/lib/pricing/server/analysis-cache';
import {
  resolveSliceSelection,
  SliceSelectionError,
  type SliceSelectionInput,
} from '@/lib/pricing/server/resolve-slice-selection';
import { profileHash, type SliceProfileV1 } from '@/lib/pricing/server/slicer-profile';
import {
  SlicerRejectedError,
  SlicerTimeoutError,
  SlicerUnavailableError,
  sliceModelPreview,
  type SliceStats,
} from '@/lib/pricing/server/slicer-client';

export const runtime = 'nodejs';
// Dilimleme + önizleme üretimi; istemci zaman aşımı buna göre ayarlanır.
export const maxDuration = 300;

const PREVIEW_BUCKET = 'gcode-previews';
/** İmzalı URL ömrü; istemci görüntüleyiciyi açtığında geçerli olmalı. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

interface PreviewRequestBody extends SliceSelectionInput {
  fileId?: string;
}

/** Yanıtta dönen imzalı önizleme tanımı. */
interface PreviewPayload {
  url: string;
  byteSize: number;
  segmentCount: number;
  layerCount: number;
  engine: string | null;
  expiresInSeconds: number;
}

interface PreviewOutcome {
  profileHash: string;
  cached: boolean;
  stats: SliceStats;
  preview: PreviewPayload | null;
  previewError: string | null;
}

const inflight = new Map<string, Promise<PreviewOutcome>>();

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ success: false, code, error: message }, { status });
}

function requireSlicingEnabled(): boolean {
  return (
    process.env.SLICING_ENABLED !== 'false' &&
    process.env.PRICING_REQUIRE_SLICING !== 'false'
  );
}

async function loadStl(
  service: ReturnType<typeof createServiceClient>,
  storagePath: string
): Promise<Buffer> {
  const { data, error } = await service.storage.from('stl-files').download(storagePath);
  if (error || !data) {
    throw new Error(`STL indirilemedi: ${error?.message ?? 'bilinmeyen hata'}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

function previewPath(fileId: string, hash: string): string {
  return `${fileId}/${hash}.bin.gz`;
}

/** Saklanan kaydı imzalı URL'e çevirir; nesne yoksa `null`. */
async function signStoredPreview(
  service: ReturnType<typeof createServiceClient>,
  row: {
    storage_path: string;
    byte_size: number;
    segment_count: number;
    layer_count: number;
    engine: string | null;
  }
): Promise<PreviewPayload | null> {
  const { data, error } = await service.storage
    .from(PREVIEW_BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) return null;

  return {
    url: data.signedUrl,
    byteSize: row.byte_size,
    segmentCount: row.segment_count,
    layerCount: row.layer_count,
    engine: row.engine,
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  };
}

async function findCachedPreview(
  service: ReturnType<typeof createServiceClient>,
  fileId: string,
  hash: string
): Promise<PreviewPayload | null> {
  const { data, error } = await (service as any)
    .from('gcode_previews')
    .select('storage_path, byte_size, segment_count, layer_count, engine')
    .eq('file_id', fileId)
    .eq('profile_hash', hash)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    storage_path: string;
    byte_size: number;
    segment_count: number;
    layer_count: number;
    engine: string | null;
  };

  const signed = await signStoredPreview(service, row);
  if (signed) return signed;

  // Kayıt var ama nesne yok (temizlik/kesinti): satırı düşür, yeniden üret.
  try {
    await (service as any)
      .from('gcode_previews')
      .delete()
      .eq('file_id', fileId)
      .eq('profile_hash', hash);
  } catch {
    // Silme başarısız olsa da üretim devam eder; upsert satırı tazeler.
  }

  return null;
}

/**
 * Önizlemeyi üretir, depoya yazar ve kaydı upsert eder.
 *
 * Önizleme üretilemezse fırlatmaz: fiyat özeti yine döner, görüntüleyici STL
 * görünümüne düşer.
 */
async function buildAndStorePreview(params: {
  service: ReturnType<typeof createServiceClient>;
  fileId: string;
  storagePath: string;
  filename: string;
  profile: SliceProfileV1;
  hash: string;
}): Promise<PreviewOutcome> {
  const { service, fileId, storagePath, filename, profile, hash } = params;

  const stl = await loadStl(service, storagePath);
  const result = await sliceModelPreview(stl, filename, profile);

  // Aynı dilimleme analizi fiyat için de geçerlidir; ikinci kez dilimlemeyi
  // önlemek için burada yazılır.
  await saveAnalysis(service as any, {
    fileId,
    profileHash: hash,
    profileJson: profile,
    stats: result.stats,
    slicingJobId: null,
  });

  if (!result.gzip || !result.meta) {
    return {
      profileHash: hash,
      cached: false,
      stats: result.stats,
      preview: null,
      previewError: result.previewError ?? 'Dilimleyici önizleme üretmedi',
    };
  }

  const path = previewPath(fileId, hash);

  const upload = await service.storage
    .from(PREVIEW_BUCKET)
    .upload(path, result.gzip, {
      contentType: 'application/gzip',
      upsert: true,
    });

  if (upload.error) {
    console.error('[preview] depoya yazılamadı', upload.error);
    return {
      profileHash: hash,
      cached: false,
      stats: result.stats,
      preview: null,
      previewError: 'Önizleme depoya yazılamadı',
    };
  }

  const row = {
    file_id: fileId,
    profile_hash: hash,
    storage_path: path,
    byte_size: result.gzip.length,
    segment_count: result.meta.segmentCount,
    layer_count: result.meta.layers.length,
    engine: result.meta.engine,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await (service as any)
    .from('gcode_previews')
    .upsert(row, { onConflict: 'file_id,profile_hash' });

  if (upsertError) {
    // Kayıt yazılamasa bile dosya depoda; bir sonraki istek yeniden üretir.
    console.error('[preview] kayıt yazılamadı', upsertError);
  }

  const preview = await signStoredPreview(service, {
    storage_path: path,
    byte_size: row.byte_size,
    segment_count: row.segment_count,
    layer_count: row.layer_count,
    engine: row.engine,
  });

  if (!preview) {
    return {
      profileHash: hash,
      cached: false,
      stats: result.stats,
      preview: null,
      previewError: 'Önizleme bağlantısı oluşturulamadı',
    };
  }

  return {
    profileHash: hash,
    cached: false,
    stats: result.stats,
    preview,
    previewError: null,
  };
}

export async function POST(request: NextRequest) {
  if (process.env.SLICING_ENABLED === 'false') {
    return errorResponse(503, 'slicing_disabled', 'Dilimleme geçici olarak kapalı');
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse(401, 'unauthorized', 'Bu işlem için giriş yapmalısınız');
  }

  let body: PreviewRequestBody;
  try {
    body = (await request.json()) as PreviewRequestBody;
  } catch {
    return errorResponse(400, 'invalid_json', 'Geçersiz istek gövdesi');
  }

  const fileId = typeof body.fileId === 'string' ? body.fileId.trim() : '';
  if (!fileId) {
    return errorResponse(400, 'missing_file', 'fileId zorunlu');
  }

  const { data: file, error: fileError } = await (supabase as any)
    .from('files')
    .select('id, user_id, storage_path, filename')
    .eq('id', fileId)
    .maybeSingle();

  if (fileError || !file) {
    return errorResponse(404, 'file_not_found', 'Dosya bulunamadı');
  }
  if ((file as any).user_id !== user.id) {
    return errorResponse(403, 'forbidden', 'Bu dosya size ait değil');
  }

  const storagePath = (file as any).storage_path as string | null;
  if (!storagePath) {
    return errorResponse(409, 'missing_storage', 'Dosya depoda bulunamadı');
  }

  const service = createServiceClient();

  let resolved;
  try {
    resolved = await resolveSliceSelection(service as any, body);
  } catch (error) {
    if (error instanceof SliceSelectionError) {
      return errorResponse(400, 'invalid_selection', error.message);
    }
    console.error('[preview] seçim çözümlenemedi', error);
    return errorResponse(500, 'selection_failed', 'Dilimleme seçimleri çözümlenemedi');
  }

  // SLA hacim tahmininde kalır; takım yolu önizlemesi yoktur.
  if (!resolved.profile) {
    return errorResponse(
      409,
      'slicing_not_applicable',
      'Bu malzeme için takım yolu önizlemesi üretilmiyor (SLA)'
    );
  }

  const profile = resolved.profile;
  const hash = profileHash(profile);

  const cached = await findCachedPreview(service, fileId, hash);
  if (cached) {
    return NextResponse.json({
      success: true,
      cached: true,
      profileHash: hash,
      requireSlicing: requireSlicingEnabled(),
      preview: cached,
    });
  }

  const key = `${fileId}:${hash}`;
  const existing = inflight.get(key);
  const work =
    existing ??
    buildAndStorePreview({
      service,
      fileId,
      storagePath,
      filename: (file as any).filename || `${fileId}.stl`,
      profile,
      hash,
    });

  if (!existing) {
    inflight.set(key, work);
    work.finally(() => inflight.delete(key)).catch(() => undefined);
  }

  try {
    const outcome = await work;
    return NextResponse.json({
      success: true,
      cached: outcome.cached,
      profileHash: outcome.profileHash,
      requireSlicing: requireSlicingEnabled(),
      stats: outcome.stats,
      preview: outcome.preview,
      ...(outcome.previewError ? { previewError: outcome.previewError } : {}),
    });
  } catch (error) {
    if (error instanceof SlicerUnavailableError) {
      return errorResponse(503, 'slicer_unavailable', error.message);
    }
    if (error instanceof SlicerTimeoutError) {
      return errorResponse(504, 'slicer_timeout', error.message);
    }
    if (error instanceof SlicerRejectedError) {
      return errorResponse(422, 'slicer_rejected', error.message);
    }

    console.error('[preview] beklenmeyen hata', error);
    return errorResponse(500, 'preview_failed', 'Önizleme oluşturulamadı');
  }
}
