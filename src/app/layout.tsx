import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "맞춤 영양 솔루션, 잉크랩",
  description: "나에게 딱맞는 맞춤 영양분석 솔루션",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Same web font the old iink.co.kr used. */}
        <link rel="stylesheet" href="https://webfontworld.github.io/kopus/KoPubWorldDotum.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
