import Image from 'next/image';
import Link from 'next/link';

// Home — same look as the old live iink.co.kr home (old Home.vue).
// Old page scaled by screen HEIGHT (≤1000px, ≤670px), so these use height media queries.
export default function Home() {
  return (
    <main className="iink-old flex min-h-dvh flex-1 flex-col items-center justify-between bg-[#FAF9F5] bg-[url('/brand/iink_main.png')] bg-cover bg-top bg-no-repeat px-5 text-center">
      <div className="mt-[250px] flex flex-col items-center [@media(max-height:1000px)]:mt-[100px] [@media(max-height:670px)]:mt-[95px]">
        <Image src="/brand/logo_2.png" alt="iink" width={836} height={252} priority className="h-auto w-[250px] [@media(max-height:670px)]:w-[45vw]" />
        <h1 className="mt-[45px] text-[36px] text-[#1A1A1A] [-webkit-text-stroke:1px_black] max-[640px]:text-[26px] [@media(max-height:670px)]:mt-[25px] [@media(max-height:670px)]:text-[24px]">
          나에게 딱맞는<br className="min-[1081px]:hidden" /> 맞춤 영양분석 솔루션
        </h1>
      </div>

      <Link
        href="/start"
        className="mb-[100px] flex size-[280px] items-center justify-center rounded-full bg-white font-[Arial,Helvetica,sans-serif] text-[40px] text-[#B3E5C5] transition-transform hover:scale-[1.03] [@media(max-height:1000px)]:mb-0 [@media(max-height:1000px)]:size-[224px] [@media(max-height:1000px)]:text-[28px] [@media(max-height:670px)]:mt-[35px] [@media(max-height:670px)]:size-[184px]"
      >
        START
      </Link>

      <Image src="/brand/toptable_2.png" alt="toptable" width={674} height={144} className="mb-[70px] h-auto w-[150px] [@media(max-height:670px)]:mb-[50px]" />
    </main>
  );
}
