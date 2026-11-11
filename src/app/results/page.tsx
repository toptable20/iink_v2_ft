import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MyResults } from './my-results';

export const metadata: Metadata = { title: '내 결과 | iink' };

export default function ResultsPage() {
  return (
    <Suspense>
      <MyResults />
    </Suspense>
  );
}
