/**
 * Admin Dashboard Page - Halaman Dasbor Admin
 */

import { AdminDashboard } from '@/components/admin-dashboard';
import { translations } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: translations.dashboard.title,
  description: translations.dashboard.welcomeSubtitle,
};

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="container mx-auto">
        <AdminDashboard />
      </div>
    </main>
  );
}