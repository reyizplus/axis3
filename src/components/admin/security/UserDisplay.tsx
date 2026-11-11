'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from './utils';

export function UserDisplay({ user, userId, email, size = 'sm' }: {
  user: { id: string; email: string; full_name: string } | null;
  userId?: string; email?: string; size?: 'sm' | 'xs';
}) {
  const dim = size === 'xs' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  if (!user && !userId) return <span className="text-muted-foreground text-sm">Misafir</span>;
  if (user) {
    const displayName = user.full_name?.trim() || user.email;
    const showEmail = displayName !== user.email;
    return (
      <Link href={`/admin/users/${user.id}`} className="flex items-center gap-2 hover:bg-accent/50 rounded-md px-1.5 py-0.5 transition-colors group">
        <Avatar className={`${dim} border border-border`}><AvatarFallback>{getInitials(displayName)}</AvatarFallback></Avatar>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium group-hover:text-primary transition-colors truncate max-w-[180px]">{displayName}</span>
          {showEmail && <span className="text-[11px] text-muted-foreground">{user.email}</span>}
        </div>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      {email && <span className="text-xs text-muted-foreground">{email}</span>}
      {userId && <span className="text-xs font-mono text-muted-foreground/60">{userId.substring(0, 8)}</span>}
    </div>
  );
}
