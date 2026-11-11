import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Malzemeler',
};

export default function MaterialsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
