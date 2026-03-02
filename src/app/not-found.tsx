// src/app/not-found.tsx
import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-[#121212] text-white">
      {/* Efek glow di background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#f59e0b]/10 blur-[100px] rounded-full pointer-events-none"></div>
      
      <AlertTriangle size={72} className="text-[#f59e0b] mb-6 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
      
      <h1 className="text-6xl font-black tracking-widest mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500">
        404
      </h1>
      <h2 className="text-lg font-bold text-neutral-400 mb-6 uppercase tracking-[0.2em]">
        Halaman Tidak Ditemukan
      </h2>
      
      <p className="text-neutral-500 text-[11px] mb-10 text-center max-w-sm uppercase font-semibold tracking-wider">
        Fitur yang Anda tuju mungkin belum tersedia atau dalam tahap pengembangan.
      </p>
      
      <Link 
        href="/dashboard" 
        className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] text-white font-bold text-[12px] uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-[#06b6d4]/50"
      >
        <Home size={16} />
        <span>Kembali ke Dashboard</span>
      </Link>
    </div>
  );
}