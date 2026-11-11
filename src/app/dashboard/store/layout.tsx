import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mağazam',
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
