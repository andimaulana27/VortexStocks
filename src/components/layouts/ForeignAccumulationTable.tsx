/* eslint-disable @next/next/no-img-element */
// src/components/layouts/ForeignAccumulationTable.tsx
"use client";

import React from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA ---
interface GoApiTrendItem { symbol: string; }
interface GoApiBrokerItem {
  broker?: { code: string; name: string; }; code?: string; side: string; lot: number; value: number;
}
interface StockNet {
  symbol: string;
  name: string;
  netVal: number;
  netLot: number;
  avgPrice: number;
  logo?: string;
}

// --- HELPER FORMAT ---
const formatValue = (num: number) => { 
  if (!num) return "-";
  const abs = Math.abs(num);
  if (abs >= 1e9) return (abs / 1e9).toFixed(1) + 'B'; 
  if (abs >= 1e6) return (abs / 1e6).toFixed(1) + 'M'; 
  if (abs >= 1e3) return (abs / 1e3).toFixed(1) + 'K'; 
  return abs.toString(); 
};

export default function ForeignAccumulationTable({ selectedBrokers, customDate }: { selectedBrokers: string[], customDate: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);
  const activeSymbol = useCompanyStore(state => state.activeSymbol);
  const getCompany = useCompanyStore(state => state.getCompany);

  // 1. Fetch Smart Pool (Mendapatkan List Saham Aktif di Market)
  const { data: smartPool } = useSWR(
    `smart-pool-foreign-accum`,
    async () => {
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const [t, g, l] = await Promise.all([
        fetch('https://api.goapi.io/stock/idx/trending', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_loser', { headers }).then(r=>r.json())
      ]);
      const symSet = new Set<string>();
      
      // Tambahkan default bluechips
      symSet.add("BBCA"); symSet.add("BBRI"); symSet.add("BMRI"); symSet.add("BBNI"); symSet.add("TLKM"); symSet.add("ASII"); symSet.add("AMMN"); symSet.add("BREN");
      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      
      // Batasi 60 saham agar tidak berat saat scanning
      return Array.from(symSet).slice(0, 60); 
    },
    { dedupingInterval: 60000 }
  );

  // 2. Scan & Kalkulasi Akumulasi Hanya Untuk Broker Terpilih pada Tanggal (customDate)
  const { data: accumulations, isLoading } = useSWR(
    smartPool && selectedBrokers.length > 0 ? `foreign-accum-${selectedBrokers.join('-')}-${customDate}` : null,
    async () => {
      const promises = smartPool!.map(sym =>
        fetch(`https://api.goapi.io/stock/idx/${sym}/broker_summary?date=${customDate}&investor=ALL`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }})
          .then(res => res.json())
          .then(res => ({ symbol: sym, data: res.data?.results || [] }))
          .catch(() => ({ symbol: sym, data: [] })) 
      );
      
      const results = await Promise.all(promises);
      const accumList: StockNet[] = [];

      results.forEach(res => {
        let buyVal = 0, sellVal = 0, buyLot = 0, sellLot = 0;
        
        // Loop transaksi saham
        res.data.forEach((i: GoApiBrokerItem) => {
          const code = i.broker?.code || i.code || "-";
          // Jika transaksi ini dilakukan oleh salah satu broker yang dicentang
          if (selectedBrokers.includes(code.toUpperCase())) {
            if (i.side === "BUY") { buyVal += i.value; buyLot += i.lot; } 
            else { sellVal += i.value; sellLot += i.lot; }
          }
        });

        const netVal = buyVal - sellVal;
        const netLot = buyLot - sellLot;
        
        // KITA HANYA MENCARI SAHAM YANG DIAKUMULASI (Net Val > 0)
        if (netVal > 0) { 
          const exactAvg = netLot > 0 ? netVal / (netLot * 100) : 0;
          const companyInfo = getCompany(res.symbol);
          accumList.push({ 
            symbol: res.symbol, 
            name: companyInfo?.name || `PT ${res.symbol} Tbk.`,
            netVal, 
            netLot, 
            avgPrice: exactAvg,
            logo: companyInfo?.logo
          });
        }
      });

      // UPDATE: Urutkan berdasarkan Net Value terbesar, ambil Top 20!
      return accumList.sort((a, b) => b.netVal - a.netVal).slice(0, 20); 
    },
    { dedupingInterval: 30000 }
  );

  return (
     <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col h-full overflow-hidden shadow-lg w-full relative">
        
        {/* HEADER */}
        <div className="p-3 border-b border-[#2d2d2d] shrink-0 bg-[#1e1e1e]/50 flex justify-between items-center">
            <div>
              {/* UPDATE: Ubah teks menjadi Top 20 */}
              <span className="font-bold text-white text-[12px]">Top 20 Foreign Accumulation</span>
              <p className="text-[9px] text-neutral-500 mt-0.5 max-w-[200px] truncate">
                Akumulasi terbesar dari broker: <span className="text-[#10b981] font-bold">{selectedBrokers.join(', ')}</span>
              </p>
            </div>
            <div className="bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] px-2 py-1 rounded text-[9px] font-black uppercase">
               Net Buy
            </div>
        </div>

        {/* TABLE HEADERS */}
        <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] w-full px-3 py-2 bg-[#121212] border-b border-[#2d2d2d] text-[9px] font-bold text-neutral-400 shrink-0 uppercase tracking-wider items-center">
            <div className="text-left">Symbol</div>
            <div className="text-right text-[#10b981]">Net Val</div>
            <div className="text-right text-[#10b981]">Net Lot</div>
            <div className="text-right text-[#10b981]">Est. Avg</div>
        </div>

        {/* TABLE BODY */}
        <div className="flex-1 overflow-auto hide-scrollbar relative bg-[#121212]">
            {isLoading && (
               <div className="absolute inset-0 flex justify-center items-center text-[#10b981] animate-pulse text-[10px] font-bold bg-[#121212]/80 backdrop-blur-sm z-10 min-h-[100px]">
                 Memindai Akumulasi Broker...
               </div>
            )}

            {!isLoading && accumulations?.length === 0 && (
               <div className="flex items-center justify-center h-full text-neutral-500 text-[10px]">
                 Tidak ada akumulasi signifikan.
               </div>
            )}

            <div className="flex flex-col pb-2">
                {accumulations?.map((item) => (
                  <div 
                    key={item.symbol} 
                    onClick={() => setGlobalSymbol(item.symbol)}
                    className={`grid grid-cols-[1.8fr_1fr_1fr_1fr] w-full px-3 py-2.5 items-center text-[11px] tabular-nums border-b border-[#2d2d2d]/30 hover:bg-[#1e1e1e] cursor-pointer transition-colors ${activeSymbol === item.symbol ? 'bg-[#1e1e1e] border-l-2 border-l-[#10b981]' : ''}`}
                  >
                    
                    {/* LOGO & SYMBOL */}
                    <div className="flex items-center gap-2 overflow-hidden">
                      <img 
                        src={item.logo || `https://s3.goapi.io/logo/${item.symbol}.jpg`}
                        alt={item.symbol}
                        className="w-[26px] h-[26px] shrink-0 rounded-full bg-white object-contain p-0.5 border border-[#2d2d2d]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${item.symbol}&background=1e1e1e&color=10b981&bold=true&font-size=0.4`;
                        }}
                      />
                      <div className="flex flex-col overflow-hidden">
                        <span className="font-black text-white hover:text-[#10b981] transition-colors">{item.symbol}</span>
                        <span className="text-[8px] text-neutral-500 truncate max-w-[80px] mt-0.5">{item.name}</span>
                      </div>
                    </div>
                    
                    <div className="text-right font-black text-[#10b981]">{formatValue(item.netVal)}</div>
                    <div className="text-right font-bold text-[#10b981]/80">{formatValue(item.netLot)}</div>
                    <div className="text-right font-bold text-white bg-[#2d2d2d]/50 rounded px-1.5 py-0.5 ml-auto">
                      {item.avgPrice > 0 ? Math.round(item.avgPrice) : "-"}
                    </div>
                  </div>
                ))}
            </div>
        </div>
     </div>
  );
}