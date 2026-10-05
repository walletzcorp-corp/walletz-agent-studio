import { redirect } from 'next/navigation';

// Root page: redirect unauthenticated users to login
// Authenticated users load the dashboard at /dashboard
export default function RootPage() {
  redirect('/dashboard');
}
