import { redirect } from 'next/navigation';

export default function BlockedIPsRedirect() {
  redirect('/admin/security?tab=blocked-ips');
}
