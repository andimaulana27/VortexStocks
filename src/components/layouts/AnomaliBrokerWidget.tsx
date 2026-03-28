// src/components/layouts/AnomaliBrokerWidget.tsx
"use client";

import React from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA GOAPI ---
interface GoApiTrendItem { 
  symbol: string; 
}

interface GoApiHistoricalItem {
  date: string;
  close: number;
  volume: number;
}

interface GoApiPriceItem {
  symbol: string; 
  close: number; 
  change: number; 
  change_pct: number; 
  volume: number;
}

interface GoApiBrokerItem {
  broker?: { code: string; name: string; };
  code?: string;
  side: string;
  lot: number;
  value: number;
}

interface ScreenerRow {
  symbol: string;
  close: number;
  changePct: number;
  value: number;
  volume: number;
  anomalyBrokers: string[];
  netAnomalyVal: number; 
}

interface AnomaliBrokerWidgetProps {
  customDate?: string;
}

// --- DATA BROKER MAINSTREAM ---
// Jika broker di luar daftar ini tiba-tiba menjadi Top 5 Buyer, maka itu ANOMALI.
const MAINSTREAM_BROKERS = new Set([
  "YP", "PD", "CC", "NI", "OD", "BK", "AK", "ZP", "CS", "RX", "CG", "DB", "DX", "FS", 
  "GW", "KZ", "ML", "MS", "YU", "BB", "XC", "XL", "GR", "CP", "KK", "SQ", "SS", "DR", 
  "BQ", "TP", "XA", "HD", "AI", "BM", "BR", "MG", "AZ", "DH", "EP", "BZ"
]);

// --- HELPER DATE & FORMATTING ---
const getDefaultApiDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const formatShort = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('en-US');
};

