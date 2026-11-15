'use client';

import { ReactNode, useState, useLayoutEffect, createContext, useContext } from 'react';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  FileText,
  MessageSquare,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Home,
  ChevronRight,
  Store,
  Tag,
  ChevronLeft,
  Terminal,
  HardDrive,
  Truck,
  ScrollText,
  Calculator,
  Ticket,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminShellProps {
  children: ReactNode;
  permissions?: string[] | null;
  isSuperAdmin?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  permissionKey?: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  permissionKey?: string;
}

// Maps sidebar items to permission keys
export const NAV_PERMISSION_KEYS: Record<string, string> = {
  '/admin': 'dashboard',
  '/admin/calculations': 'dashboard',
  '/admin/orders': 'orders',
  '/admin/materials': 'materials',
  '/admin/inventory': 'inventory',
  '/admin/users': 'users',
  '/admin/cargo': 'cargo',
  '/admin/storage': 'storage',
  '/admin/blog': 'blog',
  '/admin/feedback': 'feedback',
  '/admin/store/products': 'store-products',
  '/admin/store/categories': 'store-categories',
  '/admin/coupons': 'coupons',
  '/admin/security': 'security',
  '/admin/settings': 'settings',
};

const ALL_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Genel',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Hesaplamalar', href: '/admin/calculations', icon: Calculator },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      { name: 'Siparişler', href: '/admin/orders', icon: ShoppingCart },
      { name: 'Malzemeler', href: '/admin/materials', icon: Package },
      { name: 'Envanter', href: '/admin/inventory', icon: Boxes },
      { name: 'Kullanıcılar', href: '/admin/users', icon: Users },
      { name: 'Kargo', href: '/admin/cargo', icon: Truck },
      { name: 'Depo', href: '/admin/storage', icon: HardDrive },
    ],
  },
  {
    label: 'İçerik',
    items: [
      { name: 'Blog', href: '/admin/blog', icon: FileText },
      { name: 'Geri Bildirim', href: '/admin/feedback', icon: MessageSquare },
    ],
  },
  {
    label: 'Mağaza',
    items: [
      { name: 'Ürünler', href: '/admin/store/products', icon: Store },
      { name: 'Kategoriler', href: '/admin/store/categories', icon: Tag },
      { name: 'Kuponlar', href: '/admin/coupons', icon: Ticket },
    ],
  },
  {
    label: 'Yönetim',
    items: [
      { name: 'Yönetim', href: '/admin/security', icon: ScrollText },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { name: 'Ayarlar', href: '/admin/settings', icon: Settings },
    ],
  },
];

interface AdminShellContextType {
  setSidebarOpen: (open: boolean) => void;
}

const AdminShellContext = createContext<AdminShellContextType | undefined>(undefined);

export function useAdminShell() {
  const context = useContext(AdminShellContext);
  if (!context) {
    throw new Error('useAdminShell must be used within AdminShell');
  }
  return context;
}

// Permission context for child pages (e.g. dashboard quick actions)
interface PermissionContextType {
  permissions: string[];
  isSuperAdmin: boolean;
  noPermissionSystem: boolean;
}

const PermissionCtx = createContext<PermissionContextType>({
  permissions: [],
  isSuperAdmin: false,
  noPermissionSystem: true,
});

export function useAdminPermissions() {
  return useContext(PermissionCtx);
}

