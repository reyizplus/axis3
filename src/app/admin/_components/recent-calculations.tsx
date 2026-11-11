'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, ArrowRight, Calculator, Eye, Package } from 'lucide-react';
import { PriceCalculationDetailDialog } from '@/components/admin/price-calculation-detail-dialog';

interface RecentCalculation {
  id: string;
  material: string;
  quality: string;
  price: number;
  created_at: string;
}

interface RecentCalculationsProps {
  calculations: RecentCalculation[];
  totalCount: number;
}

export function RecentCalculations({ calculations, totalCount }: RecentCalculationsProps) {
  const [selectedCalcId, setSelectedCalcId] = useState<string | null>(null);

  return (
    <>
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Son Hesaplamalar
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sistemdeki son fiyatlandırma aktiviteleri
              </p>
            </div>
            <Badge variant="secondary" className="text-xs font-normal shrink-0">
              {totalCount} toplam
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {calculations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calculator className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz hesaplama yok</p>
            </div>
          ) : (
            <div className="space-y-1">
              {calculations.slice(0, 5).map((calc) => (
                <div
                  key={calc.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors -mx-2 group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/5 shrink-0">
                      <Package className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{calc.material}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal shrink-0">
                          {calc.quality}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(calc.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">₺{calc.price.toFixed(2)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedCalcId(calc.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {calculations.length > 5 && (
                <div className="pt-2 text-center">
                    <Button variant="link" size="sm" asChild className="h-8">
                    <Link href="/admin/calculations">
                      Tümünü Görüntüle
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PriceCalculationDetailDialog
        calculationId={selectedCalcId}
        open={!!selectedCalcId}
        onOpenChange={(open) => { if (!open) setSelectedCalcId(null); }}
      />
    </>
  );
}
