// src/components/layouts/BrokerDistWidget.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { Calendar } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA API & AGREGASI ---
interface GoApiBrokerItem {
  broker?: { code: string; name: string }; code?: string; side: string; lot: number; value: number; investor: string; symbol: string;
}
interface BrokerAgg {
  code: string; value: number; volume: number; type: 'DOMESTIC' | 'BUMN' | 'FOREIGN'; color: string; name?: string;
}

// --- TIPE DATA ECHARTS ---
interface EChartsInstance { clear: () => void; setOption: (option: Record<string, unknown>) => void; resize: () => void; }
interface EChartsGlobal { init: (dom: HTMLDivElement) => EChartsInstance; }
interface CustomWindow extends Window { echarts?: EChartsGlobal; }
interface SankeyNode { name: string; value: number; itemStyle: { color: string }; label: { position: 'left' | 'right'; formatter: string }; }
interface SankeyLink { source: string; target: string; value: number; lineStyle: { color: string }; }
interface SankeyTooltipParams {
  dataType: 'node' | 'edge'; data: { name: string; value: number; itemStyle?: { color: string }; source?: string; target?: string; };
}

const COLOR_DOMESTIC = '#a855f7'; 
const COLOR_BUMN = '#10b981'; 
const COLOR_FOREIGN = '#ef4444'; 

const formatNum = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
  return num.toLocaleString("id-ID");
};

const getEffectiveDateAPI = (): string => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const getTypeAndColor = (code: string, investorStr?: string): { type: 'DOMESTIC' | 'BUMN' | 'FOREIGN', color: string } => {
  const bumnCodes = ['CC', 'NI', 'OD'];
  const foreignCodes = ['AK','BK','CS','CG','DB','DX','FS','GW','KZ','ML','MS','RX','ZP','YU','BB'];
  if (investorStr === 'FOREIGN' || foreignCodes.includes(code.toUpperCase())) return { type: 'FOREIGN', color: COLOR_FOREIGN };
  if (bumnCodes.includes(code.toUpperCase())) return { type: 'BUMN', color: COLOR_BUMN };
  return { type: 'DOMESTIC', color: COLOR_DOMESTIC };
};

