'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Package, Activity, ArrowRight, Eye, Calculator } from 'lucide-react';
import { PriceCalculationDetailDialog } from './price-calculation-detail-dialog';

interface RecentCalculation {
  id: string;
  material: string;
  quality: string;
  price: number;
  created_at: string;
}

interface RecentCalculationsWithDetailProps {
  calculations: RecentCalculation[];
  totalCount: number;
}

export function RecentCalculationsWithDetail({ calculations, totalCount }: RecentCalculationsWithDetailProps) {
  const [selectedCalcId, setSelectedCalcId] = useState<string | null>(null);

  return (
    <>
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Son Hesaplamalar
              </CardTitle>
              <CardDescription>Sistemdeki son fiyatlandırma aktiviteleri</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">
              {totalCount} toplam
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {calculations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Henüz fiyat hesaplaması yapılmamış</p>
            </div>
          ) : (
            <div className="space-y-1">
              {calculations.slice(0, 6).map((calc) => (
                <div
                  key={calc.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors -mx-2 group"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5">
                      <Package className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{calc.material}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {calc.quality}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(calc.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className="text-right">
                      <div className="text-base font-bold text-primary">
                        ₺{calc.price.toFixed(2)}
                      </div>
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
              {calculations.length > 6 && (
                <div className="pt-2 text-center">
                  <Button variant="link" size="sm" asChild>
                    <Link href="/admin/orders">
                      <Calculator className="h-3 w-3 mr-1" />
                      Tüm Siparişleri Görüntüle
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
