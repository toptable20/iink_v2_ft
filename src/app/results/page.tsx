import type { Metadata } from 'next';
import { MyResults } from './my-results';

export const metadata: Metadata = { title: 'My results | iink' };

export default function ResultsPage() {
  return <MyResults />;
}
