'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [mounted, setMounted] = React.useState(false);

  // Only render on client-side to avoid SSR issues
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return children without theme provider during SSR
    // Suppress hydration warning as theme is applied client-side
    return <div suppressHydrationWarning>{children}</div>;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
