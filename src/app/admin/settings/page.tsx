'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  DollarSign, Factory, Building2, Printer, ShoppingBag, Layers,
  Search, Settings, Monitor, ChevronRight, Truck, CreditCard,
} from 'lucide-react';
import { PricingSettingsTab } from '@/components/admin/PricingSettingsTab';
import { ProductionCapacityTab } from '@/components/admin/ProductionCapacityTab';
import { BankAccountsTab } from '@/components/admin/BankAccountsTab';
import { PrinterSettingsTab } from '@/components/admin/PrinterSettingsTab';
import { PreorderSettingsTab } from '@/components/admin/PreorderSettingsTab';
import { PrintSettingsTab } from '@/components/admin/PrintSettingsTab';
import { ShippingSettingsTab } from '@/components/admin/ShippingSettingsTab';
import PaymentGatewaysTab from '@/components/admin/PaymentGatewaysTab';

interface NavItem {
  id: string; label: string; description: string; icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'pricing', label: 'Fiyatlandırma', description: 'Elektrik, işçilik, kar marjı, KDV ve indirim kademeleri', icon: DollarSign },
  { id: 'production', label: 'Üretim Kapasitesi', description: 'Makine sayısı, çalışma saatleri, teslimat süreleri', icon: Factory },
  { id: 'printer', label: 'Yazıcı Boyutları', description: 'Maksimum baskı hacmi (X, Y, Z boyutları)', icon: Monitor },
  { id: 'preorder', label: 'Ön Sipariş', description: 'Stokta olmayan ürünler için ön sipariş sistemi', icon: ShoppingBag },
  { id: 'print-settings', label: 'Baskı Kalitesi', description: 'Teknoloji bazlı baskı parametreleri ve çarpanlar', icon: Layers },
  { id: 'bank-accounts', label: 'Banka Hesapları', description: 'EFT/Havale ödemeleri için banka hesap yönetimi', icon: Building2 },
  { id: 'payment-gateways', label: 'Ödeme Yöntemleri', description: 'Ödeme gateway ayarları, aktifleştirme ve yapılandırma', icon: CreditCard },
  { id: 'shipping', label: 'Kargo Ayarları', description: 'Kargo ücreti ve ücretsiz kargo sınırı', icon: Truck },
];

const SECTION_META: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  pricing:        { icon: DollarSign,     color: 'text-emerald-600',   bgColor: 'bg-emerald-500/10' },
  production:     { icon: Factory,        color: 'text-blue-600',      bgColor: 'bg-blue-500/10' },
  printer:        { icon: Monitor,        color: 'text-purple-600',    bgColor: 'bg-purple-500/10' },
  preorder:       { icon: ShoppingBag,    color: 'text-amber-600',     bgColor: 'bg-amber-500/10' },
  'print-settings': { icon: Layers,       color: 'text-cyan-600',      bgColor: 'bg-cyan-500/10' },
  'bank-accounts': { icon: Building2,     color: 'text-rose-600',      bgColor: 'bg-rose-500/10' },
  'payment-gateways': { icon: CreditCard,  color: 'text-indigo-600',    bgColor: 'bg-indigo-500/10' },
  'shipping':       { icon: Truck,         color: 'text-sky-600',       bgColor: 'bg-sky-500/10' },
};

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('pricing');
  const [searchQuery, setSearchQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const currentNav = NAV_ITEMS.find(n => n.id === activeTab);
  const currentMeta = SECTION_META[activeTab];

  const filteredItems = NAV_ITEMS.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'pricing': return <PricingSettingsTab />;
      case 'production': return <ProductionCapacityTab />;
      case 'printer': return <PrinterSettingsTab />;
      case 'preorder': return <PreorderSettingsTab />;
      case 'print-settings': return <PrintSettingsTab />;
      case 'bank-accounts': return <BankAccountsTab />;
      case 'payment-gateways': return <PaymentGatewaysTab />;
      case 'shipping': return <ShippingSettingsTab />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      {/* Mobile Nav */}
      <div className="lg:hidden border-b border-border/50 bg-muted/20 sticky top-0 z-10">
        <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2.5 scrollbar-none">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const meta = SECTION_META[item.id];
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-200',
                  isActive
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground/70 hover:text-foreground hover:bg-background/50'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive && meta?.color)} />
                <span className={isActive ? meta?.color : ''}>{item.label.slice(0, 8)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 xl:w-72 flex-col border-r border-border/50 bg-muted/20 shrink-0">
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Settings className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-tight">Ayarlar</h2>
              <p className="text-[10px] text-muted-foreground/70">Sistem yapılandırması</p>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 h-8 text-xs rounded-lg outline-none bg-background border border-border/50 placeholder:text-muted-foreground/40 hover:border-border focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-thin">
          <nav className="space-y-0.5">
            {filteredItems.map((item, i) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const meta = SECTION_META[item.id];
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  onClick={() => { setActiveTab(item.id); setSearchQuery(''); }}
                  className={cn(
                    'flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-sm text-left transition-all duration-200 group relative overflow-hidden',
                    isActive
                      ? 'bg-background text-foreground font-medium shadow-sm ring-1 ring-border'
                      : 'text-muted-foreground/80 hover:text-foreground hover:bg-background/50'
                  )}
                >
                  {isActive && (
                    <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-primary" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                  )}
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-all',
                    isActive ? cn(meta?.bgColor || 'bg-primary/10', meta?.color || 'text-primary') : 'bg-transparent group-hover:bg-accent/50'
                  )}>
                    <Icon className={cn('h-3.5 w-3.5 transition-transform', isActive && 'scale-110')} />
                  </div>
                  <span className="flex-1 truncate text-xs font-medium">{item.label}</span>
                  <ChevronRight className={cn('h-3 w-3 transition-all', isActive ? 'text-primary/60 opacity-100' : 'opacity-0 -translate-x-1 group-hover:opacity-40 group-hover:translate-x-0')} />
                </motion.button>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground/50">
                <Search className="h-5 w-5 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Eşleşen ayar bulunamadı</p>
              </div>
            )}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          <div className="space-y-1">
            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <span>Ayarlar</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{currentNav?.label}</span>
            </nav>
            <div className="flex items-center gap-3">
              {currentMeta && (
                <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl shrink-0', currentMeta.bgColor)}>
                  <currentMeta.icon className={cn('h-4 w-4 sm:h-5 sm:w-5', currentMeta.color)} />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">{currentNav?.label}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{currentNav?.description}</p>
              </div>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
