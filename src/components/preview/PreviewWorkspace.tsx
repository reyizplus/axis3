'use client';

/**
 * Önizleme Çalışma Alanı
 *
 * Solda 3B sahne (gerçek takım yolları hazırsa G-Code görüntüleyici, aksi
 * hâlde STL), sağda akordeon yan sütun. Önizleme üretilemezse (dilimleyici
 * kapalı, SLA, ağ hatası) sessizce STL görünümüne düşer ve nedeni yan sütunda
 * gösterilir; fiyat akışı bundan etkilenmez.
 *
 * Yükleme durumu seçimin kimliğine (`requestKey`) bağlanır: seçim değiştiğinde
 * eski sonuç gösterilmez. Yanlış profilin geometrisini göstermek, hiç
 * göstermemekten daha kötüdür.
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useIsDarkMode } from '@/hooks/use-is-dark';
import {
  loadGcodePreview,
  PreviewRequestError,
  requestGcodePreview,
  type GcodePreviewRequest,
} from '@/lib/preview/client';
import type { GcodePreviewData } from '@/lib/preview/format';
import type { PreviewStatus, SlicePreviewSelection } from '@/lib/preview/selection';
import type { ToolpathColorMode } from '@/lib/preview/display';
import { PreviewSidebar, type PreviewSpecifications } from './PreviewSidebar';

const GcodePreviewViewer = dynamic(
  () => import('./GcodePreviewViewer').then((mod) => mod.GcodePreviewViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  }
);

const ModelViewer = dynamic(
  () => import('@/components/upload/ModelViewer').then((mod) => mod.ModelViewer),
  { ssr: false }
);

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

interface PreviewWorkspaceProps {
  /** Yüklenecek dilimleme seçimi; yoksa yalnızca STL gösterilir. */
  selection?: SlicePreviewSelection | null;
  /** STL yedeği (ve SLA görünümü). */
  modelUrl: string;
  color?: string;
  materialName?: string;
  printSettingName?: string;
  specifications?: PreviewSpecifications;
  className?: string;
}

export function PreviewWorkspace({
  selection,
  modelUrl,
  color,
  materialName,
  printSettingName,
  specifications,
  className,
}: PreviewWorkspaceProps) {
  const isDark = useIsDarkMode();

  const [result, setResult] = useState<LoadedPreview | null>(null);
  const [attempt, setAttempt] = useState(0);
  /** Tür başına kullanıcı görünürlük kararı; dilimleyicinin varsayılanını ezer. */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [colorMode, setColorMode] = useState<ToolpathColorMode>('type');

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
  const data = current?.status === 'ready' ? current.data : null;

  const status: PreviewStatus = !canSlice ? 'idle' : current ? current.status : 'loading';

  const visibleTypes = useMemo(
    () => (data ? data.meta.types.map((type) => overrides[type.id] ?? type.visible) : []),
    [data, overrides]
  );

  const maxSpeed = useMemo(() => {
    if (!data) return 1;
    let max = 0;
    for (let i = 0; i < data.speeds.length; i += 1) {
      const value = data.speeds[i] / 10;
      if (value > max) max = value;
    }
    return Math.max(1, max);
  }, [data]);

  const toggleType = (index: number) => {
    if (!data) return;
    const type = data.meta.types[index];
    if (!type) return;
    setOverrides((previous) => ({
      ...previous,
      [type.id]: !(previous[type.id] ?? type.visible),
    }));
  };

  const toggleAll = () => {
    if (!data) return;
    const target = !visibleTypes.every(Boolean);
    setOverrides(Object.fromEntries(data.meta.types.map((type) => [type.id, target])));
  };

  const toggleSupport = () => {
    if (!data) return;
    const supportIds = ['support', 'support_interface'];
    const supportVisibility = data.meta.types
      .filter((type) => supportIds.includes(type.id))
      .map((type) => overrides[type.id] ?? type.visible);
    const target = !supportVisibility.every(Boolean);

    setOverrides((previous) => {
      const next = { ...previous };
      data.meta.types.forEach((type) => {
        if (supportIds.includes(type.id)) next[type.id] = target;
      });
      return next;
    });
  };

  const toggleTravel = () => {
    if (!data) return;
    const index = data.meta.types.findIndex((type) => type.id === 'travel');
    if (index >= 0) toggleType(index);
  };

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_320px] lg:grid-rows-[minmax(0,1fr)] lg:gap-4 lg:overflow-hidden',
        className
      )}
    >
      <div className="relative h-[46vh] min-h-[280px] shrink-0 overflow-hidden rounded-xl border border-border/40 lg:h-full lg:min-h-0">
        {data ? (
          <GcodePreviewViewer
            key={current?.key}
            data={data}
            visibleTypes={visibleTypes}
            colorMode={colorMode}
            className="h-full"
          />
        ) : (
          <ModelViewer url={modelUrl} color={color} className="h-full" />
        )}

        {status === 'loading' && (
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center backdrop-blur-sm',
              isDark ? 'bg-black/65' : 'bg-white/80'
            )}
          >
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-slate-700')}>
              Takım yolları hazırlanıyor
            </p>
            <p className={cn('max-w-[280px] text-xs', isDark ? 'text-slate-300' : 'text-slate-500')}>
              Model gerçek dilimleyiciyle işleniyor; duvarlar, dolgu ve destek ayakları
              çıkarılıyor. Bu işlem birkaç saniye sürebilir.
            </p>
          </div>
        )}
      </div>

      <PreviewSidebar
        isDark={isDark}
        materialName={materialName}
        printSettingName={printSettingName}
        color={color}
        specifications={specifications}
        selection={selection}
        status={status}
        data={data}
        message={current?.message ?? null}
        idleNote={isSla ? SLA_NOTE : undefined}
        onRetry={() => setAttempt((value) => value + 1)}
        visibleTypes={visibleTypes}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        onToggleType={toggleType}
        onToggleAll={toggleAll}
        onToggleSupport={toggleSupport}
        onToggleTravel={toggleTravel}
        maxSpeed={maxSpeed}
        className="shrink-0 pb-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1"
      />
    </div>
  );
}

export type { SlicePreviewSelection } from '@/lib/preview/selection';
