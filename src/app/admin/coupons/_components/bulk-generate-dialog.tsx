'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Copy, Download, Loader2, RefreshCw, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminCouponClientService,
  type BulkGenerateResult,
} from '@/lib/services/admin-coupon-client-service';
import {
  CouponRulesFields,
  createEmptyRuleState,
  ruleStateToPayload,
  validateRuleState,
  type CouponRuleFormState,
} from './coupon-rules-fields';

interface BulkGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: () => void;
}

function parseEmails(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export function BulkGenerateDialog({ open, onOpenChange, onGenerated }: BulkGenerateDialogProps) {
  const [rules, setRules] = useState<CouponRuleFormState>(createEmptyRuleState());
  const [count, setCount] = useState('10');
  const [codePrefix, setCodePrefix] = useState('AX3');
  const [batchLabel, setBatchLabel] = useState('');
  const [ownerEmails, setOwnerEmails] = useState('');
  const [result, setResult] = useState<BulkGenerateResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRules(createEmptyRuleState());
    setCount('10');
    setCodePrefix('AX3');
    setBatchLabel('');
    setOwnerEmails('');
    setResult(null);
    setError(null);
  }, [open]);

  async function handleGenerate() {
    const validation = validateRuleState(rules);
    if (validation) {
      setError(validation);
      return;
    }

    const numericCount = Math.trunc(Number(count));
    if (!Number.isFinite(numericCount) || numericCount < 1 || numericCount > 500) {
      setError('Adet 1 ile 500 arasında olmalıdır');
      return;
    }

    const emails = parseEmails(ownerEmails);
    if (emails.length > numericCount) {
      setError(
        `Kullanıcı sayısı (${emails.length}) kod adedinden (${numericCount}) fazla olamaz`
      );
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const generated = await adminCouponClientService.bulkGenerate({
        ...ruleStateToPayload(rules),
        count: numericCount,
        codePrefix: codePrefix.trim() || null,
        batchLabel: batchLabel.trim() || null,
        ownerEmails: emails,
      });

      setResult(generated);
      toast.success(`${generated.codes.length} kupon kodu üretildi`);
      onGenerated();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Üretim başarısız oldu');
    } finally {
      setGenerating(false);
    }
  }

  function copyAll() {
    if (!result) return;
    const text = result.codes
      .map((entry) => (entry.ownerEmail ? `${entry.code},${entry.ownerEmail}` : entry.code))
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Kodlar kopyalandı');
  }

  function downloadCsv() {
    if (!result) return;

    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = [
      ['kod', 'email'].map(escapeCell).join(','),
      ...result.codes.map((entry) =>
        [entry.code, entry.ownerEmail ?? ''].map(escapeCell).join(',')
      ),
    ];
    // BOM so Excel opens the Turkish characters correctly.
    const blob = new Blob([`\ufeff${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `kuponlar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Toplu Kişiye Özel Kod Üret</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border-2 border-emerald-500/30 bg-emerald-500/[0.06] p-3 flex items-start gap-2">
              <Ticket className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  {result.codes.length} kod üretildi
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Aynı kural setini ve kotayı paylaşırlar; kota kampanya bazında sayılır.
                </p>
              </div>
            </div>

            <textarea
              readOnly
              value={result.codes
                .map((entry) =>
                  entry.ownerEmail ? `${entry.code}\t${entry.ownerEmail}` : entry.code
                )
                .join('\n')}
              rows={12}
              className="w-full rounded-xl border-2 border-border/60 bg-muted/20 px-3 py-2 font-mono text-xs resize-none"
            />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={copyAll} className="gap-1.5">
                <Copy className="h-4 w-4" /> Kopyala
              </Button>
              <Button variant="outline" onClick={downloadCsv} className="gap-1.5">
                <Download className="h-4 w-4" /> CSV indir
              </Button>
              <Button variant="ghost" onClick={() => setResult(null)} className="gap-1.5">
                <RefreshCw className="h-4 w-4" /> Yeni üretim
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Adet *</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  step="1"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                  disabled={generating}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kod öneki</Label>
                <Input
                  value={codePrefix}
                  onChange={(event) =>
                    setCodePrefix(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                  }
                  maxLength={10}
                  placeholder="AX3"
                  disabled={generating}
                  className="h-9 font-mono text-sm uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Parti etiketi</Label>
                <Input
                  value={batchLabel}
                  onChange={(event) => setBatchLabel(event.target.value)}
                  placeholder="Örn. Aralık kampanyası"
                  maxLength={120}
                  disabled={generating}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kullanıcı e-postaları (isteğe bağlı)</Label>
              <textarea
                value={ownerEmails}
                onChange={(event) => setOwnerEmails(event.target.value)}
                rows={3}
                placeholder={'ornek1@mail.com\nornek2@mail.com'}
                disabled={generating}
                className="w-full rounded-xl border-2 border-border/60 bg-background/50 px-3 py-2 text-sm resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Kodlar sırayla bu kullanıcılara atanır. Boş bırakılan kodlar atanmamış olur ve
                ilk kullanan kişide bir kez geçerlidir.
              </p>
            </div>

            <div className="border-t border-border/50" />

            <CouponRulesFields value={rules} onChange={setRules} disabled={generating} />

            {error && (
              <p className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Kapat</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
                İptal
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Üretiliyor...
                  </>
                ) : (
                  'Kodları Üret'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
