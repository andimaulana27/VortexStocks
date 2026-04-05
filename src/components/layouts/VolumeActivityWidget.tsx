// src/components/layouts/VolumeActivityWidget.tsx
"use client";

import React, { useEffect, useRef, memo, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- DEFINISI TIPE TYPESCRIPT ---
interface GoApiHistoricalItem {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface EChartsInstance {
  clear: () => void;
  setOption: (option: Record<string, unknown>) => void;
  resize: () => void;
  dispose: () => void;
}

interface EChartsGlobal {
  init: (dom: HTMLDivElement) => EChartsInstance;
}

interface CustomWindow extends Window {
  echarts?: EChartsGlobal;
}

// 1. UPDATE: Tambahkan interface untuk props Date Range
export interface VolumeActivityWidgetProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

// --- HELPER FORMATTER ---
const formatNum = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toString();
};

const getPastDate = (days: number, baseDateStr?: string): string => {
  const d = baseDateStr ? new Date(baseDateStr) : new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

// HELPER MENDAPATKAN WARNA BERDASARKAN KODE BROKER
const getBrokerColor = (code: string) => {
  const bumnCodes = ['CC', 'NI', 'OD'];
  const foreignCodes = ['AK','BK','CS','CG','DB','DX','FS','GW','KZ','ML','MS','RX','ZP','YU','BB'];
  // Daftar broker anomali (Silakan sesuaikan/tambahkan kode brokernya)
  const anomaliCodes = ['MG', 'YP', 'XC', 'PD', 'XL', 'EP', 'SH']; 
  
  if (foreignCodes.includes(code.toUpperCase())) return '#ef4444'; // Merah (Asing)
  if (bumnCodes.includes(code.toUpperCase())) return '#10b981'; // Hijau (BUMN)
  if (anomaliCodes.includes(code.toUpperCase())) return '#f97316'; // Orange (Anomali)
  return '#a855f7'; // Ungu (Lokal / Lainnya)
};

// Simulasi Daftar Broker dengan Format HTML Berwarna
const getColoredMockBrokers = (dateStr: string, isBuyer: boolean): string => {
  const bList = ["XL","CC","GR","KK","XC","YP","SQ","SS","DR","CP","NI","PD"];
  const sList = ["AK","DX","YB","MG","ZP","BK","FZ","AZ","AI","BR","CS","CG"];
  let seed = 0;
  for(let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
  const start = seed % 5;
  
  const brokers = isBuyer ? bList.slice(start, start + 6) : sList.slice(start, start + 6);
  
  // Membungkus masing-masing kode broker dengan span yang berwarna sesuai kategorinya
  return brokers.map(b => `<span style="color: ${getBrokerColor(b)};">${b}</span>`).join(", ");
};

// Simulasi Komposisi Volume per Kategori Broker
const getMockVolumeComposition = (dateStr: string) => {
    let seed = 0;
    for(let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i);
    const asingPct = 0.20 + (seed % 15) / 100; // 20% - 34%
    const bumnPct = 0.10 + ((seed * 2) % 15) / 100; // 10% - 24%
    const anomaliPct = 0.05 + ((seed * 3) % 10) / 100; // 5% - 14%
    const lokalPct = 1 - asingPct - bumnPct - anomaliPct;
    return { asingPct, lokalPct, bumnPct, anomaliPct };
}

// --- KOMPONEN CHART (ECHARTS STACKED) ---
// 2. UPDATE: Komponen menerima props tanggal dan mengkalkulasi From/To
const EChartsVolumeActivity = memo(({ symbol, customDate, dateMode, startDate, endDate }: { symbol: string } & VolumeActivityWidgetProps) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<EChartsInstance | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';

  // Kalkulasi rentang tanggal
  const { targetFrom, targetTo } = useMemo(() => {
    if (dateMode === 'range' && startDate && endDate) {
      return { targetFrom: startDate, targetTo: endDate };
    }
    // Jika single date, gunakan tanggal tersebut sebagai batas akhir, dan mundur 150 hari ke belakang
    const toDate = (dateMode === 'single' && customDate) ? customDate : new Date().toISOString().split('T')[0];
    const fromDate = getPastDate(150, toDate);
    return { targetFrom: fromDate, targetTo: toDate };
  }, [dateMode, customDate, startDate, endDate]);

  const { data: historical, isLoading } = useSWR(
    `layout-hist-${symbol}-${targetFrom}-${targetTo}`, 
    () => fetch(`https://api.goapi.io/stock/idx/${symbol}/historical?from=${targetFrom}&to=${targetTo}`, { 
      headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } 
    }).then(res => res.json()), 
    { dedupingInterval: 10000 }
  );

  // Injeksi Script ECharts
  useEffect(() => {
    const customWindow = window as unknown as CustomWindow;
    if (!customWindow.echarts) {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const customWindow = window as unknown as CustomWindow;

    const renderChart = () => {
      if (!chartContainerRef.current || !customWindow.echarts || !historical?.data?.results) return;

      if (!chartInstance.current) {
        chartInstance.current = customWindow.echarts.init(chartContainerRef.current);
      }

      const rawResults: GoApiHistoricalItem[] = historical.data.results;
      const uniqueDataMap = new Map<string, GoApiHistoricalItem>();
      rawResults.forEach((item) => uniqueDataMap.set(item.date, item));
      
      const sortedData = Array.from(uniqueDataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const dates = sortedData.map(d => d.date);
      const closePrices = sortedData.map(d => d.close);
      
      const volAsing: number[] = [];
      const volLokal: number[] = [];
      const volBUMN: number[] = [];
      const volAnomali: number[] = [];

      sortedData.forEach(d => {
         const comp = getMockVolumeComposition(d.date);
         const v = d.volume || 0;
         volAsing.push(v * comp.asingPct);
         volLokal.push(v * comp.lokalPct);
         volBUMN.push(v * comp.bumnPct);
         volAnomali.push(v * comp.anomaliPct);
      });

      const option: Record<string, unknown> = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          confine: true,          
          appendToBody: true,     
          axisPointer: { type: 'cross', label: { backgroundColor: '#2d2d2d' } },
          backgroundColor: '#1e1e1e',
          borderColor: '#2d2d2d',
          textStyle: { color: '#e5e5e5', fontSize: 10 },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter: (params: any) => {
            const dateStr = params[0].name;
            const buyersHtml = getColoredMockBrokers(dateStr, true);
            const sellersHtml = getColoredMockBrokers(dateStr, false);
            
            let totalVol = 0;
            let closePrice = 0;
            let itemsHtml = '';

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            params.forEach((p: any) => {
               if (p.seriesName === 'Close Price') {
                  closePrice = p.value;
               } else {
                  totalVol += p.value;
                  itemsHtml += `<div style="display:flex; justify-content:space-between; width:100%; margin-bottom:2px;">
                                  <span>${p.marker} ${p.seriesName}</span>
                                  <span style="font-weight:bold; margin-left:15px;">${formatNum(p.value)}</span>
                                </div>`;
               }
            });

            return `
              <div style="min-width: 190px;">
                <div style="font-weight: bold; color: #fff; font-size: 12px; border-bottom: 1px solid #2d2d2d; padding-bottom: 6px; margin-bottom: 6px;">
                  ${dateStr} <span style="color:#10b981; float:right;">Rp ${closePrice.toLocaleString('id-ID')}</span>
                </div>
                <div style="font-size: 11px; margin-bottom: 6px;">
                  <div style="color:#a3a3a3; margin-bottom: 4px;">Total Volume: <b style="color:#fff;">${formatNum(totalVol)}</b></div>
                  ${itemsHtml}
                </div>
                <div style="border-top: 1px solid #2d2d2d; padding-top: 6px; margin-top: 4px;">
                  <div style="font-size: 11px; margin-bottom: 4px;">
                    <span style="font-weight:bold; color: #10b981; display:inline-block; width:35px;">BUY:</span> 
                    <span style="font-weight:600; letter-spacing: 0.5px;">${buyersHtml}</span>
                  </div>
                  <div style="font-size: 11px;">
                    <span style="font-weight:bold; color: #ef4444; display:inline-block; width:35px;">SELL:</span> 
                    <span style="font-weight:600; letter-spacing: 0.5px;">${sellersHtml}</span>
                  </div>
                </div>
              </div>
            `;
          }
        },
        grid: { top: 35, right: 50, bottom: 25, left: 50 },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: { lineStyle: { color: '#2d2d2d' } },
          axisLabel: { color: '#a3a3a3', fontSize: 9 },
        },
        yAxis: [
          {
            type: 'value',
            name: 'Volume',
            nameTextStyle: { color: '#a3a3a3', fontSize: 9, padding: [0, 15, 0, 0] },
            splitLine: { show: false },
            axisLabel: { color: '#a3a3a3', fontSize: 9, formatter: (val: number) => formatNum(val) }
          },
          {
            type: 'value',
            name: 'Price',
            nameTextStyle: { color: '#a3a3a3', fontSize: 9, padding: [0, 0, 0, 15] },
            splitLine: { lineStyle: { color: '#2d2d2d', type: 'dashed' } },
            axisLabel: { color: '#a3a3a3', fontSize: 9 }
          }
        ],
        series: [
          { name: 'Asing', type: 'bar', stack: 'Volume', itemStyle: { color: '#ef4444' }, data: volAsing },
          { name: 'Lokal', type: 'bar', stack: 'Volume', itemStyle: { color: '#a855f7' }, data: volLokal },
          { name: 'BUMN', type: 'bar', stack: 'Volume', itemStyle: { color: '#10b981' }, data: volBUMN },
          { name: 'Anomali', type: 'bar', stack: 'Volume', itemStyle: { color: '#f97316' }, data: volAnomali },
          { name: 'Close Price', type: 'line', yAxisIndex: 1, itemStyle: { color: '#e91e63' }, symbol: 'none', smooth: true, lineStyle: { width: 2 }, data: closePrices }
        ]
      };

      chartInstance.current.setOption(option);
    };

    const timer = setTimeout(() => { renderChart(); }, 500);

    const handleResize = () => {
      if (chartInstance.current) chartInstance.current.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [historical]);

  return (
    <div className="relative w-full h-full bg-[#121212]">
      {isLoading && (
         <div className="absolute inset-0 z-20 flex justify-center items-center text-[#10b981] animate-pulse text-[10px] bg-[#121212]/80 backdrop-blur-sm">
            Memuat Kalkulasi Volume...
         </div>
      )}
      <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
});

EChartsVolumeActivity.displayName = "EChartsVolumeActivity";

// --- WIDGET UTAMA ---
// 3. UPDATE: Menerima Date Props dan menyalurkannya
export default function VolumeActivityWidget({ customDate, dateMode, startDate, endDate }: VolumeActivityWidgetProps) {
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "BUMI";

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col h-full overflow-hidden w-full relative group shadow-lg">
      
      {/* HEADER */}
      <div className="p-3 flex items-center justify-center gap-2 shrink-0 bg-[#121212] border-b border-[#2d2d2d]">
        <span className="font-bold text-white text-[11px] uppercase tracking-wide">
          Volume by Broker
        </span>
        <span className="bg-[#1e1e1e] text-[#00e676] px-1.5 rounded border border-[#2d2d2d] text-[8px] font-bold">
          {globalSymbol}
        </span>
      </div>

      {/* CHART AREA */}
      <div className="flex-1 w-full relative min-h-0 bg-[#121212]">
         <EChartsVolumeActivity 
            symbol={globalSymbol} 
            customDate={customDate} 
            dateMode={dateMode} 
            startDate={startDate} 
            endDate={endDate} 
         />
      </div>

      {/* FOOTER LEGEND KETERANGAN WARNA BAR */}
      <div className="h-[65px] shrink-0 bg-[#121212] flex gap-8 px-4 py-2 justify-center items-center border-t border-[#2d2d2d]">
         
         <div className="flex-1 flex flex-col max-w-[300px]">
           <span className="text-center text-[9px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Broker Activity Buyer</span>
           <div className="w-full h-2.5 flex overflow-hidden border border-[#2d2d2d] rounded-sm">
             <div className="bg-[#ef4444] w-[30%]"></div> {/* Asing */}
             <div className="bg-[#a855f7] w-[40%]"></div> {/* Lokal */}
             <div className="bg-[#10b981] w-[20%]"></div> {/* BUMN */}
             <div className="bg-[#f97316] w-[10%]"></div> {/* Anomali */}
           </div>
           <div className="flex justify-between mt-1.5 text-[8px] font-bold text-neutral-400">
             <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#ef4444] rounded-sm"></span> ASING 30%</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#a855f7] rounded-sm"></span> LOKAL 40%</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#10b981] rounded-sm"></span> BUMN 20%</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#f97316] rounded-sm"></span> ANOMALI 10%</div>
           </div>
         </div>

         <div className="flex-1 flex flex-col max-w-[300px]">
           <span className="text-center text-[9px] font-bold text-neutral-500 mb-1.5 uppercase tracking-wide">Broker Activity Seller</span>
           <div className="w-full h-2.5 flex overflow-hidden border border-[#2d2d2d] rounded-sm">
             <div className="bg-[#ef4444] w-[40%]"></div> {/* Asing */}
             <div className="bg-[#a855f7] w-[30%]"></div> {/* Lokal */}
             <div className="bg-[#10b981] w-[20%]"></div> {/* BUMN */}
             <div className="bg-[#f97316] w-[10%]"></div> {/* Anomali */}
           </div>
           <div className="flex justify-between mt-1.5 text-[8px] font-bold text-neutral-400">
             <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#ef4444] rounded-sm"></span> ASING 40%</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#a855f7] rounded-sm"></span> LOKAL 30%</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#10b981] rounded-sm"></span> BUMN 20%</div>
             <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#f97316] rounded-sm"></span> ANOMALI 10%</div>
           </div>
         </div>

      </div>

    </div>
  );
}