'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Clock, Sparkles, Droplets } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export interface PrintSetting {
  id: string;
  name: string;
  technology: string;
  layerHeight: number | null;
  layerThickness: number | null;
  exposureTime: number | null;
  infillPercentage: number;
  timeMultiplier: number;
  qualityPremium: number;
  isActive: boolean;
  description?: string;
  requiresNozzleSizeId?: string | null;
}

interface QualitySelectorProps {
  selectedSettingId?: string;
  onSelect: (setting: PrintSetting) => void;
  disabled?: boolean;
  technology?: 'FDM' | 'SLA';
  nozzleSizeId?: string;
}

export function QualitySelector({
  selectedSettingId,
  onSelect,
  disabled = false,
  technology = 'FDM',
  nozzleSizeId,
}: QualitySelectorProps) {
  const [settings, setSettings] = useState<PrintSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPrintSettings = async () => {
      try {
        let query = (supabase.from('print_settings') as any)
          .select('*')
          .eq('is_active', true)
          .eq('technology', technology);

        if (nozzleSizeId) {
          query = query.or(`requires_nozzle_size_id.is.null,requires_nozzle_size_id.eq.${nozzleSizeId}`);
        }

        const { data, error } = await query.order('time_multiplier', { ascending: true });

        if (error) throw error;

        const mappedSettings: PrintSetting[] = (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          technology: s.technology,
          layerHeight: s.layer_height,
          layerThickness: s.layer_thickness,
          exposureTime: s.exposure_time,
          infillPercentage: s.infill_percentage ?? 20,
          timeMultiplier: s.time_multiplier,
          qualityPremium: s.quality_premium,
          isActive: s.is_active,
          description: s.description,
          requiresNozzleSizeId: s.requires_nozzle_size_id,
        }));

        setSettings(mappedSettings);
      } catch (error) {
        console.error('Failed to fetch print settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrintSettings();
  }, [technology, nozzleSizeId, supabase]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Baskı Kalitesi</h3>
          <p className="text-sm text-muted-foreground">
            Kalite ve hız arasındaki dengeyi seçin
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        {settings.map((setting) => (
          <QualityCard
            key={setting.id}
            setting={setting}
            selected={setting.id === selectedSettingId}
            onSelect={() => onSelect(setting)}
            disabled={disabled}
          />
        ))}
      </motion.div>
    </div>
  );
}

interface QualityCardProps {
  setting: PrintSetting;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function QualityCard({ setting, selected, onSelect, disabled }: QualityCardProps) {
  const isSla = setting.technology === 'SLA';
  const layerValue = isSla ? setting.layerThickness : setting.layerHeight;

  const getQualityIcon = () => {
    if (isSla) return <Droplets className="h-5 w-5" />;
    if (setting.timeMultiplier >= 1.5) return <Sparkles className="h-5 w-5" />;
    if (setting.timeMultiplier >= 1.0) return <Check className="h-5 w-5" />;
    return <Zap className="h-5 w-5" />;
  };

  const getQualityColor = () => {
    if (isSla) return 'from-cyan-500 to-blue-500';
    if (setting.timeMultiplier >= 1.5) return 'from-purple-500 to-pink-500';
    if (setting.timeMultiplier >= 1.0) return 'from-blue-500 to-cyan-500';
    return 'from-green-500 to-emerald-500';
  };

  const getSpeedLabel = () => {
    if (setting.timeMultiplier >= 1.5) return 'Yavaş';
    if (setting.timeMultiplier >= 1.0) return 'Normal';
    return 'Hızlı';
  };

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-300 relative overflow-hidden h-full",
          selected && "border-primary shadow-lg shadow-primary/20 glow",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !selected && "hover:border-primary/50"
        )}
        onClick={() => !disabled && onSelect()}
      >
        {selected && (
          <div className="absolute top-3 right-3 z-10">
            <div className="rounded-full bg-primary p-1">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        )}

        <div className={cn("h-2 bg-gradient-to-r", getQualityColor())} />

        <CardHeader>
          <div className="flex items-start gap-3">
            <div className={cn("rounded-lg p-2 bg-gradient-to-br", getQualityColor(), "text-white")}>
              {getQualityIcon()}
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">{setting.name}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {isSla ? `${layerValue}mm katman kalınlığı` : `${layerValue}mm katman yüksekliği`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {setting.description && (
            <p className="text-xs text-muted-foreground">{setting.description}</p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Hız</span>
              </div>
              <Badge variant="outline" className="text-xs">{getSpeedLabel()}</Badge>
            </div>

            {setting.qualityPremium > 0 && (
              <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">Ek Maliyet</div>
                <div className="font-medium text-amber-600">+%{(setting.qualityPremium * 100).toFixed(0)}</div>
              </div>
            )}

            {isSla && setting.exposureTime != null ? (
              <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">Pozlama Süresi</div>
                <div className="font-medium">{setting.exposureTime.toFixed(1)}s</div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <div className="text-muted-foreground">Doluluk</div>
                <div className="font-medium">%{setting.infillPercentage}</div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">{isSla ? 'Katman Kalınlığı' : 'Katman Yüksekliği'}</div>
            <div className="flex gap-1 h-8 items-end">
              {Array.from({ length: 10 }).map((_, i) => {
                const threshold = isSla ? 0.05 : 0.1;
                const midThreshold = isSla ? 0.075 : 0.2;
                const height = layerValue != null && layerValue <= threshold ? 10 - i
                  : layerValue != null && layerValue <= midThreshold ? Math.max(5, 10 - i)
                  : Math.max(3, 10 - i);
                return (
                  <div
                    key={i}
                    className={cn("flex-1 rounded-sm bg-gradient-to-t", getQualityColor(), "opacity-70")}
                    style={{ height: `${height * 10}%` }}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
