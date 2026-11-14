'use client';

/**
 * Önizleme Yan Sütunu
 *
 * Model görüntüleyicinin üzerine açılan paneller (tür listesi, dilimleme
 * ayarları, istatistikler) buraya taşındı: görüntüleyici küçük olduğu için
 * üstteki panel modelin yarısını kapatıyordu. Bölümler akordeon; başlıktaki ok
 * bir kez basınca açar, tekrar basınca kapatır.
 */

import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  ChevronDown,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  Palette,
  RefreshCw,
  Ruler,
  Settings2,
  Timer,
  Triangle,
  Weight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toolpathColor } from '@/lib/utils/color';
import { formatDuration, formatGrams, type ToolpathColorMode } from '@/lib/preview/display';
import { readableConfig, type PreviewStatus, type SlicePreviewSelection } from '@/lib/preview/selection';
import type { GcodePreviewData } from '@/lib/preview/format';

export interface PreviewSpecifications {
  volume?: number;
  surfaceArea?: number;
  dimensions?: { x: number; y: number; z: number };
  triangleCount?: number;
}

interface PreviewSidebarProps {
  isDark: boolean;
  materialName?: string;
  printSettingName?: string;
  color?: string;
  specifications?: PreviewSpecifications;
  selection?: SlicePreviewSelection | null;
  status: PreviewStatus;
  data: GcodePreviewData | null;
  message: string | null;
  /** `idle` durumunda gösterilecek açıklama (ör. SLA notu). */
  idleNote?: string;
  onRetry: () => void;
  visibleTypes: boolean[];
  colorMode: ToolpathColorMode;
  onColorModeChange: (mode: ToolpathColorMode) => void;
  onToggleType: (index: number) => void;
  onToggleAll: () => void;
  onToggleSupport: () => void;
  onToggleTravel: () => void;
  maxSpeed: number;
  className?: string;
}

type SectionId = 'settings' | 'specs' | 'toolpaths' | 'slicer';

const SECTION_TITLES: Record<SectionId, string> = {
  settings: 'Baskı Ayarları',
  specs: 'Model Özellikleri',
  toolpaths: 'Takım Yolları',
  slicer: 'Dilimleme Önizlemesi',
};

const SECTION_ICONS = {
  settings: Settings2,
  specs: Ruler,
  toolpaths: Eye,
  slicer: Timer,
} as const;

