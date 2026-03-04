// src/components/layouts/ShareholdersWidget.tsx
"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Calendar, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// --- TIPE DATA GOAPI ---
interface GoApiTrendItem { symbol: string; }
interface GoApiPriceItem {
  symbol: string; 
  close: number; 
  change: number; 
  change_pct: number; 
  volume: number;
}
interface GoApiBrokerItem {
  code?: string; broker?: { code: string }; side: string; value: number;
}
interface GoApiProfileShareholder {
  name: string;
  percentage: string;
  holding_type: string;
}

// --- TIPE DATA ROW TABLE ---
interface ShareholderRow {
  symbol: string;
  close: number;
  changePct: number;
  marketCap: number;
  volume: number;
  netForeign: number;
  publicPercentage: number;
  topHolderName: string;
  topHolderPct: number;
  status: 'KERING' | 'BASAH';
}

type SortConfig = {
  key: keyof ShareholderRow;
  direction: 'asc' | 'desc';
} | null;

// --- HELPER FORMATTING ---
const getEffectiveDateAPI = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

const formatShort = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString('en-US');
};

export default function ShareholdersWidget() {
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const getCompany = useCompanyStore(state => state.getCompany);
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);

  // --- STATE FILTERS & SORTING ---
  const [selectedDate, setSelectedDate] = useState(getEffectiveDateAPI());
  
  // Default sorting: dari publik paling sedikit (Kering)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'publicPercentage', direction: 'asc' });

  // 1. Fetch Smart Pool (Membatasi 60 saham teraktif agar API tidak Rate Limit)
  const { data: smartPool } = useSWR(
    `shareholder-screener-pool`,
    async () => {
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const [t, g, l, lq45] = await Promise.all([
        fetch('https://api.goapi.io/stock/idx/trending', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_loser', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/index/LQ45/items', { headers }).then(r=>r.json())
      ]);
      const symSet = new Set<string>();
      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      (lq45.data?.results||[]).forEach((sym: string) => symSet.add(sym));
      
      return Array.from(symSet).slice(0, 60); 
    }, { dedupingInterval: 60000 }
  );

  // 2. Fetch Prices (Realtime 15s)
  const { data: prices, isLoading: isLoadingPrices } = useSWR(
    smartPool ? `shareholder-prices-${smartPool.join(',')}` : null,
    () => fetch(`https://api.goapi.io/stock/idx/prices?symbols=${smartPool?.join(',')}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()),
    { refreshInterval: 15000 }
  );

  // 3. Fetch Broker Summary (Realtime Net Foreign hari itu)
  const { data: brokerData } = useSWR(
    smartPool ? `shareholder-brokers-${smartPool.join(',')}-${selectedDate}` : null,
    async () => {
       const promises = smartPool!.map(sym =>
          fetch(`https://api.goapi.io/stock/idx/${sym}/broker_summary?date=${selectedDate}&investor=FOREIGN`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }})
            .then(res => res.json())
            .then(res => ({ symbol: sym, data: res.data?.results || [] }))
            .catch(() => ({ symbol: sym, data: [] }))
        );
        return await Promise.all(promises);
    }, { dedupingInterval: 60000 }
  );

  // 4. Fetch Profil Perusahaan (Data Snapshot Pemegang Saham & Float)
  const { data: profileData, isLoading: isLoadingProfiles } = useSWR(
    smartPool ? `shareholder-profiles-${smartPool.join(',')}` : null,
    async () => {
       const promises = smartPool!.map(sym =>
          fetch(`https://api.goapi.io/stock/idx/${sym}/profile`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }})
            .then(res => res.json())
            .then(res => ({ symbol: sym, data: res.data || null }))
            .catch(() => ({ symbol: sym, data: null }))
        );
        return await Promise.all(promises);
    }, { dedupingInterval: 86400000 } // Cache 1 hari
  );

  // 5. Kalkulasi & Eksekusi Data (Hanya Data Asli GoAPI yang Dihitung)
  const screenerData: ShareholderRow[] = useMemo(() => {
    if (!prices?.data?.results || !profileData) return [];
    
    const rows: ShareholderRow[] = [];
    
    prices.data.results.forEach((p: GoApiPriceItem) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prof = profileData.find((pr: any) => pr.symbol === p.symbol)?.data;
      if (!prof) return;

      const outstandingShares = prof.outstanding_shares || 0;
      const marketCap = p.close * outstandingShares;

      let publicPct = 0;
      const shareholders = prof.shareholders || [];
      
      // Hitung % Publik (Float Real)
      const publicHolder = shareholders.find((s: GoApiProfileShareholder) => 
         s.name.toUpperCase().includes('MASYARAKAT') || 
         s.name.toUpperCase().includes('PUBLIC') ||
         s.holding_type === "Kurang dari 5%"
      );

      if (publicHolder) {
         publicPct = parseFloat(publicHolder.percentage) || 0;
      } else {
         const bigHoldersPct = shareholders.reduce((acc: number, s: GoApiProfileShareholder) => acc + (parseFloat(s.percentage) || 0), 0);
         publicPct = Math.max(0, 100 - bigHoldersPct);
      }

      // Cari Pemegang Saham Terbesar (Pengendali) selain Publik
      let topHolderName = "-";
      let topHolderPct = 0;
      const nonPublicHolders = shareholders.filter((s: GoApiProfileShareholder) => 
         !s.name.toUpperCase().includes('MASYARAKAT') && 
         !s.name.toUpperCase().includes('PUBLIC') &&
         s.holding_type !== "Kurang dari 5%"
      );

      if (nonPublicHolders.length > 0) {
         const top = nonPublicHolders.reduce((prev: GoApiProfileShareholder, current: GoApiProfileShareholder) => 
            (parseFloat(prev.percentage) > parseFloat(current.percentage)) ? prev : current
         );
         topHolderName = top.name;
         topHolderPct = parseFloat(top.percentage) || 0;
      }

      // Hitung Net Foreign
      let netForeign = 0;
      if (brokerData) {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const bData = brokerData.find((b: any) => b.symbol === p.symbol)?.data || [];
         bData.forEach((item: GoApiBrokerItem) => {
            if (item.side === "BUY") netForeign += item.value;
            else netForeign -= item.value;
         });
      }

      rows.push({
        symbol: p.symbol,
        close: p.close,
        changePct: p.change_pct,
        marketCap,
        volume: p.volume,
        netForeign,
        publicPercentage: publicPct,
        topHolderName,
        topHolderPct,
        status: publicPct < 30 ? 'KERING' : 'BASAH'
      });
    });

    // Handle Sorting Berdasarkan Konfigurasi
    if (sortConfig !== null) {
      rows.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return rows;
  }, [prices, profileData, brokerData, sortConfig]);

  const handleSort = (key: keyof ShareholderRow) => {
    let direction: 'asc' | 'desc' = 'desc'; // Default klik pertama descending
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: keyof ShareholderRow) => {
    if (sortConfig?.key !== key) return <ArrowUpDown size={12} className="ml-1 opacity-40 group-hover:opacity-100" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={12} className="ml-1 text-[#10b981]" /> : <ArrowDown size={12} className="ml-1 text-[#ef4444]" />;
  };

  const isScanning = isLoadingPrices || isLoadingProfiles;

  return (
    <div className="flex flex-col h-full w-full min-w-[1200px] gap-2 font-sans bg-[#121212]">
      
      {/* --- HEADER DATE PICKER (DIPINDAH KE KIRI) --- */}
      <div className="flex justify-start shrink-0 bg-[#121212] px-1 pt-1">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg hover:border-[#3b82f6] transition-colors">
          <Calendar size={13} className="text-neutral-500" /> 
          <input 
            type="date" 
            value={selectedDate}
            max={getEffectiveDateAPI()} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-[11px] font-bold text-neutral-300 outline-none cursor-pointer uppercase tracking-wider"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      {/* --- TABEL SCREENER SHAREHOLDERS --- */}
      <div className="flex-1 bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden mt-1 relative">
        
        {/* HEADER KOLOM TABEL (Background 121212) */}
        <div className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_1fr_1.8fr_1.2fr] px-5 py-3.5 bg-[#121212] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-400 uppercase tracking-widest items-center shrink-0">
          <div>Emiten</div>
          
          <div className="flex items-center cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('close')}>
            Harga {renderSortIcon('close')}
          </div>
          
          <div className="flex items-center justify-end cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('marketCap')}>
            Market Cap {renderSortIcon('marketCap')}
          </div>
          
          <div className="flex items-center justify-end cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('volume')}>
            Volume {renderSortIcon('volume')}
          </div>

          <div className="flex items-center justify-end cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('netForeign')}>
            Net Asing {renderSortIcon('netForeign')}
          </div>
          
          <div className="pl-6">Pengendali Utama (Top Holder)</div>

          <div className="flex items-center justify-center cursor-pointer group hover:text-white transition-colors" onClick={() => handleSort('publicPercentage')}>
            Float / Publik {renderSortIcon('publicPercentage')}
          </div>
        </div>

        {/* BODY TABEL (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative">
          
          {isScanning && (
             <div className="absolute inset-0 z-10 flex flex-col gap-2 justify-center items-center text-[#10b981] bg-[#121212]/90 backdrop-blur-sm">
               <div className="w-8 h-8 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
               <span className="text-[12px] font-bold animate-pulse">Menyelaraskan Data Pemegang Saham...</span>
             </div>
          )}
          
          {screenerData.map((row: ShareholderRow, idx: number) => {
            const comp = getCompany(row.symbol);
            const isUp = row.changePct >= 0;
            const colorPrice = isUp ? "text-[#10b981]" : "text-[#ef4444]";
            const isKering = row.status === 'KERING';

            return (
              <div 
                key={idx}
                onClick={() => setGlobalSymbol(row.symbol)}
                className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_1fr_1.8fr_1.2fr] px-5 py-3.5 items-center text-[12px] tabular-nums hover:bg-[#1e1e1e] cursor-pointer border-b border-[#2d2d2d]/50 transition-colors group"
              >
                {/* KOLOM 1: EMITEN */}
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={comp?.logo || `https://s3.goapi.io/logo/${row.symbol}.jpg`} alt="" className="w-7 h-7 rounded-full bg-white p-0.5 shadow-sm" onError={e => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
                  <span className="font-extrabold text-white group-hover:text-[#10b981] transition-colors tracking-wide text-[13px]">{row.symbol}</span>
                </div>
                
                {/* KOLOM 2: HARGA */}
                <div className="flex flex-col gap-0.5 font-bold">
                  <span className="text-white text-[13px]">{row.close.toLocaleString('id-ID')}</span>
                  <span className={`text-[10px] ${colorPrice}`}>{isUp?'+':''}{row.changePct.toFixed(2)}%</span>
                </div>

                {/* KOLOM 3: MARKET CAP */}
                <div className="text-right text-[#f59e0b] font-bold tracking-wide">{formatShort(row.marketCap)}</div>
                
                {/* KOLOM 4: VOLUME */}
                <div className="text-right text-neutral-300 font-medium">{formatShort(row.volume)}</div>
                
                {/* KOLOM 5: NET ASING */}
                <div className={`text-right font-black tracking-wide ${row.netForeign >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  {row.netForeign > 0 ? '+' : ''}{formatShort(row.netForeign)}
                </div>

                {/* KOLOM 6: PENGENDALI UTAMA */}
                <div className="pl-6 flex flex-col gap-0.5 justify-center">
                   <span className="text-[11px] font-bold text-white truncate w-[90%]" title={row.topHolderName}>
                      {row.topHolderName}
                   </span>
                   <span className="text-[10px] font-medium text-neutral-500">
                      Menguasai {row.topHolderPct.toFixed(2)}% Saham
                   </span>
                </div>

                {/* KOLOM 7: FLOAT & STATUS */}
                <div className="flex items-center justify-between px-2 gap-3">
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-white font-bold mb-1 text-[11px]">{row.publicPercentage.toFixed(2)}%</span>
                    <div className="w-full h-1 bg-[#2d2d2d] rounded-full overflow-hidden">
                       <div 
                          className={`h-full rounded-full transition-all duration-500 ${isKering ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} 
                          style={{ width: `${Math.min(row.publicPercentage, 100)}%` }}
                       ></div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase tracking-widest shrink-0 ${
                      isKering ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50' : 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30'
                   }`}>
                      {row.status}
                  </span>
                </div>
                
              </div>
            );
          })}
          
        </div>
      </div>
    </div>
  );
}