'use client';

/**
 * Slicer Önizleme Paneli
 *
 * FDM dosyaları için `/api/pricing/preview` üzerinden **gerçek dilimleyici
 * takım yollarını** yükler. Önizleme üretilemezse (dilimleyici kapalı, SLA,
 * ağ hatası) sessizce STL görünümüne düşer ve nedenini kısa bir şeritte
 * gösterir; fiyat akışı bundan etkilenmez.
 *
 * Yükleme durumu seçimin kimliğine (`requestKey`) bağlanır: seçim değiştiğinde
 * eski sonuç gösterilmez. Yanlış profilin geometrisini göstermek, hiç
 * göstermemekten daha kötüdür.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Layers, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  loadGcodePreview,
  PreviewRequestError,
  requestGcodePreview,
} from '@/lib/preview/client';
import type { GcodePreviewData } from '@/lib/preview/format';
import type { GcodePreviewRequest } from '@/lib/preview/client';

const GcodePreviewViewer = dynamic(
  () => import('./GcodePreviewViewer').then((mod) => mod.GcodePreviewViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0e1723]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  }
);

const ModelViewer = dynamic(
  () => import('@/components/upload/ModelViewer').then((mod) => mod.ModelViewer),
  { ssr: false }
);

export interface SlicePreviewSelection {
  fileId: string;
  materialId: string;
  printSettingId?: string | null;
  nozzleSizeMm?: number | null;
  supportEnabled?: boolean;
  customLayerHeight?: number | null;
  customInfill?: number | null;
  customSpeed?: number | null;
  technology?: string | null;
}

interface SlicerPreviewProps {
  /** Yüklenecek dilimleme seçimi; yoksa yalnızca STL gösterilir. */
  selection?: SlicePreviewSelection | null;
  /** STL yedeği (ve SLA görünümü). */
  modelUrl: string;
  color?: string;
  className?: string;
}

/** Tamamlanmış bir yükleme denemesinin sonucu. */
interface LoadedPreview {
  /** İsteğin kimliği; seçim değişince eski sonuç kullanılmaz. */
  key: string;
  status: 'ready' | 'fallback';
  data: GcodePreviewData | null;
  message: string | null;
}

const SLA_NOTE =
  'Reçine (SLA) baskıda takım yolu yoktur; model hacim üzerinden gösterilir.';

export function SlicerPreview({ selection, modelUrl, color, className }: SlicerPreviewProps) {
  const [result, setResult] = useState<LoadedPreview | null>(null);
  const [attempt, setAttempt] = useState(0);

  const fileId = selection?.fileId;
  const materialId = selection?.materialId;
  const printSettingId = selection?.printSettingId ?? null;
  const nozzleSizeMm = selection?.nozzleSizeMm ?? null;
  const supportEnabled = selection?.supportEnabled ?? true;
  const customLayerHeight = selection?.customLayerHeight ?? null;
  const customInfill = selection?.customInfill ?? null;
  const customSpeed = selection?.customSpeed ?? null;
  const technology = selection?.technology ?? null;

  const isSla = technology === 'SLA';
  const canSlice = Boolean(fileId && materialId) && !isSla;

  const requestKey =
    canSlice && fileId && materialId
      ? JSON.stringify([
          fileId,
          materialId,
          printSettingId,
          nozzleSizeMm,
          supportEnabled,
          customLayerHeight,
          customInfill,
          customSpeed,
          attempt,
        ])
      : null;

  useEffect(() => {
    if (!requestKey || !fileId || !materialId) return;

    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const request: GcodePreviewRequest = {
          fileId,
          materialId,
          printSettingId,
          nozzleSizeMm,
          supportEnabled,
          custom:
            printSettingId === 'custom'
              ? {
                  layerHeight: customLayerHeight,
                  infillPercentage: customInfill,
                  speedMultiplier: customSpeed,
                }
              : null,
        };

        const response = await requestGcodePreview(request, controller.signal);
        if (cancelled) return;

        if (!response.preview?.url) {
          setResult({
            key: requestKey,
            status: 'fallback',
            data: null,
            message: response.previewError ?? 'Dilimleyici önizleme üretmedi',
          });
          return;
        }

        const preview = await loadGcodePreview(response.preview.url, controller.signal);
        if (cancelled) return;

        setResult({ key: requestKey, status: 'ready', data: preview, message: null });
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return;

        const text =
          error instanceof PreviewRequestError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Önizleme yüklenemedi';

        setResult({ key: requestKey, status: 'fallback', data: null, message: text });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    requestKey,
    fileId,
    materialId,
    printSettingId,
    nozzleSizeMm,
    supportEnabled,
    customLayerHeight,
    customInfill,
    customSpeed,
  ]);

  /** Yalnızca güncel seçime ait sonuç gösterilir. */
  const current = requestKey !== null && result?.key === requestKey ? result : null;

  if (current?.status === 'ready' && current.data) {
    // `key` ile eşlenir: seçim değişirse sahne ve katman durumu sıfırdan kurulur.
    return <GcodePreviewViewer key={current.key} data={current.data} className={className} />;
  }

  const loading = canSlice && !current;

  return (
    <div className={cn('h-full min-h-0', className)}>
      <div className="relative h-full min-h-[260px] overflow-hidden rounded-xl">
        <ModelViewer url={modelUrl} color={color} className="h-full" />

        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 text-center backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm font-medium text-white">Takım yolları hazırlanıyor</p>
            <p className="max-w-[280px] text-xs text-slate-300">
              Model gerçek dilimleyiciyle işleniyor; duvarlar, dolgu ve destek ayakları
              çıkarılıyor. Bu işlem birkaç saniye sürebilir.
            </p>
          </div>
        )}

        {!canSlice && isSla && (
          <div className="absolute inset-x-2 bottom-2 flex items-start gap-2 rounded-lg border border-white/10 bg-slate-950/85 p-2 text-[11px] text-slate-300 backdrop-blur-sm">
            <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="min-w-0 flex-1 break-words">{SLA_NOTE}</p>
          </div>
        )}

        {current?.status === 'fallback' && current.message && (
          <div className="absolute inset-x-2 bottom-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-950/80 p-2 text-[11px] text-amber-200 backdrop-blur-sm">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Takım yolu önizlemesi gösterilemiyor</p>
              <p className="mt-0.5 break-words text-amber-300/90">{current.message}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 shrink-0 gap-1 px-2 text-[10px] text-amber-200 hover:bg-amber-500/20"
              onClick={() => setAttempt((value) => value + 1)}
            >
              <RefreshCw className="h-3 w-3" /> Dene
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
