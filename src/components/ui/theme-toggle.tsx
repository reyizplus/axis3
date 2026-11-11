'use client';

import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-transparent hover:text-foreground dark:hover:bg-accent/20">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Tema değiştir</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[130px]">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={`focus:bg-transparent focus:text-foreground dark:focus:bg-accent/20 ${theme === 'light' ? 'bg-accent/10 dark:bg-accent/20' : ''}`}
        >
          <Sun className="mr-2 h-4 w-4" />
          Açık
          {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={`focus:bg-transparent focus:text-foreground dark:focus:bg-accent/20 ${theme === 'dark' ? 'bg-accent/10 dark:bg-accent/20' : ''}`}
        >
          <Moon className="mr-2 h-4 w-4" />
          Koyu
          {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={`focus:bg-transparent focus:text-foreground dark:focus:bg-accent/20 ${theme === 'system' ? 'bg-accent/10 dark:bg-accent/20' : ''}`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          Sistem
          {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
