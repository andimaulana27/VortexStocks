// src/components/layouts/ShareholdersWidget.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Search, Users, PieChart, Info, Circle, Globe } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import dynamic from 'next/dynamic';

// Import ForceGraph secara dinamis karena library ini memerlukan objek 'window'
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// --- TIPE DATA GOAPI ---
interface GoApiProfileShareholder {
  name: string;
  percentage: string;
  amount: string;
  holding_type: string;
}

interface GoApiProfileManagement {
  name: string;
  role: string;
}

interface GoApiSubsidiary {
  name: string;
  sector: string;
  percentage_own: string;
}

interface GoApiProfileData {
  symbol: string;
  name: string;
  outstanding_shares: number;
  shareholders: GoApiProfileShareholder[];
  directors?: GoApiProfileManagement[];
  commissioners?: GoApiProfileManagement[];
  subsidiary_companies?: GoApiSubsidiary[];
}

interface GoApiBrokerItem {
  side: string;
  value: number;
}

export interface ShareholdersWidgetProps {
  customDate?: string;
  dateMode?: 'single' | 'range';
  startDate?: string;
  endDate?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
  }>;
}

// --- TIPE DATA UNTUK NETWORK MAP (STRICT, NO 'ANY') ---
interface GraphNode {
  id: string;
  name: string;
  val: number;
  type: string;
  color: string;
  info?: string;
  x?: number;
  y?: number;
  fx?: number | undefined;
  fy?: number | undefined;
}

interface GraphLink {
  source: string;
  target: string;
  label: string;
}

interface ForceLayoutOptions {
  strength?: (val: number) => ForceLayoutOptions;
  distance?: (val: number) => ForceLayoutOptions;
}

interface ForceGraphMethods {
  d3Force: (forceName: string) => ForceLayoutOptions | undefined;
  zoomToFit: (duration?: number, padding?: number) => void;
  zoom: (scale: number, duration?: number) => void;
  centerAt: (x: number, y: number, duration?: number) => void;
}

// --- PALET WARNA PROFESIONAL UNTUK GRAFIK ---
const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#14b8a6', '#f97316', '#ef4444', '#64748b'];

// --- UPDATE KEAMANAN: Fungsi Fetcher Proxy Internal ---
const proxyFetcher = async (endpoint: string) => {
  const res = await fetch(`/api/market?endpoint=${encodeURIComponent(endpoint)}`);
  if (!res.ok) throw new Error('Gagal mengambil data via proxy');
  return res.json();
};

// --- HELPER FORMATTING ---
const formatShares = (num: number) => {
  if (!num) return "-";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Miliar';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' Juta';
  return num.toLocaleString('id-ID');
};

const formatShortVal = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('en-US');
};

const formatDynamicPercentage = (val: number) => {
  if (val === 0) return "0.00%";
  if (val < 0.001) return "< 0.001%";          
  if (val < 0.01) return val.toFixed(4) + "%"; 
  if (val < 0.1) return val.toFixed(3) + "%";  
  return val.toFixed(2) + "%";                 
};

const getHoldingBadgeStyle = (type: string, name: string) => {
  const t = type.toLowerCase();
  const n = name.toLowerCase();

  if (t.includes('masyarakat') || t.includes('public') || t.includes('non warkat') || n.includes('masyarakat') || n.includes('non warkat')) {
    return "bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]"; 
  }
  if (t.includes('direksi') || n.includes('direktur') || n.includes('direksi') || t.includes('komisaris') || n.includes('komisaris')) {
    return "bg-[#eab308]/15 border-[#eab308]/40 text-[#eab308]"; 
  }
  if (t.includes('lebih')) {
    return "bg-[#3b82f6]/15 border-[#3b82f6]/40 text-[#3b82f6]"; 
  }
  if (t.includes('kurang')) {
    return "bg-[#f97316]/15 border-[#f97316]/40 text-[#f97316]"; 
  }
  if (t.includes('pengendali')) {
    return "bg-[#8b5cf6]/15 border-[#8b5cf6]/40 text-[#8b5cf6]"; 
  }
  
  return "bg-[#2d2d2d]/50 border-[#3e3e3e] text-neutral-300"; 
};

