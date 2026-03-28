// src/components/layouts/SmartMoneyScreenerWidget.tsx
"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA GOAPI ---
interface GoApiTrendItem { symbol: string; }
interface GoApiHistoricalItem { date: string; close: number; volume: number; }
interface GoApiPriceItem { symbol: string; close: number; change: number; change_pct: number; volume: number; }
interface GoApiBrokerItem { broker?: { code: string; name: string; }; code?: string; side: string; lot: number; value: number; }
interface ScreenerRow { symbol: string; close: number; changePct: number; value: number; volume: number; netLot: number; netVal: number; }
interface SmartMoneyScreenerWidgetProps { customDate?: string; }

// --- DATA BROKER ---
const FOREIGN_BROKERS = ["AK", "BK", "CS", "CG", "DB", "DX", "FS", "GW", "KZ", "ML", "MS", "RX", "ZP", "YU", "BB"];
const LOCAL_BROKERS = ["YP", "PD", "XC", "XL", "GR", "CP", "KK", "SQ", "SS", "DR", "BQ", "TP", "XA", "HD", "AI"];
const BUMN_BROKERS = ["CC", "NI", "OD", "BM", "BR"];

// --- HELPER FORMATTING & DATE ---
const formatShort = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('en-US');
};

// HELPER: Mencegah error di hari libur/weekend
const getDefaultApiDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; // Minggu -> Jumat
  else if (day === 6) offset = 1; // Sabtu -> Jumat
  else if (day === 1 && hours < 16) offset = 3; // Senin Pagi -> Jumat
  else if (hours < 16) offset = 1; // Sebelum jam 4 sore -> Kemarin
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

