// src/components/watchlist/BrokerProfilerModal.tsx
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { 
  X, Search, Calendar, ChevronDown, BarChart2, Activity, Maximize2 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, ZAxis, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList 
} from 'recharts';

interface BrokerProfilerModalProps {
  symbol: string | null;
  onClose: () => void;
}

// --- INTERFACES ---
interface GoApiHistoryItem {
  date: string;
  close: number;
  volume: number;
}

interface GoApiBrokerItem {
  broker?: { code?: string; name?: string };
  code?: string;
  investor?: string;
  side?: string;
  value?: number;
  lot?: number;
}

interface BrokerStat {
  code: string;
  name: string;
  type: string;
  buyVal: number;
  sellVal: number;
  buyLot: number;
  sellLot: number;
  dailyNet: Record<string, number>;
  netVal: number;
  grossVal: number;
  avgPrice: number;
  net5D: number;
  mktShare: number;
}

interface IntelDataRow {
  broker: string;
  name: string;
  type: string;
  badge: string;
  badgeColor: string;
  mktShare: string;
  avg: string;
  net: number;
  netStr: string;
  netColor: string;
  pnl: string;
  pnlColor: string;
  net5dStr: string;
  net5dColor: string;
  buyPct: string;
  daily: number[];
}

interface QuadrantDataPoint {
  broker: string;
  avgPrice: number;
  netValue: number;
  size: number;
  color: string;
}

// --- HELPER DATES & FORMATTER ---
const getDefaultApiDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const formatValue = (num: number): string => {
  if (num === 0) return "0";
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "+";
  if (absNum >= 1e12) return sign + (absNum / 1e12).toFixed(1) + 'T';
  if (absNum >= 1e9) return sign + (absNum / 1e9).toFixed(1) + 'B';
  if (absNum >= 1e6) return sign + (absNum / 1e6).toFixed(1) + 'M';
  if (absNum >= 1e3) return sign + (absNum / 1e3).toFixed(1) + 'K';
  return sign + absNum.toFixed(0);
};

const formatNumberOnly = (num: number): string => {
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (absNum / 1e12).toFixed(1) + 'T';
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(1) + 'B';
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(1) + 'M';
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(1) + 'K';
  return absNum.toFixed(0);
};

// --- ENTERPRISE DATA FETCHER (REAL API) ---
const chunkArray = <T,>(arr: T[], size: number): T[][] => 
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

const fetchProfilerRealData = async (keyArgs: [string, string, string, string]) => {
  const [, symbol, startDate, endDate] = keyArgs;
  if (!symbol) return null;

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };

  try {
    const histRes = await fetch(`https://api.goapi.io/stock/idx/${symbol}/historical?from=${startDate}&to=${endDate}`, { headers }).then(res => res.json());
    const history: GoApiHistoryItem[] = histRes?.data?.results || [];
    if (history.length === 0) throw new Error("No historical data");

    const tradingDates = history.map(h => h.date);

    const dailyBrokersMap: Record<string, GoApiBrokerItem[]> = {};
    const dateChunks = chunkArray(tradingDates, 10); 

    for (const chunk of dateChunks) {
      const promises = chunk.map(date => 
        fetch(`https://api.goapi.io/stock/idx/${symbol}/broker_summary?date=${date}&investor=ALL`, { headers })
          .then(r => r.json())
          .then(res => ({ date, brokers: (res?.data?.results || []) as GoApiBrokerItem[] }))
          .catch(() => ({ date, brokers: [] as GoApiBrokerItem[] }))
      );
      const chunkResults = await Promise.all(promises);
      chunkResults.forEach(cr => {
        dailyBrokersMap[cr.date] = cr.brokers;
      });
    }

    return { history, dailyBrokersMap, tradingDates };
  } catch (error) {
    console.error("Profiler Fetch Error:", error);
    return null;
  }
};

type DateModeType = 'single' | '1w' | '1m' | '1y' | 'custom';

