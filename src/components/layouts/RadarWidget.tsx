"use client";

import React, { useState, useMemo, useEffect, useRef, memo } from 'react';
import useSWR from 'swr';
import { Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';
import { createChart, ColorType, LineStyle, IChartApi, ISeriesApi, LineSeries } from 'lightweight-charts';

interface RadarWidgetProps { customDate?: string; dateMode?: 'single' | 'range'; startDate?: string; endDate?: string; }
interface GoApiRadarItem { symbol: string; close: number; change: number; percent?: number; change_pct?: number; company?: { name: string; logo: string }; }
interface GoApiHistItem { date: string; close: number; }

const getPastDate = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().split('T')[0]; };
const fetchHistorical = async (url: string) => { const res = await fetch(url); return res.json(); };
type FetchActiveRadarKey = [string, string | undefined, string | undefined, string | undefined, string | undefined];

const fetchActiveRadar = async (keyArgs: FetchActiveRadarKey) => {
  const [, dateMode, customDate, startDate, endDate] = keyArgs;
  const params = new URLSearchParams();
  if (dateMode === 'single' && customDate) { params.append('date', customDate); } else if (dateMode === 'range' && startDate && endDate) { params.append('from', startDate); params.append('to', endDate); }
  const qs = params.toString() ? `&${params.toString()}` : '';
  
  const [resT, resG, resL] = await Promise.all([
    fetch(`/api/market?endpoint=stock/idx/trending${qs}`), fetch(`/api/market?endpoint=stock/idx/top_gainer${qs}`), fetch(`/api/market?endpoint=stock/idx/top_loser${qs}`)
  ]);
  
  const [t, g, l] = await Promise.all([resT.json(), resG.json(), resL.json()]);
  const combined: GoApiRadarItem[] = [ ...(t.data?.results || []), ...(g.data?.results || []), ...(l.data?.results || []) ];
  return Array.from(new Map(combined.map(item => [item.symbol, item])).values());
};

const RealSparkline = memo(({ symbol, isUp, targetDate }: { symbol: string, isUp: boolean, targetDate: string }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const from = useMemo(() => { const d = new Date(targetDate); d.setDate(d.getDate() - 14); return d.toISOString().split('T')[0]; }, [targetDate]);
  const to = targetDate;
  
  // SMART POLLING: Matikan refresh sparkline jika historis/weekend
  const isLiveMarket = useMemo(() => {
     const day = new Date().getDay();
     if (day === 0 || day === 6) return false;
     return targetDate === new Date().toISOString().split('T')[0];
  }, [targetDate]);

  const { data } = useSWR(
    `/api/market?endpoint=stock/idx/${symbol}/historical&from=${from}&to=${to}`,
    fetchHistorical,
    { dedupingInterval: 300000, refreshInterval: isLiveMarket ? 300000 : 0 } 
  );

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      width: 60, height: 30, layout: { background: { type: ColorType.Solid, color: 'transparent' }, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } }, timeScale: { visible: false }, rightPriceScale: { visible: false }, leftPriceScale: { visible: false }, crosshair: { mode: 0, horzLine: { visible: false }, vertLine: { visible: false } }, handleScroll: false, handleScale: false,
    });
    chartRef.current = chart;
    const series = chart.addSeries(LineSeries, { color: isUp ? '#10b981' : '#ef4444', lineWidth: 2, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false });
    seriesRef.current = series;
    return () => { chart.remove(); };
  }, [isUp]);

  useEffect(() => {
    if (!data?.data?.results || !seriesRef.current || !chartRef.current) return;
    const results: GoApiHistItem[] = [...data.data.results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (results.length === 0) return;
    const chartData = results.map(d => ({ time: d.date, value: d.close }));
    seriesRef.current.setData(chartData); chartRef.current.timeScale().fitContent();
    const basePrice = chartData[0].value;
    seriesRef.current.createPriceLine({ price: basePrice, color: '#52525b', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '' });
  }, [data]);

  return (
    <div className="relative w-[60px] h-[30px] flex items-center justify-center">
      {!data && <div className="absolute w-2 h-2 bg-neutral-600 rounded-full animate-pulse"></div>}
      <div ref={chartContainerRef} className="w-[60px] h-[30px]" />
    </div>
  );
});
RealSparkline.displayName = "RealSparkline";