export default function AnomaliBrokerWidget({ customDate }: AnomaliBrokerWidgetProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);

  // 1. Fetch Smart Pool (Ditingkatkan ke 100 Saham Teraktif untuk menjaring lebih banyak anomali)
  const { data: smartPool } = useSWR(
    `anomali-screener-pool`,
    async () => {
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const [t, g, l] = await Promise.all([
        fetch('https://api.goapi.io/stock/idx/trending', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_loser', { headers }).then(r=>r.json())
      ]);
      const symSet = new Set<string>();
      
      // Sisipkan bluechips default
      const bluechips = ["BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "AMMN", "BREN", "CUAN", "POGO"];
      bluechips.forEach(b => symSet.add(b));

      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      
      // Jangkauan diperluas menjadi 100 saham
      return Array.from(symSet).slice(0, 100); 
    }, { dedupingInterval: 60000 }
  );

  // 2. Mesin Pemindai Anomali & Fetch Harga (Terintegrasi)
  const { data: screenerData, isLoading: isScanning } = useSWR(
    smartPool ? `anomali-screener-data-${customDate || 'live'}` : null,
    async () => {
      if (!smartPool) return [];
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const targetDateStr = customDate || getDefaultApiDate();

      // A. Tarik Broker Summary untuk 100 saham secara paralel
      const promises = smartPool.map(sym =>
        fetch(`https://api.goapi.io/stock/idx/${sym}/broker_summary?date=${targetDateStr}&investor=ALL`, { headers })
          .then(res => res.json())
          .then(res => ({ symbol: sym, data: res.data?.results || [] }))
          .catch(() => ({ symbol: sym, data: [] }))
      );
      
      const brokerResults = await Promise.all(promises);
      const passedStocks: Array<{symbol: string, anomalyBrokers: string[], netAnomalyVal: number}> = [];

      // B. Logika Deteksi Anomali
      brokerResults.forEach(res => {
        // Agregasi Net Value per Broker untuk saham ini
        const brokerNets: Record<string, { code: string, netVal: number }> = {};
        
        res.data.forEach((item: GoApiBrokerItem) => {
            const code = (item.broker?.code || item.code || "-").toUpperCase();
            if (!brokerNets[code]) brokerNets[code] = { code, netVal: 0 };
            
            if (item.side === "BUY") brokerNets[code].netVal += item.value;
            else brokerNets[code].netVal -= item.value;
        });

        // Ambil Top 5 Buyer Terbesar
        const topBuyers = Object.values(brokerNets)
            .sort((a, b) => b.netVal - a.netVal)
            .slice(0, 5); // Diperluas dari 3 ke 5 agar lebih banyak anomali terdeteksi

        const anomalyBrokers: string[] = [];
        let anomalyNetVal = 0;

        // Cek apakah ada broker anomali (non-mainstream) di jajaran Top 5 Buyer
        topBuyers.forEach(b => {
            if (b.netVal > 0 && !MAINSTREAM_BROKERS.has(b.code)) {
                anomalyBrokers.push(b.code);
                anomalyNetVal += b.netVal;
            }
        });

        // Loloskan saham ke tabel jika ada anomali
        if (anomalyBrokers.length > 0) {
            passedStocks.push({ 
                symbol: res.symbol, 
                anomalyBrokers, 
                netAnomalyVal: anomalyNetVal 
            });
        }
      });

      if (passedStocks.length === 0) return [];

      // C. Tarik Harga (Live atau Historis) HANYA untuk saham yang terdeteksi anomali
      const isLatestMarket = targetDateStr === getDefaultApiDate();
      const passedSymbols = passedStocks.map(s => s.symbol).join(',');
      let livePricesData: GoApiPriceItem[] = [];

      if (isLatestMarket && passedSymbols) {
        try {
          const liveRes = await fetch(`https://api.goapi.io/stock/idx/prices?symbols=${passedSymbols}`, { headers });
          const liveJson = await liveRes.json();
          livePricesData = liveJson?.data?.results || [];
        } catch(e) {
          console.error("Gagal menarik live prices", e);
        }
      }

      const finalResults: ScreenerRow[] = [];
      const targetDate = new Date(targetDateStr);
      const pastDate = new Date(targetDate);
      pastDate.setDate(pastDate.getDate() - 5);
      const toStr = targetDate.toISOString().split('T')[0];
      const fromStr = pastDate.toISOString().split('T')[0];

      await Promise.all(passedStocks.map(async (ps) => {
        let close = 0, changePct = 0, volume = 0, value = 0;
        const live = livePricesData.find(p => p.symbol === ps.symbol);

        if (isLatestMarket && live) {
          close = live.close || 0;
          changePct = live.change_pct || 0;
          volume = live.volume || 0;
          value = volume * close;
        } else {
          try {
            const histRes = await fetch(`https://api.goapi.io/stock/idx/${ps.symbol}/historical?from=${fromStr}&to=${toStr}`, { headers });
            const histJson = await histRes.json();
            const histData: GoApiHistoricalItem[] = histJson?.data?.results || [];
            if (histData.length > 0) {
              histData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const exactDay = histData[0];
              const prevDay = histData[1];
              close = exactDay.close;
              volume = exactDay.volume;
              value = exactDay.volume * exactDay.close;
              changePct = prevDay ? ((close - prevDay.close) / prevDay.close) * 100 : 0;
            }
          } catch(e) {
            console.error("Gagal menarik historical", e);
          }
        }

        finalResults.push({
          symbol: ps.symbol,
          close,
          changePct,
          volume,
          value,
          anomalyBrokers: ps.anomalyBrokers,
          netAnomalyVal: ps.netAnomalyVal
        });
      }));

      // Mengurutkan berdasarkan besaran uang yang disuntik oleh broker anomali
      return finalResults.sort((a, b) => b.netAnomalyVal - a.netAnomalyVal);
    },
    { dedupingInterval: 10000, refreshInterval: 15000 }
  );

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-3 font-sans bg-[#121212]">

      {/* --- TABEL SCREENER ANOMALI --- */}
      <div className="flex-1 bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg mt-1 relative">
        
        {/* Header Tabel */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[11px] font-bold text-neutral-500 items-center shrink-0">
          <div>Kode Emiten</div>
          <div>Last Price</div>
          <div className="text-right">Turnover (Value)</div>
          <div className="text-right">Total Volume</div>
          <div className="text-right text-[#ec4899]">Broker Anomali</div>
          <div className="text-right text-[#ec4899]">Total Akumulasi Anomali</div>
        </div>

        {/* Body Tabel */}
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          {isScanning && (
             <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-[#ec4899] bg-[#121212]/90 backdrop-blur-sm">
               <span className="animate-pulse text-[13px] font-bold tracking-wide">Mencari Broker Non-Mainstream...</span>
               <span className="text-neutral-500 text-[10px] mt-2">Menganalisis Top 5 Buyers dari 100 Saham Teraktif</span>
             </div>
          )}
          
          {!isScanning && (!screenerData || screenerData.length === 0) && (
             <div className="flex justify-center items-center h-full text-neutral-500 text-[12px] font-medium">
               Tidak ada aktivitas broker anomali yang signifikan pada tanggal ini.
             </div>
          )}

          {screenerData?.map((row: ScreenerRow, idx: number) => {
            const comp = getCompany(row.symbol);
            const isUp = row.changePct >= 0;
            const colorPrice = isUp ? "text-[#10b981]" : "text-[#ef4444]";
            const colorNet = row.netAnomalyVal >= 0 ? "text-[#10b981]" : "text-[#ef4444]";

            return (
              <div 
                key={`${row.symbol}-${idx}`}
                onClick={() => setGlobalSymbol(row.symbol)}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3.5 items-center text-[12px] tabular-nums hover:bg-[#1e1e1e] cursor-pointer border-b border-[#2d2d2d]/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comp?.logo || `https://s3.goapi.io/logo/${row.symbol}.jpg`} alt="" className="w-6 h-6 rounded-full bg-white p-0.5 shadow-sm" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
                  <span className="font-extrabold text-white group-hover:text-[#ec4899] transition-colors tracking-wide text-[13px]">{row.symbol}</span>
                </div>
                
                <div className="flex flex-col gap-0.5 font-bold">
                  <span className="text-white text-[13px]">{row.close.toLocaleString('id-ID')}</span>
                  <span className={`text-[10px] ${colorPrice}`}>{isUp?'+':''}{row.changePct.toFixed(2)}%</span>
                </div>

                <div className="text-right text-[#f59e0b] font-bold tracking-wide">{formatShort(row.value)}</div>
                
                <div className="text-right text-neutral-300 font-medium">{formatShort(row.volume)}</div>
                
                <div className="flex justify-end gap-1 flex-wrap">
                  {row.anomalyBrokers.map((b, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-[#ec4899]/20 border border-[#ec4899]/50 text-[#ec4899] text-[10px] font-black rounded shadow-sm">
                      {b}
                    </span>
                  ))}
                </div>
                
                <div className={`text-right font-black tracking-wide ${colorNet}`}>
                  {row.netAnomalyVal > 0 ? '+' : ''}{formatShort(row.netAnomalyVal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}