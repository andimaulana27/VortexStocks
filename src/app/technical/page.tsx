// src/app/technical/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Settings2, AlertCircle, BarChart2, Activity, Zap } from 'lucide-react';
import Link from 'next/link';
// Anda bisa meng-import komponen chart TradingView kustom Anda di sini nantinya
// import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget';

// Mapping label untuk mencocokkan ID dari database
const INDICATOR_LABELS: Record<string, string> = {
  ma_ema: 'Ma+Ema', macd: 'Macd', stoch_rsi: 'Stoch Rsi', rsi: 'RSI', 
  big_volume: 'Big Volume', breakout_ch: 'Breakout Ch', trendline_atr: 'Trendline ATR', 
  dtfx_zone: 'DTFX Zone', zig_zag: 'Zig-Zag Ch', money_flow: 'Money Flow', 
  atr_supertrend: 'ATR SuperTrend', reversal: 'Reversal',
  
  foreign: 'Foreign', bid_offer: 'Bid Offer', volume_sm: 'Volume', 
  smart_money: 'Smart Money', anomali_broker: 'Anomali Broker', top_acum: 'Top Acum', 
  shareholders: 'Shareholders', haki: 'HAKI', haka: 'HAKA'
};

export default function TechnicalPage() {
  const [settings, setSettings] = useState<Record<string, boolean> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState('1D');
  const supabase = createClient();

  // 1. Pindahkan fungsi ke ATAS useEffect
  const fetchUserSettings = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data } = await supabase.from('profiles').select('technical_settings').eq('id', user.id).single();
      if (data && data.technical_settings) {
        setSettings(data.technical_settings);
      } else {
        setSettings({}); // Kosong jika belum pernah disetting
      }
    }
    setIsLoading(false);
  };

  // 2. useEffect memanggil fungsi yang sudah diinisialisasi
  useEffect(() => {
    fetchUserSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Perbaikan logika filter untuk menghindari "unused variable '_'"
  // Mengambil daftar indikator yang statusnya "true" (Aktif)
  const activeIndicators = settings 
    ? Object.keys(settings).filter((key) => settings[key])
    : [];

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden p-2 gap-2">
      
      {/* --- TOP BAR: INDIKATOR PERSONALISASI --- */}
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-3 flex items-center justify-between shrink-0 shadow-md">
        
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar flex-1">
          <div className="flex items-center gap-2 pr-3 border-r border-[#2d2d2d]">
            <Activity size={16} className="text-[#10b981]" />
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Setup:</span>
          </div>

          {isLoading ? (
            <div className="text-xs text-neutral-500 animate-pulse flex items-center gap-2">
               Memuat workspace Anda...
            </div>
          ) : activeIndicators.length === 0 ? (
            <div className="text-xs text-[#f59e0b] flex items-center gap-2">
              <AlertCircle size={14} /> Belum ada indikator aktif.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {activeIndicators.map((indKey) => (
                <span 
                  key={indKey} 
                  className="px-4 py-1.5 rounded-full text-[11px] font-bold bg-[#1e1e1e] border border-[#06b6d4]/50 text-[#06b6d4] shadow-[0_0_8px_rgba(6,182,212,0.15)] whitespace-nowrap"
                >
                  {INDICATOR_LABELS[indKey] || indKey}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tombol ke halaman Settings */}
        <Link href="/settings" className="ml-4 shrink-0 flex items-center gap-2 px-4 py-1.5 bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#2d2d2d] hover:border-neutral-500 rounded-full text-xs font-bold text-neutral-300 transition-all">
          <Settings2 size={14} /> <span className="hidden sm:inline">Edit Setup</span>
        </Link>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <div className="flex-1 flex gap-2 min-h-0">
        
        {/* Kiri: Advanced Chart Area */}
        <div className="flex-[2.5] flex flex-col bg-[#121212] border border-[#2d2d2d] rounded-xl shadow-md overflow-hidden relative">
          
          {/* Chart Toolbar (Timeframe) */}
          <div className="h-10 border-b border-[#2d2d2d] bg-[#1e1e1e]/50 flex items-center px-4 gap-2">
            {['1m', '5m', '15m', '1H', '4H', '1D', '1W'].map((tf) => (
              <button 
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-3 py-1 text-[11px] font-bold rounded transition-colors ${
                  activeTimeframe === tf 
                    ? 'bg-[#2d2d2d] text-white shadow-sm' 
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Area Render Chart Aktual */}
          <div className="flex-1 relative bg-[#0a0a0a] flex items-center justify-center border-2 border-dashed border-[#2d2d2d] m-2 rounded-lg">
             <div className="text-center">
                <BarChart2 size={48} className="text-neutral-700 mx-auto mb-3" />
                <p className="text-[#06b6d4] font-bold">TradingView Chart Area</p>
                <p className="text-neutral-500 text-xs mt-1">Indikator akan diinjeksi berdasarkan Active Setup di atas.</p>
             </div>
             
             {/* Simulasi Injeksi Sinyal jika indikator aktif */}
             {activeIndicators.includes('smart_money') && (
               <div className="absolute bottom-4 right-4 bg-[#10b981]/20 border border-[#10b981] px-4 py-2 rounded-lg flex items-center gap-2 text-[#10b981] text-xs font-bold animate-pulse">
                 <Zap size={14} /> Smart Money Detected: Akumulasi Besar
               </div>
             )}
          </div>
        </div>

        {/* Kanan: Side Panel (Broker Summary / Order Book) */}
        <div className="flex-1 flex flex-col gap-2 min-w-[300px]">
          
          {/* Panel Atas */}
          <div className="flex-[1] bg-[#121212] border border-[#2d2d2d] rounded-xl shadow-md p-4">
             <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-[#2d2d2d] pb-2 mb-3">Broker Action</h3>
             <div className="h-full flex items-center justify-center text-neutral-600 text-xs font-medium">
               Komponen Broker Summary di sini
             </div>
          </div>

          {/* Panel Bawah */}
          <div className="flex-[1.2] bg-[#121212] border border-[#2d2d2d] rounded-xl shadow-md p-4">
             <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-[#2d2d2d] pb-2 mb-3">Order Book & Tape</h3>
             <div className="h-full flex items-center justify-center text-neutral-600 text-xs font-medium">
               Komponen Tape Reading di sini
             </div>
          </div>

        </div>

      </div>

    </div>
  );
}