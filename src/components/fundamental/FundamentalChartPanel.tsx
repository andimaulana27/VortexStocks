"use client";

import React, { useEffect, useRef, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Info, Activity } from 'lucide-react';

// --- DEFINISI TIPE ---
interface Shareholder { name: string; percentage: string; }
interface Subsidiary { name: string; total_asset: string; }
interface HistData { date: string; close: number; open: number; high: number; low: number; volume: number; }
interface BrokerData { code?: string; broker?: { code: string }; side: string; value: number; investor: string; }

interface SubAssetData { name: string; value: number; }
interface TooltipParams { value: number; name?: string; seriesName?: string; }

interface EChartsInstance {
  setOption: (option: Record<string, unknown>) => void;
  resize: () => void;
  dispose: () => void;
}
interface CustomWindow extends Window { echarts?: { init: (dom: HTMLDivElement) => EChartsInstance } }

// --- HELPER FORMATTING ---
const formatShortNum = (num?: number) => {
  if (!num) return "-";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  return num.toLocaleString('id-ID');
};

const getEffectiveDate = (daysAgo: number = 0) => {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); return d.toISOString().split('T')[0];
};

const getEffectiveTradingDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const fetcher = (url: string) => fetch(url, { headers: { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' } }).then(res => res.json());

// --- PALET WARNA GLOBAL ---
const PREMIUM_PALETTE = ['#a855f7', '#ec4899', '#f97316', '#10b981', '#f59e0b', '#14b8a6', '#e11d48'];

// --- KOMPONEN ECHART GENERIC ---
const BaseChart = ({ option, height = "220px" }: { option: Record<string, unknown> | null, height?: string }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const instance = useRef<EChartsInstance | null>(null);

  useEffect(() => {
    const customWindow = window as unknown as CustomWindow;
    if (!customWindow.echarts) {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js";
      script.async = true;
      document.head.appendChild(script);
      return;
    }
  }, []);

  useEffect(() => {
    const customWindow = window as unknown as CustomWindow;
    if (!chartRef.current || !customWindow.echarts || !option) return;

    if (!instance.current) instance.current = customWindow.echarts.init(chartRef.current);
    instance.current.setOption(option);

    const handleResize = () => instance.current?.resize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      instance.current?.dispose();
      instance.current = null;
    };
  }, [option]);

  return <div ref={chartRef} style={{ width: '100%', height }} />;
};

export default function FundamentalChartPanel({ symbol }: { symbol: string }) {
  const TABS = ["Overview", "Smart Money", "Historical"];
  const [activeTab, setActiveTab] = useState(TABS[0]);

  // 1. DATA FETCHING
  const { data: priceRes } = useSWR(`https://api.goapi.io/stock/idx/prices?symbols=${symbol}`, fetcher, { refreshInterval: 10000 });
  const { data: profileRes, isLoading: loadProfile } = useSWR(`https://api.goapi.io/stock/idx/${symbol}/profile`, fetcher, { dedupingInterval: 60000 });
  
  const fromDate = getEffectiveDate(90); // 3 Bulan terakhir
  const toDate = getEffectiveDate(0);
  const { data: histRes } = useSWR(`https://api.goapi.io/stock/idx/${symbol}/historical?from=${fromDate}&to=${toDate}`, fetcher, { dedupingInterval: 60000 });

  const tradingDate = getEffectiveTradingDate();
  const { data: brokerRes } = useSWR(`https://api.goapi.io/stock/idx/${symbol}/broker_summary?date=${tradingDate}&investor=ALL`, fetcher, { refreshInterval: 60000 });

  const priceData = priceRes?.data?.results?.[0];
  const profile = profileRes?.data;
  
  const histData: HistData[] = useMemo(() => {
    if (!histRes?.data?.results) return [];
    return [...histRes.data.results].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [histRes]);

  // SMART MONEY CALCULATION (Bandarmologi Logic)
  const smartMoney = useMemo(() => {
    // FIX: Menyamakan struktur default return agar TypeScript tidak menganggap variabel topBuyerVal/topSellerVal sebagai undefined
    if (!brokerRes?.data?.results) return { 
        status: "NEUTRAL", 
        statusColor: "text-neutral-500", 
        topBuyer: "-", 
        topBuyerVal: 0,
        topSeller: "-", 
        topSellerVal: 0,
        brokers: [] as [string, number][] 
    };
    
    const bMap: Record<string, number> = {};
    brokerRes.data.results.forEach((i: BrokerData) => {
      const code = i.broker?.code || i.code || "-";
      const val = i.side === "BUY" ? i.value : -i.value;
      bMap[code] = (bMap[code] || 0) + val;
    });
    
    const sorted = Object.entries(bMap).sort((a, b) => b[1] - a[1]);
    
    // Logika Akumulasi & Distribusi (Top 3 Buyers vs Top 3 Sellers)
    const top3Buy = sorted.slice(0, 3).reduce((acc, curr) => acc + (curr[1] > 0 ? curr[1] : 0), 0);
    const top3Sell = sorted.slice(-3).reduce((acc, curr) => acc + Math.abs(curr[1] < 0 ? curr[1] : 0), 0);
    
    let status = "NEUTRAL";
    let statusColor = "text-neutral-400";
    if (top3Buy > top3Sell * 1.2) { status = "BIG ACCUM"; statusColor = "text-[#10b981]"; }
    else if (top3Buy > top3Sell) { status = "NORMAL ACCUM"; statusColor = "text-[#10b981]"; }
    else if (top3Sell > top3Buy * 1.2) { status = "BIG DISTRIB"; statusColor = "text-[#ef4444]"; }
    else if (top3Sell > top3Buy) { status = "NORMAL DISTRIB"; statusColor = "text-[#ef4444]"; }

    return {
      status,
      statusColor,
      topBuyer: sorted.length > 0 && sorted[0][1] > 0 ? sorted[0][0] : "-",
      topBuyerVal: sorted.length > 0 && sorted[0][1] > 0 ? sorted[0][1] : 0,
      topSeller: sorted.length > 0 && sorted[sorted.length - 1][1] < 0 ? sorted[sorted.length - 1][0] : "-",
      topSellerVal: sorted.length > 0 && sorted[sorted.length - 1][1] < 0 ? sorted[sorted.length - 1][1] : 0,
      brokers: sorted
    };
  }, [brokerRes]);

  // 2. ECHARTS OPTIONS CALCULATION (Untuk Tab Overview)
  const ownershipOption = useMemo(() => {
    if (!profile?.shareholders) return null;
    let totalInsider = 0;
    const data = profile.shareholders.map((sh: Shareholder) => {
       const pct = parseFloat(sh.percentage);
       totalInsider += pct;
       return { name: sh.name, value: pct }; 
    });
    if (totalInsider < 100) data.push({ name: 'Public / Free Float', value: parseFloat((100 - totalInsider).toFixed(2)) });

    return {
      tooltip: { trigger: 'item', backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', textStyle: { color: '#fff', fontSize: 10 } },
      legend: { type: 'scroll', orient: 'vertical', right: '0%', top: 'center', textStyle: { color: '#a3a3a3', fontSize: 9, width: 140, overflow: 'break' }, itemWidth: 10, itemHeight: 10, icon: 'circle' },
      series: [{ type: 'pie', radius: ['55%', '80%'], center: ['22%', '50%'], avoidLabelOverlap: false, itemStyle: { borderRadius: 2, borderColor: '#121212', borderWidth: 3 }, label: { show: false }, color: PREMIUM_PALETTE, data: data }]
    };
  }, [profile]);

  const subsidiaryOption = useMemo(() => {
    if (!profile?.subsidiary_companies || profile.subsidiary_companies.length === 0) return null;
    const data: SubAssetData[] = profile.subsidiary_companies.slice(0, 5).map((sub: Subsidiary) => ({
      name: sub.name.substring(0, 15), value: Number(sub.total_asset.replace(/\./g, ''))
    })).sort((a: SubAssetData, b: SubAssetData) => a.value - b.value);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', textStyle: { color: '#fff', fontSize: 10 } },
      grid: { top: 10, bottom: 20, left: 80, right: 30 },
      xAxis: { type: 'value', splitLine: { lineStyle: { color: '#2d2d2d', type: 'dashed' } }, axisLabel: { show: false } },
      yAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { color: '#a3a3a3', fontSize: 9, width: 70, overflow: 'truncate' }, axisLine: { lineStyle: { color: '#2d2d2d' } } },
      series: [{ type: 'bar', data: data.map(d => d.value), colorBy: 'data', color: PREMIUM_PALETTE, itemStyle: { borderRadius: [0, 2, 2, 0] }, barWidth: '50%', label: { show: true, position: 'right', color: '#fff', fontSize: 9, formatter: (p: TooltipParams) => formatShortNum(p.value) } }]
    };
  }, [profile]);

  const performanceOption = useMemo(() => {
    if (histData.length === 0) return null;
    const dates = histData.map(d => d.date.substring(5));
    const prices = histData.map(d => d.close);
    const volUp: (number | string)[] = [];
    const volDown: (number | string)[] = [];

    histData.forEach((d, i) => {
       const prevClose = i > 0 ? histData[i-1].close : (d.open || d.close);
       if (d.close >= prevClose) { volUp.push(d.volume); volDown.push('-'); } 
       else { volUp.push('-'); volDown.push(d.volume); }
    });

    return {
      tooltip: { trigger: 'axis', backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', textStyle: { color: '#fff', fontSize: 10 } },
      legend: { data: ['Vol Up', 'Vol Down', 'Price'], bottom: 0, textStyle: { color: '#a3a3a3', fontSize: 9 }, itemWidth: 10, itemHeight: 10 },
      grid: { top: 20, bottom: 40, left: 40, right: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: '#a3a3a3', fontSize: 8 }, axisLine: { lineStyle: { color: '#2d2d2d' } } },
      yAxis: [ { type: 'value', splitLine: { show: false }, axisLabel: { color: '#a3a3a3', fontSize: 8, formatter: (v: number) => formatShortNum(v) } }, { type: 'value', splitLine: { lineStyle: { color: '#2d2d2d', type: 'dashed' } }, axisLabel: { color: '#f59e0b', fontSize: 8 } } ],
      series: [ { name: 'Vol Up', type: 'bar', stack: 'Volume', data: volUp, itemStyle: { color: '#10b981' }, barWidth: '50%' }, { name: 'Vol Down', type: 'bar', stack: 'Volume', data: volDown, itemStyle: { color: '#ef4444' }, barWidth: '50%' }, { name: 'Price', type: 'line', yAxisIndex: 1, data: prices, itemStyle: { color: '#f59e0b' }, smooth: true, symbol: 'none', lineStyle: { width: 2 } } ]
    };
  }, [histData]);

  const seasonalityOption = useMemo(() => {
    if (histData.length === 0) return null;
    const monthlyData: Record<string, { first: number, last: number }> = {};
    histData.forEach(d => {
      const month = d.date.substring(0, 7);
      if (!monthlyData[month]) monthlyData[month] = { first: d.close, last: d.close };
      else monthlyData[month].last = d.close;
    });

    const months = Object.keys(monthlyData);
    const returns = months.map(m => {
       const pct = ((monthlyData[m].last - monthlyData[m].first) / monthlyData[m].first) * 100;
       return { value: parseFloat(pct.toFixed(2)), itemStyle: { color: pct >= 0 ? '#10b981' : '#ef4444' } };
    });

    return {
      tooltip: { trigger: 'axis', backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', textStyle: { color: '#fff', fontSize: 10 }, formatter: '{b}<br/>Return: <b>{c}%</b>' },
      grid: { top: 20, bottom: 20, left: 30, right: 10 },
      xAxis: { type: 'category', data: months.map(m => m.substring(5)), axisLabel: { color: '#a3a3a3', fontSize: 9 }, axisLine: { lineStyle: { color: '#71717a', width: 2 } }, axisTick: { show: false } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#2d2d2d', type: 'dashed' } }, axisLabel: { color: '#a3a3a3', fontSize: 8 } },
      series: [{ type: 'bar', data: returns, barWidth: '40%', label: { show: true, position: 'outside', color: '#fff', fontSize: 8, formatter: '{c}%' } }]
    };
  }, [histData]);

  if (loadProfile) {
    return <div className="flex h-full items-center justify-center text-[#f59e0b] text-[10px] font-bold animate-pulse bg-[#121212]">Menyiapkan Canvas Grafik Real-time...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto hide-scrollbar bg-[#121212] font-sans">
      
      {/* HEADER: COMPANY INFO */}
      <div className="pt-4 px-6 flex flex-col gap-3 bg-[#121212] shrink-0">
         <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile?.logo || `https://s3.goapi.io/logo/${symbol}.jpg`} alt={symbol} className="w-12 h-12 rounded bg-white object-contain p-1 shrink-0 border border-[#2d2d2d]" onError={(e) => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
            <div className="flex flex-col">
               <h1 className="text-white text-[15px] font-black leading-tight flex items-center gap-2">
                 {profile?.name || symbol} 
                 <span className="bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-300 text-[9px] px-1.5 py-0.5 rounded tracking-widest uppercase">Class A</span>
               </h1>
               <div className="text-neutral-500 text-[10px] font-bold mt-0.5 flex gap-1.5 items-center uppercase tracking-wide">
                 <span className="text-white bg-[#2d2d2d] px-1.5 py-0.5 rounded leading-none">{symbol}</span> • <span>Indonesia Stock Exchange</span>
               </div>
            </div>
         </div>
         
         <div className="flex items-end gap-3 mt-1">
            <span className="text-[32px] font-black text-white tabular-nums leading-none tracking-tight">{priceData?.close?.toLocaleString('id-ID') || "-"}</span>
            {/* FIX: Menggunakan fallback || 0 agar TypeScript aman jika priceData.change undefined */}
            <div className={`flex items-center gap-1 font-bold text-[13px] mb-1 ${(priceData?.change || 0) >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
               <span>{(priceData?.change || 0) > 0 ? '+' : ''}{priceData?.change || 0}</span>
               <span>({(priceData?.change_pct || 0).toFixed(2)}%)</span>
            </div>
         </div>
      </div>

      {/* SUB-NAV TABS */}
      <div className="px-6 mt-6 border-b border-[#2d2d2d] flex gap-6 shrink-0 bg-[#121212] overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => (
           <button 
             key={tab} 
             onClick={() => setActiveTab(tab)}
             className={`pb-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${activeTab === tab ? "border-[#f59e0b] text-[#f59e0b]" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
           >
             {tab}
           </button>
        ))}
      </div>

      <div className="p-6">
        
        {/* ======================= RENDER TAB 1: OVERVIEW ======================= */}
        {activeTab === "Overview" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
               <h2 className="text-white text-[13px] font-bold">Fundamentals and stats</h2>
            </div>

            {/* KEY FACTS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mb-8">
               <div className="flex flex-col gap-1 border-b border-[#2d2d2d] pb-2">
                 <span className="text-neutral-500 text-[9px] uppercase tracking-widest font-bold flex items-center gap-1">Market capitalisation <Info size={10}/></span>
                 <span className="text-white text-[12px] font-black">Rp {formatShortNum((priceData?.close || 0) * (profile?.outstanding_shares || 0))}</span>
               </div>
               <div className="flex flex-col gap-1 border-b border-[#2d2d2d] pb-2">
                 <span className="text-neutral-500 text-[9px] uppercase tracking-widest font-bold flex items-center gap-1">Outstanding Shares <Info size={10}/></span>
                 <span className="text-white text-[12px] font-black">{formatShortNum(profile?.outstanding_shares)}</span>
               </div>
               <div className="flex flex-col gap-1 border-b border-[#2d2d2d] pb-2">
                 <span className="text-neutral-500 text-[9px] uppercase tracking-widest font-bold flex items-center gap-1">IPO Price <Info size={10}/></span>
                 <span className="text-white text-[12px] font-black">Rp {profile?.ipo_offering_price?.toLocaleString('id-ID') || "-"}</span>
               </div>
               <div className="flex flex-col gap-1 border-b border-[#2d2d2d] pb-2">
                 <span className="text-neutral-500 text-[9px] uppercase tracking-widest font-bold flex items-center gap-1">Sector <Info size={10}/></span>
                 <span className="text-[#f59e0b] text-[12px] font-bold">{profile?.sector_name || "-"}</span>
               </div>
            </div>

            <div className="mb-8">
               <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-2 block">About</span>
               <p className="text-neutral-300 text-[10px] leading-relaxed text-justify line-clamp-2">
                 {profile?.about || "Deskripsi perusahaan tidak tersedia."}
               </p>
            </div>

            {/* CHARTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 mb-8">
               <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2 border-b border-[#2d2d2d] pb-2">
                    <span className="text-white text-[11px] font-bold flex items-center gap-1">Ownership <Info size={12} className="text-neutral-500"/></span>
                  </div>
                  {ownershipOption ? <BaseChart option={ownershipOption} height="160px"/> : <div className="h-[160px] flex items-center text-neutral-500 text-[10px]">Data tidak tersedia</div>}
               </div>
               <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2 border-b border-[#2d2d2d] pb-2">
                    <span className="text-white text-[11px] font-bold flex items-center gap-1">Subsidiary Assets <Info size={12} className="text-neutral-500"/></span>
                  </div>
                  {subsidiaryOption ? <BaseChart option={subsidiaryOption} height="160px"/> : <div className="h-[160px] flex items-center text-neutral-500 text-[10px]">Tidak ada Entitas Anak</div>}
               </div>
               <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2 border-b border-[#2d2d2d] pb-2">
                    <span className="text-white text-[11px] font-bold flex items-center gap-1">Price & Volume Trends <Info size={12} className="text-neutral-500"/></span>
                    <span className="text-[9px] text-neutral-500">3 Months</span>
                  </div>
                  {performanceOption ? <BaseChart option={performanceOption} height="160px"/> : <div className="h-[160px] flex items-center text-neutral-500 text-[10px]">Memuat tren...</div>}
               </div>
               <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2 border-b border-[#2d2d2d] pb-2">
                    <span className="text-white text-[11px] font-bold flex items-center gap-1">Monthly Returns <Info size={12} className="text-neutral-500"/></span>
                    <span className="text-[9px] text-neutral-500">YTD</span>
                  </div>
                  {seasonalityOption ? <BaseChart option={seasonalityOption} height="160px"/> : <div className="h-[160px] flex items-center text-neutral-500 text-[10px]">Memuat seasonality...</div>}
               </div>
            </div>
          </div>
        )}

        {/* ======================= RENDER TAB 2: SMART MONEY ======================= */}
        {activeTab === "Smart Money" && (
          <div className="animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-white text-[13px] font-bold flex items-center gap-2"><Activity size={14} className="text-[#f59e0b]"/> EOD Broker Summary</h2>
               <span className="text-[9px] text-neutral-500 border border-[#2d2d2d] px-2 py-1 rounded">Today</span>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#121212] border border-[#2d2d2d] p-3 rounded flex flex-col items-center justify-center text-center">
                  <span className="text-neutral-500 text-[9px] font-bold uppercase block mb-1">Smart Money Status</span>
                  <span className={`text-lg font-black tracking-widest ${smartMoney.statusColor}`}>
                    {smartMoney.status}
                  </span>
                </div>
                <div className="bg-[#121212] border border-[#2d2d2d] p-3 rounded">
                  <span className="text-neutral-500 text-[9px] font-bold uppercase block mb-1">Top Accumulator</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#10b981] text-lg font-black">{smartMoney.topBuyer}</span>
                    {/* FIX: Math.abs sudah dijamin menerima tipe number murni */}
                    <span className="text-neutral-400 text-[10px]">Rp {formatShortNum(Math.abs(smartMoney.topBuyerVal))}</span>
                  </div>
                </div>
                <div className="bg-[#121212] border border-[#2d2d2d] p-3 rounded">
                  <span className="text-neutral-500 text-[9px] font-bold uppercase block mb-1">Top Distributor</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[#ef4444] text-lg font-black">{smartMoney.topSeller}</span>
                    {/* FIX: Math.abs sudah dijamin menerima tipe number murni */}
                    <span className="text-neutral-400 text-[10px]">Rp {formatShortNum(Math.abs(smartMoney.topSellerVal))}</span>
                  </div>
                </div>
             </div>

             <h3 className="text-white text-[11px] font-bold uppercase tracking-widest border-b border-[#2d2d2d] pb-2 mb-3">Top Brokers (Net Value)</h3>
             <div className="flex flex-col gap-2">
                {smartMoney.brokers.slice(0, 10).map(([code, val], i) => {
                  // FIX: Menggunakan maxBuy dan maxSell agar style={{width}} lebih aman untuk TypeScript
                  const maxBuy = smartMoney.brokers[0]?.[1] || 1;
                  const maxSell = Math.abs(smartMoney.brokers[smartMoney.brokers.length - 1]?.[1] || 1);
                  
                  return (
                    <div key={i} className="flex justify-between items-center p-2 border-b border-[#2d2d2d]/30 hover:bg-[#1e1e1e]">
                      <span className="text-white font-bold text-[11px] w-10">{code}</span>
                      <div className="flex-1 px-4">
                         <div className="h-1.5 w-full bg-[#1e1e1e] rounded-full overflow-hidden flex relative">
                           {val > 0 && <div className="h-full bg-[#10b981] absolute right-1/2" style={{ width: `${Math.min((val / maxBuy) * 50, 50)}%` }}></div>}
                           {val < 0 && <div className="h-full bg-[#ef4444] absolute left-1/2" style={{ width: `${Math.min((Math.abs(val) / maxSell) * 50, 50)}%` }}></div>}
                         </div>
                      </div>
                      <span className={`text-[10px] font-bold tabular-nums w-20 text-right ${val >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{formatShortNum(val)}</span>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {/* ======================= RENDER TAB 3: HISTORICAL ======================= */}
        {activeTab === "Historical" && (
          <div className="animate-in fade-in duration-300">
             <div className="flex justify-between items-center mb-4 border-b border-[#2d2d2d] pb-2">
               <h2 className="text-white text-[13px] font-bold flex items-center gap-2"><Activity size={14} className="text-[#f59e0b]"/> Historical Price & Volatility</h2>
               <span className="text-[9px] text-neutral-500 border border-[#2d2d2d] px-2 py-1 rounded">3 Months</span>
             </div>
             
             <table className="w-full text-left text-[10px]">
                <thead className="text-neutral-500 bg-[#1e1e1e] uppercase">
                  <tr>
                    <th className="px-3 py-2 border-b border-[#2d2d2d]">Date</th>
                    <th className="px-3 py-2 border-b border-[#2d2d2d] text-right">Close</th>
                    <th className="px-3 py-2 border-b border-[#2d2d2d] text-right">High</th>
                    <th className="px-3 py-2 border-b border-[#2d2d2d] text-right">Low</th>
                    <th className="px-3 py-2 border-b border-[#2d2d2d] text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {histData.slice(0, 15).map((row, i) => (
                    <tr key={i} className="hover:bg-[#1e1e1e] border-b border-[#2d2d2d]/30">
                      <td className="px-3 py-2 text-neutral-300 font-mono">{row.date}</td>
                      <td className="px-3 py-2 text-right text-white font-bold">{row.close.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2 text-right text-[#10b981]">{row.high.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2 text-right text-[#ef4444]">{row.low.toLocaleString('id-ID')}</td>
                      <td className="px-3 py-2 text-right text-neutral-400">{row.volume.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
             <div className="text-center mt-4 text-[9px] text-neutral-500">Showing last 15 trading days. Data sourced directly from API.</div>
          </div>
        )}

      </div>
    </div>
  );
}