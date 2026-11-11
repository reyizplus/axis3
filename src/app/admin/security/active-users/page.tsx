import { redirect } from 'next/navigation';

export default function ActiveUsersRedirect() {
  redirect('/admin/security?tab=active-users');
}
