import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VorteStocks | Advanced Tape Reading & Smart Money Screener",
  description: "Platform analitik saham BEI (IHSG) berskala enterprise. Dilengkapi fitur live Tape Reading, Smart Money Order Book, Screener, Heatmap, dan Multi-Watchlist secara real-time.",
  keywords: ["VorteStocks", "saham", "IHSG", "BEI", "tape reading", "smart money", "order book", "screener saham", "trading", "analisis fundamental", "analisis teknikal", "broker summary"],
  authors: [{ name: "VorteStocks" }],
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased flex bg-[#121212] text-[#e5e5e5] overflow-hidden">
        {/* AppShell dihapus dari sini. 
            Nanti akan dipindahkan spesifik ke layout.tsx di dalam folder (protected) */}
        {children}
      </body>
    </html>
  );
}