export default function SmartMoneyScreenerWidget({ customDate }: SmartMoneyScreenerWidgetProps) {
  // DEFAULT AKTIF: 1 Asing (AK) dan 1 Lokal (YP)
  const [selForeign, setSelForeign] = useState<string[]>(["AK"]);
  const [selLocal, setSelLocal] = useState<string[]>(["YP"]);
  const [selBumn, setSelBumn] = useState<string[]>([]);

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);

  const toggleBroker = (code: string, type: 'foreign' | 'local' | 'bumn') => {
    if (type === 'foreign') {
      setSelForeign(prev => prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]);
    } else if (type === 'local') {
      setSelLocal(prev => prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]);
    } else {
      setSelBumn(prev => prev.includes(code) ? prev.filter(b => b !== code) : [...prev, code]);
    }
  };

  const activeBrokersArr = [...selForeign, ...selLocal, ...selBumn];
  const activeBrokersKey = activeBrokersArr.length > 0 ? activeBrokersArr.join('-') : 'ALL';

  // 1. Fetch Smart Pool (Mendapatkan Top 60 Saham Teraktif & Bluechips)
  const { data: smartPool } = useSWR(
    `sm-screener-pool`,
    async () => {
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const [t, g, l] = await Promise.all([
        fetch('https://api.goapi.io/stock/idx/trending', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_loser', { headers }).then(r=>r.json())
      ]);
      const symSet = new Set<string>();
      
      const bluechips = ["BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "AMMN", "BREN", "CUAN", "POGO"];
      bluechips.forEach(b => symSet.add(b));

      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      
      return Array.from(symSet).slice(0, 60); 
    }, { dedupingInterval: 60000 }
  );

  // 2. Mesin Scanning Akumulasi & Fetch Harga
  const { data: screenerData, isLoading: isScanning } = useSWR(
    smartPool ? `sm-screener-accum-${activeBrokersKey}-${customDate || 'live'}` : null,
    async () => {
      if (!smartPool) return [];
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      
      // FIX: Gunakan helper proteksi tanggal jika customDate kosong
      const targetDateStr = customDate || getDefaultApiDate();

      // A. Fetch Broker Summary secara paralel
      const promises = smartPool.map(sym =>
        fetch(`https://api.goapi.io/stock/idx/${sym}/broker_summary?date=${targetDateStr}&investor=ALL`, { headers })
          .then(res => res.json())
          .then(res => ({ symbol: sym, data: res.data?.results || [] }))
          .catch(() => ({ symbol: sym, data: [] }))
      );
      
      const brokerResults = await Promise.all(promises);
      const passedStocks: Array<{symbol: string, netVal: number, netLot: number}> = [];

      // B. Filter Logika Akumulasi (Sama persis dengan ForeignAccumulationTable)
      brokerResults.forEach(res => {
        let buyVal = 0, sellVal = 0, buyLot = 0, sellLot = 0;
        
        res.data.forEach((i: GoApiBrokerItem) => {
          const code = (i.broker?.code || i.code || "-").toUpperCase();
          
          if (activeBrokersArr.length === 0) {
            // Jika kosong, hitung semua broker
            if (i.side === "BUY") { buyVal += i.value; buyLot += i.lot; }
            else { sellVal += i.value; sellLot += i.lot; }
          } else if (activeBrokersArr.includes(code)) {
            // Jika ada filter, hitung HANYA broker yang dipilih
            if (i.side === "BUY") { buyVal += i.value; buyLot += i.lot; }
            else { sellVal += i.value; sellLot += i.lot; }
          }
        });

        const netVal = buyVal - sellVal;
        const netLot = buyLot - sellLot;

        if (activeBrokersArr.length === 0) {
          // View global
          passedStocks.push({ symbol: res.symbol, netVal, netLot });
        } else if (netVal > 0) {
          // View terfilter: Hanya loloskan jika terjadi akumulasi bersih (Net Buy > 0)
          passedStocks.push({ symbol: res.symbol, netVal, netLot });
        }
      });

      if (passedStocks.length === 0) return [];

      // C. Tarik Harga Terkini/Historis untuk saham yang lolos
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
          netLot: ps.netLot,
          netVal: ps.netVal
        });
      }));

      return finalResults.sort((a, b) => b.netVal - a.netVal);
    },
    { dedupingInterval: 10000, refreshInterval: 15000 }
  );

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-3 font-sans bg-[#121212]">
      
      {/* --- HEADER FILTER --- */}
      <div className="flex flex-col gap-3 shrink-0 bg-[#121212] px-1 pt-1">
       

        {/* Sub-Filters Brokers */}
        <div className="flex items-center gap-5 pt-1 overflow-x-auto hide-scrollbar pb-1">
          {/* Asing (Merah) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-bold text-[#ef4444] uppercase tracking-widest">Asing:</span>
            <div className="flex gap-1.5">
              {FOREIGN_BROKERS.map(b => (
                <button key={`f-${b}`} onClick={() => toggleBroker(b, 'foreign')} className={`w-7 h-7 shrink-0 rounded-full text-[9px] font-black flex items-center justify-center transition-all duration-300 ${selForeign.includes(b) ? 'bg-[#ef4444] text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] border-transparent scale-105' : 'bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-500 hover:border-[#ef4444] hover:text-[#ef4444]'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-5 bg-[#2d2d2d] shrink-0"></div>
          
          {/* Lokal (Ungu) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-bold text-[#a855f7] uppercase tracking-widest">Lokal:</span>
            <div className="flex gap-1.5">
              {LOCAL_BROKERS.map(b => (
                <button key={`l-${b}`} onClick={() => toggleBroker(b, 'local')} className={`w-7 h-7 shrink-0 rounded-full text-[9px] font-black flex items-center justify-center transition-all duration-300 ${selLocal.includes(b) ? 'bg-[#a855f7] text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] border-transparent scale-105' : 'bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-500 hover:border-[#a855f7] hover:text-[#a855f7]'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-5 bg-[#2d2d2d] shrink-0"></div>
          
          {/* BUMN (Hijau) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[10px] font-bold text-[#10b981] uppercase tracking-widest">BUMN:</span>
            <div className="flex gap-1.5">
              {BUMN_BROKERS.map(b => (
                <button key={`b-${b}`} onClick={() => toggleBroker(b, 'bumn')} className={`w-7 h-7 shrink-0 rounded-full text-[9px] font-black flex items-center justify-center transition-all duration-300 ${selBumn.includes(b) ? 'bg-[#10b981] text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] border-transparent scale-105' : 'bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-500 hover:border-[#10b981] hover:text-[#10b981]'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- TABEL SCREENER --- */}
      <div className="flex-1 bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-lg mt-1 relative">
        
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[11px] font-bold text-neutral-500 items-center shrink-0">
          <div>Kode Emiten</div>
          <div>Last Price</div>
          <div className="text-right">Turnover (Value)</div>
          <div className="text-right">Total Volume</div>
          <div className="text-right text-[#10b981]">{activeBrokersArr.length === 0 ? "Global Net Lot" : "Net Lot Accumulation"}</div>
          <div className="text-right text-[#10b981]">{activeBrokersArr.length === 0 ? "Global Net Value" : "Net Value Accumulation"}</div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          
          {isScanning && (
             <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-[#3b82f6] bg-[#121212]/90 backdrop-blur-sm">
               <span className="animate-pulse text-[13px] font-bold tracking-wide">Memindai Jejak Smart Money...</span>
               <span className="text-neutral-500 text-[10px] mt-2">Menarik data akumulasi menggunakan Developer API</span>
             </div>
          )}
          
          {!isScanning && screenerData && screenerData.length === 0 && (
             <div className="flex justify-center items-center h-full text-neutral-500 text-[12px] font-medium">
               Tidak ada aktivitas akumulasi signifikan dari kombinasi broker yang Anda pilih.
             </div>
          )}

          {screenerData?.map((row: ScreenerRow, idx: number) => {
            const comp = getCompany(row.symbol);
            const isUp = row.changePct >= 0;
            const colorPrice = isUp ? "text-[#10b981]" : "text-[#ef4444]";
            const colorNet = row.netVal >= 0 ? "text-[#10b981]" : "text-[#ef4444]";

            return (
              <div 
                key={`${row.symbol}-${idx}`}
                onClick={() => setGlobalSymbol(row.symbol)}
                className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1.5fr] px-5 py-3.5 items-center text-[12px] tabular-nums hover:bg-[#1e1e1e] cursor-pointer border-b border-[#2d2d2d]/50 transition-colors group"
              >
                {/* Symbol & Logo */}
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comp?.logo || `https://s3.goapi.io/logo/${row.symbol}.jpg`} alt="" className="w-6 h-6 rounded-full bg-white p-0.5 shadow-sm" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
                  <span className="font-extrabold text-white group-hover:text-[#3b82f6] transition-colors tracking-wide text-[13px]">{row.symbol}</span>
                </div>
                
                {/* Price */}
                <div className="flex flex-col gap-0.5 font-bold">
                  <span className="text-white text-[13px]">{row.close.toLocaleString('id-ID')}</span>
                  <span className={`text-[10px] ${colorPrice}`}>{isUp?'+':''}{row.changePct.toFixed(2)}%</span>
                </div>

                {/* Turnover */}
                <div className="text-right text-[#f59e0b] font-bold tracking-wide">{formatShort(row.value)}</div>
                
                {/* Vol */}
                <div className="text-right text-neutral-300 font-medium">{formatShort(row.volume)}</div>
                
                {/* Net Lot */}
                <div className={`text-right font-medium ${row.netLot >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {row.netLot > 0 ? '+' : ''}{formatShort(row.netLot)}
                </div>
                
                {/* Net Smart Money Value */}
                <div className={`text-right font-black tracking-wide ${colorNet}`}>
                  {row.netVal > 0 ? '+' : ''}{formatShort(row.netVal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}