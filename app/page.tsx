/**
 * Home Page - Halaman Formulir Keluhan
 */

import { ComplaintForm } from '@/components/complaint-form';
import { translations } from '@/lib/i18n';

export const metadata = {
  title: translations.form.title,
  description: translations.form.subtitle,
};

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="container mx-auto">
        <ComplaintForm />
      </div>
    </main>
  );
}
