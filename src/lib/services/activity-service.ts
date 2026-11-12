export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

function detectDeviceType(userAgent: string | null): DeviceType {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/mobile|android.*mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  if (/tablet|ipad|android(?!.*mobile)|silk|kindle|playbook/i.test(ua)) return 'tablet';
  if (/windows|macintosh|linux|cros|chrome os|ubuntu|fedora/i.test(ua)) return 'desktop';
  return 'unknown';
}

export async function logUserActivity(params: {
  userId: string;
  userEmail?: string;
  userName?: string;
  ipAddress: string | null;
  userAgent: string | null;
  pageUrl: string;
}) {
  const deviceType = detectDeviceType(params.userAgent);

  try {
    // Ayni origin'e (goreli URL) istek atilir. Mutlak URL kullanildiginda
    // www/apex farki veya CSP connect-src kisitlamasi istegi bloke edebiliyordu.
    await fetch('/api/internal/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: params.userId,
        user_email: params.userEmail || '',
        user_name: params.userName || '',
        page_url: params.pageUrl,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        device_type: deviceType,
      }),
    });
  } catch (error) {
    console.error('[ActivityService] Failed to log activity:', error);
  }
}
