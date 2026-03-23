import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eugene News — AI Board of Advisors",
  description: "Your daily news intelligence platform with 7 advisor perspectives per story",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-[var(--border)] bg-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 no-underline">
              <span className="text-xl font-bold text-[var(--brand)]">Eugene News</span>
              <span className="text-xs text-[var(--text-muted)] bg-gray-100 px-2 py-0.5 rounded-full">
                Board of Advisors
              </span>
            </a>
            <nav className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
              <a href="/" className="hover:text-[var(--brand)] no-underline">Today</a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
