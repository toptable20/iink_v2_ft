import Image from 'next/image';
import Link from 'next/link';
import { Devices } from './devices';

export default function DevicesPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center bg-[#f8f7f2] px-5 py-10 font-sans text-[#3b3b3b] sm:px-8 sm:py-14">
      <Link href="/" className="mb-8 sm:mb-10">
        <Image src="/iink-logo.svg" alt="iink 홈" width={118} height={36} className="h-[34px] w-auto" priority />
      </Link>
      <Devices />
    </main>
  );
}
