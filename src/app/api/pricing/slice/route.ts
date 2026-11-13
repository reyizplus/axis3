/**
 * POST /api/pricing/slice
 *
 * Tek dilimleme giriş noktası. Fiyat önizlemesi de sipariş öncesi doğrulama da
 * buraya gelir. Sözleşme:
 *
 *   { fileId, materialId, printSettingId?, nozzleSizeMm?, custom? }
 *     → { success, source: 'slicing', profileHash, cached, stats }
 *     → { success, source: 'volume', reason: 'sla', profileHash: null }
 *
 * Kurallar:
 * - Oturum zorunlu (K2); dosya sahipliği ayrıca kontrol edilir.
 * - Sayısal ayarlar istemciden DEĞİL, `print_settings`/`materials` tablolarından
 *   okunur. İstemci yalnızca ID ve özel mod değerlerini gönderir.
 * - Sonuç (file_id, profile_hash) anahtarıyla önbelleğe yazılır. Aynı anahtar
 *   için eşzamanlı istekler tek dilimlemeye indirgenir.
 * - Hiçbir hata yolunda uydurma gram/süre dönmez.
 */

import { NextRequest, NextResponse } from 'next/server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  getCachedAnalysis,
  saveAnalysis,
} from '@/lib/pricing/server/analysis-cache';
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
  sliceModel,
  type SliceStats,
} from '@/lib/pricing/server/slicer-client';

export const runtime = 'nodejs';
// PrusaSlicer karmaşık modellerde uzun sürebilir; istemci zaman aşımı 200 s.
export const maxDuration = 300;

interface SliceRequestBody extends SliceSelectionInput {
  fileId?: string;
}

interface SliceOutcome {
  profileHash: string;
  cached: boolean;
  stats: SliceStats;
}

/**
 * Aynı (dosya, profil) için eşzamanlı istekler tek dilimlemeye indirgenir.
 * Süreç içi; çok örnekli kurulumda unique index + upsert son savunma hattıdır.
 */
const inflight = new Map<string, Promise<SliceOutcome>>();

function errorResponse(
  status: number,
  code: string,
  message: string
): NextResponse {
  return NextResponse.json({ success: false, code, error: message }, { status });
}

/**
 * Sipariş politikası (K1). Arayüz bu bayrağı sunucudan alır; `NEXT_PUBLIC_*`
 * kopyası tutmaz, böylece iki taraf ayrışamaz.
 */
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

async function recordJobStart(
  service: ReturnType<typeof createServiceClient>,
  params: { fileId: string; userId: string; profile: SliceProfileV1; hash: string }
): Promise<string | null> {
  try {
    const { data } = await (service as any)
      .from('slicing_jobs')
      .insert({
        file_id: params.fileId,
        user_id: params.userId,
        status: 'processing',
        profile_json: params.profile,
        profile_hash: params.hash,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  } catch {
    // Gözlemlenebilirlik kaydı fiyatlamayı bloklamamalı.
    return null;
  }
}

async function recordJobEnd(
  service: ReturnType<typeof createServiceClient>,
  jobId: string | null,
  update: { status: 'completed' | 'failed'; durationMs?: number; errorMessage?: string }
): Promise<void> {
  if (!jobId) return;
  try {
    await (service as any)
      .from('slicing_jobs')
      .update({
        status: update.status,
        duration_ms: update.durationMs ?? null,
        error_message: update.errorMessage ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  } catch {
    // yut: kayıt hatası kullanıcıya yansımamalı
  }
}

async function sliceAndCache(params: {
  service: ReturnType<typeof createServiceClient>;
  fileId: string;
  userId: string;
  storagePath: string;
  filename: string;
  profile: SliceProfileV1;
  hash: string;
}): Promise<SliceOutcome> {
  const { service, fileId, userId, storagePath, filename, profile, hash } = params;

  const startedAt = Date.now();
  const jobId = await recordJobStart(service, { fileId, userId, profile, hash });

  try {
    const stl = await loadStl(service, storagePath);
    const stats = await sliceModel(stl, filename, profile);

    await saveAnalysis(service as any, {
      fileId,
      profileHash: hash,
      profileJson: profile,
      stats,
      slicingJobId: jobId,
    });

    await recordJobEnd(service, jobId, {
      status: 'completed',
      durationMs: stats.durationMs,
    });

    console.log(
      `[slicing] file=${fileId} profile=${hash} source=live durationMs=${Date.now() - startedAt} grams=${stats.grams}`
    );

    return { profileHash: hash, cached: false, stats };
  } catch (error) {
    await recordJobEnd(service, jobId, {
      status: 'failed',
      durationMs: Date.now() - startedAt,
      errorMessage: error instanceof Error ? error.message : 'dilimleme hatası',
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  // Kill switch: dilimleme kapatıldığında çağıran taraf hacim tahminine döner.
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

  let body: SliceRequestBody;
  try {
    body = (await request.json()) as SliceRequestBody;
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
    console.error('[slicing] seçim çözümlenemedi', error);
    return errorResponse(500, 'selection_failed', 'Dilimleme seçimleri çözümlenemedi');
  }

  // Reçine (SLA) bilinçli olarak hacim tahmininde kalır (K3).
  if (!resolved.profile) {
    return NextResponse.json({
      success: true,
      source: 'volume',
      reason: resolved.skipReason,
      profileHash: null,
      requireSlicing: requireSlicingEnabled(),
    });
  }

  const profile = resolved.profile;
  const hash = profileHash(profile);

  const cached = await getCachedAnalysis(service as any, fileId, hash);
  if (cached) {
    return NextResponse.json({
      success: true,
      source: 'slicing',
      cached: true,
      profileHash: hash,
      requireSlicing: requireSlicingEnabled(),
      stats: {
        grams: cached.grams,
        printSeconds: cached.printSeconds,
        layerCount: cached.layerCount,
        filamentMm: cached.filamentMm,
        durationMs: 0,
        engine: cached.engine ?? profile.engine,
      },
    });
  }

  const key = `${fileId}:${hash}`;
  const existing = inflight.get(key);
  const work =
    existing ??
    sliceAndCache({
      service,
      fileId,
      userId: user.id,
      storagePath,
      filename: (file as any).filename || `${fileId}.stl`,
      profile,
      hash,
    });

  if (!existing) {
    inflight.set(key, work);
    // Yanıt beklenmese bile haritayı temizle; hata durumunda da sızıntı olmasın.
    work.finally(() => inflight.delete(key)).catch(() => undefined);
  }

  try {
    const outcome = await work;
    return NextResponse.json({
      success: true,
      source: 'slicing',
      cached: outcome.cached,
      profileHash: outcome.profileHash,
      requireSlicing: requireSlicingEnabled(),
      stats: outcome.stats,
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

    console.error('[slicing] beklenmeyen hata', error);
    return errorResponse(500, 'slicing_failed', 'Dilimleme başarısız oldu');
  }
}
