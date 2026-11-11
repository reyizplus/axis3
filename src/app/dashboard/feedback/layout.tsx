import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Geri Bildirim',
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
