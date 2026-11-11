'use client';

import { useAdminPermissions, NAV_PERMISSION_KEYS } from '@/components/layout/admin-shell';
import { QuickActionCard } from './quick-action-card';

interface QuickAction {
  title: string;
  href: string;
  icon: string;
  color: string;
  bg: string;
}

export function QuickActionGrid({ actions }: { actions: QuickAction[] }) {
  const { permissions, isSuperAdmin, noPermissionSystem } = useAdminPermissions();

  const filtered = actions.filter(a => {
    if (isSuperAdmin || noPermissionSystem) return true;
    const permKey = NAV_PERMISSION_KEYS[a.href];
    if (!permKey) return false;
    return permissions.includes(permKey);
  });

  return (
    <>
      {filtered.map((action, i) => (
        <QuickActionCard key={i} {...action} />
      ))}
    </>
  );
}
