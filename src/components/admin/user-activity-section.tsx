'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Smartphone, Globe, Monitor, Clock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export interface ActivityLog {
  id: string; page_url: string; device_type: string;
  ip_address: string; user_agent: string | null; created_at: string;
}

interface UserActivitySectionProps { activityLogs: ActivityLog[]; }

function getDeviceIcon(deviceType: string) {
  switch (deviceType) {
    case 'mobile': return <Smartphone className="h-3.5 w-3.5" />;
    case 'tablet': return <Monitor className="h-3.5 w-3.5" />;
    default: return <Globe className="h-3.5 w-3.5" />;
  }
}

function getDeviceLabel(deviceType: string): string {
  switch (deviceType) {
    case 'mobile': return 'Mobil';
    case 'tablet': return 'Tablet';
    case 'desktop': return 'Web';
    default: return 'Bilinmiyor';
  }
}

function getPageLabel(url: string): string {
  if (!url || url === '/') return 'Ana Sayfa';
  const parts = url.split('/').filter(Boolean);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' → ');
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function UserActivitySection({ activityLogs }: UserActivitySectionProps) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...activityLogs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const limit = 5;
  const displayed = showAll ? sorted : sorted.slice(0, limit);
  const hasMore = sorted.length > limit;

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      <CardHeader className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary shrink-0" />
              Site Aktivite Geçmişi
            </CardTitle>
            <CardDescription className="text-xs">{activityLogs.length} kayıt</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-6">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz aktivite kaydı bulunmuyor</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayed.map((log, index) => (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors -mx-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 shrink-0 mt-0.5">
                  {getDeviceIcon(log.device_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs sm:text-sm font-medium truncate max-w-[150px] sm:max-w-[250px]">
                      {getPageLabel(log.page_url || '')}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{getDeviceLabel(log.device_type)}</Badge>
                    <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{formatDateTime(log.created_at)}</span>
                    <span>IP: {log.ip_address || 'Bilinmiyor'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {log.page_url && (
                    <a href={log.page_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-primary/60 transition-colors">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {hasMore && !showAll && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
              <ChevronDown className="h-4 w-4 mr-1" />Tümünü Göster ({sorted.length} kayıt)
            </Button>
          </div>
        )}
        {showAll && sorted.length > limit && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowAll(false)}>
              <ChevronUp className="h-4 w-4 mr-1" />Daralt
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
