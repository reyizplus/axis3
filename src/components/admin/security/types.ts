import { Smartphone, Tablet, Monitor, Globe } from 'lucide-react';

export interface SysInfo {
  uptime: number;
  memory: { rss: string; heapTotal: string; heapUsed: string };
  node: string; platform: string; pid: number;
}

export interface LogResponse {
  success: boolean; logPath: string | null; source: string; lines: number;
  system: SysInfo | null; data: unknown[]; parsed: boolean;
}

export interface ParsedAppEntry {
  timestamp: string; path: string; ip: string; userId: string; email: string;
  guest: boolean; raw: string;
  user: { id: string; email: string; full_name: string } | null;
  _parseError?: boolean;
}

export interface ParsedActivityEntry {
  userId: string; userEmail: string; userName: string; pageUrl: string;
  ipAddress: string; userAgent: string | null; deviceType: string;
  timestamp: string; raw: string;
  user: { id: string; email: string; full_name: string } | null;
  _parseError?: boolean;
}

/** Son 5 dakikada istek atan kayıtlı kullanıcı (kullanıcı bazında gruplanmış). */
export interface ActiveUser {
  userId: string;
  email: string | null;
  fullName: string | null;
  lastSeen: string;
  lastPage: string;
  ips: string[];
  requestCount: number;
}

/** IP bazında gruplanmış erişim kaydı. */
export interface IpDetail {
  ip: string;
  count: number;
  lastSeen: string;
  lastPage: string;
  userId: string | null;
  user: { email: string; full_name: string } | null;
  isGuest: boolean;
}

export interface ActiveUsersData {
  /** Sadece kayıtlı kullanıcılar. */
  activeUsers: ActiveUser[];
  /** Son 5 dakikadaki tüm IP'ler (misafir + kayıtlı). */
  activeIPs: IpDetail[];
  summary: {
    activeUsers: number; activeIPs: number;
    uniqueIPs: number; uniqueUsers: number; totalRequests: number;
    topPages: { page: string; count: number }[];
  };
  /** Son 24 saatteki tüm IP'ler. */
  ipDetails: IpDetail[];
}

export interface BlockedIP {
  id: string; ip_address: string; reason: string | null;
  blocked_by: string | null; blocked_at: string; expires_at: string | null;
  is_active: boolean;
  blocked_by_user: { id: string; email: string; full_name: string } | null;
}

export interface AuditEntry {
  id: string; user_id: string | null; action: string; entity_type: string;
  entity_id: string; ip_address: string | null; user_agent: string | null;
  created_at: string;
  user: { id: string; email: string; full_name: string } | null;
}

export interface Pagination {
  page: number; limit: number; total: number; totalPages: number;
}

export interface IpActivityEntry {
  id: string; ip_address: string; user_id: string | null; page_url: string;
  device_type: string; user_agent: string | null; created_at: string;
  user: { id: string; email: string; full_name: string } | null;
}

export interface UserActivityEntry {
  id: string; page_url: string; ip_address: string;
  device_type: string; user_agent: string | null; created_at: string;
  source: 'user_activity' | 'ip_activity' | 'audit';
}

export interface SecurityUser {
  id: string; email: string; full_name: string | null; phone: string | null;
  is_admin: boolean; status: string; created_at: string; last_sign_in_at: string | null;
  last_active_at: string | null;
}

export const DEVICE_ICONS: Record<string, typeof Smartphone> = {
  mobile: Smartphone, tablet: Tablet, desktop: Monitor, unknown: Globe,
};

export const ACTION_LABELS: Record<string, string> = {
  'page_view': 'Sayfa Görüntüleme',
  'auth:LOGIN_SUCCESS': 'Giriş Başarılı',
  'auth:LOGIN_FAILURE': 'Giriş Başarısız',
  'auth:LOGOUT': 'Çıkış',
  'auth:REGISTER_SUCCESS': 'Kayıt',
  'auth:PASSWORD_RESET_REQUEST': 'Şifre Sıfırlama Talebi',
  'auth:PASSWORD_RESET_SUCCESS': 'Şifre Sıfırlama',
  'auth:PASSWORD_CHANGE': 'Şifre Değişikliği',
  'rate_limit:login': 'Giriş Hız Sınırı',
  'rate_limit:register': 'Kayıt Hız Sınırı',
  'rate_limit:password-reset': 'Şifre Sıfırlama Hız Sınırı',
};

export const ACTION_OPTIONS = [
  { value: 'all', label: 'Tüm İşlemler' },
  { value: 'auth:LOGIN_SUCCESS', label: 'Giriş Başarılı' },
  { value: 'auth:LOGIN_FAILURE', label: 'Giriş Başarısız' },
  { value: 'auth:LOGOUT', label: 'Çıkış' },
  { value: 'auth:REGISTER_SUCCESS', label: 'Kayıt' },
  { value: 'auth:PASSWORD_RESET_REQUEST', label: 'Şifre Sıfırlama Talebi' },
  { value: 'auth:PASSWORD_CHANGE', label: 'Şifre Değişikliği' },
  { value: 'rate_limit:login', label: 'Giriş Hız Sınırı' },
  { value: 'rate_limit:register', label: 'Kayıt Hız Sınırı' },
  { value: 'rate_limit:password-reset', label: 'Şifre Sıfırlama Hız Sınırı' },
  { value: 'page_view', label: 'Sayfa Görüntüleme' },
];