const getEffectiveDateAPI = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
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

export default function ShareholdersWidget({ 
  customDate, 
  dateMode = 'single', 
  startDate, 
  endDate 
}: ShareholdersWidgetProps) {
  
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "BBCA";
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);
  const getCompany = useCompanyStore(state => state.getCompany);
  const companyMaster = getCompany(globalSymbol);

  const [activeTab, setActiveTab] = useState<'SHAREHOLDERS' | 'FREE_FLOAT' | 'NETWORK_MAP'>('SHAREHOLDERS');
  const [searchInput, setSearchInput] = useState("");
  
  const graphRef = useRef<ForceGraphMethods | null>(null); 
  
  const isRangeMode = dateMode === 'range' && !!startDate && !!endDate;

  const displayDate = useMemo(() => {
    if (isRangeMode) {
      const s = new Date(startDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      const e = new Date(endDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
      return `${s} - ${e}`;
    }
    const tDate = customDate || getEffectiveDateAPI();
    return new Date(tDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }, [isRangeMode, customDate, startDate, endDate]);

  useEffect(() => {
    setSearchInput(globalSymbol);
  }, [globalSymbol]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setGlobalSymbol(searchInput.trim().toUpperCase());
    }
  };

  const { data: profileData, isLoading: isLoadingProfile } = useSWR<GoApiProfileData>(
    `profile-detail-${globalSymbol}`,
    async () => {
      const json = await proxyFetcher(`stock/idx/${globalSymbol}/profile`);
      return json.data;
    },
    { refreshInterval: 60000, dedupingInterval: 10000 }
  );

  const { data: priceData } = useSWR(
    `price-${globalSymbol}`,
    () => proxyFetcher(`stock/idx/prices?symbols=${globalSymbol}`),
    { refreshInterval: 15000 }
  );

  const { data: brokerData, isLoading: isLoadingBroker } = useSWR(
    `foreign-net-${globalSymbol}-${dateMode}-${customDate}-${startDate}-${endDate}`,
    async () => {
      if (!isRangeMode) {
        const targetDateStr = customDate || getEffectiveDateAPI();
        return await proxyFetcher(`stock/idx/${globalSymbol}/broker_summary?date=${targetDateStr}&investor=FOREIGN`);
      } else {
        const dates = getDatesInRange(startDate!, endDate!);
        const promises = dates.map(d => 
          proxyFetcher(`stock/idx/${globalSymbol}/broker_summary?date=${d}&investor=FOREIGN`)
            .catch(() => ({ data: { results: [] } }))
        );
        const results = await Promise.all(promises);
        
        const combinedResults: GoApiBrokerItem[] = [];
        results.forEach(r => {
          if (r?.data?.results) {
            combinedResults.push(...r.data.results);
          }
        });
        
        return { data: { results: combinedResults } };
      }
    },
    { refreshInterval: 60000 }
  );

  const { publicPct, publicShares, isKering, enhancedShareholders, netForeignVal, marketCap, chartDataFreeFloat } = useMemo(() => {
    let pct = 0, sharesAmount = 0, netF = 0, mCap = 0;
    const sorted: (GoApiProfileShareholder & { numericValue: number; rawAmount: number; color: string })[] = [];

    if (brokerData?.data?.results) {
      brokerData.data.results.forEach((item: GoApiBrokerItem) => {
        if (item.side === "BUY") netF += item.value;
        else netF -= item.value;
      });
    }

    if (profileData?.shareholders) {
      const shareholders = profileData.shareholders;
      const outstanding = profileData.outstanding_shares || 0;

      const closePrice = priceData?.data?.results?.[0]?.close || 0;
      mCap = closePrice * outstanding;

      const rawSorted = [...shareholders].sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
      
      rawSorted.forEach((sh, idx) => {
        const rawAmount = parseInt(sh.amount.replace(/\./g, '')) || 0;
        let numericValue = parseFloat(sh.percentage);
        
        if (numericValue === 0 && rawAmount > 0 && outstanding > 0) {
           numericValue = (rawAmount / outstanding) * 100;
        }

        sorted.push({
          ...sh,
          numericValue: numericValue,
          rawAmount: rawAmount,
          color: CHART_COLORS[idx % CHART_COLORS.length]
        });
      });

      const publicHolder = shareholders.find(s => 
         s.name.toUpperCase().includes('MASYARAKAT') || 
         s.name.toUpperCase().includes('PUBLIC') ||
         s.name.toUpperCase().includes('NON WARKAT') ||
         s.holding_type === "Kurang dari 5%"
      );

      if (publicHolder) {
         pct = parseFloat(publicHolder.percentage) || 0;
         sharesAmount = parseInt(publicHolder.amount.replace(/\./g, '')) || 0;
      } else {
         const bigHoldersPct = shareholders.reduce((acc, s) => acc + (parseFloat(s.percentage) || 0), 0);
         pct = Math.max(0, 100 - bigHoldersPct);
         sharesAmount = (pct / 100) * outstanding;
      }
    }

    const freeFloatData = [
      { name: 'Pengendali', value: Math.max(0, 100 - pct), color: '#3b82f6' },
      { name: 'Masyarakat', value: pct, color: pct < 30 ? '#10b981' : '#ef4444' }
    ];

    return { 
      publicPct: pct, 
      publicShares: sharesAmount, 
      isKering: pct < 30, 
      enhancedShareholders: sorted,
      netForeignVal: netF,
      marketCap: mCap,
      chartDataFreeFloat: freeFloatData
    };
  }, [profileData, brokerData, priceData]);

  // --- LOGIKA NETWORK MAP (STATIC QUADRANT LAYOUT DIPERLUAS) ---
  const graphData = useMemo(() => {
    if (!profileData) return { nodes: [], links: [] };

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // 1. Emiten (Titik Pusat Tetap / 0,0)
    nodes.push({
      id: profileData.symbol,
      name: profileData.name,
      val: 65, 
      type: 'center',
      color: '#10b981',
      fx: 0,
      fy: 0
    });

    const baseRadius = 350; 
    const tierGap = 130;

    // 2. Pemegang Saham (Kuadran 1: Kanan Atas -> Sudut 0 sd -90 derajat)
    const shList = profileData.shareholders || [];
    const shCount = shList.length;
    shList.forEach((sh, i) => {
      const id = `sh-${i}`;
      const sAngle = 0;
      const eAngle = -Math.PI / 2;
      const pad = shCount > 1 ? (eAngle - sAngle) * 0.15 : 0;
      let angle = (sAngle + eAngle) / 2;
      if (shCount > 1) angle = (sAngle + pad) + (eAngle - sAngle - 2*pad) * (i / (shCount - 1));
      
      const r = baseRadius + (i % 3) * tierGap; 
      nodes.push({
        id, name: sh.name, val: 35, type: 'holder', color: '#3b82f6',
        info: `${sh.percentage}% Ownership`,
        fx: Math.cos(angle) * r, fy: Math.sin(angle) * r
      });
      links.push({ source: profileData.symbol, target: id, label: 'Shares' });
    });

    // 3. Direksi (Kuadran 2: Kiri Atas -> Sudut -90 sd -180 derajat)
    const dirList = profileData.directors || [];
    const dirCount = dirList.length;
    dirList.forEach((dir, i) => {
      const id = `dir-${i}`;
      const sAngle = -Math.PI / 2;
      const eAngle = -Math.PI;
      const pad = dirCount > 1 ? (eAngle - sAngle) * 0.15 : 0;
      let angle = (sAngle + eAngle) / 2;
      if (dirCount > 1) angle = (sAngle + pad) + (eAngle - sAngle - 2*pad) * (i / (dirCount - 1));
      
      const r = baseRadius + (i % 3) * tierGap;
      nodes.push({
        id, name: dir.name, val: 25, type: 'management', color: '#ec4899',
        info: dir.role,
        fx: Math.cos(angle) * r, fy: Math.sin(angle) * r
      });
      links.push({ source: profileData.symbol, target: id, label: 'Director' });
    });

    // 4. Komisaris (Kuadran 3: Kiri Bawah -> Sudut 180 sd 90 derajat)
    const comList = profileData.commissioners || [];
    const comCount = comList.length;
    comList.forEach((com, i) => {
      const id = `com-${i}`;
      const sAngle = Math.PI;
      const eAngle = Math.PI / 2;
      const pad = comCount > 1 ? (eAngle - sAngle) * 0.15 : 0;
      let angle = (sAngle + eAngle) / 2;
      if (comCount > 1) angle = (sAngle + pad) + (eAngle - sAngle - 2*pad) * (i / (comCount - 1));
      
      const r = baseRadius + (i % 3) * tierGap;
      nodes.push({
        id, name: com.name, val: 25, type: 'management', color: '#f59e0b',
        info: com.role,
        fx: Math.cos(angle) * r, fy: Math.sin(angle) * r
      });
      links.push({ source: profileData.symbol, target: id, label: 'Commissioner' });
    });

    // 5. Anak Usaha (Kuadran 4: Kanan Bawah -> Sudut 90 sd 0 derajat)
    const subList = profileData.subsidiary_companies || [];
    const subCount = subList.length;
    subList.forEach((sub, i) => {
      const id = `sub-${i}`;
      const sAngle = Math.PI / 2;
      const eAngle = 0;
      const pad = subCount > 1 ? (eAngle - sAngle) * 0.15 : 0;
      let angle = (sAngle + eAngle) / 2;
      if (subCount > 1) angle = (sAngle + pad) + (eAngle - sAngle - 2*pad) * (i / (subCount - 1));
      
      const r = baseRadius + (i % 3) * tierGap;
      nodes.push({
        id, name: sub.name, val: 30, type: 'subsidiary', color: '#8b5cf6',
        info: `Own: ${sub.percentage_own}`,
        fx: Math.cos(angle) * r, fy: Math.sin(angle) * r
      });
      links.push({ source: profileData.symbol, target: id, label: 'Subsidiary' });
    });

    return { nodes, links };
  }, [profileData]);

  // Efek Auto Fit ke dalam kotak
  useEffect(() => {
    if (activeTab === 'NETWORK_MAP' && graphRef.current) {
      setTimeout(() => {
        if (graphRef.current && typeof graphRef.current.zoomToFit === 'function') {
          graphRef.current.zoomToFit(600, 80); 
        }
      }, 150); 
    }
  }, [activeTab, graphData]);

  const isLoading = isLoadingProfile || isLoadingBroker;

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-[#1e1e1e] border border-[#2d2d2d] p-3 rounded-lg shadow-xl">
          <p className="text-white font-bold text-[12px]">{payload[0].name}</p>
          <p className="text-[#10b981] font-black text-[14px]">{formatDynamicPercentage(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full w-full min-w-[900px] font-sans bg-[#121212] border border-[#2d2d2d] rounded-xl shadow-lg overflow-hidden relative">
      
      {/* --- WIDGET HEADER --- */}
      <div className="flex items-center justify-between shrink-0 bg-[#121212] px-4 py-3 border-b border-[#2d2d2d]">
        <div className="flex items-center gap-3">
           {/* eslint-disable-next-line @next/next/no-img-element */}
           <img src={companyMaster?.logo || `https://s3.goapi.io/logo/${globalSymbol}.jpg`} alt="" className="w-8 h-8 rounded-lg bg-white p-0.5 shadow-sm border border-[#2d2d2d]" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
           <div className="flex flex-col">
              <span className="text-white text-[14px] font-extrabold tracking-wide flex items-center gap-2">
                {globalSymbol}
                {isLoading && <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></div>}
              </span>
              <span className="text-neutral-500 text-[10px] font-medium truncate max-w-[200px]">{profileData?.name || companyMaster?.name || "Memuat..."}</span>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-full border border-[#2d2d2d]">
            <button
              onClick={() => setActiveTab('SHAREHOLDERS')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold rounded-full transition-all ${
                activeTab === 'SHAREHOLDERS' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Users size={12} /> Pemegang Saham
            </button>
            <button
              onClick={() => setActiveTab('FREE_FLOAT')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold rounded-full transition-all ${
                activeTab === 'FREE_FLOAT' ? 'bg-[#10b981] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <PieChart size={12} /> Free Float Analysis
            </button>
            <button
              onClick={() => setActiveTab('NETWORK_MAP')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold rounded-full transition-all ${
                activeTab === 'NETWORK_MAP' ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Globe size={12} /> Network Map
            </button>
          </div>

          <div className="h-6 w-px bg-[#2d2d2d]"></div>

          <form onSubmit={handleSearchSubmit} className="flex items-center bg-[#1e1e1e] border border-[#2d2d2d] rounded-full px-3 py-1.5 focus-within:border-[#10b981] transition-colors shadow-inner w-[160px]">
            <Search size={14} className="text-neutral-500 mr-2 shrink-0" />
            <input 
              type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              placeholder="CARI SAHAM..."
              className="bg-transparent text-white font-bold outline-none w-full placeholder-neutral-600 uppercase text-[11px] tracking-widest" maxLength={4}
            />
          </form>
        </div>
      </div>

      {/* --- KONTEN UTAMA --- */}
      <div className="flex-1 overflow-hidden bg-[#121212] relative flex">
        
        {activeTab === 'SHAREHOLDERS' && (
          <>
            <div className="w-[35%] border-r border-[#2d2d2d] p-6 flex flex-col items-center justify-center relative bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
              <h3 className="text-neutral-400 font-bold text-[11px] tracking-widest uppercase mb-4 w-full text-center">Komposisi Kepemilikan</h3>
              <div className="w-full h-[250px]">
                {enhancedShareholders.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={enhancedShareholders}
                        cx="50%" cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="numericValue"
                        stroke="none"
                      >
                        {enhancedShareholders.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600 text-[11px]">Memuat Grafik...</div>
                )}
              </div>
              <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-white font-black text-[20px]">{globalSymbol}</div>
                <div className="text-neutral-500 text-[10px]">Saham</div>
              </div>
            </div>

            <div className="w-[65%] flex flex-col h-full overflow-hidden">
              <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] px-5 py-3 bg-[#181818] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-500 uppercase tracking-widest items-center shrink-0">
                <div>Nama Entitas / Individu</div>
                <div className="text-center">Status Kepemilikan</div>
                <div className="text-right">Jumlah Lembar</div>
                <div className="text-right">Porsi (%)</div>
              </div>
              
              <div className="flex flex-col flex-1 overflow-y-auto pb-4 hide-scrollbar">
                {enhancedShareholders.length === 0 && !isLoading ? (
                  <div className="flex-1 flex justify-center items-center text-neutral-500 text-[11px] font-medium">Data pemegang saham tidak tersedia.</div>
                ) : (
                  enhancedShareholders.map((sh, idx) => {
                    const isPublic = sh.name.toUpperCase().includes('MASYARAKAT') || sh.name.toUpperCase().includes('PUBLIC');
                    
                    return (
                      <div key={idx} className="grid grid-cols-[2fr_1.5fr_1.5fr_1fr] px-5 py-4 items-center text-[12px] border-b border-[#2d2d2d]/40 hover:bg-[#1e1e1e] cursor-pointer transition-colors group">
                        <div className="flex items-center gap-3">
                          <Circle size={10} fill={sh.color} className="shrink-0" strokeWidth={0} />
                          <div className="flex flex-col">
                            <span className={`font-bold tracking-wide leading-tight ${isPublic ? 'text-[#10b981]' : 'text-neutral-200 group-hover:text-white transition-colors'}`}>
                              {sh.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-center">
                          {/* BADGE TAB 1 DIPERBARUI MENJADI rounded-full & px-3 */}
                          <span className={`border px-3 py-1 rounded-full text-[10px] font-bold tracking-wider ${getHoldingBadgeStyle(sh.holding_type, sh.name)}`}>
                            {sh.holding_type || 'TERDAFTAR'}
                          </span>
                        </div>
                        <div className="text-right text-neutral-400 font-medium tabular-nums">{sh.rawAmount.toLocaleString('id-ID')}</div>
                        <div className="text-right font-black tabular-nums text-white text-[13px]">
                           {formatDynamicPercentage(sh.numericValue)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'FREE_FLOAT' && (
          <>
            <div className="w-[35%] border-r border-[#2d2d2d] p-6 flex flex-col items-center justify-center relative bg-gradient-to-b from-[#121212] to-[#1a1a1a]">
              <h3 className="text-neutral-400 font-bold text-[11px] tracking-widest uppercase mb-4 w-full text-center">Pengendali vs Publik</h3>
              <div className="w-full h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={chartDataFreeFloat}
                      cx="50%" cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartDataFreeFloat.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-6">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Pengendali</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isKering ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`}></div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Masyarakat</span>
                 </div>
              </div>
            </div>

            <div className="w-[65%] flex flex-col h-full overflow-hidden">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-3 bg-[#181818] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-500 uppercase tracking-widest items-center shrink-0">
                <div>Metrik Bandarmologi</div>
                <div className="text-right">Nilai / Lembar</div>
                <div className="text-right">Persentase</div>
                <div className="text-center">Indikator & Status</div>
              </div>

              <div className="flex flex-col flex-1 overflow-y-auto pb-4 hide-scrollbar">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-5 items-center text-[12px] border-b border-[#2d2d2d]/40 hover:bg-[#1e1e1e] transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-white font-bold tracking-wide">Total Saham Beredar</span>
                    <span className="text-neutral-500 text-[10px]">Outstanding Shares (100%)</span>
                  </div>
                  <div className="text-right text-white font-bold tabular-nums">{formatShares(profileData?.outstanding_shares || 0)}</div>
                  <div className="text-right text-neutral-400 font-semibold tabular-nums">100.00%</div>
                  <div className="flex justify-center">
                      {/* BADGE TAB 2 DIPERBARUI MENJADI rounded-full */}
                      <span className="bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/30 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wide">
                        Market Cap: Rp {formatShortVal(marketCap)}
                      </span>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-5 items-center text-[12px] border-b border-[#2d2d2d]/40 hover:bg-[#1e1e1e] transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-white font-bold tracking-wide">Kepemilikan Pengendali</span>
                    <span className="text-neutral-500 text-[10px]">Institusi / Pemegang Saham Besar</span>
                  </div>
                  <div className="text-right text-white font-bold tabular-nums">{formatShares((profileData?.outstanding_shares || 0) - publicShares)}</div>
                  <div className="text-right text-neutral-400 font-semibold tabular-nums">{Math.max(0, 100 - publicPct).toFixed(2)}%</div>
                  <div className="flex justify-center w-full px-8">
                      <div className="w-full h-2 bg-[#2d2d2d] rounded-full overflow-hidden">
                        <div className="h-full bg-[#3b82f6] rounded-full" style={{ width: `${Math.max(0, 100 - publicPct)}%` }}></div>
                      </div>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-5 items-center text-[12px] border-b border-[#2d2d2d]/40 hover:bg-[#1e1e1e] transition-colors bg-[#1e1e1e]/30">
                  <div className="flex flex-col gap-1.5">
                    <span className={`font-bold tracking-wide ${isKering ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>Porsi Masyarakat (Free Float)</span>
                    <span className="text-neutral-500 text-[10px]">Saham Ritel & Publik (&lt;5%)</span>
                  </div>
                  <div className={`text-right font-bold tabular-nums ${isKering ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{formatShares(publicShares)}</div>
                  <div className={`text-right font-black tabular-nums text-[14px] ${isKering ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{publicPct.toFixed(2)}%</div>
                  <div className="flex justify-center gap-2 items-center">
                      {/* BADGE TAB 2 DIPERBARUI MENJADI rounded-full */}
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${isKering ? 'bg-[#10b981] text-white' : 'bg-[#ef4444] text-white'}`}>
                        {isKering ? 'SAHAM KERING' : 'SAHAM BASAH'}
                      </span>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-5 items-center text-[12px] border-b border-[#2d2d2d]/40 hover:bg-[#1e1e1e] transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-white font-bold tracking-wide flex items-center gap-2">Aktivitas Asing (Net Foreign)</span>
                    <span className="text-neutral-500 text-[10px] flex items-center gap-1">Periode: <span className="text-[#3b82f6] font-bold">{displayDate}</span></span>
                  </div>
                  <div className={`text-right font-black tabular-nums text-[13px] ${netForeignVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {netForeignVal > 0 ? '+' : ''}Rp {formatShortVal(netForeignVal)}
                  </div>
                  <div className="text-right text-neutral-500 font-semibold tabular-nums">-</div>
                  <div className="flex justify-center gap-2 items-center">
                      {/* BADGE TAB 2 DIPERBARUI MENJADI rounded-full */}
                      <span className={`px-4 py-1.5 rounded-full border text-[10px] font-bold tracking-wide ${netForeignVal >= 0 ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'}`}>
                        {netForeignVal >= 0 ? 'AKUMULASI ASING' : 'DISTRIBUSI ASING'}
                      </span>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}

        {/* TAB 3 BARU: NETWORK MAP (QUADRANT LAYOUT DIPERLUAS) */}
        {activeTab === 'NETWORK_MAP' && (
          <div className="h-full w-full bg-[#0a0a0a] relative flex items-center justify-center overflow-hidden">
             
             {/* LABEL KUADRAN STATIS DI POJOK-POJOK - DIPERBARUI rounded-full */}
             <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-[#1e1e1e]/80 border border-[#3b82f6]/40 px-4 py-2 rounded-full pointer-events-none shadow-xl backdrop-blur-sm">
                 <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                 <span className="text-[#3b82f6] text-[11px] font-black uppercase tracking-widest">Shareholders</span>
             </div>
             <div className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-[#1e1e1e]/80 border border-[#ec4899]/40 px-4 py-2 rounded-full pointer-events-none shadow-xl backdrop-blur-sm">
                 <div className="w-3 h-3 rounded-full bg-[#ec4899]"></div>
                 <span className="text-[#ec4899] text-[11px] font-black uppercase tracking-widest">Board of Directors</span>
             </div>
             <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 bg-[#1e1e1e]/80 border border-[#f59e0b]/40 px-4 py-2 rounded-full pointer-events-none shadow-xl backdrop-blur-sm">
                 <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                 <span className="text-[#f59e0b] text-[11px] font-black uppercase tracking-widest">Commissioners</span>
             </div>
             <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 bg-[#1e1e1e]/80 border border-[#8b5cf6]/40 px-4 py-2 rounded-full pointer-events-none shadow-xl backdrop-blur-sm">
                 <div className="w-3 h-3 rounded-full bg-[#8b5cf6]"></div>
                 <span className="text-[#8b5cf6] text-[11px] font-black uppercase tracking-widest">Subsidiaries</span>
             </div>

             <ForceGraph2D
               // Trik React standar menghindari error linter: mengganti 'any' dengan 'unknown'
               ref={(el: unknown) => { if (el) graphRef.current = el as ForceGraphMethods; }}
               graphData={graphData}
               nodeColor={(node) => (node as GraphNode).color}
               linkColor={() => '#2d2d2d'}
               linkWidth={1.5}
               backgroundColor="#0a0a0a"
               nodeCanvasObject={(node, ctx, globalScale) => {
                 const n = node as GraphNode;
                 
                 // Pengecekan ketat agar Type 'undefined' tidak masuk ke perhitungan 'number'
                 if (typeof n.x !== 'number' || typeof n.y !== 'number') return;
                 
                 // Variabel x & y sudah dipastikan tipenya 'number'
                 const x = n.x;
                 const y = n.y;

                 // 1. Gambar Garis Crosshair / Grid Radar di Latar (Hanya saat menggambar node Center)
                 if (n.type === 'center') {
                     ctx.save();
                     ctx.beginPath();
                     ctx.moveTo(x - 3000, y);
                     ctx.lineTo(x + 3000, y);
                     ctx.moveTo(x, y - 3000);
                     ctx.lineTo(x, y + 3000);
                     ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; 
                     ctx.lineWidth = 1 / globalScale;
                     ctx.setLineDash([5, 5]);
                     ctx.stroke();

                     // Cincin Radar Pembatas Jarak disesuaikan dengan Tiering Radius yang baru
                     [350, 480, 610].forEach(r => {
                        ctx.beginPath();
                        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                        ctx.stroke();
                     });
                     ctx.restore();
                 }

                 const label = n.name;
                 const fontSize = n.type === 'center' ? 16 / globalScale : 12 / globalScale;
                 ctx.font = `bold ${fontSize}px Inter, sans-serif`;
                 const textWidth = ctx.measureText(label).width;
                 const bckg = [textWidth, fontSize].map(size => size + fontSize * 0.6);

                 // 2. Lingkaran Entitas (Menggunakan variabel pasti x & y dari ekstraksi di atas)
                 ctx.beginPath();
                 ctx.arc(x, y, n.val / 2, 0, 2 * Math.PI, false);
                 ctx.fillStyle = n.color;
                 ctx.fill();

                 // 3. Nama & Info Entitas
                 if (globalScale > 0.4) { // Disesuaikan agar bisa dilihat walau di zoom-out jauh
                   ctx.fillStyle = 'rgba(18, 18, 18, 0.85)';
                   ctx.fillRect(x - bckg[0] / 2, y + (n.val / 2) + 4, bckg[0], bckg[1]);
                   
                   ctx.textAlign = 'center';
                   ctx.textBaseline = 'middle';
                   ctx.fillStyle = '#ffffff';
                   ctx.fillText(label, x, y + (n.val / 2) + 4 + bckg[1] / 2);

                   if (n.info) {
                     ctx.font = `normal ${10 / globalScale}px Inter, sans-serif`;
                     ctx.fillStyle = '#a3a3a3';
                     ctx.fillText(n.info, x, y + (n.val / 2) + 4 + bckg[1] + (6 / globalScale));
                   }
                 }
               }}
               onNodeDragEnd={(node) => {
                 const n = node as GraphNode;
                 if (n.x !== undefined && n.y !== undefined) {
                   n.fx = n.x;
                   n.fy = n.y;
                 }
               }}
             />
          </div>
        )}

      </div>

      <div className="px-4 py-2 border-t border-[#2d2d2d] bg-[#121212] shrink-0 text-center z-10">
        <span className="text-[10px] text-neutral-500 flex items-center justify-center gap-1.5 font-medium">
           <Info size={12} /> Arahkan kursor pada grafik untuk melihat detail persentase. Gunakan Search Bar untuk mengganti emiten.
        </span>
      </div>

    </div>
  );
}