import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminResults } from './admin-results';

export const metadata: Metadata = { title: '결과 · 출력 | iink 관리자' };

export default function AdminResultsPage() {
  return (
    <Suspense>
      <AdminResults />
    </Suspense>
  );
}
