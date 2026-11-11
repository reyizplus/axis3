import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { adminServiceServer } from '@/lib/services/admin-service-server';
import { UserDetailContent } from '@/components/admin/user-detail-content';
import { UnauthorizedFallback } from '@/components/admin/unauthorized-fallback';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const isAdmin = await adminServiceServer.isAdmin();
  if (!isAdmin) redirect('/dashboard');

  const isCurrentUserSuperAdmin = user.email?.endsWith('@axis3.com.tr') || false;

  let targetPermissions: string[] = [];
  if (isCurrentUserSuperAdmin) {
    try {
      const svc = createServiceClient();
      const { data } = await (svc as any)
        .from('admin_permissions')
        .select('section_key')
        .eq('user_id', userId);
      targetPermissions = (data || []).map((r: any) => r.section_key);
    } catch {
      targetPermissions = [];
    }
  }

  const userData = await adminServiceServer.getUserById(userId).catch(() => null);
  if (!userData) redirect('/admin/users');

  const targetIsUnlimited = userData.email?.endsWith('@axis3.com.tr') || false;
  const targetIsAdmin = userData.is_admin || false;

  if (!isCurrentUserSuperAdmin && targetIsAdmin && userId !== user.id) {
    return <UnauthorizedFallback />;
  }

  const [
    orders, files, activityLogs, addresses, feedback,
    storageUsage, guestSession, quotaInfo, authEvents, payments, pricingRules, cart,
  ] = await Promise.all([
    adminServiceServer.getUserOrders(userId).catch(() => []),
    adminServiceServer.getUserFiles(userId).catch(() => []),
    adminServiceServer.getUserActivityLogs(userId, 10000).catch(() => []),
    adminServiceServer.getUserAddresses(userId).catch(() => []),
    adminServiceServer.getUserFeedback(userId).catch(() => []),
    adminServiceServer.getUserStorageUsage(userId).catch(() => ({ totalBytes: 0, fileCount: 0 })),
    adminServiceServer.getUserGuestSession(userId).catch(() => null),
    targetIsUnlimited
      ? Promise.resolve({ used: 0, total: 999999, remaining: 999999, canUpload: true, bonus: 0, isUnlimited: true })
      : (async () => {
          try {
            const [{ data: usedData }, { data: totalData }, { data: userQuota }] = await Promise.all([
              (supabase as any).rpc('calculate_upload_quota_used', { user_uuid: userId }),
              (supabase as any).rpc('calculate_total_quota', { user_uuid: userId }),
              (supabase as any).from('users').select('upload_quota_bonus').eq('id', userId).maybeSingle(),
            ]);
            const used = usedData || 0;
            const total = totalData || 3;
            const bonus = userQuota?.upload_quota_bonus || 0;
            return { used, total, remaining: Math.max(0, total - used), canUpload: used < total, bonus };
          } catch {
            return { used: 0, total: 3, remaining: 3, canUpload: true, bonus: 0 };
          }
        })(),
    adminServiceServer.getUserAuthEvents(userId, 50).catch(() => []),
    adminServiceServer.getUserPayments(userId).catch(() => []),
    adminServiceServer.getUserPricingRules(userId).catch(() => []),
    adminServiceServer.getUserCart(userId).catch(() => null),
  ]);

  return (
    <UserDetailContent
      userData={userData as any}
      orders={orders as any}
      files={files}
      activityLogs={activityLogs}
      addresses={addresses}
      feedback={feedback}
      storageUsage={storageUsage}
      guestSession={guestSession}
      quotaInfo={quotaInfo}
      authEvents={authEvents as any}
      payments={payments}
      pricingRules={pricingRules as any}
      cart={cart as any}
      isCurrentUserSuperAdmin={isCurrentUserSuperAdmin}
      targetPermissions={targetPermissions}
    />
  );
}