const fetchBrokerSummary = async (url: string): Promise<GoApiBrokerItem[]> => {
  const res = await fetch(url, { headers: { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' } });
  if (!res.ok) throw new Error("Gagal memuat data broker.");
  const json = await res.json();
  return (json.data?.results || []) as GoApiBrokerItem[];
};

export default function BrokerDistWidget({ customDate }: { customDate?: string }) {
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "BUMI";
  const [activeTab, setActiveTab] = useState<"Value" | "Volume">("Value");
  
  const dateFilter = customDate || getEffectiveDateAPI(); // INTEGRASI CUSTOM DATE
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<EChartsInstance | null>(null);
  
  const { data: brokerRaw, isLoading } = useSWR<GoApiBrokerItem[]>(
    `layout-brokerdist-${globalSymbol}-${dateFilter}`, 
    () => fetchBrokerSummary(`https://api.goapi.io/stock/idx/${globalSymbol}/broker_summary?date=${dateFilter}&investor=ALL`), 
    { refreshInterval: 15000, dedupingInterval: 5000 }
  );

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
      if (!chartContainerRef.current || !customWindow.echarts || !brokerRaw) return;

      if (!chartInstance.current) {
        chartInstance.current = customWindow.echarts.init(chartContainerRef.current);
      }

      const buyerMap = new Map<string, BrokerAgg>();
      const sellerMap = new Map<string, BrokerAgg>();

      brokerRaw.forEach(item => {
        const code = item.broker?.code || item.code || "-";
        const val = item.value || 0;
        const vol = item.lot || 0;
        const inv = item.investor || 'LOCAL';

        if (item.side === 'BUY') {
          if (!buyerMap.has(code)) buyerMap.set(code, { code, name: item.broker?.name, value: 0, volume: 0, ...getTypeAndColor(code, inv) });
          buyerMap.get(code)!.value += val;
          buyerMap.get(code)!.volume += vol;
        } else {
          if (!sellerMap.has(code)) sellerMap.set(code, { code, name: item.broker?.name, value: 0, volume: 0, ...getTypeAndColor(code, inv) });
          sellerMap.get(code)!.value += val;
          sellerMap.get(code)!.volume += vol;
        }
      });

      const getValue = (b: BrokerAgg) => activeTab === 'Value' ? b.value : b.volume;
      const topBuyers = Array.from(buyerMap.values()).sort((a,b) => getValue(b) - getValue(a)).slice(0, 5);
      const topSellers = Array.from(sellerMap.values()).sort((a,b) => getValue(b) - getValue(a)).slice(0, 5);

      const nodes: SankeyNode[] = [];
      const links: SankeyLink[] = [];
      const sumS = topSellers.reduce((acc, b) => acc + getValue(b), 0);

      if (sumS === 0 || topBuyers.length === 0) {
        chartInstance.current.clear();
        return;
      }

      topBuyers.forEach(b => {
        nodes.push({
          name: `B_${b.code}`, value: getValue(b), itemStyle: { color: b.color },
          label: { position: 'right', formatter: `{title|${b.code}} {val|${formatNum(getValue(b))}}` }
        });
        topSellers.forEach(s => {
          const flowValue = getValue(b) * (getValue(s) / sumS);
          if (flowValue > 0) {
            links.push({ source: `B_${b.code}`, target: `S_${s.code}`, value: flowValue, lineStyle: { color: b.color } });
          }
        });
      });

      topSellers.forEach(s => {
        nodes.push({
          name: `S_${s.code}`, value: getValue(s), itemStyle: { color: s.color },
          label: { position: 'left', formatter: `{val|${formatNum(getValue(s))}} {title|${s.code}}` }
        });
      });

      const option: Record<string, unknown> = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item', triggerOn: 'mousemove', backgroundColor: '#1e1e1e', borderColor: '#2d2d2d', textStyle: { color: '#e5e5e5', fontSize: 10 },
          formatter: (params: SankeyTooltipParams) => {
            if (params.dataType === 'node') {
               const code = params.data.name.replace('B_', '').replace('S_', '');
               const color = params.data.itemStyle?.color || '#ffffff';
               return `<div style="font-weight:bold;color:${color}">${code}</div>Total: ${formatNum(params.data.value)}`;
            } else if (params.dataType === 'edge') {
               const src = params.data.source?.replace('B_', '') || '';
               const tgt = params.data.target?.replace('S_', '') || '';
               return `Distribusi<br/><span style="color:#10b981">${src}</span> ➔ <span style="color:#ef4444">${tgt}</span><br/><b>${formatNum(params.data.value)}</b>`;
            }
            return '';
          }
        },
        series: [{
          type: 'sankey', layout: 'none', top: '5%', bottom: '5%', left: '5%', right: '5%', nodeGap: 14, nodeWidth: 10, nodeAlign: 'justify',
          data: nodes, links: links, itemStyle: { borderWidth: 0 }, lineStyle: { curveness: 0.5, opacity: 0.35 }, emphasis: { focus: 'adjacency', lineStyle: { opacity: 0.8 } },
          label: { color: '#ffffff', fontSize: 10, rich: { title: { fontWeight: 'bold', color: '#ffffff', fontSize: 11 }, val: { color: '#a3a3a3', fontSize: 9 } } }
        }]
      };

      chartInstance.current.setOption(option);
    };

    const timer = setTimeout(() => { renderChart(); }, 500);
    const handleResize = () => { if (chartInstance.current) chartInstance.current.resize(); };
    window.addEventListener('resize', handleResize);

    return () => { clearTimeout(timer); window.removeEventListener('resize', handleResize); };
  }, [brokerRaw, activeTab]);

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col relative overflow-hidden h-full shadow-lg group">
      <div className="p-3 flex justify-between items-center border-b border-[#2d2d2d] z-10 bg-[#121212] shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-[9px] tracking-wide uppercase">Broker Distribution</span>
          <span className="bg-[#1e1e1e] text-[#10b981] px-1.0 rounded border border-[#2d2d2d] text-[8px] font-bold">{globalSymbol}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-[#121212] rounded-full p-0.5 border border-[#2d2d2d]">
            <button onClick={() => setActiveTab("Value")} className={`px-3 py-1 text-[8px] font-bold rounded-full transition-all ${activeTab === "Value" ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50" : "text-neutral-500 hover:text-white"}`}>Value</button>
            <button onClick={() => setActiveTab("Volume")} className={`px-3 py-1 text-[9px] font-bold rounded-full transition-all ${activeTab === "Volume" ? "bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50" : "text-neutral-500 hover:text-white"}`}>Volume</button>
          </div>
          <div className="flex items-center text-neutral-500 text-[9px] font-semibold gap-1">
             {new Date(dateFilter).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
             <Calendar size={11} />
          </div>
        </div>
      </div>

      <div className="flex justify-between px-4 py-2 text-[9px] font-bold z-10 bg-[#121212] border-b border-[#2d2d2d] shrink-0 uppercase tracking-widest">
        <span className="text-[#10b981]">Buyer</span><span className="text-[#ef4444]">Seller</span>
      </div>

      <div className="flex-1 relative w-full h-full min-h-0 bg-[#121212]">
        {isLoading && <div className="absolute inset-0 z-20 flex justify-center items-center text-[#10b981] animate-pulse text-[10px]">Menyusun Kalkulasi Sankey...</div>}
        <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />
      </div>

      <div className="h-8 shrink-0 flex justify-center items-center gap-6 border-t border-[#2d2d2d] bg-[#121212] z-10 text-[9px] font-bold uppercase tracking-wider">
         <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#a855f7]"></span> <span className="text-neutral-500">Domestic</span></div>
         <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#10b981]"></span> <span className="text-neutral-500">BUMN</span></div>
         <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#ef4444]"></span> <span className="text-neutral-500">Foreign</span></div>
      </div>
    </div>
  );
}