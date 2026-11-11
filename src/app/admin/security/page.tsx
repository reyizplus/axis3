'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Terminal,
  Users as UsersIcon,
  Activity,
  Ban,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { ServerLogsTab, UsersTab, ActiveUsersTab, BlockedIPsTab, AuditTab } from '@/components/admin/security';

interface NavEntry {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  section: string;
}

const NAV_ENTRIES: NavEntry[] = [
  {
    id: 'logs',
    label: 'Sistem Logları',
    description: 'Uygulama ve aktivite log kayıtları',
    icon: Terminal,
    section: 'Sistem',
  },
  {
    id: 'audit',
    label: 'Denetim Kayıtları',
    description: 'Yönetici işlem geçmişi',
    icon: ScrollText,
    section: 'Sistem',
  },
  {
    id: 'users',
    label: 'Kullanıcılar',
    description: 'Kullanıcı listesi ve detayları',
    icon: UsersIcon,
    section: 'Kullanıcılar',
  },
  {
    id: 'active-users',
    label: 'Aktif Kullanıcılar',
    description: 'Canlı oturum ve ziyaretçi takibi',
    icon: Activity,
    section: 'Kullanıcılar',
  },
  {
    id: 'blocked-ips',
    label: 'Engellenen IP\'ler',
    description: 'IP engelleme ve erişim kontrolü',
    icon: Ban,
    section: 'Güvenlik',
  },
];

const NAV_SECTIONS = ['Sistem', 'Kullanıcılar', 'Güvenlik'];

const VALID_TABS = new Set(NAV_ENTRIES.map((entry) => entry.id));
const DEFAULT_TAB = 'logs';

function SecurityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab') || DEFAULT_TAB;
  // URL is the single source of truth for the active tab
  const tab = VALID_TABS.has(urlTab) ? urlTab : DEFAULT_TAB;
  const current = NAV_ENTRIES.find((entry) => entry.id === tab) || NAV_ENTRIES[0];
  const CurrentIcon = current.icon;

  const setTab = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.replace(`/admin/security?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-[1500px]">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/5">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold gradient-text">Yönetim</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Kullanıcı takibi, sistem logları, güvenlik ve denetim — tümü tek panelde
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
        {/* Left navigation */}
        <nav
          aria-label="Yönetim bölümleri"
          className="lg:sticky lg:top-4 rounded-xl border bg-card p-2 lg:p-3"
        >
          {/* Mobile: horizontal scroll strip */}
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {NAV_SECTIONS.map((section) => {
              const items = NAV_ENTRIES.filter((entry) => entry.section === section);
              if (items.length === 0) return null;

              return (
                <div key={section} className="flex lg:flex-col gap-1 lg:gap-0.5 lg:mb-1">
                  <p className="hidden lg:block px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {section}
                  </p>
                  {items.map((entry) => {
                    const isActive = entry.id === tab;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setTab(entry.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors text-left',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <entry.icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{entry.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Content area */}
        <main className="min-w-0">
          <div className="mb-5 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-primary/5 mt-0.5">
              <CurrentIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">{current.label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{current.description}</p>
            </div>
          </div>

          <div role="region" aria-label={current.label}>
            {tab === 'logs' && <ServerLogsTab />}
            {tab === 'audit' && <AuditTab />}
            {tab === 'users' && <UsersTab />}
            {tab === 'active-users' && <ActiveUsersTab />}
            {tab === 'blocked-ips' && <BlockedIPsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <Suspense fallback={null}>
      <SecurityPageContent />
    </Suspense>
  );
}
