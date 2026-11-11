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
