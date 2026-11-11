export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export function detectDeviceType(userAgent: string | null): DeviceType {
  if (!userAgent) return 'unknown';

  const ua = userAgent.toLowerCase();

  if (/mobile|android.*mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'mobile';
  }

  if (/tablet|ipad|android(?!.*mobile)|silk|kindle|playbook|tablet/i.test(ua)) {
    return 'tablet';
  }

  if (/windows|macintosh|linux|cros|chrome os|ubuntu|fedora/i.test(ua)) {
    return 'desktop';
  }

  return 'unknown';
}
