'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HardDrive, Box, Image, Users, FileText, BarChart3 } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

interface StorageStats {
  stl: { count: number; bytes: number; active_users: number };
  images: { count: number; bytes: number };
  thumbnails: { count: number; bytes: number };
  total: { count: number; bytes: number };
  total_users: number;
}

interface StorageStatsTabProps {
  stats: StorageStats;
}

export function StorageStatsTab({ stats }: StorageStatsTabProps) {
  const buckets = [
    {
      title: 'STL Dosyaları',
      description: '3D model dosyaları',
      icon: Box,
      count: stats.stl.count,
      bytes: stats.stl.bytes,
      activeUsers: stats.stl.active_users,
      gradient: 'from-blue-500/20 via-blue-500/5 to-transparent',
      iconBg: 'bg-blue-500/10 text-blue-600',
    },
    {
      title: 'Resimler',
      description: 'Blog, ürün ve thumbnail görselleri',
      icon: Image,
      count: stats.images.count,
      bytes: stats.images.bytes,
      activeUsers: null,
      gradient: 'from-emerald-500/20 via-emerald-500/5 to-transparent',
      iconBg: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      title: 'Thumbnail\'lar',
      description: '3D model önizleme resimleri',
      icon: FileText,
      count: stats.thumbnails.count,
      bytes: stats.thumbnails.bytes,
      activeUsers: null,
      gradient: 'from-purple-500/20 via-purple-500/5 to-transparent',
      iconBg: 'bg-purple-500/10 text-purple-600',
    },
  ];

  const percentage = stats.total.bytes > 0
    ? (stats.stl.bytes / stats.total.bytes) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden border-border/60">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Toplam Depolama</CardTitle>
            <HardDrive className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatBytes(stats.total.bytes)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.total.count} dosya</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-500/5 to-transparent opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">STL Kullanımı</CardTitle>
            <Box className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatBytes(stats.stl.bytes)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.stl.count} dosya</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Görsel Kullanımı</CardTitle>
            <Image className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{formatBytes(stats.images.bytes)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.images.count} dosya</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-border/60">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-orange-500/5 to-transparent opacity-50" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Aktif Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{stats.stl.active_users}</div>
            <p className="text-xs text-muted-foreground mt-1">Dosya yükleyen kullanıcı</p>
          </CardContent>
        </Card>
      </div>

      {/* Bucket Breakdown */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-4 w-4 text-primary" />
            Bucket Bazında Dağılım
          </CardTitle>
          <CardDescription>
            Her depolama alanı için dosya sayısı ve kullanım miktarı
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {buckets.map((bucket, index) => {
              const maxBytes = Math.max(...buckets.map(b => b.bytes));
              const barWidth = maxBytes > 0 ? (bucket.bytes / maxBytes) * 100 : 0;
              const Icon = bucket.icon;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bucket.iconBg}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{bucket.title}</p>
                        <p className="text-xs text-muted-foreground">{bucket.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatBytes(bucket.bytes)}</p>
                      <p className="text-xs text-muted-foreground">{bucket.count} dosya</p>
                    </div>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${
                        index === 0 ? 'from-blue-500 to-blue-400' :
                        index === 1 ? 'from-emerald-500 to-emerald-400' :
                        'from-purple-500 to-purple-400'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Storage Distribution Pie (visual bar) */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDrive className="h-4 w-4 text-primary" />
            Depolama Dağılımı
          </CardTitle>
          <CardDescription>
            Toplam {formatBytes(stats.total.bytes)} depolamanın bucket bazında dağılımı
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-6 rounded-full overflow-hidden">
            {buckets.map((bucket, index) => {
              const pct = stats.total.bytes > 0
                ? (bucket.bytes / stats.total.bytes) * 100
                : 0;
              if (pct < 0.5) return null;
              return (
                <div
                  key={index}
                  className={`h-full flex items-center justify-center text-[10px] font-medium text-white ${
                    index === 0 ? 'bg-blue-500' :
                    index === 1 ? 'bg-emerald-500' :
                    'bg-purple-500'
                  }`}
                  style={{ width: `${pct}%`, minWidth: pct > 5 ? 'fit-content' : undefined }}
                  title={`${bucket.title}: ${pct.toFixed(1)}%`}
                >
                  {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                </div>
              );
            })}
            {percentage < 100 && (
              <div
                className="h-full bg-muted"
                style={{ width: `${100 - percentage}%` }}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-4">
            {buckets.map((bucket, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className={`h-3 w-3 rounded-sm ${
                  index === 0 ? 'bg-blue-500' :
                  index === 1 ? 'bg-emerald-500' :
                  'bg-purple-500'
                }`} />
                <span className="text-muted-foreground">{bucket.title}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
