"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
// Hapus icon yang tidak terpakai agar ESLint tidak protes
import { ArrowRight, Activity, TrendingUp, Zap, Crown, Star, Check } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#10b981] selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#2d2d2d]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105">
            <Image src="/VorteStocks.svg" alt="VorteStocks Logo" width={180} height={50} priority className="drop-shadow-[0_4px_12px_rgba(16,185,129,0.15)]" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#stats" className="hover:text-white transition-colors">Market Stats</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm font-bold text-neutral-300 hover:text-white transition-colors hidden sm:block">Sign In</Link>
            <Link href="/auth" className="px-6 py-2.5 bg-gradient-to-r from-[#06b6d4] to-[#10b981] hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] rounded-full text-sm font-bold text-white transition-all transform hover:-translate-y-0.5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* --- 1. HERO SECTION --- */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden flex flex-col items-center text-center min-h-[90vh] justify-center">
        <div className="absolute top-[20%] left-[-10%] w-[40vw] h-[40vw] bg-[#10b981]/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[#06b6d4]/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1e1e1e] border border-[#2d2d2d] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Star size={14} className="text-[#f59e0b]" />
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Komunitas Trader Tier-1 Indonesia</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100 max-w-5xl">
          Terminal Trading Eksklusif <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] to-[#10b981]">
            Jejak Smart Money
          </span>
        </h1>
        
        <p className="text-neutral-400 text-lg md:text-xl leading-relaxed mb-10 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          VorteStocks memberikan Anda keunggulan analitik tingkat institusi. Pantau order book, akumulasi broker, dan pergerakan bandar secara real-time. Eksklusif untuk trader dengan portofolio terverifikasi.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <Link href="/auth" className="px-8 py-4 bg-gradient-to-r from-[#06b6d4] to-[#10b981] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] text-white font-bold rounded-full transition-all transform hover:scale-105 flex items-center gap-2 text-lg">
            Verifikasi Portofolio Anda <ArrowRight size={20} />
          </Link>
          <a href="#features" className="px-8 py-4 bg-transparent border-2 border-[#2d2d2d] hover:bg-[#1e1e1e] hover:border-[#10b981] text-white font-bold rounded-full transition-all text-lg">
            Pelajari Fitur
          </a>
        </div>
      </section>

      {/* --- 2. STATS SECTION --- */}
      <section id="stats" className="py-16 px-6 bg-[#121212] border-t border-b border-[#1e1e1e]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-[#2d2d2d]">
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black text-white mb-2">940+</span>
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Saham BEI Terpantau</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] to-[#10b981] mb-2">0ms</span>
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Delay Data Feed</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black text-white mb-2">300<span className="text-2xl">Jt</span></span>
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Min. Portofolio Whale</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl md:text-5xl font-black text-white mb-2">24/7</span>
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Uptime Server</span>
          </div>
        </div>
      </section>

      {/* --- 3. FEATURES SECTION --- */}
      <section id="features" className="py-24 px-6 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Senjata Utama Para Whale</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">Kami tidak memberikan sinyal palsu. Kami menyediakan data murni yang telah diolah agar Anda bisa mengambil keputusan objektif.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#121212] border border-[#2d2d2d] hover:border-[#10b981] rounded-2xl p-8 transition-colors group">
              <div className="w-14 h-14 bg-[#10b981]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity size={28} className="text-[#10b981]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live Tape Reading</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">Pantau HAKA/HAKI secara real-time. Ketahui kapan bandar memakan antrian offer dalam jumlah masif seketika.</p>
            </div>

            <div className="bg-[#121212] border border-[#2d2d2d] hover:border-[#06b6d4] rounded-2xl p-8 transition-colors group">
              <div className="w-14 h-14 bg-[#06b6d4]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp size={28} className="text-[#06b6d4]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Smart Money Order Book</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">Screener otomatis yang mendeteksi anomali pada bid/offer dan menyorot pergerakan asing di saham-saham likuid.</p>
            </div>

            <div className="bg-[#121212] border border-[#2d2d2d] hover:border-[#f59e0b] rounded-2xl p-8 transition-colors group">
              <div className="w-14 h-14 bg-[#f59e0b]/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap size={28} className="text-[#f59e0b]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Custom Technical Setup</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">Bebas atur dan simpan indikator teknikal favorit Anda. Layout chart akan menyesuaikan dengan gaya trading Anda.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- 4. TESTIMONIAL SECTION --- */}
      <section className="py-24 px-6 bg-[#121212] border-t border-[#1e1e1e]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Dipercaya Oleh Elite Trader</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">Bergabunglah dengan ratusan trader yang telah merasakan ketajaman analitik VorteStocks.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#0a0a0a] p-8 rounded-2xl border border-[#2d2d2d] relative">
                <div className="text-[#10b981] mb-4 flex gap-1">
                  <Star fill="currentColor" size={16} /><Star fill="currentColor" size={16} /><Star fill="currentColor" size={16} /><Star fill="currentColor" size={16} /><Star fill="currentColor" size={16} />
                </div>
                {/* Menggunakan &quot; untuk mencegah error ESLint (Unescaped Entities) */}
                <p className="text-neutral-300 text-sm italic mb-6">
                  &quot;Sejak menggunakan platform ini, saya bisa melihat akumulasi broker secara lebih transparan. Delay-nya nyaris tidak ada, sangat cocok untuk scalper.&quot;
                </p>
                <div className="flex items-center gap-3">
                  {/* Menggunakan Next.js Image dengan properti unoptimized untuk gambar dari URL eksternal */}
                  <div className="w-10 h-10 shrink-0 relative rounded-full overflow-hidden border border-[#2d2d2d]">
                    <Image 
                      src={`https://i.pravatar.cc/150?img=${i + 30}`} 
                      alt="User" 
                      fill
                      className="object-cover"
                      unoptimized 
                    />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-bold">Trader {i === 1 ? 'Alpha' : i === 2 ? 'Sigma' : 'Omega'}</h4>
                    <span className="text-xs text-neutral-500">Verified Whale</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- 5. PRICING SECTION --- */}
      <section id="pricing" className="py-24 px-6 bg-[#0a0a0a] border-t border-[#1e1e1e] relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Investasi untuk Portofolio Anda</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">Pilih paket langganan yang sesuai dengan kebutuhan analitik Anda. Tidak ada biaya tersembunyi.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Paket Pro */}
            <div className="bg-[#121212] border border-[#2d2d2d] rounded-3xl p-8 flex flex-col">
              <h3 className="text-2xl font-bold text-white mb-2">Pro Trader</h3>
              <p className="text-neutral-400 text-sm mb-6">Akses analitik mendasar untuk scalper dan swing trader.</p>
              <div className="text-4xl font-black text-white mb-8">Rp 499k<span className="text-base font-medium text-neutral-500">/bulan</span></div>
              
              <div className="flex-1 space-y-4 mb-8">
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-neutral-300">Basic Tape Reading</span></div>
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-neutral-300">Data End of Day (EOD)</span></div>
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-neutral-300">Standard Screener</span></div>
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-neutral-300">3 Custom Watchlist</span></div>
              </div>
              <Link href="/auth" className="w-full py-4 text-center rounded-xl font-bold bg-[#1e1e1e] border border-[#2d2d2d] hover:bg-[#2d2d2d] text-white transition-colors">Daftar Pro</Link>
            </div>

            {/* Paket Whale (Tier 1) */}
            <div className="bg-gradient-to-b from-[#10b981]/10 to-[#121212] border-2 border-[#10b981] rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#06b6d4] to-[#10b981] text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5">
                <Crown size={14} /> Most Popular
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">Whale (Tier-1)</h3>
              <p className="text-neutral-400 text-sm mb-6">Akses terminal penuh. <span className="text-[#10b981] font-bold">Syarat: Saldo min. 300 Juta.</span></p>
              <div className="text-4xl font-black text-white mb-8">Rp 1.499k<span className="text-base font-medium text-neutral-500">/bulan</span></div>
              
              <div className="flex-1 space-y-4 mb-8">
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-white font-bold">Semua Fitur Pro</span></div>
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-neutral-300">Smart Money Tracking Live</span></div>
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-neutral-300">Anomali Broker & Heatmap</span></div>
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-neutral-300">Unlimited Watchlist & Layout</span></div>
                <div className="flex items-center gap-3"><Check size={18} className="text-[#10b981]" /><span className="text-sm text-neutral-300">Akses Komunitas VIP</span></div>
              </div>
              <Link href="/auth" className="w-full py-4 text-center rounded-xl font-bold bg-gradient-to-r from-[#06b6d4] to-[#10b981] text-white hover:shadow-[0_4px_15px_rgba(16,185,129,0.4)] transition-all">Ajukan Verifikasi Whale</Link>
            </div>

          </div>
        </div>
      </section>

      {/* --- 6. FOOTER --- */}
      <footer className="bg-[#121212] border-t border-[#1e1e1e] py-12 text-center">
        <Image src="/VorteStocks.svg" alt="VorteStocks Logo" width={140} height={40} className="mx-auto mb-6 opacity-50 grayscale hover:grayscale-0 transition-all" />
        <div className="flex justify-center gap-6 mb-6">
          <Link href="#" className="text-sm text-neutral-500 hover:text-white">Syarat & Ketentuan</Link>
          <Link href="#" className="text-sm text-neutral-500 hover:text-white">Kebijakan Privasi</Link>
          <Link href="#" className="text-sm text-neutral-500 hover:text-white">Kontak Kami</Link>
        </div>
        <p className="text-neutral-600 text-sm">© {new Date().getFullYear()} VorteStocks Analytics. All rights reserved.</p>
        <p className="text-neutral-700 text-xs mt-2 max-w-lg mx-auto">Trading saham memiliki risiko tinggi. Data yang disediakan bersifat analitik dan bukan merupakan ajakan untuk membeli atau menjual saham.</p>
      </footer>

    </div>
  );
}