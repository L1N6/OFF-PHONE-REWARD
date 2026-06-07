import { redirect } from 'next/navigation';

// /admin → redirect tới dashboard (auth check ở middleware)
export default function AdminRoot() {
  redirect('/admin/dashboard');
}
