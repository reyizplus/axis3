'use client';

import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

export function CustomToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      theme={theme as 'light' | 'dark' | 'system'}
      toastOptions={{
        classNames: {
          toast: 'glass-light dark:glass border-2 shadow-2xl backdrop-blur-xl',
          title: 'font-semibold text-base',
          description: 'text-sm opacity-90',
          actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
          cancelButton: 'bg-muted text-muted-foreground hover:bg-muted/80',
          closeButton: 'bg-background border-2 hover:bg-accent',
          success: 'border-green-500/30 bg-green-500/5',
          error: 'border-red-500/30 bg-red-500/5',
          warning: 'border-yellow-500/30 bg-yellow-500/5',
          info: 'border-blue-500/30 bg-blue-500/5',
        },
        style: {
          borderRadius: '12px',
          padding: '16px',
          gap: '8px',
        },
        duration: 4000,
      }}
    />
  );
}
