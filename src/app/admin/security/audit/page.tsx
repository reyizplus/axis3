import { redirect } from 'next/navigation';

export default function AuditRedirect() {
  redirect('/admin/security?tab=audit');
}