export function PreviewSidebar({
  isDark,
  materialName,
  printSettingName,
  color,
  specifications,
  selection,
  status,
  data,
  message,
  idleNote,
  onRetry,
  visibleTypes,
  colorMode,
  onColorModeChange,
  onToggleType,
  onToggleAll,
  onToggleSupport,
  onToggleTravel,
  maxSpeed,
  className,
}: PreviewSidebarProps) {
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    settings: false,
    specs: false,
    toolpaths: false,
    slicer: true,
  });

  const toggle = (id: SectionId) => setOpen((previous) => ({ ...previous, [id]: !previous[id] }));

  const config = readableConfig(data);
  const stats = data?.meta.stats ?? null;
  const types = data?.meta.types ?? [];

  const allVisible = visibleTypes.length > 0 && visibleTypes.every(Boolean);
  const supportIndex = types.findIndex((type) => type.id === 'support');
  const supportInterfaceIndex = types.findIndex((type) => type.id === 'support_interface');
  const supportVisible =
    (supportIndex < 0 || visibleTypes[supportIndex] !== false) &&
    (supportInterfaceIndex < 0 || visibleTypes[supportInterfaceIndex] !== false);
  const travelIndex = types.findIndex((type) => type.id === 'travel');
  const travelVisible = travelIndex >= 0 ? visibleTypes[travelIndex] !== false : false;

  const hasSelectionExtras =
    selection?.printSettingId === 'custom' ||
    selection?.supportEnabled === false ||
    selection?.customLayerHeight != null ||
    selection?.customInfill != null ||
    selection?.customSpeed != null;

  const dimensionText = specifications?.dimensions
    ? `${specifications.dimensions.x.toFixed(1)} × ${specifications.dimensions.y.toFixed(1)} × ${specifications.dimensions.z.toFixed(1)} mm`
    : null;

  const section = (id: SectionId, summary: string | null, body: ReactNode) => {
    const Icon = SECTION_ICONS[id];
    const expanded = open[id];

    return (
      <div key={id} className="overflow-hidden rounded-lg border border-border/60 bg-card/60">
        <button
          type="button"
          onClick={() => toggle(id)}
          aria-expanded={expanded}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{SECTION_TITLES[id]}</span>
            {summary && (
              <span className="block truncate text-[11px] text-muted-foreground">{summary}</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180'
            )}
          />
        </button>

        {expanded && <div className="border-t border-border/50 px-3 py-3">{body}</div>}
      </div>
    );
  };

  const row = (label: ReactNode, value: ReactNode) => (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value}</span>
    </div>
  );

  return (
    <div className={cn('space-y-2', className)}>
      {/* Baskı Ayarları */}
      {section(
        'settings',
        [materialName, printSettingName, color].filter(Boolean).join(' · ') || null,
        <div className="space-y-2.5">
          {(materialName || printSettingName || color) && (
            <div className="flex flex-wrap gap-1.5">
              {materialName && (
                <Badge className="border-blue-500/20 bg-blue-500/10 text-[11px] text-blue-600 dark:text-blue-300">
                  {materialName}
                </Badge>
              )}
              {printSettingName && (
                <Badge className="border-purple-500/20 bg-purple-500/10 text-[11px] text-purple-600 dark:text-purple-300">
                  {printSettingName}
                </Badge>
              )}
              {color && (
                <Badge className="gap-1 border-emerald-500/20 bg-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-300">
                  <Palette className="h-3 w-3" />
                  {color}
                </Badge>
              )}
            </div>
          )}

          {hasSelectionExtras && (
            <div className="space-y-1 text-xs">
              {selection?.supportEnabled === false && row('Destek', 'Kapalı')}
              {selection?.customLayerHeight != null && row('Katman', `${selection.customLayerHeight} mm`)}
              {selection?.customInfill != null && row('Doluluk', `%${selection.customInfill}`)}
              {selection?.customSpeed != null && row('Hız', `×${selection.customSpeed.toFixed(2)}`)}
            </div>
          )}

          {config.length > 0 && (
            <div className="space-y-1 border-t border-border/40 pt-2 text-xs">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Dilimleyici ayarları
              </p>
              {config.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="max-w-[60%] truncate text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}

          {!materialName && !printSettingName && !color && !hasSelectionExtras && config.length === 0 && (
            <p className="text-xs text-muted-foreground">Bu dosya için baskı ayarı seçilmemiş.</p>
          )}
        </div>
      )}

      {/* Model Özellikleri */}
      {section(
        'specs',
        dimensionText,
        <div className="space-y-2 text-xs">
          {specifications?.dimensions && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} className="rounded-md border border-border/50 bg-muted/40 py-1.5">
                  <p className="text-[10px] uppercase text-muted-foreground">{axis}</p>
                  <p className="font-semibold tabular-nums">
                    {specifications.dimensions![axis].toFixed(1)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {specifications?.volume !== undefined && row('Hacim', `${specifications.volume.toFixed(2)} cm³`)}
          {specifications?.surfaceArea !== undefined &&
            row('Yüzey alanı', `${specifications.surfaceArea.toFixed(2)} cm²`)}
          {specifications?.triangleCount !== undefined && (
            row(
              <span className="inline-flex items-center gap-1">
                <Triangle className="h-3 w-3" /> Üçgen
              </span>,
              specifications.triangleCount.toLocaleString('tr-TR')
            )
          )}

          {!specifications?.dimensions &&
            specifications?.volume === undefined &&
            specifications?.surfaceArea === undefined && (
              <p className="text-muted-foreground">Model ölçüleri bu dosya için yok.</p>
            )}
        </div>
      )}

      {/* Takım Yolları */}
      {section(
        'toolpaths',
        status === 'ready' && types.length > 0 ? `${types.length} tür` : null,
        status !== 'ready' || types.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {status === 'loading'
              ? 'Model dilimleniyor; takım yolları hazır olunca burada listelenir.'
              : 'Takım yolu verisi yok. Model, STL görünümüyle gösteriliyor.'}
          </p>
        ) : (
          <div className="space-y-2">
            {/* Renk modu */}
            <div className="flex overflow-hidden rounded-md border border-border/60 text-[11px]">
              <button
                type="button"
                onClick={() => onColorModeChange('type')}
                className={cn(
                  'flex-1 px-2 py-1 transition-colors',
                  colorMode === 'type' ? 'bg-primary/90 text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                Türe göre
              </button>
              <button
                type="button"
                onClick={() => onColorModeChange('speed')}
                className={cn(
                  'flex-1 px-2 py-1 transition-colors',
                  colorMode === 'speed' ? 'bg-primary/90 text-primary-foreground' : 'hover:bg-muted'
                )}
              >
                Hıza göre
              </button>
            </div>

            {colorMode === 'speed' && (
              <div className="space-y-0.5">
                <div className="h-1.5 w-full rounded-full bg-[linear-gradient(90deg,#3b82f6,#22c55e,#f97316,#ef4444)]" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>yavaş</span>
                  <span>{Math.round(maxSpeed)} mm/s</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={onToggleSupport}
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
                    supportVisible
                      ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                      : 'border-border/60 bg-muted/40 text-muted-foreground'
                  )}
                >
                  Destek
                </button>
                <button
                  type="button"
                  onClick={onToggleTravel}
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
                    travelVisible
                      ? 'border-slate-400/50 bg-slate-500/15 text-slate-700 dark:text-slate-200'
                      : 'border-border/60 bg-muted/40 text-muted-foreground'
                  )}
                >
                  Seyahat
                </button>
              </div>
              <button
                type="button"
                onClick={onToggleAll}
                className="shrink-0 text-[10px] text-primary hover:underline"
              >
                {allVisible ? 'Tümünü gizle' : 'Tümünü göster'}
              </button>
            </div>

            <div className="space-y-0.5">
              {types.map((type, index) => {
                const visible = visibleTypes[index] !== false;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => onToggleType(index)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-1 py-1 text-left text-[11px] transition-colors hover:bg-muted/60',
                      visible ? 'opacity-100' : 'opacity-45'
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm ring-1 ring-black/10 dark:ring-white/10"
                      style={{ backgroundColor: toolpathColor(type.color, isDark) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{type.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {type.grams > 0 ? `${type.grams.toFixed(2)} g` : '—'}
                    </span>
                    <span className="w-14 shrink-0 text-right tabular-nums text-muted-foreground/70">
                      {type.seconds > 0 ? formatDuration(type.seconds) : ''}
                    </span>
                    {visible ? (
                      <Eye className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* Dilimleme Önizlemesi */}
      {section(
        'slicer',
        stats ? `${formatGrams(stats.grams)} · ${formatDuration(stats.printSeconds)}` : null,
        <div className="space-y-2.5">
          <div className="inline-flex items-center rounded-md border border-border/60 bg-white px-2 py-1">
            <Image
              src="/navbar-logo.png"
              alt="AXIS3"
              width={110}
              height={36}
              className="h-5 w-auto object-contain"
            />
          </div>

          {status === 'loading' && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Model dilimleniyor…
            </p>
          )}

          {status === 'ready' && stats && data && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-border/50 bg-muted/40 px-2 py-1.5">
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Weight className="h-3 w-3" /> Filament
                  </p>
                  <p className="text-sm font-semibold tabular-nums">{formatGrams(stats.grams)}</p>
                </div>
                <div className="rounded-md border border-border/50 bg-muted/40 px-2 py-1.5">
                  <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Timer className="h-3 w-3" /> Süre
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatDuration(stats.printSeconds)}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                {row('Destek', stats.supportGrams > 0 ? formatGrams(stats.supportGrams) : 'Yok')}
                {row(
                  <span className="inline-flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Katman
                  </span>,
                  stats.layerCount.toLocaleString('tr-TR')
                )}
                {row('Filament boyu', `${(stats.filamentMm / 1000).toFixed(2)} m`)}
                {dimensionText && row('Ölçü', dimensionText)}
                {row('Hareket', data.meta.segmentCount.toLocaleString('tr-TR'))}
                {data.meta.droppedSegments > 0 &&
                  row('Kırpılan', data.meta.droppedSegments.toLocaleString('tr-TR'))}
              </div>
            </div>
          )}

          {status === 'fallback' && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p className="min-w-0 flex-1 break-words">
                  {message ?? 'Dilimleme önizlemesi üretilemedi.'}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-full gap-1 text-[11px]"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3" /> Yeniden dene
              </Button>
            </div>
          )}

          {status === 'idle' && (
            <p className="text-xs text-muted-foreground">
              {idleNote ?? 'Bu görünüm için dilimleme verisi yok; model STL olarak gösteriliyor.'}
            </p>
          )}

          {/* Renk açıklaması */}
          {status === 'ready' && (
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Renkler dilimleyici çıktısından gelir; katman kaydırıcısıyla baskıyı adım adım
              inceleyebilirsiniz.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
