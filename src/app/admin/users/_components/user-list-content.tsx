'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, Shield, Search, Mail, Calendar, ArrowLeft } from 'lucide-react';
import type { UserListItem } from '../page';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  suspended: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  deleted: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function UsersListContent({ users }: { users: UserListItem[] }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        if (!u.full_name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false;
      }
      if (roleFilter === 'admin' && !u.is_admin) return false;
      if (roleFilter === 'regular' && u.is_admin) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter]);

  const adminCount = users.filter((u) => u.is_admin).length;
  const regularCount = users.length - adminCount;

  return (
    <div className="px-4 py-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">Kullanıcı Yönetimi</h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{users.length} kayıtlı kullanıcı</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-3">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Toplam</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-3">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Admin</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-orange-500">{adminCount}</div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm overflow-hidden">
          <CardHeader className="px-3 sm:px-6 py-3">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground">Kullanıcı</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-500">{regularCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="İsim veya e-posta ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 w-[110px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="regular">Kullanıcı</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[110px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="suspended">Askıda</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users List */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-4">
          <CardTitle className="text-sm sm:text-base">Kullanıcılar</CardTitle>
          <CardDescription className="text-xs sm:text-sm">{filtered.length} sonuç</CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Kullanıcı bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <span className="text-sm sm:text-lg font-bold text-primary">
                      {u.full_name?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm sm:text-base font-semibold truncate">{u.full_name || 'İsimsiz Kullanıcı'}</span>
                      {u.is_admin && (
                        <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] h-4 px-1 shrink-0">
                          <Shield className="h-2.5 w-2.5 mr-0.5" />Admin
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] h-4 px-1 shrink-0 ${statusColors[u.status] || ''}`}>
                        {u.status === 'active' ? 'Aktif' : u.status === 'suspended' ? 'Askıda' : 'Silindi'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[150px] sm:max-w-[250px]">{u.email}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {new Date(u.created_at).toLocaleDateString('tr-TR')}
                      </span>
                      {u.last_sign_in_at && (
                        <span className="text-muted-foreground/60">
                          Son: {new Date(u.last_sign_in_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-muted-foreground shrink-0 rotate-180" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-border/50 shadow-sm overflow-hidden border-blue-500/20">
        <CardHeader className="px-4 sm:px-6 py-4">
          <CardTitle className="text-sm sm:text-base">Bilgilendirme</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-6 space-y-1 text-xs sm:text-sm text-muted-foreground">
          <p>• Admin yetkisi @axis3.com.tr email uzantısına veya metadata&apos;daki role alanına göre belirlenir.</p>
          <p>• Kullanıcı yönetimi özellikleri geliştirilme aşamasındadır.</p>
        </CardContent>
      </Card>
    </div>
  );
}
