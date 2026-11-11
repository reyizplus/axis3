/**
 * Company Info Form Component
 * Axis3 - Corporate user company information
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Building2, Loader2, Save } from 'lucide-react';

interface CompanyInfoFormProps {
  userId: string;
  isCorporate: boolean;
}

interface CompanyInfo {
  company_name: string;
  tax_number: string;
  tax_office: string;
}

export function CompanyInfoForm({ userId, isCorporate }: CompanyInfoFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CompanyInfo>({
    company_name: '',
    tax_number: '',
    tax_office: '',
  });

  const supabase = createClient();

  const loadCompanyInfo = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from('users') as any)
        .select('company_name, tax_number, tax_office')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load company info:', error);
        // Use empty form data on error
      } else if (data) {
        const d = data as { company_name: string; tax_number: string; tax_office: string };
        setFormData({
          company_name: d.company_name || '',
          tax_number: d.tax_number || '',
          tax_office: d.tax_office || '',
        });
      }
      // If data is null, keep default empty form data
    } catch (error) {
      console.error('Load company info exception:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    loadCompanyInfo();
  }, [userId, loadCompanyInfo]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await (supabase.from('users') as any)
        .update({
          company_name: formData.company_name,
          tax_number: formData.tax_number,
          tax_office: formData.tax_office,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to save company info:', error);
        toast.error('Şirket bilgileri kaydedilemedi');
        return;
      }

      toast.success('Şirket bilgileri güncellendi');
    } catch (error) {
      console.error('Save company info exception:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  // Don't render if not corporate user
  if (!isCorporate) {
    return null;
  }

  if (loading) {
    return (
      <Card className="glass-light dark:glass">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-light dark:glass">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Şirket Bilgileri</CardTitle>
            <CardDescription>
              Kurumsal hesap bilgilerinizi güncelleyin
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company_name" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Şirket Adı
          </Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            placeholder="Şirket adınız"
            className="glass-light dark:glass"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_number">Vergi Numarası</Label>
          <Input
            id="tax_number"
            value={formData.tax_number}
            onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
            placeholder="1234567890"
            className="glass-light dark:glass"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_office">Vergi Dairesi</Label>
          <Input
            id="tax_office"
            value={formData.tax_office}
            onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
            placeholder="Vergi dairesi adı"
            className="glass-light dark:glass"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[160px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Değişiklikleri Kaydet
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
