export function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return iso; }
}

export function fmtDT(iso: string) {
  try { return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return iso; }
}

export function fmtRelative(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime(); const m = Math.floor(diff / 60000);
    if (m < 1) return 'Az önce'; if (m < 60) return `${m} dk önce`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} s önce`;
    return new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function fmtUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return [d > 0 && `${d}g`, h > 0 && `${h}s`, `${m}d`].filter(Boolean).join(' ');
}

export function getInitials(name: string) { return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'; }

export function getActionColor(action: string) {
  if (action === 'page_view') return 'text-blue-600 bg-blue-500/10';
  if (action === 'auth:LOGIN_SUCCESS') return 'text-emerald-600 bg-emerald-500/10';
  if (action === 'auth:LOGIN_FAILURE') return 'text-red-600 bg-red-500/10';
  if (action === 'auth:LOGOUT') return 'text-gray-600 bg-gray-500/10';
  if (action === 'auth:REGISTER_SUCCESS') return 'text-emerald-600 bg-emerald-500/10';
  if (action.startsWith('auth:PASSWORD')) return 'text-amber-600 bg-amber-500/10';
  if (action.startsWith('rate_limit:')) return 'text-red-600 bg-red-500/10';
  return 'text-gray-600 bg-gray-500/10';
}

export function getTimeRemaining(expiresAt: string | null) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Süresi doldu';
  const hours = Math.floor(diff / 3600000);
  if (hours > 24) return `${Math.floor(hours / 24)} gün`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return hours > 0 ? `${hours}s ${mins}d` : `${mins} dk`;
}
