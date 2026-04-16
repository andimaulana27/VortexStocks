// src/components/watchlist/WatchlistChart.tsx
"use client";

import React, { useState, useMemo, useRef } from 'react';
import useSWR from 'swr';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Crosshair, Calendar } from 'lucide-react';

interface WatchlistChartProps {
  activeSymbols: string[];
}

type ViewModeType = 'Performance' | 'Total Value';

interface HistoricalDataPoint {
  date: string;
  Total: number;
  [key: string]: string | number; 
}

const formatValue = (num: number): string => {
  if (!num) return "0";
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString("id-ID");
};

// Helper Tanggal Default
const getDefaultApiDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

// Mesin Fetcher Data Historis Dinamis (Sekarang menerima fromDate dan toDate spesifik)
const fetchHistoricalMulti = async (keyArgs: [string, string[], string, string]) => {
  const [, symbols, fromDate, toDate] = keyArgs;
  if (!symbols || symbols.length === 0) return [];

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };

  const promises = symbols.map(sym =>
    fetch(`https://api.goapi.io/stock/idx/${sym}/historical?from=${fromDate}&to=${toDate}`, { headers })
      .then(res => res.json())
      .then(json => ({ symbol: sym, data: json?.data?.results || [] }))
      .catch(() => ({ symbol: sym, data: [] }))
  );

  const results = await Promise.all(promises);

  const dateMap: Record<string, HistoricalDataPoint> = {};
  
  results.forEach(({ symbol, data }) => {
    data.forEach((item: { date: string; close?: number }) => {
      if (!dateMap[item.date]) {
        dateMap[item.date] = { date: item.date, Total: 0 };
      }
      dateMap[item.date][symbol] = item.close || 0;
      dateMap[item.date].Total += (item.close || 0); 
    });
  });

  return Object.values(dateMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const COLORS = [
  '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', 
  '#10b981', '#06b6d4', '#f97316', '#84cc16', '#14b8a6', 
  '#6366f1', '#d946ef', '#f43f5e', '#eab308', '#0ea5e9'
];

export default function WatchlistChart({ activeSymbols }: WatchlistChartProps) {
  const [viewMode, setViewMode] = useState<ViewModeType>('Total Value');

  // --- STATE MANAJEMEN TANGGAL (SMART MONEY STYLE) ---
  const [dateMode, setDateMode] = useState<'single' | '1w' | '1m' | '1y' | 'custom'>('1m');
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultApiDate());
  
  const defaultStart = new Date();
  defaultStart.setMonth(defaultStart.getMonth() - 1);
  const [startDate, setStartDate] = useState<string>(defaultStart.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(getDefaultApiDate());
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      try { ref.current.showPicker(); } catch { ref.current.focus(); }
    }
  };

  const handleModeChange = (mode: 'single' | '1w' | '1m' | '1y' | 'custom') => {
    setDateMode(mode);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    
    if (mode === '1w') {
      const start = new Date(); start.setDate(start.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (mode === '1m') {
      const start = new Date(); start.setMonth(start.getMonth() - 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (mode === '1y') {
      const start = new Date(); start.setFullYear(start.getFullYear() - 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    if (dateMode !== 'custom') setDateMode('custom');
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    if (dateMode !== 'custom') setDateMode('custom');
  };

  // Tentukan parameter fetching yang dikirim (Jika single, gunakan range hari yang sama)
  const fetchFrom = dateMode === 'single' ? selectedDate : startDate;
  const fetchTo = dateMode === 'single' ? selectedDate : endDate;

  // SWR DENGAN RANGE TANGGAL DINAMIS
  const { data: chartData, isLoading } = useSWR(
    activeSymbols.length > 0 ? ['watchlist-historical', activeSymbols, fetchFrom, fetchTo] : null,
    fetchHistoricalMulti,
    { dedupingInterval: 60000, revalidateOnFocus: false }
  );

  const metrics = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { totalValue: 0, gainLossVal: 0, gainLossPct: 0, maxDrawdown: 0, topGainer: '-' };
    }

    const firstDay = chartData[0];
    const lastDay = chartData[chartData.length - 1];

    const currentTotal = lastDay.Total || 0;
    const initialTotal = firstDay.Total || 0;
    
    const gainLossVal = currentTotal - initialTotal;
    const gainLossPct = initialTotal > 0 ? (gainLossVal / initialTotal) * 100 : 0;

    let maxT = 0;
    let maxDrawdown = 0;
    chartData.forEach(day => {
      if (day.Total > maxT) maxT = day.Total;
      const drawdown = maxT > 0 ? ((maxT - day.Total) / maxT) * 100 : 0;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    let topGainer = '-';
    let topVal = -Infinity;
    
    activeSymbols.forEach(sym => {
      const startVal = Number(firstDay[sym]) || 0;
      const endVal = Number(lastDay[sym]) || 0;
      if (startVal > 0) {
        const pct = ((endVal - startVal) / startVal) * 100;
        if (pct > topVal) {
          topVal = pct;
          topGainer = sym;
        }
      }
    });

    return { totalValue: currentTotal, gainLossVal, gainLossPct, maxDrawdown, topGainer: topVal !== -Infinity ? topGainer : '-' };
  }, [chartData, activeSymbols]);

  const displayData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    if (viewMode === 'Total Value') return chartData;

    const baseData = chartData[0];
    
    return chartData.map(day => {
      const perfDay: HistoricalDataPoint = { date: day.date, Total: 0 };
      
      Object.keys(day).forEach(key => {
        if (key === 'date') return;
        
        const currentVal = Number(day[key]) || 0;
        const baseVal = Number(baseData[key]) || 0;

        if (baseVal === 0) {
          perfDay[key] = 0;
        } else {
          perfDay[key] = ((currentVal - baseVal) / baseVal) * 100;
        }
      });
      return perfDay;
    });
  }, [chartData, viewMode]);

  if (activeSymbols.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 mb-4 shrink-0">
      
      {/* INJEKSI CSS UTK DATE PICKER KUSTOM */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-date-input::-webkit-calendar-picker-indicator {
            opacity: 0; position: absolute; left: 0; top: 0; width: 100%; height: 100%; cursor: pointer;
        }
        .custom-date-input { position: relative; }
      `}} />

      {/* KONTROL HEADER CHART */}
      <div className="flex justify-between items-center bg-transparent border-b border-[#2d2d2d] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1e1e1e] flex items-center justify-center rounded-lg border border-[#2d2d2d]">
            <Wallet size={20} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-white font-bold text-[14px]">Portfolio Analysis</h2>
            <p className="text-neutral-500 text-[10px] uppercase tracking-wider font-semibold">Holdings Performance</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          
          {/* --- ADVANCED DATE PICKER --- */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Lookback</span>
            
            <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-[#2d2d2d] items-center mr-1">
              <button onClick={() => handleModeChange('single')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === 'single' ? 'bg-[#2d2d2d] text-white' : 'text-neutral-500 hover:text-white'}`}>Single</button>
              <div className="w-px h-3 bg-[#3e3e3e] mx-1"></div>
              <button onClick={() => handleModeChange('1w')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === '1w' ? 'bg-[#10b981]/20 text-[#10b981]' : 'text-neutral-500 hover:text-white'}`}>1W</button>
              <button onClick={() => handleModeChange('1m')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === '1m' ? 'bg-[#3b82f6]/20 text-[#3b82f6]' : 'text-neutral-500 hover:text-white'}`}>1M</button>
              <button onClick={() => handleModeChange('1y')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === '1y' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'text-neutral-500 hover:text-white'}`}>1Y</button>
              <div className="w-px h-3 bg-[#3e3e3e] mx-1"></div>
              <button onClick={() => handleModeChange('custom')} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateMode === 'custom' ? 'bg-[#2d2d2d] text-white' : 'text-neutral-500 hover:text-white'}`}>Custom</button>
            </div>

            {dateMode === 'single' ? (
              <div onClick={() => handleOpenDatePicker(dateInputRef)} className="relative flex items-center gap-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1.5 hover:border-[#10b981] transition-all cursor-pointer group">
                <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                <input ref={dateInputRef} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase custom-date-input [color-scheme:dark] w-[95px]"
                  max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} />
              </div>
            ) : (
              <div className={`flex items-center gap-2 bg-[#1e1e1e] border rounded-lg px-2 py-1.5 transition-colors ${dateMode === 'custom' ? 'border-[#3b82f6]' : 'border-[#2d2d2d]'}`}>
                <div onClick={() => handleOpenDatePicker(startDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981]">
                  <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                  <input ref={startDateInputRef} type="date" value={startDate} onChange={handleStartDateChange}
                    className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase custom-date-input [color-scheme:dark] w-[95px]"
                    max={endDate} onClick={(e) => e.stopPropagation()} />
                </div>
                <span className="text-neutral-500 text-[10px] font-bold">-</span>
                <div onClick={() => handleOpenDatePicker(endDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981]">
                  <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                  <input ref={endDateInputRef} type="date" value={endDate} onChange={handleEndDateChange}
                    className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase custom-date-input [color-scheme:dark] w-[95px]"
                    min={startDate} max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} />
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-[#2d2d2d] mx-2"></div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">View</span>
            <div className="flex bg-[#1e1e1e] p-1 rounded-lg border border-[#2d2d2d]">
              {['Performance', 'Total Value'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as ViewModeType)}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    viewMode === mode ? 'bg-blue-600 text-white shadow-md' : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Total Value Index</span>
            <Wallet size={14} className="text-neutral-400" />
          </div>
          <span className="text-white font-black text-2xl tabular-nums">{formatValue(metrics.totalValue)}</span>
        </div>

        <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-4 flex flex-col justify-between relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start mb-2 relative z-10">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Gain/Loss</span>
            {metrics.gainLossVal >= 0 ? <TrendingUp size={14} className="text-[#10b981]" /> : <TrendingDown size={14} className="text-[#ef4444]" />}
          </div>
          <div className="flex flex-col relative z-10">
            <span className={`font-black text-2xl tabular-nums ${metrics.gainLossVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {metrics.gainLossVal > 0 ? '+' : ''}{formatValue(metrics.gainLossVal)}
            </span>
            <span className={`text-[11px] font-bold ${metrics.gainLossVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {metrics.gainLossPct > 0 ? '+' : ''}{metrics.gainLossPct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Max Drawdown</span>
            <TrendingDown size={14} className="text-neutral-400" />
          </div>
          <span className="text-[#ef4444] font-black text-2xl tabular-nums">-{metrics.maxDrawdown.toFixed(2)}%</span>
        </div>

        <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-4 flex flex-col justify-between shadow-sm">
           <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Top Gainer (%)</span>
            <Crosshair size={14} className="text-neutral-400" />
          </div>
          <span className="text-white font-black text-2xl">{metrics.topGainer}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2 px-1">
        <div className="flex items-center gap-1.5 bg-[#1e1e1e] px-2.5 py-1 rounded-md border border-[#2d2d2d]">
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"></div>
          <span className="text-[10px] font-bold text-white">Watchlist Index (EQ)</span>
        </div>
        
        {activeSymbols.map((sym, i) => (
          <div key={sym} className="flex items-center gap-1.5 bg-[#121212] px-2 py-0.5 rounded border border-[#2d2d2d]/50">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            ></div>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">{sym}</span>
          </div>
        ))}
      </div>

      {/* RECHARTS MAIN AREA */}
      <div className="bg-[#121212] rounded-xl h-[350px] relative mt-1">
        {isLoading ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#121212]/80 z-20 rounded-xl backdrop-blur-sm">
             <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
             <span className="text-blue-500 text-xs font-bold animate-pulse">Menarik History {activeSymbols.length} Saham...</span>
           </div>
        ) : !displayData || displayData.length === 0 ? (
           <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-xs font-medium">Tidak ada data historis.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#525252" 
                fontSize={10} 
                tickMargin={10}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()} ${d.toLocaleString('id-ID', { month: 'short' })}`;
                }}
              />
              
              <YAxis 
                orientation="right" 
                domain={['auto', 'auto']} 
                stroke="#525252" 
                fontSize={10} 
                tickFormatter={(val) => viewMode === 'Performance' ? `${val > 0 ? '+' : ''}${val.toFixed(1)}%` : formatValue(val)}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
              />
              
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', borderRadius: '8px', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                formatter={(
                  value: number | string | readonly (string | number)[] | undefined, 
                  name: string | number | undefined
                ) => {
                  const rawValue = Array.isArray(value) ? value[0] : value;
                  const numValue = Number(rawValue) || 0;
                  const strName = String(name);
                  const displayName = strName === 'Total' ? 'Watchlist Index (EQ)' : strName;

                  if (viewMode === 'Performance') {
                    return [`${numValue > 0 ? '+' : ''}${numValue.toFixed(2)}%`, displayName];
                  }
                  return [formatValue(numValue), displayName];
                }}
                labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              />
              
              {/* Garis Utama (Watchlist Index) */}
              <Line type="monotone" dataKey="Total" stroke="#ffffff" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#fff', stroke: '#121212', strokeWidth: 2 }} />
              
              {/* Garis Individual Saham */}
              {activeSymbols.map((sym, i) => (
                <Line key={sym} type="monotone" dataKey={sym} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}