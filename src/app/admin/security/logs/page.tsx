import { redirect } from 'next/navigation';

// Redirect to the main security page to show logs in the ServerLogsTab component
export default function LogsRedirect() {
  redirect('/admin/security?tab=logs');
}
