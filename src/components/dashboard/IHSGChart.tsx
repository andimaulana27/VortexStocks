// src/components/dashboard/IHSGChart.tsx
"use client";

import React, { useEffect, useRef, useMemo } from 'react';
// IMPORT TIPE KETAT LIGHTWEIGHT CHARTS (Termasuk IPriceLine)
import { createChart, ColorType, ISeriesApi, IChartApi, AreaSeries, LineStyle, IPriceLine } from 'lightweight-charts';
import useSWR from 'swr';
// IMPORT MESIN INDEKS GLOBAL
import { useIndices } from '@/hooks/useMarketData';

// --- TIPE DATA KETAT GOAPI ---
interface GoApiHistoricalItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface GoApiIndexItem {
  symbol: string;
  price?: {
    date?: string; open: number; high: number; low: number; close: number; volume: number; change: number; change_pct: number;
  };
}

interface ChartData { time: string; value: number; }

// PROPS BARU DARI DASHBOARD
interface IHSGChartProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

// Helper Format Angka Singkat
const formatShortValue = (num?: number): string => {
  if (num === undefined || num === null || num === 0) return "-"; 
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (absNum / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(2) + 'K';
  return absNum.toString();
};

const getDateRange1Year = () => {
  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setFullYear(toDate.getFullYear() - 1); 
  const format = (d: Date) => d.toISOString().split('T')[0]; 
  return { from: format(fromDate), to: format(toDate) };
};

// --- UPDATE KEAMANAN: Fetcher Khusus via Proxy Internal ---
const proxyFetcher = async (endpoint: string) => {
  const res = await fetch(`/api/market?endpoint=${encodeURIComponent(endpoint)}`);
  if (!res.ok) throw new Error("Gagal mengambil grafik historis.");
  return res.json();
};

export default function IHSGChart({ customDate, dateMode, startDate, endDate }: IHSGChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  
  // SOLUSI ERROR 1: Menggunakan Tipe IPriceLine bukan "any"
  const prevLineRef = useRef<IPriceLine | null>(null);

  // PANGGIL DATA LIVE DARI MESIN SWR GLOBAL (Update tiap 15 dtk)
  const { indicesData } = useIndices();
  
  // LOGIKA TANGGAL DINAMIS BERDASARKAN PROPS
  const { from, to } = useMemo(() => {
    if (dateMode === 'range' && startDate && endDate) {
      return { from: startDate, to: endDate };
    } else if (dateMode === 'single' && customDate) {
      // Jika Single, tarik data 1 tahun ke belakang DARI tanggal yang dipilih
      // Ini agar grafik Area punya titik yang cukup untuk digambar dan rumus 52W High tetap jalan
      const toDate = new Date(customDate);
      const fromDate = new Date(customDate);
      fromDate.setFullYear(toDate.getFullYear() - 1);
      return {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0]
      };
    }
    // Fallback jika tidak ada props
    return getDateRange1Year();
  }, [dateMode, customDate, startDate, endDate]);

  // BUILD ENDPOINT DINAMIS
  const histEndpoint = `stock/idx/COMPOSITE/historical?from=${from}&to=${to}`;

  // PANGGIL DATA HISTORIS MELALUI PROXY
  const { data: histResult, isLoading: isHistLoading, error: histError } = useSWR(
    histEndpoint,
    proxyFetcher,
    { dedupingInterval: 300000, refreshInterval: 300000 } 
  );

  // Ekstrak IHSG Live dari SWR Global
  const liveIHSG = useMemo(() => {
    if (!indicesData || !Array.isArray(indicesData)) return null;
    return indicesData.find((i: GoApiIndexItem) => i.symbol === "COMPOSITE" || i.symbol === "IHSG")?.price;
  }, [indicesData]);

  // SOLUSI ERROR 2: Kalkulasi Pure Derived State di dalam useMemo (Tanpa setState)
  const marketData = useMemo(() => {
    // State Default (Fallback)
    const defaultData = {
      isUp: true, currentPrice: "0", priceChange: "0", percentChange: "0%",
      stats: { open: "-", high: "-", low: "-", prevClose: "-", vol: "-", m1Pct: "-", m1IsUp: true, w52High: "-", w52Low: "-", ytdPct: "-", ytdIsUp: true },
      chartData: [] as ChartData[],
      prevClosePrice: 0
    };

    if (!histResult || histResult.status !== "success") return defaultData;

    const rawHist: GoApiHistoricalItem[] = histResult.data?.results;
    if (!rawHist || rawHist.length === 0) return defaultData;

    const sortedHist = [...rawHist].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const mappedData: ChartData[] = sortedHist.map(item => ({ time: item.date, value: item.close || 0 }));
    
    // Sambungkan titik hari ini jika pasar buka (Hanya jika mode single mencari tanggal hari ini / sangat dekat dengan hari ini)
    if (liveIHSG && liveIHSG.close) {
      const todayStr = new Date().toISOString().split('T')[0];
      const lastHist = mappedData[mappedData.length - 1];
      if (lastHist && lastHist.time === todayStr) {
        lastHist.value = liveIHSG.close;
      } else if (lastHist) {
        // Hanya tambahkan titik live jika toDate (akhir grafik) adalah hari ini
        if (to === todayStr) {
          mappedData.push({ time: todayStr, value: liveIHSG.close });
        }
      }
    }

    // Kalkulasi Data Fundamental (52W, YTD, 1M Return)
    const w52HighCalc = Math.max(...sortedHist.map(d => d.high || d.close || 0));
    const w52LowCalc = Math.min(...sortedHist.map(d => d.low || d.close || Infinity).filter(v => v !== Infinity));

    const currentYear = new Date(to).getFullYear();
    const firstCandleThisYear = sortedHist.find(c => new Date(c.date).getFullYear() === currentYear);
    const ytdStartPrice = firstCandleThisYear?.close || sortedHist[0].close || 1;

    const latestHist = sortedHist[sortedHist.length - 1];
    const prevHist = sortedHist.length > 1 ? sortedHist[sortedHist.length - 2] : latestHist;

    // Jika melihat grafik masa lalu (bukan hari ini), gunakan data penutupan hari tersebut alih-alih data Live
    const isViewingToday = to === new Date().toISOString().split('T')[0];
    const currentLivePrice = isViewingToday && liveIHSG?.close ? liveIHSG.close : (latestHist.close ?? 0);
    const prevClosePrice = prevHist.close ?? currentLivePrice;
    
    const tradingDays1M = 21;
    const index1M = Math.max(0, sortedHist.length - tradingDays1M - 1);
    const m1StartPrice = sortedHist[index1M]?.close || currentLivePrice;
    const m1PctCalc = ((currentLivePrice - m1StartPrice) / m1StartPrice) * 100;
    
    // Menghitung change berdasar tanggal yang sedang dilihat
    const change = isViewingToday && liveIHSG?.change ? liveIHSG.change : (currentLivePrice - prevClosePrice);
    const pct = isViewingToday && liveIHSG?.change_pct ? liveIHSG.change_pct : ((change / prevClosePrice) * 100);
    const trendUp = change >= 0;
    const ytdPctCalc = ((currentLivePrice - ytdStartPrice) / ytdStartPrice) * 100;
    const rawVol = isViewingToday && liveIHSG?.volume ? liveIHSG.volume : (latestHist.volume ?? undefined);

    return {
      isUp: trendUp,
      currentPrice: currentLivePrice.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      priceChange: Math.abs(change).toFixed(2),
      percentChange: `${Math.abs(pct).toFixed(2)}%`,
      prevClosePrice: prevClosePrice,
      chartData: mappedData,
      stats: {
        open: (isViewingToday && liveIHSG?.open ? liveIHSG.open : (latestHist.open ?? 0)).toLocaleString("id-ID", { minimumFractionDigits: 2 }),
        high: (isViewingToday && liveIHSG?.high ? liveIHSG.high : (latestHist.high ?? 0)).toLocaleString("id-ID", { minimumFractionDigits: 2 }),
        low:  (isViewingToday && liveIHSG?.low ? liveIHSG.low : (latestHist.low ?? 0)).toLocaleString("id-ID", { minimumFractionDigits: 2 }),
        prevClose: prevClosePrice.toLocaleString("id-ID", { minimumFractionDigits: 2 }),
        vol: formatShortValue(rawVol),
        m1Pct: `${Math.abs(m1PctCalc).toFixed(2)}%`,
        m1IsUp: m1PctCalc >= 0,
        w52High: w52HighCalc.toLocaleString("id-ID", { minimumFractionDigits: 2 }),
        w52Low: w52LowCalc.toLocaleString("id-ID", { minimumFractionDigits: 2 }),
        ytdPct: `${Math.abs(ytdPctCalc).toFixed(2)}%`,
        ytdIsUp: ytdPctCalc >= 0
      }
    };
  }, [histResult, liveIHSG, to]);

  // INISIALISASI GRAFIK KOSONG (Hanya 1x saat render pertama)
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#a3a3a3' },
      grid: { vertLines: { color: 'transparent' }, horzLines: { color: '#2d2d2d' } },
      timeScale: { timeVisible: true, borderColor: '#2d2d2d' },
      rightPriceScale: { borderColor: '#2d2d2d' },
      crosshair: { mode: 1, vertLine: { color: '#52525b', width: 1, style: LineStyle.Dashed }, horzLine: { color: '#52525b', width: 1, style: LineStyle.Dashed } }
    });
    chartRef.current = chart;

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor: '#ef4444', 
      topColor: 'rgba(239, 68, 68, 0.4)',
      bottomColor: 'rgba(239, 68, 68, 0.0)',
      lineWidth: 2,
    });
    seriesRef.current = newSeries as unknown as ISeriesApi<"Area">;

    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // SINKRONISASI UPDATE DATA KE DALAM GRAFIK (Murni External System Sync)
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || marketData.chartData.length === 0) return;

    // 1. Update Data & Fit to Screen
    seriesRef.current.setData(marketData.chartData);
    chartRef.current.timeScale().fitContent();

    // 2. Ganti Warna Tergantung Tren
    if (marketData.isUp) {
      seriesRef.current.applyOptions({ lineColor: '#10b981', topColor: 'rgba(16, 185, 129, 0.4)', bottomColor: 'rgba(16, 185, 129, 0.0)' });
    } else {
      seriesRef.current.applyOptions({ lineColor: '#ef4444', topColor: 'rgba(239, 68, 68, 0.4)', bottomColor: 'rgba(239, 68, 68, 0.0)' });
    }

    // 3. Update Garis Harga Penutupan Kemarin
    if (prevLineRef.current) seriesRef.current.removePriceLine(prevLineRef.current);
    prevLineRef.current = seriesRef.current.createPriceLine({
      price: marketData.prevClosePrice, color: '#52525b', lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: '',
    });

  }, [marketData.chartData, marketData.isUp, marketData.prevClosePrice]); 

  return (
    <div className="flex flex-col h-full bg-[#121212] border border-[#2d2d2d] rounded-lg shadow-lg overflow-hidden relative">
      <div className="p-4 border-b border-[#2d2d2d] shrink-0 flex justify-between items-center bg-[#121212]">
        <div className="flex items-center space-x-3">
          <h2 className="text-white text-lg font-bold tracking-wide">IHSG (COMPOSITE)</h2>
          {isHistLoading ? (
            <span className="text-neutral-500 text-sm animate-pulse">Memuat Live Data...</span>
          ) : !histError && (
            <div className="flex items-center space-x-2">
              <span className="text-white text-lg font-bold">{marketData.currentPrice}</span>
              <span className={`text-xs font-semibold ${marketData.isUp ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                {marketData.isUp ? "↑" : "↓"}{marketData.priceChange} ({marketData.isUp ? "+" : "-"}{marketData.percentChange})
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative w-full px-2 pt-2">
        {isHistLoading && <div className="absolute inset-0 flex items-center justify-center z-10 text-neutral-500 text-sm font-bold animate-pulse">Mempersiapkan Grafik Historis...</div>}
        {histError && !isHistLoading && <div className="absolute inset-0 flex items-center justify-center z-10 text-[#ef4444] text-xs font-bold text-center px-4">Gagal memuat grafik.</div>}
        <div ref={chartContainerRef} className="absolute inset-0" />
      </div>

      <div className="shrink-0 bg-[#121212] flex flex-col mt-2 border-t border-[#2d2d2d]">
        <div className="grid grid-cols-4 divide-x divide-[#2d2d2d] border-b border-[#2d2d2d]">
          <div className="flex flex-col items-center py-2 bg-[#2d2d2d]/10">
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Prev Close</span>
            <span className="text-neutral-300 text-[11px] font-bold">{marketData.stats.prevClose}</span>
          </div>
          <div className="flex flex-col items-center py-2 bg-[#2d2d2d]/10">
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Open</span>
            <span className="text-[#10b981] text-[11px] font-bold">{marketData.stats.open}</span>
          </div>
          <div className="flex flex-col items-center py-2 bg-[#2d2d2d]/10">
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">High</span>
            <span className="text-[#10b981] text-[11px] font-bold">{marketData.stats.high}</span>
          </div>
          <div className="flex flex-col items-center py-2 bg-[#2d2d2d]/10">
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Low</span>
            <span className="text-[#ef4444] text-[11px] font-bold">{marketData.stats.low}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 divide-x divide-[#2d2d2d]">
          <div className="flex flex-col items-center justify-center py-2">
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Total Vol</span>
            <div className="flex items-end justify-center space-x-1"><span className="text-white text-[11px] font-bold leading-none">{marketData.stats.vol}</span></div>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">1M Return</span>
            <div className="flex items-center justify-center space-x-1">
              <span className={`text-[11px] font-bold leading-none ${marketData.stats.m1IsUp ? "text-[#10b981]" : "text-[#ef4444]"}`}>{marketData.stats.m1IsUp ? "+" : "-"}{marketData.stats.m1Pct}</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-2 px-1 text-center">
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">52W Range</span>
            <div className="flex justify-center items-center w-full space-x-1">
              <span className="text-[#ef4444] text-[10px] font-bold">{marketData.stats.w52Low}</span><span className="text-neutral-600 text-[10px]">-</span><span className="text-[#10b981] text-[10px] font-bold">{marketData.stats.w52High}</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">YTD Return</span>
            <div className="flex items-center justify-center space-x-1">
              <span className={`text-[11px] font-bold leading-none ${marketData.stats.ytdIsUp ? "text-[#10b981]" : "text-[#ef4444]"}`}>{marketData.stats.ytdIsUp ? "+" : "-"}{marketData.stats.ytdPct}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}