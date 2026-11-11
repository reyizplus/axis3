'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, LogIn, LogOut, Key, Lock, Unlock, CheckCircle2, XCircle, AlertTriangle, Smartphone, Mail } from 'lucide-react';

export interface AuthEvent {
  id: string; user_id: string | null; action: string; entity_type: string;
  entity_id: string; old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null; ip_address: string | null;
  user_agent: string | null; created_at: string;
}

interface UserSecuritySectionProps { authEvents: AuthEvent[]; }

const EVENT_CONFIG: Record<string, { label: string; icon: typeof Shield; color: string }> = {
  'auth:LOGIN_SUCCESS': { label: 'Giriş Başarılı', icon: LogIn, color: 'text-emerald-600 bg-emerald-500/10' },
  'auth:LOGIN_FAILURE': { label: 'Giriş Başarısız', icon: XCircle, color: 'text-red-600 bg-red-500/10' },
  'auth:LOGOUT': { label: 'Çıkış', icon: LogOut, color: 'text-blue-600 bg-blue-500/10' },
  'auth:REGISTER_SUCCESS': { label: 'Kayıt', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10' },
  'auth:PASSWORD_RESET_REQUEST': { label: 'Şifre Sıfırlama Talebi', icon: Key, color: 'text-amber-600 bg-amber-500/10' },
  'auth:PASSWORD_RESET_SUCCESS': { label: 'Şifre Sıfırlama', icon: Key, color: 'text-emerald-600 bg-emerald-500/10' },
  'auth:PASSWORD_CHANGE': { label: 'Şifre Değişikliği', icon: Key, color: 'text-orange-600 bg-orange-500/10' },
  'auth:EMAIL_VERIFY': { label: 'E-posta Doğrulama', icon: Mail, color: 'text-purple-600 bg-purple-500/10' },
  'auth:TWO_FACTOR_ENABLE': { label: '2FA Etkinleştirme', icon: Shield, color: 'text-cyan-600 bg-cyan-500/10' },
  'auth:TWO_FACTOR_DISABLE': { label: '2FA Devre Dışı', icon: Shield, color: 'text-gray-600 bg-gray-500/10' },
  'auth:TWO_FACTOR_VERIFY': { label: '2FA Doğrulama', icon: Smartphone, color: 'text-cyan-600 bg-cyan-500/10' },
  'auth:TWO_FACTOR_FAILURE': { label: '2FA Başarısız', icon: AlertTriangle, color: 'text-red-600 bg-red-500/10' },
  'rate_limit:login': { label: 'Rate Limit (Giriş)', icon: AlertTriangle, color: 'text-red-600 bg-red-500/10' },
  'auth:ACCOUNT_SUSPENDED': { label: 'Hesap Askıya Alındı', icon: Lock, color: 'text-red-600 bg-red-500/10' },
};

function getEventConfig(action: string) {
  const found = EVENT_CONFIG[action];
  if (found) return found;
  if (action.startsWith('auth:')) return { label: action.replace('auth:', ''), icon: Shield, color: 'text-gray-600 bg-gray-500/10' };
  return { label: action, icon: Shield, color: 'text-gray-600 bg-gray-500/10' };
}

export function UserSecuritySection({ authEvents }: UserSecuritySectionProps) {
  const sorted = [...authEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              Güvenlik Geçmişi
            </CardTitle>
            <CardDescription className="text-xs">{authEvents.length} kayıt</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-6">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz güvenlik kaydı bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-1">
            {sorted.map((event) => {
              const config = getEventConfig(event.action);
              const Icon = config.icon;
              return (
                <div key={event.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors -mx-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${config.color} mt-0.5`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs sm:text-sm font-medium truncate">{config.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(event.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      {event.ip_address && <span>IP: {event.ip_address}</span>}
                      {event.entity_type === 'rate_limit' && <span className="text-red-500/70 font-medium">Rate Limit: {event.entity_id}</span>}
                      {event.entity_type === 'auth_event' && event.entity_id !== event.user_id && <span>Hedef: {event.entity_id}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