export default function RadarWidget({ customDate, dateMode, startDate, endDate }: RadarWidgetProps) {
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "BUMI";
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);
  const allCompanies = useCompanyStore(state => state.companies);
  const getCompany = useCompanyStore(state => state.getCompany);
  const [searchQ, setSearchQ] = useState("");
  
  const targetDate = useMemo(() => {
    if (dateMode === 'single' && customDate) return customDate;
    if (dateMode === 'range' && endDate) return endDate;
    return getPastDate(0);
  }, [dateMode, customDate, endDate]);

  // SMART POLLING LOGIC
  const isLiveMarket = useMemo(() => {
    if (dateMode === 'range') return false;
    const now = new Date();
    if (now.getDay() === 0 || now.getDay() === 6) return false;
    const todayStr = now.toISOString().split('T')[0];
    const target = customDate || todayStr;
    return target === todayStr;
  }, [dateMode, customDate]);

  const { data: activeStocks } = useSWR(
    ['radar-active-market', dateMode, customDate, startDate, endDate], 
    fetchActiveRadar, 
    { refreshInterval: isLiveMarket ? 15000 : 0 } // MATIKAN POLLING JIKA HISTORIS
  );

  const searchSymbols = useMemo(() => {
    if (!searchQ) return "";
    return Object.values(allCompanies)
      .filter(c => c.symbol.includes(searchQ.toUpperCase()) || c.name.toUpperCase().includes(searchQ.toUpperCase()))
      .slice(0, 50).map(c => c.symbol).join(",");
  }, [searchQ, allCompanies]);

  const { data: searchPrices } = useSWR(
    searchSymbols ? ['prices', searchSymbols, dateMode, customDate, startDate, endDate] : null, 
    async (args) => {
      const [, symbols, dMode, cDate, sDate, eDate] = args;
      const params = new URLSearchParams(); params.append('symbols', symbols as string);
      if (dMode === 'single' && cDate) { params.append('date', cDate as string); } else if (dMode === 'range' && sDate && eDate) { params.append('from', sDate as string); params.append('to', eDate as string); }
      const res = await fetch(`/api/market?endpoint=stock/idx/prices&${params.toString()}`);
      const json = await res.json();
      return json.data?.results || [];
    }, 
    { refreshInterval: isLiveMarket ? 5000 : 0 } // MATIKAN POLLING JIKA HISTORIS
  );

  const displayList = useMemo(() => {
    let list: GoApiRadarItem[] = [];
    if (searchQ) {
      list = (searchPrices || []).map((p: GoApiRadarItem) => ({ ...p, percent: p.change_pct, company: getCompany(p.symbol) }));
    } else {
      list = (activeStocks || []).map((item: GoApiRadarItem) => ({ ...item, company: getCompany(item.symbol) || item.company }));
    }
    return list;
  }, [searchQ, searchPrices, activeStocks, getCompany]);

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col h-full overflow-hidden shadow-lg">
      <div className="p-2 border-b border-[#2d2d2d] bg-[#18181b] flex items-center justify-between shrink-0">
        <span className="font-bold text-white text-[11px] tracking-wide">{searchQ ? "All Market Result" : "Radar Market"}</span>
        <div className="flex items-center bg-[#2d2d2d]/50 px-2 py-1 rounded border border-transparent focus-within:border-[#10b981] transition-colors">
          <Search size={10} className="text-neutral-500 mr-1"/>
          <input type="text" placeholder="Search All..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="bg-transparent outline-none w-16 focus:w-24 transition-all duration-300 text-[10px] text-white placeholder-neutral-600 uppercase" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto hide-scrollbar p-1">
        {displayList.length === 0 && searchQ && <div className="flex justify-center items-center h-full text-neutral-500 text-[10px]">Saham tidak ditemukan.</div>}
        {displayList.map((item, i) => {
          const isUp = item.change >= 0; const colorClass = isUp ? "text-[#10b981]" : "text-[#ef4444]"; const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight; const pct = item.percent ?? item.change_pct ?? 0;
          return (
            <div key={`${item.symbol}-${i}`} onClick={() => setGlobalSymbol(item.symbol)} className={`flex items-center justify-between px-2 py-2.5 hover:bg-[#1e1e1e] cursor-pointer rounded mb-0.5 border-l-2 transition-all group ${globalSymbol === item.symbol ? 'border-[#10b981] bg-[#1e1e1e]' : 'border-transparent'}`}>
              <div className="flex items-center gap-2.5 w-[130px] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.company?.logo || `https://s3.goapi.io/logo/${item.symbol}.jpg`} alt="" className="w-7 h-7 rounded-full bg-white object-contain shrink-0" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
                <div className="flex flex-col truncate">
                  <span className="font-extrabold text-white text-[13px] leading-tight group-hover:text-[#10b981] transition-colors">{item.symbol}</span>
                  <span className="text-neutral-500 text-[10px] truncate leading-tight mt-[1px]" title={item.company?.name}>{item.company?.name || `PT ${item.symbol} Tbk.`}</span>
                </div>
              </div>
              <div className="flex items-center justify-center shrink-0 pr-2">
                <RealSparkline symbol={item.symbol} isUp={isUp} targetDate={targetDate} />
              </div>
              <div className="flex flex-col items-end shrink-0 tabular-nums">
                <span className="text-white font-bold text-[13px] leading-tight">{item.close.toLocaleString('id-ID')}</span>
                <div className={`flex items-center gap-0.5 text-[10px] font-bold leading-tight mt-[2px] ${colorClass}`}>
                  <TrendIcon size={11} strokeWidth={2.5} className="shrink-0" /><span>{Math.abs(item.change)}</span><span>({isUp ? '+' : ''}{pct.toFixed(2)}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}