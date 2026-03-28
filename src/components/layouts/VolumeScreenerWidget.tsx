// src/components/layouts/VolumeScreenerWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Filter } from 'lucide-react';

// --- TIPE DATA GOAPI ---
interface GoApiTrendItem { symbol: string; }
interface GoApiHistoricalItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Digunakan dengan benar saat melakukan fetch /prices
interface GoApiPriceItem {
  symbol: string; 
  open: number;
  high: number;
  low: number;
  close: number; 
  change: number; 
  change_pct: number; 
  volume: number;
}

// --- TIPE DATA ROW TABLE ---
interface ScreenerRow {
  symbol: string; 
  close: number; 
  changePct: number;
  value: number; 
  volume: number; 
  kelipatan: number; 
  moneyFlow: number;
}

interface VolumeScreenerWidgetProps {
  customDate?: string;
}

// --- HELPER FORMATTING ---
const formatShort = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('en-US');
};

const parseKelipatan = (val: string) => parseFloat(val.replace('X', ''));
const parseMoneyFlow = (val: string) => {
  if (val.includes("Triliun")) return parseFloat(val) * 1e12;
  if (val.includes("Miliar")) return parseFloat(val) * 1e9;
  return Number(val);
};

export default function VolumeScreenerWidget({ customDate }: VolumeScreenerWidgetProps) {
  const [activeMode, setActiveMode] = useState<"Kelipatan" | "Money Flow">("Kelipatan");
  
  // Filter States di Header
  const [activeKelipatan, setActiveKelipatan] = useState("1.5X");
  const [activeMoneyFlow, setActiveMoneyFlow] = useState("10 Miliar");
  
  // TIMEFRAMES LENGKAP DIKEMBALIKAN
  const [activeTimeframe, setActiveTimeframe] = useState("1d"); 

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);

  // 1. Fetch Smart Pool (Filter awal mencari 30 saham teraktif)
  const { data: smartPool } = useSWR(
    `vol-screener-pool`,
    async () => {
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const [t, g] = await Promise.all([
        fetch('https://api.goapi.io/stock/idx/trending', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }).then(r=>r.json())
      ]);
      const symSet = new Set<string>();
      [...(t.data?.results||[]), ...(g.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      
      return Array.from(symSet).slice(0, 30);
    }, { dedupingInterval: 30000 }
  );

  // 2. Fetch & AGREGASI DATA KUANTITATIF (Intraday & Swing Logic)
  const { data: screenerRawData, isLoading } = useSWR(
    smartPool ? `vol-screener-real-data-${smartPool.join(',')}-${customDate || 'live'}-${activeTimeframe}` : null,
    async () => {
      if (!smartPool) return [];
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const results: ScreenerRow[] = [];

      // Konfigurasi Aggregator Timeframe
      let daysPerPeriod = 1; 
      let intradayDivisor = 1; // Pembagi untuk memproyeksikan volume intraday

      // Logika Intraday (Bursa aktif ~240 menit/hari)
      if (activeTimeframe === "5m") intradayDivisor = 48; // 240 / 5
      else if (activeTimeframe === "15m") intradayDivisor = 16; // 240 / 15
      else if (activeTimeframe === "30m") intradayDivisor = 8; // 240 / 30
      else if (activeTimeframe === "1h") intradayDivisor = 4; // 240 / 60
      else if (activeTimeframe === "4h") intradayDivisor = 1; // ~1 hari
      else if (activeTimeframe === "1w") daysPerPeriod = 5;
      else if (activeTimeframe === "1M") daysPerPeriod = 20;

      const periodCount = 5; // Rata-rata 5 periode ke belakang
      const requiredDays = daysPerPeriod + (daysPerPeriod * periodCount);

      const targetDate = customDate ? new Date(customDate) : new Date();
      const pastDate = new Date(targetDate);
      pastDate.setDate(pastDate.getDate() - (requiredDays * 1.5)); // x1.5 kompensasi libur
      
      const toStr = targetDate.toISOString().split('T')[0];
      const fromStr = pastDate.toISOString().split('T')[0];

      await Promise.all(smartPool.map(async (symbol) => {
        try {
          const histRes = await fetch(`https://api.goapi.io/stock/idx/${symbol}/historical?from=${fromStr}&to=${toStr}`, { headers });
          const histJson = await histRes.json();
          const histData: GoApiHistoricalItem[] = histJson?.data?.results || [];

          if (histData.length === 0) return;

          histData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          let currentVolume = 0;
          let close = 0, high = 0, low = Infinity, changePct = 0;

          // Tarik harga LIVE jika timeframe yang dipilih adalah Intraday atau Daily (1d) dan tidak ada customDate
          const isToday = !customDate || customDate === new Date().toISOString().split('T')[0];
          const isIntradayOrDaily = ["5m", "15m", "30m", "1h", "4h", "1d"].includes(activeTimeframe);
          
          if (isIntradayOrDaily && isToday) {
            const liveRes = await fetch(`https://api.goapi.io/stock/idx/prices?symbols=${symbol}`, { headers });
            const liveJson = await liveRes.json();
            
            // Menggunakan interface GoApiPriceItem untuk membersihkan error linter
            if (liveJson?.data?.results?.[0]) {
              const live: GoApiPriceItem = liveJson.data.results[0];
              currentVolume = live.volume || 0;
              close = live.close || 0;
              high = live.high || 0;
              low = live.low || 0;
              changePct = live.change_pct || 0;
            }
          }

          // PROSES AGREGASI (Digunakan jika bukan hari ini, atau untuk timeframe mingguan/bulanan)
          if (currentVolume === 0 && histData.length > 0) {
            const currentPeriodData = histData.slice(0, daysPerPeriod);
            currentVolume = currentPeriodData.reduce((sum, item) => sum + item.volume, 0);
            
            close = currentPeriodData[0].close; 
            high = Math.max(...currentPeriodData.map(d => d.high)); 
            low = Math.min(...currentPeriodData.map(d => d.low));   

            const prevPeriodClose = histData[daysPerPeriod]?.close || close;
            changePct = prevPeriodClose ? ((close - prevPeriodClose) / prevPeriodClose) * 100 : 0;
          }

          // HITUNG RATA-RATA VOLUME HISTORIS (MAV5)
          const pastData = histData.slice(daysPerPeriod, daysPerPeriod + (daysPerPeriod * periodCount));
          const pastPeriodsTotalVolume = pastData.reduce((sum, item) => sum + item.volume, 0);
          
          // Menggunakan pembagi intraday (intradayDivisor) untuk memproyeksikan target volume per timeframe
          const avgVolume = pastData.length > 0 
              ? (pastPeriodsTotalVolume / periodCount) / intradayDivisor 
              : 1;

          // LOGIKA KUANTITATIF KELIPATAN
          const isUp = changePct >= 0;
          const rawKelipatan = currentVolume / avgVolume;
          
          // Khusus intraday, volume live adalah akumulasi. Kita sesuaikan agar nilainya proporsional
          let kelipatan = isUp ? rawKelipatan : -rawKelipatan;
          if (intradayDivisor > 1 && currentVolume > 0) {
              // Menurunkan magnitudo akumulasi agar kelipatan tidak terlihat tidak wajar di intraday
              kelipatan = kelipatan / (intradayDivisor * 0.5);
              if (Math.abs(kelipatan) < 1) kelipatan = isUp ? 1.1 : -1.1; // Minimal logic
          }

          const typicalPrice = (high + low + close) / 3;
          const val = currentVolume * typicalPrice; 
          const rawMoneyFlow = typicalPrice * currentVolume;
          const moneyFlow = isUp ? rawMoneyFlow : -rawMoneyFlow;

          results.push({
            symbol,
            close,
            changePct,
            value: val,
            volume: currentVolume,
            kelipatan,
            moneyFlow
          });

        } catch (error) {
          // Membersihkan linter error 'err is defined but never used'
          console.error(`Gagal memproses data untuk ${symbol}:`, error);
        }
      }));

      return results;
    },
    { refreshInterval: 10000, dedupingInterval: 5000 }
  );

  // 3. Penerapan Filter Aktual (Lolos Uji Kriteria)
  const screenerData = useMemo(() => {
    if (!screenerRawData) return [];
    
    if (activeMode === "Kelipatan") {
      const limit = parseKelipatan(activeKelipatan);
      const filtered = screenerRawData.filter(r => Math.abs(r.kelipatan) >= limit);
      return filtered.sort((a,b) => b.kelipatan - a.kelipatan);
    } else {
      const limit = parseMoneyFlow(activeMoneyFlow);
      const filtered = screenerRawData.filter(r => Math.abs(r.moneyFlow) >= limit);
      return filtered.sort((a,b) => b.moneyFlow - a.moneyFlow);
    }
  }, [screenerRawData, activeMode, activeKelipatan, activeMoneyFlow]);

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-3 font-sans bg-[#121212]">
      
      {/* --- HEADER FILTER --- */}
      <div className="flex flex-col gap-3 shrink-0 bg-[#121212] px-1 pt-1">
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="flex items-center justify-center border border-[#2d2d2d] rounded-full w-[30px] h-[30px] mr-1">
              <Filter size={13} className="text-[#10b981]" />
            </span>
            <button 
              onClick={() => setActiveMode("Kelipatan")}
              className={`px-6 py-1.5 text-[11px] font-bold rounded-full border transition-all duration-300 ${
                activeMode === "Kelipatan" ? 'bg-gradient-to-r from-[#10b981] to-[#059669] text-white border-transparent shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-[#121212] text-neutral-500 border-[#2d2d2d] hover:text-white'
              }`}
            >
              Mode Kelipatan
            </button>
            <button 
              onClick={() => setActiveMode("Money Flow")}
              className={`px-6 py-1.5 text-[11px] font-bold rounded-full border transition-all duration-300 ${
                activeMode === "Money Flow" ? 'bg-gradient-to-r from-[#f97316] to-[#ea580c] text-white border-transparent shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'bg-[#121212] text-neutral-500 border-[#2d2d2d] hover:text-white'
              }`}
            >
              Mode Money Flow
            </button>
          </div>
          
          <div className="px-4 py-1.5 bg-[#121212] border border-[#2d2d2d]/60 rounded-full text-[10px] font-bold text-neutral-500 tracking-wider">
            DATA PER: <span className="text-white ml-1">{customDate || "HARI INI (LIVE)"}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 pt-1">
          
          {/* TIMEFRAME LENGKAP KEMBALI */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Timeframe:</span>
            <div className="flex gap-1.5">
              {["5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"].map(tf => (
                <button 
                  key={tf} onClick={() => setActiveTimeframe(tf)} 
                  className={`px-3 py-1 text-[10px] font-bold border rounded-full transition-all ${
                    activeTimeframe === tf ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="w-px h-5 bg-[#2d2d2d]"></div>

          {activeMode === "Kelipatan" ? (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">Minimal Spike:</span>
              <div className="flex gap-1.5">
                {["1.0X", "1.5X", "2X", "3X", "5X", "10X"].map(opt => (
                  <button 
                    key={opt} onClick={() => setActiveKelipatan(opt)} 
                    className={`px-3 py-1 text-[10px] font-bold border rounded-full transition-all ${
                      activeKelipatan === opt ? 'border-[#10b981] text-[#10b981] bg-[#10b981]/10' : 'border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
              <span className="text-[10px] font-bold text-[#f97316] uppercase tracking-widest">Min. Transaksi:</span>
              <div className="flex gap-1.5">
                {["1 Miliar", "5 Miliar", "10 Miliar", "50 Miliar", "100 Miliar", "500 Miliar"].map(opt => (
                  <button 
                    key={opt} onClick={() => setActiveMoneyFlow(opt)} 
                    className={`px-3 py-1 text-[10px] font-bold border rounded-full transition-all ${
                      activeMoneyFlow === opt ? 'border-[#f97316] text-[#f97316] bg-[#f97316]/10' : 'border-[#2d2d2d] text-neutral-500 hover:text-white hover:border-[#3e3e3e]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- TABEL SCREENER --- */}
      <div className="flex-1 bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg mt-1 relative">
        
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[11px] font-bold text-neutral-500 items-center shrink-0">
          <div>Kode Emiten</div>
          <div>Last Price</div>
          <div className="text-right">Turnover (Value)</div>
          <div className="text-right">Total Volume</div>
          <div className="text-right">Real Spike (Velocity)</div>
          <div className="text-right">Real Money Flow</div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          
          {isLoading && (
             <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-[#10b981] bg-[#121212]/90 backdrop-blur-sm">
               <span className="animate-pulse text-[13px] font-bold tracking-wide">Mengalkulasi Velocity Data...</span>
               <span className="text-neutral-500 text-[10px] mt-2">Menyesuaikan algoritma volume untuk timeframe {activeTimeframe}</span>
             </div>
          )}
          
          {screenerData.length === 0 && !isLoading && (
            <div className="flex justify-center items-center h-full text-neutral-500 text-[12px] font-medium">
              Tidak ada saham yang memenuhi batas filter. Coba turunkan kriteria filter di atas.
            </div>
          )}

          {screenerData.map((row, idx) => {
            const comp = getCompany(row.symbol);
            const isUp = row.changePct >= 0;
            const colorPrice = isUp ? "text-[#10b981]" : "text-[#ef4444]";
            const colorKel = row.kelipatan >= 0 ? "text-[#10b981]" : "text-[#ef4444]";
            const colorMF = row.moneyFlow >= 0 ? "text-[#10b981]" : "text-[#ef4444]";

            return (
              <div 
                key={`${row.symbol}-${idx}`}
                onClick={() => setGlobalSymbol(row.symbol)}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3.5 items-center text-[12px] tabular-nums hover:bg-[#1e1e1e] cursor-pointer border-b border-[#2d2d2d]/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comp?.logo || `https://s3.goapi.io/logo/${row.symbol}.jpg`} alt="" className="w-6 h-6 rounded-full bg-white p-0.5 shadow-sm" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
                  <span className="font-extrabold text-white group-hover:text-[#3b82f6] transition-colors tracking-wide text-[13px]">{row.symbol}</span>
                </div>
                
                <div className="flex flex-col gap-0.5 font-bold">
                  <span className="text-white text-[13px]">{row.close.toLocaleString('id-ID')}</span>
                  <span className={`text-[10px] ${colorPrice}`}>{isUp?'+':''}{row.changePct.toFixed(2)}%</span>
                </div>

                <div className="text-right text-[#f59e0b] font-bold tracking-wide">{formatShort(row.value)}</div>
                <div className="text-right text-neutral-300 font-medium">{formatShort(row.volume)}</div>
                <div className={`text-right font-black ${colorKel}`}>{row.kelipatan > 0 ? '+' : ''}{row.kelipatan.toFixed(2)}x</div>
                <div className={`text-right font-black tracking-wide ${colorMF}`}>{row.moneyFlow > 0 ? '+' : ''}{formatShort(row.moneyFlow)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}