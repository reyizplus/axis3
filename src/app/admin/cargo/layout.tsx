import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kargo',
};

export default function CargoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
