import { Skeleton } from '@/components/ui/skeleton';

export default function AdminOrderFileDetailLoading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
      <Skeleton className="h-7 w-48 mb-6" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><Skeleton className="h-[250px] sm:h-[600px] rounded-xl" /></div>
        <div className="space-y-6"><Skeleton className="h-48 rounded-xl" /><Skeleton className="h-48 rounded-xl" /></div>
      </div>
    </div>
  );
}
