import type { Metadata } from 'next';
import { AdminDashboard } from './admin-dashboard';

export const metadata: Metadata = { title: '관리자 | iink' };

export default function AdminPage() {
  return <AdminDashboard />;
}
