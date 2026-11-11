import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Banka Hesapları',
};

export default function BankAccountsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
