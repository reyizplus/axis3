/**
 * Material Selector Component
 * Axis3 - Visual Material Selection
 * 
 * Features:
 * - Technology filter (FDM/SLA)
 * - Visual material cards
 * - Color selection
 * - Stock status
 * - Price preview
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, AlertCircle, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// =====================================================
// TYPES
// =====================================================

export interface Material {
  id: string;
  name: string;
  technology: 'FDM' | 'SLA';
  description: string;
  costPerGram: number;
  density: number;
  printSpeedModifier: number;
  isActive: boolean;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  leadTimeDays: number;
  colors?: string[];
  preorderAllowed: boolean;
  preorderDiscountPercent: number | null;
  estimatedRestockDays: number;
}

interface MaterialSelectorProps {
  selectedMaterialId?: string;
  onSelect: (material: Material) => void;
  disabled?: boolean;
}

// =====================================================
// COMPONENT
// =====================================================

export function MaterialSelector({
  selectedMaterialId,
  onSelect,
  disabled = false,
}: MaterialSelectorProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [technology, setTechnology] = useState<'FDM' | 'SLA'>('FDM');
  const supabase = createClient();

  // Define fetchMaterials before useEffect to avoid immutability error
  const fetchMaterials = async () => {
    try {
      const { data, error } = await (supabase.from('materials') as any)
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const mappedMaterials: Material[] = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        technology: m.technology,
        description: m.description || '',
        costPerGram: m.cost_per_gram,
        density: m.density,
        printSpeedModifier: m.print_speed_modifier,
        isActive: m.is_active,
        stockStatus: m.stock_status || 'in_stock',
        leadTimeDays: m.lead_time_days || 0,
        colors: m.colors || [],
        preorderAllowed: m.preorder_allowed ?? true,
        preorderDiscountPercent: m.preorder_discount_percent,
        estimatedRestockDays: m.estimated_restock_days ?? 14,
      }));

      setMaterials(mappedMaterials);
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMaterials = materials.filter(m => m.technology === technology);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Technology Tabs */}
      <Tabs value={technology} onValueChange={(v) => setTechnology(v as 'FDM' | 'SLA')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="FDM">
            FDM (Filament)
          </TabsTrigger>
          <TabsTrigger value="SLA">
            SLA (Resin)
          </TabsTrigger>
        </TabsList>

        <TabsContent value={technology} className="mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredMaterials.map((material) => (
              <MaterialCard
                key={material.id}
                material={material}
                selected={material.id === selectedMaterialId}
                onSelect={() => onSelect(material)}
                disabled={disabled || material.stockStatus === 'out_of_stock'}
              />
            ))}
          </motion.div>

          {filteredMaterials.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Bu teknoloji için malzeme bulunamadı
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// MATERIAL CARD
// =====================================================

interface MaterialCardProps {
  material: Material;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
}

function MaterialCard({ material, selected, onSelect, disabled }: MaterialCardProps) {
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-300 relative overflow-hidden h-full flex flex-col",
          selected && "border-primary shadow-lg shadow-primary/20 glow",
          disabled && "opacity-50 cursor-not-allowed",
          !disabled && !selected && "hover:border-primary/50"
        )}
        onClick={() => !disabled && onSelect()}
      >
        {/* Selection Indicator */}
        {selected && (
          <div className="absolute top-3 right-3 z-10">
            <div className="rounded-full bg-primary p-1">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        )}

        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">{material.name}</CardTitle>
              <CardDescription className="text-xs">
                {material.technology} Technology
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 flex-1">
          {/* Description */}
          {material.description && (
            <p className="text-sm text-muted-foreground">
              {material.description}
            </p>
          )}

          {/* Properties */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <div className="text-muted-foreground">Yoğunluk</div>
              <div className="font-medium">{material.density} g/cm³</div>
            </div>
            <div className="space-y-1">
              <div className="text-muted-foreground">Hız</div>
              <div className="font-medium">{(material.printSpeedModifier * 100).toFixed(0)}%</div>
            </div>
          </div>

          {/* Lead Time */}
          {material.leadTimeDays > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{material.leadTimeDays} gün teslimat</span>
            </div>
          )}

        </CardContent>
      </Card>
    </motion.div>
  );
}
