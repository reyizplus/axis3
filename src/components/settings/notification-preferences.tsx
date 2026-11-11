/**
 * Notification Preferences Component
 * Axis3 - User notification settings
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Bell, Loader2, Save, Mail, ShoppingBag, Newspaper } from 'lucide-react';

interface NotificationPreferencesProps {
  userId: string;
}

interface Preferences {
  email_order_updates: boolean;
  email_marketing: boolean;
  email_newsletter: boolean;
}

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    email_order_updates: true,
    email_marketing: false,
    email_newsletter: false,
  });

  const supabase = createClient();

  const initializePreferences = useCallback(async () => {
    try {
      const { error } = await (supabase.from('users') as any)
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to initialize preferences:', error);
      }
    } catch (error) {
      console.error('Initialize preferences exception:', error);
    }
  }, [supabase, preferences, userId]);

  const loadPreferences = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from('users') as any)
        .select('notification_preferences')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load preferences:', error);
      } else if ((data as any)?.notification_preferences) {
        setPreferences((data as any).notification_preferences);
      } else {
        await initializePreferences();
      }
    } catch (error) {
      console.error('Load preferences exception:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase, initializePreferences]);

  useEffect(() => {
    loadPreferences();
  }, [userId, loadPreferences]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await (supabase.from('users') as any)
        .update({
          notification_preferences: preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to save preferences:', error);
        toast.error('Bildirim tercihleri kaydedilemedi');
        return;
      }

      toast.success('Bildirim tercihleri güncellendi');
    } catch (error) {
      console.error('Save preferences exception:', error);
      toast.error('Beklenmeyen bir hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  function updatePreference(key: keyof Preferences, value: boolean) {
    setPreferences({ ...preferences, [key]: value });
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
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Bildirim Tercihleri</CardTitle>
            <CardDescription>
              E-posta bildirimlerinizi yönetin
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Updates */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start gap-3 flex-1">
            <Mail className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="email_order_updates" className="text-base font-medium cursor-pointer">
                Sipariş Güncellemeleri
              </Label>
              <p className="text-sm text-muted-foreground">
                Sipariş durumu değişikliklerinde e-posta alın
              </p>
            </div>
          </div>
          <Switch
            id="email_order_updates"
            checked={preferences.email_order_updates}
            onCheckedChange={(checked: boolean) => updatePreference('email_order_updates', checked)}
          />
        </div>

        <Separator />

        {/* Marketing Emails */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start gap-3 flex-1">
            <ShoppingBag className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="email_marketing" className="text-base font-medium cursor-pointer">
                Pazarlama E-postaları
              </Label>
              <p className="text-sm text-muted-foreground">
                Özel teklifler ve kampanyalar hakkında bilgi alın
              </p>
            </div>
          </div>
          <Switch
            id="email_marketing"
            checked={preferences.email_marketing}
            onCheckedChange={(checked: boolean) => updatePreference('email_marketing', checked)}
          />
        </div>

        <Separator />

        {/* Newsletter */}
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-start gap-3 flex-1">
            <Newspaper className="h-5 w-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <Label htmlFor="email_newsletter" className="text-base font-medium cursor-pointer">
                Haber Bülteni
              </Label>
              <p className="text-sm text-muted-foreground">
                3D baskı ipuçları ve yenilikler hakkında bilgi alın
              </p>
            </div>
          </div>
          <Switch
            id="email_newsletter"
            checked={preferences.email_newsletter}
            onCheckedChange={(checked: boolean) => updatePreference('email_newsletter', checked)}
          />
        </div>

        <Separator />

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
