import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CheckupLookup } from './checkup';

export const metadata: Metadata = { title: '건강검진 조회 | iink' };

export default function CheckupPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-[#f8f7f2] px-5 py-10 font-sans text-[#3b3b3b] sm:px-8 sm:py-14">
      <Link href="/" className="mb-8 sm:mb-10">
        <Image src="/iink-logo.svg" alt="iink 홈" width={118} height={36} className="h-[34px] w-auto" priority />
      </Link>
      <CheckupLookup />
    </main>
  );
}
