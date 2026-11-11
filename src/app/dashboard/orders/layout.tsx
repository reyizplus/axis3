import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Siparişlerim',
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
