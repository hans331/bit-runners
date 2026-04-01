import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "BIT Runners Dashboard",
  description: "BIT Runners 러닝 클럽 대시보드 - Run to Boost, Run for Impact, Run Together",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-50 border-b border-[#334155] bg-[#0f172a]/95 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-2xl">🏃🏻</span>
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">BIT Runners</h1>
                <p className="text-[10px] text-slate-400 tracking-wider">BOOST · IMPACT · TOGETHER</p>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                대시보드
              </Link>
              <Link
                href="/awards"
                className="px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                시상
              </Link>
              <Link
                href="/log"
                className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                + 기록
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[#334155] py-4 text-center text-xs text-slate-500">
          BIT Runners &copy; 2025-2026 | Run to Boost, Run for Impact, Run Together
        </footer>
      </body>
    </html>
  );
}
