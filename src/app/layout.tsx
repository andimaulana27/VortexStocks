import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import GlobalInit from "@/components/GlobalInit";

export const metadata: Metadata = {
  title: "VortexStock",
  description: "Advanced tape reading & smart money screener",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased flex bg-[#121212] text-[#e5e5e5] overflow-hidden">
        
        {/* INISIALISASI MESIN BACKGROUND */}
        <GlobalInit />

        <Sidebar />

        <main className="flex-1 ml-[240px] flex flex-col min-w-0 h-screen">
          <Topbar />
          
          {/* FIX UTAMA: Dibuat murni overflow-hidden tanpa padding global */}
          {/* Padding dan scroll kini diatur eksklusif oleh masing-masing halaman */}
          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>
        </main>

      </body>
    </html>
  );
}