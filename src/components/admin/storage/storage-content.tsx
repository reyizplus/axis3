'use client';

import { useState, useMemo } from 'react';
import { HardDrive, Box, Image, BarChart3, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { StlFilesTab } from './stl-files-tab';
import { ImagesTab } from './images-tab';
import { StorageStatsTab } from './storage-stats-tab';

interface FileWithUser {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  bucket_name: string | null;
  volume_cm3: number | null;
  surface_area_cm2: number | null;
  bounding_box_x: number | null;
  bounding_box_y: number | null;
  bounding_box_z: number | null;
  triangle_count: number | null;
  is_manifold: boolean | null;
  has_errors: boolean;
  analysis_status: string;
  thumbnail_path: string | null;
  color: string | null;
  metadata: any;
  created_at: string;
  users: { id: string; full_name: string | null; email: string | null } | null;
}

interface StorageStats {
  stl: { count: number; bytes: number; active_users: number };
  images: { count: number; bytes: number };
  thumbnails: { count: number; bytes: number };
  total: { count: number; bytes: number };
  total_users: number;
}

interface StorageContentProps {
  files: FileWithUser[];
  stats: StorageStats | null;
}

type TabId = 'stl' | 'images' | 'stats';

export function StorageContent({ files, stats }: StorageContentProps) {
  const [activeTab, setActiveTab] = useState<TabId>('stl');
  const [search, setSearch] = useState('');

  const filteredFiles = useMemo(() => {
    if (!search) return files;
    const q = search.toLowerCase();
    return files.filter(f =>
      f.original_filename?.toLowerCase().includes(q) ||
      f.users?.full_name?.toLowerCase().includes(q) ||
      f.users?.email?.toLowerCase().includes(q)
    );
  }, [files, search]);

  const stlFiles = useMemo(
    () => filteredFiles.filter(f => f.mime_type === 'model/stl' || f.filename?.endsWith('.stl')),
    [filteredFiles]
  );

  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'ico'];
  const imageFiles = useMemo(
    () => filteredFiles.filter(f => {
      if (f.mime_type?.startsWith('image/')) return true;
      if (f.bucket_name === 'images') return true;
      const ext = f.filename?.split('.').pop()?.toLowerCase();
      if (ext && imageExtensions.includes(ext)) return true;
      return false;
    }),
    [filteredFiles]
  );

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold gradient-text flex items-center gap-3">
          <HardDrive className="h-6 w-6 text-primary" /> Depo Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Dosyaları görüntüle, düzenle ve yönet</p>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabId)} className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <TabsList className="bg-muted/50 p-0.5">
            <TabsTrigger value="stl" className="rounded-md gap-1.5">
              <Box className="h-4 w-4" /> STL Dosyaları
              <span className="ml-1 text-xs rounded-full bg-primary/10 px-1.5 py-0.5">{stlFiles.length}</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="rounded-md gap-1.5">
              <Image className="h-4 w-4" /> Resimler
              <span className="ml-1 text-xs rounded-full bg-primary/10 px-1.5 py-0.5">{imageFiles.length}</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="rounded-md gap-1.5">
              <BarChart3 className="h-4 w-4" /> Depolama
            </TabsTrigger>
          </TabsList>
          {activeTab !== 'stats' && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Dosya veya kullanıcı ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm w-full" />
            </div>
          )}
        </div>
        <TabsContent value="stl"><StlFilesTab files={stlFiles} /></TabsContent>
        <TabsContent value="images"><ImagesTab files={imageFiles as any} /></TabsContent>
        <TabsContent value="stats">{stats && <StorageStatsTab stats={stats} />}</TabsContent>
      </Tabs>
    </div>
  );
}
