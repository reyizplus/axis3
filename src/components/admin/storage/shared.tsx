/**
 * Canonical shape of a storage row joined with its owner. Every storage tab
 * used to declare its own copy of this interface, so a field added in one
 * place (bucket_name) made the types incompatible at the call sites.
 */
export interface AdminStorageFile {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  created_at: string;
  users: { id: string; full_name: string | null; email: string | null } | null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const analysisStatusColors: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-600',
  processing: 'bg-amber-500/10 text-amber-600',
  pending: 'bg-gray-500/10 text-gray-600',
  failed: 'bg-red-500/10 text-red-600',
};

export const analysisStatusLabels: Record<string, string> = {
  completed: 'Tamamlandı',
  processing: 'İşleniyor',
  pending: 'Beklemede',
  failed: 'Başarısız',
};
