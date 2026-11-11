'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/providers/auth-provider';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  ChevronDown,
  Menu,
  X,
  Upload,
  LayoutDashboard,
  Package,
  FlaskConical,
  Sun,
  Moon,
  Store,
  Info,
  PenLine,
  Phone,
} from 'lucide-react';
import { CartButton } from '@/components/store/CartButton';

interface NavLink {
  label: string;
  href: string;
  icon: React.ElementType;
  dropdown?: { label: string; href: string; icon: React.ElementType }[];
}

const navLinks: NavLink[] = [
  { label: 'Mağaza', href: '/store', icon: Store },
  { label: 'Hakkımızda', href: '/hakkimizda', icon: Info },
  {
    label: 'Hizmetler',
    href: '/hizmetler',
    icon: Package,
    dropdown: [
      { label: '3D Baskı', href: '/hizmetler', icon: Package },
      { label: 'Malzemeler', href: '/malzemeler', icon: FlaskConical },
    ],
  },
  { label: 'Blog', href: '/blog', icon: PenLine },
  { label: 'İletişim', href: '/iletisim', icon: Phone },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading } = useAuth();
  const { setTheme, theme } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      {/* Gradient accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="max-w-7xl mx-auto flex h-[var(--nav-height)] items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3 shrink-0">
          <div className="relative flex items-center">
            <Image
              src="/navbar-logo.png"
              alt="AXIS3"
              width={110}
              height={36}
              priority
              className="h-9 w-auto object-contain transition-opacity duration-300 group-hover:opacity-90"
            />
            <span className="ml-2.5 hidden sm:inline-block text-[10px] font-medium text-muted-foreground/50 tracking-[0.2em] uppercase select-none border-l border-border/40 pl-2.5">
               3D Baskı
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) =>
            link.dropdown ? (
              <DropdownMenu key={link.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`group relative flex items-center gap-1 px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive(link.href)
                        ? 'text-foreground bg-accent/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                  >
                    {link.label}
                    <ChevronDown className="h-3 w-3 opacity-50 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    {isActive(link.href) && (
                      <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44 p-1.5 glass-light animate-scale-in">
                  {link.dropdown.map((item) => (
                    <DropdownMenuItem key={item.label} asChild>
                      <Link href={item.href} className="group flex items-center gap-3 rounded-lg">
                        <item.icon className="h-4 w-4 text-primary group-hover:text-foreground transition-colors" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className={`group relative px-3.5 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive(link.href)
                    ? 'text-foreground bg-accent/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary shadow-[0_0_6px_rgba(242,112,34,0.6)]" />
                )}
              </Link>
            )
          )}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Tema değiştir</span>
          </Button>

          <CartButton />

          {loading ? (
            <div className="h-9 w-28 animate-pulse bg-muted rounded-xl" />
          ) : user ? (
            <>
              <Button asChild size="sm" className="h-9 rounded-xl glow-hover">
                <Link href="/upload">
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Yükle
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ml-0.5 outline-none">
                    <Avatar className="h-8 w-8 ring-2 ring-primary/20 hover:ring-primary/50 transition-all duration-300 cursor-pointer">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-semibold">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1.5 glass-light animate-scale-in">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2 rounded-lg">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-lg">
                      <LayoutDashboard className="h-4 w-4" />
                      Ayarlar
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="h-9 rounded-xl text-muted-foreground hover:text-foreground">
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button size="sm" asChild className="h-9 rounded-xl glow-hover">
                <Link href="/register">Ücretsiz Başla</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile: cart icon + hamburger */}
        <div className="flex md:hidden items-center gap-1.5">
          <CartButton />
          {/* Animated hamburger */}
          <button
            onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(prev => !prev); }}
            className="relative h-11 w-11 flex items-center justify-center active:scale-95 transition-transform"
            aria-label={mobileMenuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          >
            <div className="relative w-5 h-4">
              <span
                className={`absolute left-0 top-0 h-[2px] w-5 rounded-full bg-foreground transition-all duration-300 ${
                  mobileMenuOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : ''
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-[2px] w-5 rounded-full bg-foreground transition-all duration-300 ${
                  mobileMenuOpen ? 'opacity-0 translate-x-2' : ''
                }`}
              />
              <span
                className={`absolute left-0 bottom-0 h-[2px] w-5 rounded-full bg-foreground transition-all duration-300 ${
                  mobileMenuOpen ? 'bottom-1/2 translate-y-1/2 -rotate-45' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </header>

      {/* Mobile Overlay */}
      <div
        ref={menuRef}
        className={`md:hidden fixed inset-x-0 top-[var(--nav-height)] bottom-0 z-50 transition-all duration-300 ease-in-out ${
          mobileMenuOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-background/95 backdrop-blur-2xl transition-opacity duration-500 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Menu content */}
        <div
          className={`relative h-full overflow-y-auto transition-transform duration-500 ease-out ${
            mobileMenuOpen ? 'translate-y-0' : '-translate-y-4'
          }`}
        >
          <div className="flex flex-col min-h-full px-6 py-8">
            {/* Nav links with stagger */}
            <nav className="flex-1 space-y-1">
              {navLinks.map((link, idx) =>
                link.dropdown ? (
                  <div key={link.label}>
                    <span
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground"
                      style={{
                        animation: mobileMenuOpen
                          ? `fade-in-up 0.4s ease-out ${0.05 * (idx + 1)}s forwards`
                          : 'none',
                        opacity: 0,
                      }}
                    >
                      <link.icon className="h-4 w-4 text-primary/60" />
                      {link.label}
                    </span>
                    <div className="ml-4 space-y-0.5">
                      {link.dropdown.map((item, didx) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition-colors ${
                            isActive(item.href)
                              ? 'text-foreground bg-accent/10'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                          style={{
                            animation: mobileMenuOpen
                              ? `fade-in-up 0.4s ease-out ${0.05 * (idx + didx + 2)}s forwards`
                              : 'none',
                            opacity: 0,
                          }}
                        >
                          <item.icon className="h-4 w-4 text-primary/60" />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      isActive(link.href)
                        ? 'text-foreground bg-accent/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    style={{
                      animation: mobileMenuOpen
                        ? `fade-in-up 0.4s ease-out ${0.05 * (idx + 1)}s forwards`
                        : 'none',
                      opacity: 0,
                    }}
                  >
                    <link.icon className="h-4 w-4 text-primary/60" />
                    {link.label}
                    {isActive(link.href) && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                )
              )}
            </nav>

            {/* Bottom section */}
            <div
              className="mt-auto pt-8 border-t border-border/40 space-y-3"
              style={{
                animation: mobileMenuOpen
                  ? 'fade-in-up 0.4s ease-out 0.4s forwards'
                  : 'none',
                opacity: 0,
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-3 h-11 rounded-xl text-muted-foreground"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4 text-primary/60" />
                ) : (
                  <Moon className="h-4 w-4 text-primary/60" />
                )}
                {theme === 'dark' ? 'Açık Tema' : 'Koyu Tema'}
              </Button>

              {loading ? (
                <div className="h-11 animate-pulse bg-muted rounded-xl" />
              ) : user ? (
                <>
                  <Button variant="outline" asChild className="w-full justify-start gap-3 h-11 rounded-xl">
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <LayoutDashboard className="h-4 w-4 text-primary/60" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start gap-3 h-11 rounded-xl glow-hover">
                    <Link href="/upload" onClick={() => setMobileMenuOpen(false)}>
                      <Upload className="h-4 w-4" />
                      Yeni Yükle
                    </Link>
                  </Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" asChild className="h-11 rounded-xl">
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      Giriş Yap
                    </Link>
                  </Button>
                  <Button asChild className="h-11 rounded-xl glow-hover">
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                      Ücretsiz Başla
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