export default function BrokerProfilerModal({ symbol, onClose }: BrokerProfilerModalProps) {
  const [activeTab, setActiveTab] = useState('Inventory');

  // --- STATE FILTERS ---
  const [investorFilter, setInvestorFilter] = useState('All');
  const [isInvestorOpen, setIsInvestorOpen] = useState(false);
  const [marketFilter, setMarketFilter] = useState('Reg');
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  // --- STATE TANGGAL ---
  const [dateMode, setDateMode] = useState<DateModeType>('1m');
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultApiDate());
  
  const defaultStart = new Date();
  defaultStart.setMonth(defaultStart.getMonth() - 1);
  const [startDate, setStartDate] = useState<string>(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(getDefaultApiDate());
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = () => { setIsInvestorOpen(false); setIsMarketOpen(false); };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) { try { ref.current.showPicker(); } catch { ref.current.focus(); } }
  };

  const handleModeChange = (mode: DateModeType) => {
    setDateMode(mode);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    if (mode === '1w') {
      const start = new Date(); start.setDate(start.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]); setEndDate(endStr);
    } else if (mode === '1m') {
      const start = new Date(); start.setMonth(start.getMonth() - 1);
      setStartDate(start.toISOString().split('T')[0]); setEndDate(endStr);
    } else if (mode === '1y') {
      const start = new Date(); start.setFullYear(start.getFullYear() - 1);
      setStartDate(start.toISOString().split('T')[0]); setEndDate(endStr);
    }
  };

  // --- SWR FETCHER ---
  const fetchStart = dateMode === 'single' ? selectedDate : startDate;
  const fetchEnd = dateMode === 'single' ? selectedDate : endDate;

  const { data: rawData, isLoading } = useSWR(
    symbol ? ['profiler-data', symbol, fetchStart, fetchEnd] : null,
    fetchProfilerRealData,
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );

  // --- DATA AGGREGATION & COMPUTATION ---
  const aggregatedData = useMemo(() => {
    if (!rawData) return null;
    const { history, dailyBrokersMap, tradingDates } = rawData;
    
    const brokerStats: Record<string, BrokerStat> = {};
    let totalGrossMarket = 0;
    let netForeign = 0;

    tradingDates.forEach((date: string) => {
      const dailyBrokers = dailyBrokersMap[date] || [];
      dailyBrokers.forEach((b) => {
        if (investorFilter === 'Foreign' && b.investor !== 'FOREIGN') return;
        if (investorFilter === 'Domestic' && b.investor !== 'LOCAL') return;

        const bCode = b.broker?.code || b.code || '-';
        const bName = b.broker?.name || bCode;
        const bVal = b.value || 0;
        const bLot = b.lot || 0;

        if (!brokerStats[bCode]) {
          brokerStats[bCode] = { 
            code: bCode, name: bName, type: b.investor === 'FOREIGN' ? 'Asing' : 'Domestik', 
            buyVal: 0, sellVal: 0, buyLot: 0, sellLot: 0, dailyNet: {},
            netVal: 0, grossVal: 0, avgPrice: 0, net5D: 0, mktShare: 0 
          };
        }

        totalGrossMarket += bVal;

        if (b.side === 'BUY') {
          brokerStats[bCode].buyVal += bVal;
          brokerStats[bCode].buyLot += bLot;
          brokerStats[bCode].dailyNet[date] = (brokerStats[bCode].dailyNet[date] || 0) + bVal;
        } else if (b.side === 'SELL') {
          brokerStats[bCode].sellVal += bVal;
          brokerStats[bCode].sellLot += bLot;
          brokerStats[bCode].dailyNet[date] = (brokerStats[bCode].dailyNet[date] || 0) - bVal;
        }

        if (b.investor === 'FOREIGN') {
          netForeign += b.side === 'BUY' ? bVal : -bVal;
        }
      });
    });

    const brokerList: BrokerStat[] = Object.values(brokerStats).map(b => {
      const netVal = b.buyVal - b.sellVal;
      const grossVal = b.buyVal + b.sellVal;
      const totalLot = b.buyLot + b.sellLot;
      const avgPrice = totalLot > 0 ? grossVal / (totalLot * 100) : 0;
      
      const last5Dates = tradingDates.slice(-5);
      const net5D = last5Dates.reduce((sum: number, d: string) => sum + (b.dailyNet[d] || 0), 0);

      return { ...b, netVal, grossVal, avgPrice, net5D, mktShare: totalGrossMarket > 0 ? (grossVal / totalGrossMarket) * 100 : 0 };
    });

    const sortedByNet = [...brokerList].sort((a, b) => b.netVal - a.netVal);
    const topBuyers = sortedByNet.filter(b => b.netVal > 0).slice(0, 5);
    const topSellers = [...sortedByNet].sort((a, b) => a.netVal - b.netVal).filter(b => b.netVal < 0).slice(0, 5);
    
    const topBrokersGross = [...brokerList].sort((a, b) => b.grossVal - a.grossVal).slice(0, 30);
    const currentPrice = history[history.length - 1]?.close || 0;

    const chartLinesData = history.map(h => {
      const dayData: Record<string, string | number> = { date: h.date, price: h.close, volume: h.volume };
      [...topBuyers.slice(0,3), ...topSellers.slice(0,2)].forEach(tb => {
        let cum = 0;
        for (const d of tradingDates) {
          cum += (brokerStats[tb.code]?.dailyNet[d] || 0);
          if (d === h.date) break;
        }
        dayData[tb.code] = cum;
      });
      return dayData;
    });

    const quadrantData: QuadrantDataPoint[] = topBrokersGross.map(b => {
      let color = '#3b82f6'; 
      if (b.netVal > 0 && b.avgPrice > currentPrice) color = '#10b981'; 
      else if (b.netVal > 0 && b.avgPrice <= currentPrice) color = '#06b6d4'; 
      else if (b.netVal < 0 && b.avgPrice < currentPrice) color = '#f97316'; 
      else if (b.netVal < 0 && b.avgPrice >= currentPrice) color = '#ef4444'; 

      return {
        broker: b.code,
        avgPrice: Number(b.avgPrice.toFixed(0)),
        netValue: b.netVal,
        size: b.grossVal, 
        color
      };
    });

    const intelData: IntelDataRow[] = topBrokersGross.map(b => {
      const pnl = b.avgPrice > 0 ? ((currentPrice - b.avgPrice) / b.avgPrice) * 100 : 0;
      let badge = 'NEUTRAL';
      let badgeColor = 'bg-neutral-500/20 text-neutral-400';
      if (b.netVal > 0) { badge = 'AKUMULASI'; badgeColor = 'bg-[#10b981]/20 text-[#10b981]'; }
      if (b.netVal < 0) { badge = 'NET SELLER'; badgeColor = 'bg-[#ef4444]/20 text-[#ef4444]'; }
      if (b.netVal > 0 && pnl < -2) { badge = 'TERPERANGKAP'; badgeColor = 'bg-[#f59e0b]/20 text-[#f59e0b]'; }
      if (b.grossVal > totalGrossMarket * 0.1) { badge = 'LARGE PLAYER'; badgeColor = 'bg-[#3b82f6]/20 text-[#3b82f6]'; }

      const recent14Dates = tradingDates.slice(-14);
      const dailyPattern = recent14Dates.map((d: string) => b.dailyNet[d] || 0);

      return {
        broker: b.code, name: b.name, type: b.type,
        badge, badgeColor,
        mktShare: b.mktShare.toFixed(2) + '%',
        avg: b.avgPrice.toFixed(0),
        net: b.netVal, netStr: formatValue(b.netVal),
        netColor: b.netVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]',
        pnl: (pnl > 0 ? '+' : '') + pnl.toFixed(2) + '%',
        pnlColor: pnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]',
        net5dStr: formatValue(b.net5D), net5dColor: b.net5D >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]',
        buyPct: b.grossVal > 0 ? ((b.buyVal / b.grossVal) * 100).toFixed(1) + '%' : '0%',
        daily: dailyPattern
      };
    });

    return { topBuyers, topSellers, brokerList: sortedByNet, chartLinesData, quadrantData, intelData, netForeign, currentPrice };
  }, [rawData, investorFilter]);

  if (!symbol) return null;

  const DATE_MODES: DateModeType[] = ['single', '1w', '1m', '1y', 'custom'];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-date-input::-webkit-calendar-picker-indicator {
            opacity: 0; position: absolute; left: 0; top: 0; width: 100%; height: 100%; cursor: pointer;
        }
        .custom-date-input { position: relative; }
      `}} />

      <div className="bg-[#121212] border border-[#2d2d2d] w-[98vw] max-w-[1600px] h-[95vh] rounded-xl flex flex-col shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        
        {/* 1. HEADER */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#2d2d2d] bg-[#1e1e1e]/50 shrink-0">
          <div className="flex items-center gap-4 overflow-hidden">
            <h2 className="text-white font-black text-lg tracking-wide flex items-center gap-2 shrink-0">
              <BarChart2 className="text-[#06b6d4]" /> Stock Profiler <span className="text-[10px] bg-[#06b6d4]/20 text-[#06b6d4] px-2 py-0.5 rounded-full ml-1 uppercase">BETA</span>
            </h2>
            <div className="flex items-center gap-2 bg-[#10b981]/10 border border-[#10b981]/20 px-3 py-1 rounded-full shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>
              <span className="text-[#10b981] text-[11px] font-bold">Real-time Extractor</span>
            </div>
            <div className="text-neutral-500 text-[11px] ml-4 flex items-center gap-1.5 truncate">
              <Activity size={14} /> Analisis Mendalam untuk Saham <b>{symbol}</b>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-[#ef4444] rounded-lg transition-all shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* 2. TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 border-b border-[#2d2d2d] bg-[#121212] shrink-0 relative z-[50]">
          
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1.5 w-[200px] focus-within:border-[#06b6d4] transition-colors shrink-0">
              <Search size={14} className="text-neutral-500 mr-2" />
              <input type="text" value={symbol} readOnly className="bg-transparent text-white font-bold outline-none w-full text-[12px]" />
            </div>

            <div className="flex items-center gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#2d2d2d] overflow-x-auto hide-scrollbar shrink-0">
              {['Inventory', 'Quadrant', 'Broker Intel'].map((tab) => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  {tab === 'Inventory' && <Activity size={14} />}
                  {tab === 'Quadrant' && <Maximize2 size={14} />}
                  {tab === 'Broker Intel' && <BarChart2 size={14} />}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative">
            
            <div className="flex items-center gap-2 relative" onClick={(e) => e.stopPropagation()}>
               <span className="text-neutral-500 text-[10px] font-bold uppercase hidden xl:block">Investor</span>
               <div onClick={() => {setIsInvestorOpen(!isInvestorOpen); setIsMarketOpen(false);}} className="flex items-center bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#3b82f6] rounded-lg px-3 py-1.5 cursor-pointer text-[11px] font-bold text-white transition-colors">
                  {investorFilter} <ChevronDown size={14} className="ml-2 text-neutral-500" />
               </div>
               {isInvestorOpen && (
                 <div className="absolute top-full right-0 mt-1 w-[120px] bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg shadow-xl z-[1000] overflow-hidden">
                   {['All', 'Domestic', 'Foreign'].map(opt => (
                     <div key={opt} onClick={() => {setInvestorFilter(opt); setIsInvestorOpen(false);}} className={`px-4 py-2 text-[11px] font-bold cursor-pointer hover:bg-[#2d2d2d] ${investorFilter === opt ? 'text-[#06b6d4]' : 'text-white'}`}>{opt}</div>
                   ))}
                 </div>
               )}
            </div>

            <div className="flex items-center gap-2 relative" onClick={(e) => e.stopPropagation()}>
               <span className="text-neutral-500 text-[10px] font-bold uppercase hidden xl:block">Market</span>
               <div onClick={() => {setIsMarketOpen(!isMarketOpen); setIsInvestorOpen(false);}} className="flex items-center bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#3b82f6] rounded-lg px-3 py-1.5 cursor-pointer text-[11px] font-bold text-white transition-colors">
                  {marketFilter} <ChevronDown size={14} className="ml-2 text-neutral-500" />
               </div>
               {isMarketOpen && (
                 <div className="absolute top-full right-0 mt-1 w-[100px] bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg shadow-xl z-[1000] overflow-hidden">
                   {['Reg', 'All', 'Nego'].map(opt => (
                     <div key={opt} onClick={() => {setMarketFilter(opt); setIsMarketOpen(false);}} className={`px-4 py-2 text-[11px] font-bold cursor-pointer hover:bg-[#2d2d2d] ${marketFilter === opt ? 'text-[#06b6d4]' : 'text-white'}`}>{opt}</div>
                   ))}
                 </div>
               )}
            </div>
            
            <div className="flex items-center gap-2 ml-1 border-l border-[#2d2d2d] pl-3 relative">
              <span className="text-neutral-500 text-[10px] font-bold uppercase hidden xl:block">Periode</span>
              <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-[#2d2d2d] items-center mr-1">
                {DATE_MODES.map((mode) => (
                  <React.Fragment key={mode}>
                     <button onClick={() => handleModeChange(mode)} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${dateMode === mode ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>{mode}</button>
                     {mode !== 'custom' && <div className="w-px h-3 bg-[#3e3e3e] mx-0.5"></div>}
                  </React.Fragment>
                ))}
              </div>

              {dateMode === 'single' ? (
                <div onClick={() => handleOpenDatePicker(dateInputRef)} className="relative flex items-center gap-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1.5 hover:border-[#10b981] transition-all cursor-pointer group">
                  <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                  <input ref={dateInputRef} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase custom-date-input [color-scheme:dark] w-[95px] z-10"
                    max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} />
                </div>
              ) : (
                <div className={`flex items-center gap-1.5 bg-[#1e1e1e] border rounded-lg px-2 py-1.5 transition-colors z-10 ${dateMode === 'custom' ? 'border-[#3b82f6]' : 'border-[#2d2d2d]'}`}>
                  <div onClick={() => handleOpenDatePicker(startDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981]">
                    <Calendar size={12} className="text-[#10b981] group-hover:scale-110" />
                    <input ref={startDateInputRef} type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); if (dateMode !== 'custom') setDateMode('custom');}}
                      className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase custom-date-input [color-scheme:dark] w-[90px] relative z-20" max={endDate} onClick={(e) => e.stopPropagation()} />
                  </div>
                  <span className="text-neutral-500 text-[10px] font-bold">-</span>
                  <div onClick={() => handleOpenDatePicker(endDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981]">
                    <Calendar size={12} className="text-[#10b981] group-hover:scale-110" />
                    <input ref={endDateInputRef} type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); if (dateMode !== 'custom') setDateMode('custom');}}
                      className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase custom-date-input [color-scheme:dark] w-[90px] relative z-20" min={startDate} max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 3. MAIN CONTENT */}
        <div className="flex-1 min-h-0 flex bg-[#121212] relative z-[10]">
          
          {isLoading || !aggregatedData ? (
             <div className="w-full h-full flex flex-col items-center justify-center bg-[#121212] space-y-4">
               <div className="w-10 h-10 border-4 border-[#06b6d4] border-t-transparent rounded-full animate-spin"></div>
               <span className="text-[#06b6d4] font-bold text-xs animate-pulse">Mengekstrak Jutaan Baris Data Transaksi...</span>
             </div>
          ) : (
            <>
              {/* TAB 1: INVENTORY (Line Chart) */}
              {activeTab === 'Inventory' && (
                 <>
                   <div className="flex-1 flex flex-col border-r border-[#2d2d2d] relative overflow-hidden">
                     <div className="px-6 py-4 flex flex-wrap items-center gap-6 shrink-0 border-b border-[#2d2d2d]/50 bg-[#1e1e1e]/20">
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-[#10b981]">TOP BUYERS</span>
                         {aggregatedData.topBuyers.slice(0,3).map((b: BrokerStat, i: number) => (
                           <span key={b.code} className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${i===0?'bg-red-500':i===1?'bg-blue-500':'bg-pink-600'}`}>{b.code}</span>
                         ))}
                       </div>
                       <div className="w-px h-4 bg-[#2d2d2d]"></div>
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-[#ef4444]">TOP SELLERS</span>
                         {aggregatedData.topSellers.slice(0,2).map((b: BrokerStat, i: number) => (
                           <span key={b.code} className={`text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${i===0?'bg-purple-600':'bg-teal-500'}`}>{b.code}</span>
                         ))}
                       </div>
                     </div>

                     <div className="flex-1 px-4 min-h-0 pt-4">
                       <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={aggregatedData.chartLinesData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis yAxisId="left" stroke="#525252" fontSize={10} tickFormatter={(v) => formatNumberOnly(v)} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" stroke="#525252" fontSize={10} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
                            
                            <Tooltip 
                              itemStyle={{ color: '#ffffff' }}
                              contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', color: '#ffffff', fontSize: '11px' }} 
                              formatter={(value: number | string | readonly (string | number)[] | undefined, name: string | number | undefined) => {
                                const numValue = Array.isArray(value) ? Number(value[0]) : Number(value) || 0;
                                return [formatValue(numValue), String(name)];
                              }} 
                            />
                            
                            {aggregatedData.topBuyers[0] && <Line yAxisId="left" type="monotone" dataKey={aggregatedData.topBuyers[0].code} stroke="#ef4444" strokeWidth={2} dot={false} />}
                            {aggregatedData.topBuyers[1] && <Line yAxisId="left" type="monotone" dataKey={aggregatedData.topBuyers[1].code} stroke="#3b82f6" strokeWidth={2} dot={false} />}
                            {aggregatedData.topBuyers[2] && <Line yAxisId="left" type="monotone" dataKey={aggregatedData.topBuyers[2].code} stroke="#db2777" strokeWidth={2} dot={false} />}
                            {aggregatedData.topSellers[0] && <Line yAxisId="left" type="monotone" dataKey={aggregatedData.topSellers[0].code} stroke="#9333ea" strokeWidth={2} dot={false} />}
                            {aggregatedData.topSellers[1] && <Line yAxisId="left" type="monotone" dataKey={aggregatedData.topSellers[1].code} stroke="#14b8a6" strokeWidth={2} dot={false} />}
                            <Line yAxisId="right" type="monotone" dataKey="price" stroke="#ffffff" strokeWidth={2} dot={false} />
                          </LineChart>
                       </ResponsiveContainer>
                     </div>
                     <div className="h-[120px] px-4 pb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={aggregatedData.chartLinesData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                            <XAxis dataKey="date" stroke="#525252" fontSize={10} tickMargin={5} axisLine={false} tickLine={false} />
                            <YAxis hide />
                            <Tooltip 
                              cursor={{fill: '#1e1e1e'}} 
                              itemStyle={{ color: '#ffffff' }}
                              contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', color: '#ffffff', fontSize: '11px' }} 
                              formatter={(value: number | string | readonly (string | number)[] | undefined, name: string | number | undefined) => {
                                const numValue = Array.isArray(value) ? Number(value[0]) : Number(value) || 0;
                                return [formatNumberOnly(numValue), String(name)];
                              }} 
                            />
                            <Bar dataKey="volume" radius={[2, 2, 2, 2]} fill="#3b82f6" opacity={0.6} />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>

                   {/* SIDEBAR INVENTORY */}
                   <div className="w-[400px] flex flex-col bg-[#1e1e1e]/30 shrink-0">
                     <div className="flex items-center justify-between p-4 border-b border-[#2d2d2d]">
                       <h3 className="text-white font-bold text-[13px]">Broker Summary</h3>
                       <div className="flex bg-[#1e1e1e] rounded-full p-0.5 border border-[#2d2d2d]">
                         <button className="px-3 py-1 text-[9px] font-bold rounded-full bg-[#3b82f6] text-white">Net</button>
                         <button className="px-3 py-1 text-[9px] font-bold rounded-full text-neutral-500 hover:text-white transition-colors">Gross</button>
                       </div>
                     </div>
                     <div className="grid grid-cols-2 text-[10px] font-bold uppercase border-b border-[#2d2d2d] bg-[#121212]">
                        <div className="grid grid-cols-[30px_1fr_1fr_1fr] p-2 border-r border-[#2d2d2d]"><span className="text-[#10b981]">Buy</span><span className="text-neutral-500 text-right">Val</span><span className="text-neutral-500 text-right">Lot</span><span className="text-neutral-500 text-right">Avg</span></div>
                        <div className="grid grid-cols-[30px_1fr_1fr_1fr] p-2"><span className="text-[#ef4444]">Sell</span><span className="text-neutral-500 text-right">Val</span><span className="text-neutral-500 text-right">Lot</span><span className="text-neutral-500 text-right">Avg</span></div>
                     </div>
                     <div className="flex-1 overflow-y-auto hide-scrollbar text-[11px] font-medium font-mono">
                        {Array.from({ length: Math.max(aggregatedData.topBuyers.length, aggregatedData.topSellers.length) }).map((_, i) => {
                          const buyer = aggregatedData.topBuyers[i];
                          const seller = aggregatedData.topSellers[i];
                          return (
                            <div key={i} className="grid grid-cols-2 border-b border-[#2d2d2d]/50 hover:bg-[#1e1e1e] transition-colors">
                              <div className="grid grid-cols-[30px_1fr_1fr_1fr] p-2 border-r border-[#2d2d2d] items-center">
                                <span className="text-[#10b981] font-black">{buyer?.code || '-'}</span>
                                <span className="text-white text-right">{buyer ? formatNumberOnly(buyer.buyVal) : '-'}</span>
                                <span className="text-neutral-400 text-right">{buyer ? formatNumberOnly(buyer.buyLot) : '-'}</span>
                                <span className="text-neutral-500 text-right">{buyer ? buyer.avgPrice.toFixed(0) : '-'}</span>
                              </div>
                              <div className="grid grid-cols-[30px_1fr_1fr_1fr] p-2 items-center">
                                <span className="text-[#ef4444] font-black">{seller?.code || '-'}</span>
                                <span className="text-white text-right">{seller ? formatNumberOnly(seller.sellVal) : '-'}</span>
                                <span className="text-neutral-400 text-right">{seller ? formatNumberOnly(seller.sellLot) : '-'}</span>
                                <span className="text-neutral-500 text-right">{seller ? seller.avgPrice.toFixed(0) : '-'}</span>
                              </div>
                            </div>
                          );
                        })}
                     </div>
                     <div className="h-[120px] border-t border-[#2d2d2d] p-4 flex flex-col shrink-0 bg-[#121212]">
                       <div className="flex items-center justify-between mb-4">
                         <div><h4 className="text-white font-bold text-[12px] flex items-center gap-1.5"><BarChart2 size={14} className="text-[#3b82f6]" /> Foreign Flow Accumulation</h4></div>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="text-[10px] text-neutral-400 w-[60px]">Foreign Net</span>
                         <div className="flex-1 h-3 flex items-center bg-[#2d2d2d] rounded-sm overflow-hidden">
                            <div className={`h-full ${aggregatedData.netForeign >= 0 ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} style={{ width: '100%' }}></div>
                         </div>
                         <span className={`text-[11px] font-bold tabular-nums ${aggregatedData.netForeign >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{formatValue(aggregatedData.netForeign)}</span>
                       </div>
                     </div>
                   </div>
                 </>
              )}

              {/* TAB 2: QUADRANT (Scatter Chart) */}
              {activeTab === 'Quadrant' && (
                <div className="flex-1 w-full h-full p-6 relative flex flex-col bg-[#121212]">
                  <div className="flex items-center justify-between mb-4 absolute top-6 left-6 right-6 z-10 pointer-events-none">
                    <span className="text-[#10b981] font-black text-xs uppercase tracking-widest bg-[#10b981]/10 border border-[#10b981]/20 px-3 py-1 rounded">Smart Accum</span>
                    <span className="text-[#10b981] font-black text-xs uppercase tracking-widest bg-[#10b981]/10 border border-[#10b981]/20 px-3 py-1 rounded">Aggressive Buy</span>
                  </div>
                  <div className="flex items-center justify-between absolute bottom-12 left-6 right-6 z-10 pointer-events-none">
                    <span className="text-[#f97316] font-black text-xs uppercase tracking-widest bg-[#f97316]/10 border border-[#f97316]/20 px-3 py-1 rounded">Panic Selling</span>
                    <span className="text-[#ef4444] font-black text-xs uppercase tracking-widest bg-[#ef4444]/10 border border-[#ef4444]/20 px-3 py-1 rounded">Distribution</span>
                  </div>

                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" opacity={0.5} />
                        <XAxis type="number" dataKey="avgPrice" name="Avg Price" domain={['dataMin - 50', 'dataMax + 50']} stroke="#525252" fontSize={10} tickFormatter={(v)=>v.toLocaleString()} />
                        <YAxis type="number" dataKey="netValue" name="Net Value" domain={['auto', 'auto']} stroke="#525252" fontSize={10} tickFormatter={(v)=>formatNumberOnly(v)} />
                        <ZAxis type="number" dataKey="size" range={[200, 2000]} name="Gross Vol" />
                        
                        <Tooltip 
                          cursor={{ strokeDasharray: '3 3' }} 
                          itemStyle={{ color: '#ffffff' }}
                          contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', color: '#ffffff', fontSize:'12px', borderRadius:'8px' }} 
                          formatter={(value: number | string | readonly (string | number)[] | undefined, name: string | number | undefined) => {
                            const numValue = Array.isArray(value) ? Number(value[0]) : Number(value) || 0;
                            const strName = String(name);
                            if (strName === 'Net Value' || strName === 'Gross Vol') {
                              return [formatNumberOnly(numValue), strName];
                            }
                            return [numValue, strName];
                          }}
                        />
                        
                        <ReferenceLine x={aggregatedData.currentPrice} stroke="#525252" strokeDasharray="3 3" label={{ position: 'top', value: `Current Price: ${aggregatedData.currentPrice}`, fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                        <ReferenceLine y={0} stroke="#525252" strokeDasharray="3 3" />
                        
                        <Scatter data={aggregatedData.quadrantData}>
                          <LabelList dataKey="broker" position="center" fill="#ffffff" fontSize={11} fontWeight="bold" />
                          {aggregatedData.quadrantData.map((entry: QuadrantDataPoint, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.85} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TAB 3: BROKER INTEL (Table + Bar) */}
              {activeTab === 'Broker Intel' && (
                <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#121212]">
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_2.5fr] gap-3 px-6 py-4 bg-[#1e1e1e]/50 border-b border-[#2d2d2d] text-[10px] font-black text-neutral-400 tracking-wider uppercase shrink-0">
                    <div>Broker</div>
                    <div className="text-right">MKT Share ↓</div>
                    <div className="text-right">AVG</div>
                    <div className="text-right">NET</div>
                    <div className="text-right">P&L</div>
                    <div className="text-right">NET 5D</div>
                    <div className="text-right">BUY%</div>
                    <div>Pola Harian (14D)</div>
                  </div>
                  <div className="flex-1 overflow-y-auto hide-scrollbar">
                    {aggregatedData.intelData.map((row: IntelDataRow, i: number) => (
                      <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr_2.5fr] gap-3 px-6 py-4 border-b border-[#2d2d2d]/50 hover:bg-[#1e1e1e] transition-colors items-center">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-black text-[13px]">{row.broker}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${row.badgeColor}`}>{row.badge}</span>
                            <span className="bg-[#2563eb]/20 text-[#3b82f6] border border-[#2563eb]/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{row.type}</span>
                          </div>
                          <span className="text-neutral-500 text-[10px] font-medium">{row.name}</span>
                        </div>
                        <div className="text-right text-white font-bold text-[12px]">{row.mktShare}</div>
                        <div className="text-right text-white font-bold text-[12px] tabular-nums">{row.avg}</div>
                        <div className={`text-right font-black text-[12px] tabular-nums ${row.netColor}`}>{row.netStr}</div>
                        <div className={`text-right font-bold text-[12px] tabular-nums ${row.pnlColor}`}>{row.pnl}</div>
                        <div className={`text-right font-bold text-[12px] tabular-nums ${row.net5dColor}`}>{row.net5dStr}</div>
                        <div className="text-right text-white font-bold text-[12px] tabular-nums">{row.buyPct}</div>
                        
                        <div className="flex items-end gap-[3px] h-6 justify-start pl-4 border-l border-[#2d2d2d]">
                          {row.daily.map((val: number, idx: number) => {
                             const maxAbs = Math.max(...row.daily.map(Math.abs));
                             const heightPct = maxAbs > 0 ? (Math.abs(val) / maxAbs) * 100 : 0;
                             const finalHeight = Math.max(heightPct, 15); 

                             return (
                              <div key={idx} className="flex flex-col justify-end h-full w-[10px] group relative" title={formatValue(val)}>
                                 {val >= 0 
                                  ? <div className="w-full bg-[#10b981] rounded-sm mb-auto hover:opacity-80 transition-opacity" style={{ height: `${finalHeight}%` }}></div> 
                                  : <div className="w-full bg-[#ef4444] rounded-sm mt-auto hover:opacity-80 transition-opacity" style={{ height: `${finalHeight}%` }}></div>
                                 }
                              </div>
                             );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </>
          )}

        </div>

      </div>
    </div>
  );
}