export function AdminShell({ children, permissions: perms, isSuperAdmin = false }: AdminShellProps) {
  const permissions = perms ?? [];
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('admin-sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });
  const { user, profile, signOut } = useAuth();

  // Permission guard: redirect before paint if user has no access to current page
  const noPermissionSystem = perms === null;
  useLayoutEffect(() => {
    if (isSuperAdmin || noPermissionSystem) return;

    const sortedKeys = Object.entries(NAV_PERMISSION_KEYS).sort((a, b) => b[0].length - a[0].length);
    const match = sortedKeys.find(([route]) => pathname.startsWith(route));
    const requiredKey = match?.[1];

    if (requiredKey && !permissions.includes(requiredKey)) {
      router.replace('/admin');
    }
  }, [pathname, isSuperAdmin, noPermissionSystem, permissions, router]);

  // Filter nav groups based on permissions (null = migration not applied, show all)
  const navigationGroups = ALL_NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (isSuperAdmin || noPermissionSystem) return true;
      const permKey = NAV_PERMISSION_KEYS[item.href];
      if (!permKey) return false;
      return permissions.includes(permKey);
    }),
  })).filter(group => group.items.length > 0);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('admin-sidebar-collapsed', String(next));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Başarıyla çıkış yaptınız');
      router.push('/');
    } catch {
      toast.error('Çıkış yapılırken bir hata oluştu');
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const currentPageName = () => {
    for (const group of navigationGroups) {
      for (const item of group.items) {
        if (isActive(item.href)) return item.name;
      }
    }
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={collapsed ? 'closed' : 'open'}
        variants={{
          open: { width: 280 },
          closed: { width: 72 },
        }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden lg:flex flex-col',
          'bg-secondary text-secondary-foreground border-r border-border'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            'flex h-16 items-center border-b border-border px-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}>
            <Link href="/admin" className={cn(
              'flex items-center gap-3 group',
              collapsed && 'justify-center'
            )}>
              {collapsed ? (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Image
                    src="/dashboard-icon.png"
                    alt="AXIS3"
                    width={28}
                    height={28}
                    className="h-7 w-7 object-contain"
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
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={toggleCollapsed}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Collapsed toggle when collapsed */}
          {collapsed && (
            <div className="flex justify-center py-2">
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
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navigationGroups.map((group) => (
              <div key={group.label}>
                {!collapsed && (
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                    {group.label}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                          collapsed && 'justify-center px-2 py-2',
                          active
                            ? 'bg-primary/10 text-primary shadow-sm'
                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                        )}
                        title={collapsed ? item.name : undefined}
                      >
                        <div className={cn(
                          'rounded-lg p-1.5 transition-all',
                          active ? 'bg-primary/10' : ''
                        )}>
                          <Icon className={cn('h-4 w-4', active && 'text-primary')} />
                        </div>
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.name}</span>
                            {item.badge && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User Menu */}
          <div className={cn('p-3 mt-auto border-t border-border', collapsed && 'px-2')}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 h-auto py-2.5 hover:bg-accent/30 transition-all rounded-lg',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <Avatar className={cn('h-8 w-8 border-2 border-primary/20', collapsed && 'h-9 w-9')}>
                    <AvatarImage src={profile?.avatar} alt={profile?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xs">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{profile?.full_name || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={collapsed ? 'start' : 'end'} className="w-56">
                <DropdownMenuLabel>Admin Menü</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Dashboard&apos;a Dön</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.aside>

      {/* Mobile sidebar (drawer) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-secondary text-secondary-foreground border-r border-border lg:hidden"
          >
            <div className="flex h-16 items-center justify-between px-4 border-b border-border">
              <Link href="/admin" className="flex items-center gap-3 group">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold gradient-text">AXIS3</span>
                  <span className="text-[10px] text-muted-foreground -mt-0.5">Admin Panel</span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
              {navigationGroups.map((group) => (
                <div key={group.label}>
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                          active
                            ? 'bg-primary/10 text-primary shadow-sm'
                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                        )}
                      >
                        <div className={cn(
                          'rounded-lg p-1.5 transition-all',
                          active ? 'bg-primary/10' : ''
                        )}>
                          <Icon className={cn('h-4 w-4', active && 'text-primary')} />
                        </div>
                        <span className="flex-1 truncate">{item.name}</span>
                          {item.badge && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="p-3 mt-auto border-t border-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2.5 hover:bg-accent/30 rounded-lg">
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarImage src={profile?.avatar} alt={profile?.full_name} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xs">
                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{profile?.full_name || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Admin Menü</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      <Home className="mr-2 h-4 w-4" />
                      <span>Dashboard&apos;a Dön</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Çıkış Yap</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className={cn(
        'transition-all duration-300',
        'lg:ml-[280px]',
        collapsed && 'lg:ml-[72px]'
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 sm:px-6">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="font-semibold truncate">{currentPageName()}</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Desktop user avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarImage src={profile?.avatar} alt={profile?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-xs">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Admin Menü</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Dashboard&apos;a Dön</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          <AdminShellContext.Provider value={{ setSidebarOpen }}>
            <PermissionCtx.Provider value={{ permissions, isSuperAdmin, noPermissionSystem }}>
              {children}
            </PermissionCtx.Provider>
          </AdminShellContext.Provider>
        </main>
      </div>
    </div>
  );
}
