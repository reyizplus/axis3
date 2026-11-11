'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
} from 'lucide-react';
import { PriceCalculationDetailDialog } from '@/components/admin/price-calculation-detail-dialog';

interface Calculation {
  id: string;
  material: string;
  quality: string;
  price: number;
  created_at: string;
}

interface PageData {
  calculations: Calculation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CalculationsPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedCalcId, setSelectedCalcId] = useState<string | null>(null);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/price-calculations?page=${p}&limit=20`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page);
  }, [page, fetchData]);

  return (
    <div className="animate-in px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Fiyat Hesaplamaları</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `Toplam ${data.total} hesaplama` : 'Tüm fiyat hesaplama kayıtları'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Hesaplama Geçmişi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : !data || data.calculations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Henüz hesaplama yok</p>
              <p className="text-xs mt-1">Sistemde kayıtlı herhangi bir fiyat hesaplaması bulunamadı.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {data.calculations.map((calc) => (
                  <div
                    key={calc.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors -mx-2 group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 shrink-0">
                        <Package className="h-4 w-4 text-primary" />
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
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3 shrink-0">
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
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Sayfa {data.page} / {data.totalPages} (toplam {data.total})
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={page <= 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                      {data.page}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PriceCalculationDetailDialog
        calculationId={selectedCalcId}
        open={!!selectedCalcId}
        onOpenChange={(open) => { if (!open) setSelectedCalcId(null); }}
      />
    </div>
  );
}
