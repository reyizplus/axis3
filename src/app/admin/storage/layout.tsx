import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Depolama',
};

export default function StorageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
