'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inventoryService, type NozzleSize } from '@/lib/services/inventory-service';

// Nozzle sizes rendered dynamically from DB via inventoryService.getAllNozzleSizes()

interface NozzleSelectorProps {
  selectedNozzleId?: string;
  onSelect: (nozzle: NozzleSize) => void;
  disabled?: boolean;
  technology?: 'FDM' | 'SLA';
}

export function NozzleSelector({
  selectedNozzleId,
  onSelect,
  disabled = false,
  technology,
}: NozzleSelectorProps) {
  const [nozzles, setNozzles] = useState<NozzleSize[]>([]);
  const [inStockIds, setInStockIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNozzles = async () => {
      try {
        const [data, stockIds] = await Promise.all([
          inventoryService.getAllNozzleSizes(),
          inventoryService.getAvailableNozzleSizeIds(),
        ]);
        setNozzles(data.filter(n => n.is_active && (!technology || n.compatible_technology === technology)));
        setInStockIds(stockIds);
      } catch (err) {
        console.error('Failed to fetch nozzle sizes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNozzles();
  }, [technology]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-10">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nozzles
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.size_mm - b.size_mm)
        .map(nozzle => {
          const inStock = inStockIds.has(nozzle.id);
          const isSelected = nozzle.id === selectedNozzleId;

          return (
            <button
              key={nozzle.id}
              type="button"
              disabled={disabled || !inStock}
              onClick={() => onSelect(nozzle)}
              className={cn(
                "min-w-[3.5rem] px-3 py-2 rounded-lg text-sm font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                  : inStock
                    ? "bg-muted hover:bg-muted/80 text-foreground border border-border hover:border-primary/50"
                    : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed line-through"
              )}
            >
              {nozzle.size_mm.toFixed(1)}
            </button>
          );
        })}
    </div>
  );
}
