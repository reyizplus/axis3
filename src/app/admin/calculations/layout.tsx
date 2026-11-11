import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hesaplamalar',
};

export default function CalculationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
