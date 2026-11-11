/**
 * DashboardShell Component
 * Axis3 - Premium Dashboard Framework
 *
 * The Command Center: Universal layout with glassmorphism sidebar
 * Apple-esque simplicity with technological depth
 */

'use client';

import { ReactNode, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Upload,
  Box,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Home,
  FileText,
  Sparkles,
  MessageSquare,
  Store,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface DashboardShellProps {
  children: ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
}

const navigation = [
  { name: 'Ana Sayfa', href: '/dashboard', icon: Home },
  { name: 'Yeni Yükleme', href: '/upload', icon: Upload, highlight: true },
  { name: 'Mağaza', href: '/dashboard/store', icon: Store },
  { name: 'Modellerim', href: '/dashboard/files', icon: Box },
  { name: 'Sepetim', href: '/cart', icon: ShoppingCart },
  { name: 'Siparişlerim', href: '/dashboard/orders', icon: FileText },
  { name: 'Geri Bildirim', href: '/dashboard/feedback', icon: MessageSquare },
  { name: 'Ayarlar', href: '/dashboard/settings', icon: Settings },
];

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const { user, profile, signOut } = useAuth();

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('dashboard-sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Başarıyla çıkış yaptınız');
      router.push('/');
    } catch {
      toast.error('Çıkış yapılırken bir hata oluştu');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-[72px]' : 'lg:w-72',
          'w-[85vw]',
          'bg-secondary text-secondary-foreground border-r-2 border-border dark:border-border/60'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            'flex h-14 lg:h-16 items-center border-b-2 border-border dark:border-border/60',
            collapsed ? 'justify-center px-2' : 'justify-between px-4 lg:px-6'
          )}>
            <Link href="/dashboard" className={cn(
              'flex items-center group hover:opacity-90 transition-opacity',
              collapsed && 'justify-center'
            )}>
              {collapsed ? (
                <div className="flex h-8 w-8 items-center justify-center">
                  <Image
                    src="/dashboard-icon.png"
                    alt="AXIS3"
                    width={32}
                    height={32}
                    className="h-8 w-8 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <Image
                  src="/navbar-logo.png"
                  alt="AXIS3"
                  width={90}
                  height={28}
                  className="h-7 lg:h-8 w-auto object-contain"
                />
              )}
            </Link>
            {!collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:inline-flex h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={toggleCollapsed}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Collapse toggle when collapsed */}
          {collapsed && (
            <div className="hidden lg:flex justify-center py-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={toggleCollapsed}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          <nav className={cn(
            'flex-1 space-y-0.5 lg:space-y-1 overflow-y-auto',
            collapsed ? 'px-1.5 py-3' : 'px-2 lg:px-3 py-3 lg:py-4'
          )}>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    'group flex items-center rounded-xl text-sm font-semibold transition-all active:scale-[0.98]',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 lg:px-4 py-2.5 lg:py-3',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md dark:shadow-lg'
                      : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground dark:hover:bg-accent/20',
                    item.highlight && 'relative'
                  )}
                >
                  {item.highlight && (
                    <div className={cn(
                      'absolute top-1/2 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-blue-600',
                      collapsed ? '-left-0 h-6 w-0.5' : '-left-1 h-6 lg:h-8 w-1'
                    )} />
                  )}

                  <div
                    className={cn(
                      'rounded-lg transition-all',
                      collapsed ? 'p-2' : 'p-1.5 lg:p-2',
                      isActive
                        ? 'bg-primary-foreground/10 dark:bg-primary-foreground/20'
                        : 'bg-accent/20 group-hover:bg-accent/30 dark:bg-accent/30 dark:group-hover:bg-accent/40'
                    )}
                  >
                    <Icon className={cn('h-5 w-5', isActive && 'text-primary-foreground')} />
                  </div>

                  {!collapsed && (
                    <>
                      <span className={cn(isActive && 'font-bold')}>
                        {item.name}
                      </span>
                      {item.highlight && (
                        <Sparkles className="ml-auto h-4 w-4 text-primary animate-pulse" />
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className={cn('mt-auto', collapsed ? 'p-2' : 'p-4')}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full h-auto py-3 hover:bg-accent transition-all rounded-xl',
                    collapsed ? 'justify-center gap-0' : 'justify-start gap-3'
                  )}
                >
                  <Avatar className="h-10 w-10 border-2 border-primary/20">
                    <AvatarImage src={profile?.avatar} alt={profile?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{profile?.full_name || 'Kullanıcı'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile?.email || user?.email || ''}
                      </p>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Ayarlar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Çıkış Yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn('transition-all duration-300', collapsed ? 'lg:pl-[72px]' : 'lg:pl-72')}>
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 lg:h-16 items-center gap-2 lg:gap-4 border-b-2 border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-3 lg:px-6 dark:bg-background/90 dark:border-border/80">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-10 w-10"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumbs / Page title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xs sm:text-sm lg:text-lg font-semibold truncate">
              {navigation.find((item) => pathname === item.href)?.name || 'Dashboard'}
            </h1>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 lg:gap-2">
            <div className="scale-90 lg:scale-100"><ThemeToggle /></div>
            <Button asChild size="sm" className="h-9 lg:h-10 px-3 lg:px-4 rounded-xl">
              <Link href="/upload" className="flex items-center gap-1 lg:gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Yeni Yükleme</span>
                <span className="sm:hidden">Yükle</span>
              </Link>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-3 lg:px-4 py-4 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
