// src/components/layouts/BrokerSummaryWidget.tsx
"use client";

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Calendar, Info } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';
import BrokerDetailModal, { StockActivity } from '@/components/modals/BrokerDetailModal';

// --- TIPE DATA TYPESCRIPT ---
interface GoApiBrokerItem {
  broker?: { code: string; name: string; }; code?: string; side: string; lot: number; value: number; investor: string; avg?: number; symbol: string;
}
interface GoApiTrendItem { symbol: string; }
interface BrokerNet {
  code: string; name: string; val: number; rawVal: number; lot: number; rawLot: number; avg: number; investor: string;
}

// --- FUNGSI HELPER ---
const formatVal = (num: number) => { 
  if (!num) return "-";
  const abs = Math.abs(num);
  if (abs >= 1e9) return (abs / 1e9).toFixed(1) + 'B'; 
  if (abs >= 1e6) return (abs / 1e6).toFixed(1) + 'M'; 
  if (abs >= 1e3) return (abs / 1e3).toFixed(1) + 'K'; 
  return abs.toString(); 
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

const getBrokerColorClass = (code: string, investor: string) => {
  const bumnCodes = ["CC", "NI", "OD"];
  const foreignCodes = ["AK", "BK", "CS", "CG", "DB", "DX", "FS", "GW", "KZ", "ML", "MS", "RX", "ZP", "YU", "BB"];
  if (investor.toUpperCase() === 'FOREIGN' || foreignCodes.includes(code.toUpperCase())) return "text-[#ef4444]"; 
  if (bumnCodes.includes(code.toUpperCase())) return "text-[#10b981]"; 
  return "text-[#a855f7]"; 
};

export default function BrokerSummaryWidget({ customDate }: { customDate?: string }) {
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "VKTR";
  const getCompany = useCompanyStore(state => state.getCompany);
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  
  const apiDate = customDate || getEffectiveDateAPI(); // CUSTOM DATE INTEGRATION
  const displayDate = new Date(apiDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const [modalData, setModalData] = useState<{
    isOpen: boolean; brokerCode: string; brokerName: string; investorType: string; totalNetVal: number; totalNetLot: number; avgPrice: number;
  } | null>(null);

  const { data: brokerSum, isLoading } = useSWR(
    `layout-broker-${globalSymbol}-${apiDate}`, 
    () => fetch(`https://api.goapi.io/stock/idx/${globalSymbol}/broker_summary?date=${apiDate}&investor=ALL`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()), 
    { refreshInterval: 15000, dedupingInterval: 5000 }
  );

  const { data: smartPool } = useSWR(
    `smart-pool-symbols`,
    async () => {
      const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };
      const [t, g, l] = await Promise.all([
        fetch('https://api.goapi.io/stock/idx/trending', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_gainer', { headers }).then(r=>r.json()),
        fetch('https://api.goapi.io/stock/idx/top_loser', { headers }).then(r=>r.json())
      ]);
      const symSet = new Set<string>();
      symSet.add(globalSymbol);
      symSet.add("BBCA"); symSet.add("BBRI"); symSet.add("BMRI"); symSet.add("BBNI"); 
      [...(t.data?.results||[]), ...(g.data?.results||[]), ...(l.data?.results||[])].forEach((s: GoApiTrendItem) => symSet.add(s.symbol));
      return Array.from(symSet).slice(0, 40); 
    },
    { dedupingInterval: 60000 } 
  );

  const { data: crossActivity, isLoading: isScanning } = useSWR(
    modalData?.isOpen && smartPool ? `cross-scan-${modalData.brokerCode}-${apiDate}` : null,
    async () => {
      if (!smartPool || !modalData) return [];
      const promises = smartPool.map(sym =>
        fetch(`https://api.goapi.io/stock/idx/${sym}/broker_summary?date=${apiDate}&investor=ALL`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }})
          .then(res => res.json())
          .then(res => ({ symbol: sym, data: res.data?.results || [] }))
          .catch(() => ({ symbol: sym, data: [] })) 
      );
      
      const results = await Promise.all(promises);
      const activities: StockActivity[] = [];
      
      results.forEach(res => {
        let bVal = 0, sVal = 0, avg = 0; 
        res.data.forEach((i: GoApiBrokerItem) => {
          const code = i.broker?.code || i.code || "-";
          if (code === modalData.brokerCode) {
            if (i.side === "BUY") { bVal += i.value; avg = i.avg || 0; }
            else { sVal += i.value; avg = i.avg || 0; }
          }
        });
        
        const nVal = bVal - sVal;
        if (bVal > 0 || sVal > 0) {
          const companyInfo = getCompany(res.symbol);
          activities.push({
            symbol: res.symbol, name: companyInfo?.name || `PT ${res.symbol} Tbk.`, buyVal: bVal, sellVal: sVal, netVal: nVal, avgPrice: avg
          });
        }
      });
      return activities;
    },
    { dedupingInterval: 30000 }
  );

  const { topBuyers, topSellers, actionScore } = useMemo(() => {
    if (!brokerSum?.data?.results) return { topBuyers: [], topSellers: [], actionScore: 50 };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bMap: Record<string, any> = {};
    const rawData: GoApiBrokerItem[] = brokerSum.data.results;

    rawData.forEach((item) => {
      const code = item.broker?.code || item.code || "-";
      if (!bMap[code]) bMap[code] = { code, name: item.broker?.name || "-", buyVal: 0, buyLot: 0, buyAvg: 0, sellVal: 0, sellLot: 0, sellAvg: 0, investor: item.investor || "LOCAL" };
      if (item.side === "BUY") { bMap[code].buyVal += item.value; bMap[code].buyLot += item.lot; bMap[code].buyAvg = item.avg || 0; } 
      else { bMap[code].sellVal += item.value; bMap[code].sellLot += item.lot; bMap[code].sellAvg = item.avg || 0; }
    });

    const buyers: BrokerNet[] = [];
    const sellers: BrokerNet[] = [];

    Object.values(bMap).forEach((b) => {
      const netVal = b.buyVal - b.sellVal;
      const netLot = b.buyLot - b.sellLot;
      
      if (netVal > 0) buyers.push({ code: b.code, name: b.name, val: netVal, rawVal: netVal, lot: netLot, rawLot: netLot, avg: b.buyAvg, investor: b.investor });
      else if (netVal < 0) sellers.push({ code: b.code, name: b.name, val: Math.abs(netVal), rawVal: netVal, lot: Math.abs(netLot), rawLot: netLot, avg: b.sellAvg, investor: b.investor });
    });

    buyers.sort((a, b) => b.val - a.val);
    sellers.sort((a, b) => b.val - a.val);

    const top5BuyVal = buyers.slice(0, 5).reduce((acc, curr) => acc + curr.val, 0);
    const top5SellVal = sellers.slice(0, 5).reduce((acc, curr) => acc + curr.val, 0);
    const totalTop = top5BuyVal + top5SellVal;
    
    let score = 50; 
    if (totalTop > 0) score = (top5BuyVal / totalTop) * 100; 

    return { topBuyers: buyers, topSellers: sellers, actionScore: score };
  }, [brokerSum]);

  const maxRows = Math.max(topBuyers.length, topSellers.length);
  const rows = Array.from({ length: maxRows });

  const handleOpenModal = (broker: BrokerNet) => {
    setModalData({
      isOpen: true, brokerCode: broker.code, brokerName: broker.name, investorType: broker.investor, totalNetVal: broker.rawVal, totalNetLot: broker.rawLot, avgPrice: broker.avg
    });
  };

  return (
    <>
      <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col overflow-hidden h-full shadow-lg relative w-full group">
        <div className="p-3 pb-2 flex justify-between items-center shrink-0">
          <span className="font-bold text-white text-[12px] flex items-center gap-1.5">Broker Summary</span>
        </div>

        <div className="px-3 py-1 flex items-center gap-3 text-[10px] text-neutral-400 font-semibold shrink-0">
           <span>{displayDate}</span><Calendar size={12} className="text-neutral-500 ml-1" />
        </div>

        <div className="px-3 py-3 border-b border-[#2d2d2d] shrink-0">
           <span className="text-white text-[10px] font-bold flex items-center gap-1.5 mb-2">
             Broker Action <Info size={10} className="text-neutral-500" />
           </span>
           <div className="w-full relative mb-1.5 flex items-center h-4">
              <div className="absolute inset-y-[4px] left-0 right-0 rounded overflow-hidden bg-[linear-gradient(to_right,#ef4444_0%,#9f1239_25%,#3f3f46_50%,#065f46_75%,#10b981_100%)]">
                 <div className="absolute inset-0 flex">
                    <div className="flex-1 border-r-[2px] border-[#121212]"></div>
                    <div className="flex-1 border-r-[2px] border-[#121212]"></div>
                    <div className="flex-1 border-r-[2px] border-[#121212]"></div>
                    <div className="flex-1 border-r-[2px] border-[#121212]"></div>
                    <div className="flex-1"></div>
                 </div>
              </div>
              <div 
                 className="absolute w-[3px] h-full bg-[#8b5cf6] rounded-sm transition-all duration-500 z-10 shadow-[0_0_8px_rgba(139,92,246,0.8)]" 
                 style={{ left: `calc(${actionScore}% - 1.5px)` }}
              ></div>
           </div>
           <div className="flex justify-between text-[8px] font-bold text-neutral-500 mt-1">
              <span>Big Dist</span><span>Neutral</span><span>Big Acc</span>
           </div>
        </div>

        <div className="flex w-full px-1 py-2 bg-[#121212] border-b border-[#2d2d2d] text-[9px] font-bold shrink-0 text-center items-center uppercase tracking-wider">
           <div className="w-1/2 grid grid-cols-[1fr_1.5fr_1.5fr_1fr] border-r border-[#2d2d2d]/50 pr-1">
              <div className="text-left pl-1 text-white">Buy</div><div className="text-[#10b981]">B.Val</div><div className="text-[#10b981]">B.Lot</div><div className="text-[#10b981]">B.Avg</div>
           </div>
           <div className="w-1/2 grid grid-cols-[1fr_1.5fr_1.5fr_1fr] pl-1">
              <div className="text-left pl-2 text-white">Sell</div><div className="text-[#ef4444]">S.Val</div><div className="text-[#ef4444]">S.Lot</div><div className="text-[#ef4444]">S.Avg</div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar relative bg-[#121212]">
           {isLoading && (
              <div className="absolute inset-0 z-10 flex justify-center items-center text-[#10b981] animate-pulse text-[10px] font-bold bg-[#121212]/80 backdrop-blur-sm">
                 Kalkulasi Net Broker...
              </div>
           )}

           <div className="flex flex-col pb-4">
              {rows.map((_, i) => {
                 const b = topBuyers[i];
                 const s = topSellers[i];

                 return (
                    <div key={i} className="flex w-full text-[10px] tabular-nums items-center text-center border-b border-[#2d2d2d]/30 last:border-0">
                       <div className="w-1/2 grid grid-cols-[1fr_1.5fr_1.5fr_1fr] py-2 px-1 hover:bg-[#1e1e1e] cursor-pointer border-r border-[#2d2d2d]/50 transition-colors group/left" onClick={() => b && handleOpenModal(b)}>
                          <div className={`text-left pl-1 font-black ${b ? getBrokerColorClass(b.code, b.investor) : ""}`}>{b ? b.code : ""}</div>
                          <div className="text-[#10b981] font-semibold">{b ? formatVal(b.val) : ""}</div>
                          <div className="text-[#10b981] font-semibold">{b ? formatVal(b.lot) : ""}</div>
                          <div className="text-[#10b981] font-semibold">{b ? Math.round(b.avg) : ""}</div>
                       </div>
                       
                       <div className="w-1/2 grid grid-cols-[1fr_1.5fr_1.5fr_1fr] py-2 px-1 hover:bg-[#1e1e1e] cursor-pointer transition-colors group/right" onClick={() => s && handleOpenModal(s)}>
                          <div className={`text-left pl-2 font-black ${s ? getBrokerColorClass(s.code, s.investor) : ""}`}>{s ? s.code : ""}</div>
                          <div className="text-[#ef4444] font-semibold">{s ? formatVal(s.val) : ""}</div>
                          <div className="text-[#ef4444] font-semibold">{s ? formatVal(s.lot) : ""}</div>
                          <div className="text-[#ef4444] font-semibold">{s ? Math.round(s.avg) : ""}</div>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>
      </div>

      <BrokerDetailModal
        isOpen={modalData?.isOpen || false} onClose={() => setModalData(null)}
        brokerCode={modalData?.brokerCode || ""} brokerName={modalData?.brokerName || ""} investorType={modalData?.investorType || "LOCAL"}
        totalNetVal={modalData?.totalNetVal || 0} totalNetLot={modalData?.totalNetLot || 0} avgPrice={modalData?.avgPrice || 0}
        activities={crossActivity || []} isLoadingData={isScanning}
      />
    </>
  );
}