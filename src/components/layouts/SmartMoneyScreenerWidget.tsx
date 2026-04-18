// src/components/layouts/SmartMoneyScreenerWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Calendar } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA GOAPI ---
interface GoApiTrendItem { symbol: string; }
interface GoApiHistoricalItem { date: string; open: number; close: number; volume: number; }
interface GoApiPriceItem { symbol: string; close: number; change: number; change_pct: number; volume: number; }
interface GoApiBrokerItem { broker?: { code: string; name: string; }; code?: string; side: string; lot: number; value: number; }
interface ScreenerRow { symbol: string; close: number; changePct: number; value: number; volume: number; netLot: number; netVal: number; }

export interface SmartMoneyScreenerWidgetProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

// UPDATE KEAMANAN: Fungsi Fetcher khusus melalui Proxy Internal
const proxyFetcher = async (endpoint: string) => {
  const res = await fetch(`/api/market?endpoint=${encodeURIComponent(endpoint)}`);
  if (!res.ok) throw new Error('Gagal mengambil data via proxy');
  return res.json();
};

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

const getDatesInRange = (start: string, end: string) => {
  const dateArray = [];
  const currentDate = new Date(start);
  const stopDate = new Date(end);
  while (currentDate <= stopDate) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      dateArray.push(currentDate.toISOString().split('T')[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
};

export default function SmartMoneyScreenerWidget({ 
  customDate, 
  dateMode = 'single', 
  startDate, 
  endDate 
}: SmartMoneyScreenerWidgetProps) {
  // DEFAULT AKTIF: 1 Asing (AK) dan 1 Lokal (YP)
  const [selForeign, setSelForeign] = useState<string[]>(["AK"]);
  const [selLocal, setSelLocal] = useState<string[]>(["YP"]);
  const [selBumn, setSelBumn] = useState<string[]>([]);

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

  const isRangeMode = dateMode === 'range' && !!startDate && !!endDate;

  // Format UI Tanggal
  const displayDate = useMemo(() => {
    if (isRangeMode) {
      const s = new Date(startDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      const e = new Date(endDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      return `${s} - ${e}`;
    }
    const tDate = customDate || getDefaultApiDate();
    return new Date(tDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [isRangeMode, customDate, startDate, endDate]);

  // 1. Fetch Smart Pool
  const { data: smartPool } = useSWR(
    `sm-screener-pool`,
    async () => {
      const [t, g, l] = await Promise.all([
        proxyFetcher('stock/idx/trending'),
        proxyFetcher('stock/idx/top_gainer'),
        proxyFetcher('stock/idx/top_loser')
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
    smartPool ? `sm-screener-accum-${activeBrokersKey}-${dateMode}-${customDate}-${startDate}-${endDate}` : null,
    async () => {
      if (!smartPool) return [];
      
      const targetDateStr = isRangeMode ? endDate! : (customDate || getDefaultApiDate());
      const isLatestMarket = targetDateStr === getDefaultApiDate() || targetDateStr === new Date().toISOString().split('T')[0];

      let passedStocks: Array<{symbol: string, netVal: number, netLot: number}> = [];

      if (!isRangeMode) {
        const promises = smartPool.map(sym =>
          proxyFetcher(`stock/idx/${sym}/broker_summary?date=${targetDateStr}&investor=ALL`)
            .then(res => ({ symbol: sym, data: res.data?.results || [] }))
            .catch(() => ({ symbol: sym, data: [] }))
        );
        
        const brokerResults = await Promise.all(promises);
        
        brokerResults.forEach(res => {
          let buyVal = 0, sellVal = 0, buyLot = 0, sellLot = 0;
          res.data.forEach((i: GoApiBrokerItem) => {
            const code = (i.broker?.code || i.code || "-").toUpperCase();
            if (activeBrokersArr.length === 0 || activeBrokersArr.includes(code)) {
              if (i.side === "BUY") { buyVal += i.value; buyLot += i.lot; }
              else { sellVal += i.value; sellLot += i.lot; }
            }
          });

          const netVal = buyVal - sellVal;
          const netLot = buyLot - sellLot;
          if (activeBrokersArr.length === 0 || netVal > 0) passedStocks.push({ symbol: res.symbol, netVal, netLot });
        });
      } else {
        const dates = getDatesInRange(startDate!, endDate!);
        const brokerPromises = smartPool.map(async (sym) => {
          const datePromises = dates.map(d => 
            proxyFetcher(`stock/idx/${sym}/broker_summary?date=${d}&investor=ALL`)
              .catch(() => ({ data: { results: [] } }))
          );
          
          const dateResults = await Promise.all(datePromises);
          let buyVal = 0, sellVal = 0, buyLot = 0, sellLot = 0;
          
          dateResults.forEach(res => {
            if (!res?.data?.results) return;
            res.data.results.forEach((i: GoApiBrokerItem) => {
              const code = (i.broker?.code || i.code || "-").toUpperCase();
              if (activeBrokersArr.length === 0 || activeBrokersArr.includes(code)) {
                if (i.side === "BUY") { buyVal += i.value; buyLot += i.lot; }
                else { sellVal += i.value; sellLot += i.lot; }
              }
            });
          });

          const netVal = buyVal - sellVal;
          const netLot = buyLot - sellLot;
          if (activeBrokersArr.length === 0 || netVal > 0) return { symbol: sym, netVal, netLot };
          return null;
        });

        const bResults = await Promise.all(brokerPromises);
        passedStocks = bResults.filter(s => s !== null) as Array<{symbol: string, netVal: number, netLot: number}>;
      }

      if (passedStocks.length === 0) return [];

      const passedSymbols = passedStocks.map(s => s.symbol).join(',');
      let livePricesData: GoApiPriceItem[] = [];

      if (isLatestMarket && passedSymbols) {
        try {
          const liveJson = await proxyFetcher(`stock/idx/prices?symbols=${passedSymbols}`);
          livePricesData = liveJson?.data?.results || [];
        } catch(e) {
          console.error("Gagal menarik live prices", e);
        }
      }

      const finalResults: ScreenerRow[] = [];
      const targetDate = new Date(targetDateStr);
      const pastDate = new Date(isRangeMode ? startDate! : targetDateStr);
      pastDate.setDate(pastDate.getDate() - 5); 
      const toStr = targetDate.toISOString().split('T')[0];
      const fromStr = pastDate.toISOString().split('T')[0];

      await Promise.all(passedStocks.map(async (ps) => {
        let close = 0, changePct = 0, volume = 0, value = 0;

        try {
          const histJson = await proxyFetcher(`stock/idx/${ps.symbol}/historical?from=${fromStr}&to=${toStr}`);
          const histData: GoApiHistoricalItem[] = histJson?.data?.results || [];
          
          if (histData.length > 0) {
            histData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            if (isRangeMode) {
              const rangeData = histData.filter(d => d.date >= startDate! && d.date <= endDate!);
              const beforeRangeData = histData.filter(d => d.date < startDate!);
              
              if (rangeData.length > 0) {
                close = rangeData[0].close; 
                volume = rangeData.reduce((acc, curr) => acc + curr.volume, 0); 
                value = volume * close; 
                const prevClose = beforeRangeData.length > 0 ? beforeRangeData[0].close : rangeData[rangeData.length - 1].open; 
                changePct = prevClose ? ((close - prevClose) / prevClose) * 100 : 0;
              }
            } else {
              const exactDay = histData[0];
              const prevDay = histData[1];
              close = exactDay.close;
              volume = exactDay.volume;
              value = exactDay.volume * exactDay.close;
              changePct = prevDay ? ((close - prevDay.close) / prevDay.close) * 100 : 0;
            }
          }

          if (isLatestMarket) {
             const live = livePricesData.find(p => p.symbol === ps.symbol);
             if (live) {
                close = live.close || close;
                if (!isRangeMode) {
                  changePct = live.change_pct || changePct;
                  volume = live.volume || volume;
                  value = volume * close;
                }
             }
          }

        } catch(e) {
          console.error("Gagal menarik historical", e);
        }

        finalResults.push({ symbol: ps.symbol, close, changePct, volume, value, netLot: ps.netLot, netVal: ps.netVal });
      }));

      return finalResults.sort((a, b) => b.netVal - a.netVal);
    },
    { dedupingInterval: 10000, refreshInterval: 15000 }
  );

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-3 font-sans bg-[#121212]">
      
      {/* --- HEADER FILTER --- */}
      <div className="flex flex-col gap-2 shrink-0 bg-[#121212] px-1 pt-1">
       
        {/* Info & Kalender */}
        <div className="flex justify-between items-center w-full px-1">
           <span className="text-white text-[12px] font-bold uppercase">Multi-Broker Accumulation</span>
           <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1 shadow-sm">
             <Calendar size={12} className="text-[#10b981]" />
             <span className="text-white text-[10px] font-bold tracking-wider uppercase">{displayDate}</span>
           </div>
        </div>

        {/* Sub-Filters Brokers */}
        <div className="flex items-center gap-5 pt-1 overflow-x-auto hide-scrollbar pb-1">
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
          <div className="text-right">Est. Turnover (Value)</div>
          <div className="text-right">Last Volume</div>
          <div className="text-right text-[#10b981]">{activeBrokersArr.length === 0 ? "Global Net Lot" : "Net Lot Accumulation"}</div>
          <div className="text-right text-[#10b981]">{activeBrokersArr.length === 0 ? "Global Net Value" : "Net Value Accumulation"}</div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          
          {isScanning && (
             <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-[#3b82f6] bg-[#121212]/90 backdrop-blur-sm">
               <span className="animate-pulse text-[13px] font-bold tracking-wide">Memindai Jejak Smart Money...</span>
               <span className="text-neutral-500 text-[10px] mt-2">Menarik data akumulasi untuk {displayDate}</span>
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
                <div className={`text-right font-medium ${row.netLot >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {row.netLot > 0 ? '+' : ''}{formatShort(row.netLot)}
                </div>
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