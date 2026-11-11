import { Skeleton } from '@/components/ui/skeleton';

export default function OrderDetailLoading() {
  return (
    <div className="px-4 py-6 max-w-[1600px] mx-auto">
      <Skeleton className="h-7 w-48 mb-6" />
      <Skeleton className="h-32 mb-6" />
      <Skeleton className="h-64" />
    </div>
  );
}
