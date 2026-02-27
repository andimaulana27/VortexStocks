"use client";

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Building2, Users, Activity, Briefcase, CalendarClock, Globe, ShieldAlert } from 'lucide-react';

// --- DEFINISI TIPE ---
interface Shareholder { name: string; holding_type: string; amount: string; percentage: string; }
interface Management { name: string; role: string; }
interface Subsidiary { name: string; sector: string; total_asset: string; percentage_own: string; }
interface HistData { date: string; close: number; open: number; high: number; low: number; volume: number; }
interface BrokerData { code?: string; broker?: { code: string }; side: string; value: number; investor: string; }

const SUB_TABS = ["Keystats", "Analysis", "Financials", "Seasonality", "Corp. Action", "Insider", "Profile"];

// --- FETCHER GLOBAL ---
const fetcher = (url: string) => fetch(url, { headers: { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' } }).then(res => res.json());

// --- HELPER FORMATTING ---
const formatShortNum = (num?: number) => {
  if (!num) return "-";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  return num.toLocaleString('id-ID');
};

const formatCurrency = (num?: number) => {
  if (!num) return "-";
  return num.toLocaleString('id-ID');
};

const getEffectiveDate = (daysAgo: number = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
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

// --- KOMPONEN UI HELPER ---
const SectionHeader = ({ title, icon: Icon }: { title: string, icon?: React.ElementType }) => (
  <div className="bg-[#121212] border-y border-[#2d2d2d] py-1 px-2 mb-1.5 mt-3 flex items-center gap-1.5">
    {Icon && <Icon size={11} className="text-neutral-400" />}
    <span className="text-neutral-300 text-[10px] font-bold uppercase tracking-wider">{title}</span>
  </div>
);

const MetricRow = ({ label, value, valClass = "text-white" }: { label: string, value: React.ReactNode, valClass?: string }) => (
  <div className="flex justify-between items-center py-1 px-2 hover:bg-[#1e1e1e] group transition-colors border-b border-[#2d2d2d]/30 last:border-0">
    <span className="text-neutral-500 text-[10px] group-hover:text-neutral-300 transition-colors">{label}</span>
    <span className={`text-[10px] font-semibold tabular-nums ${valClass}`}>{value}</span>
  </div>
);

export default function FundamentalTablePanel({ symbol }: { symbol: string }) {
  const [activeTab, setActiveTab] = useState("Keystats");

  // 1. DATA HARGA REAL-TIME
  const { data: priceRes, isLoading: loadPrice } = useSWR(`https://api.goapi.io/stock/idx/prices?symbols=${symbol}`, fetcher, { refreshInterval: 5000 });
  
  // 2. DATA PROFILE LENGKAP
  const { data: profileRes, isLoading: loadProfile } = useSWR(`https://api.goapi.io/stock/idx/${symbol}/profile`, fetcher, { dedupingInterval: 60000 });
  
  // 3. DATA HISTORIKAL 1 TAHUN
  const oneYearAgo = getEffectiveDate(365);
  const today = getEffectiveDate(0);
  const { data: histRes, isLoading: loadHist } = useSWR(`https://api.goapi.io/stock/idx/${symbol}/historical?from=${oneYearAgo}&to=${today}`, fetcher, { dedupingInterval: 60000 });

  // 4. DATA SMART MONEY HARI INI
  const tradingDate = getEffectiveTradingDate();
  const { data: brokerRes } = useSWR(`https://api.goapi.io/stock/idx/${symbol}/broker_summary?date=${tradingDate}&investor=ALL`, fetcher, { refreshInterval: 15000 });

  const priceData = priceRes?.data?.results?.[0];
  const profileData = profileRes?.data;
  const histData: HistData[] = useMemo(() => {
    if (!histRes?.data?.results) return [];
    return [...histRes.data.results].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [histRes]);

  const isLoading = loadPrice || loadProfile || loadHist;

  // =========================================================================
  // DATA ENGINEERING & CALCULATIONS (100% REAL DATA)
  // =========================================================================
  const currentPrice = priceData?.close || 0;
  const outShares = profileData?.outstanding_shares || 0;
  const marketCap = currentPrice * outShares;
  
  // 1. Broker / Smart Money Calculation
  const smartMoney = useMemo(() => {
    if (!brokerRes?.data?.results) return { netForeign: 0, topBuyer: "-", topSeller: "-", totalVal: 0 };
    let netF = 0;
    let totalVal = 0;
    const bMap: Record<string, number> = {};
    brokerRes.data.results.forEach((i: BrokerData) => {
      const code = i.broker?.code || i.code || "-";
      const val = i.side === "BUY" ? i.value : -i.value;
      if (i.investor === "FOREIGN") netF += val;
      bMap[code] = (bMap[code] || 0) + val;
      totalVal += i.value;
    });
    const sorted = Object.entries(bMap).sort((a, b) => b[1] - a[1]);
    return {
      netForeign: netF,
      topBuyer: sorted.length > 0 && sorted[0][1] > 0 ? sorted[0][0] : "-",
      topSeller: sorted.length > 0 && sorted[sorted.length - 1][1] < 0 ? sorted[sorted.length - 1][0] : "-",
      totalVal: totalVal / 2 // Dibagi 2 karena buy dan sell dihitung ganda
    };
  }, [brokerRes]);

  // 2. Performance & Volatility Calculation
  const perf = useMemo(() => {
    if (histData.length === 0) return null;
    const latest = histData[0].close;
    const getRet = (idx: number) => {
      if (!histData[idx]) return null;
      return ((latest - histData[idx].close) / histData[idx].close) * 100;
    };
    
    const ret1W = getRet(5);
    const ret1M = getRet(21);
    const ret3M = getRet(63);
    const ret6M = getRet(126);
    const ret1Y = getRet(histData.length - 1);
    
    const currentYear = new Date().getFullYear().toString();
    const ytdData = histData.filter(d => d.date.startsWith(currentYear));
    const retYTD = ytdData.length > 0 ? ((latest - ytdData[ytdData.length - 1].close) / ytdData[ytdData.length - 1].close) * 100 : null;
    
    const high52 = Math.max(...histData.map(d => d.high));
    const low52 = Math.min(...histData.map(d => d.low));
    
    const avgVol1M = histData.slice(0, 21).reduce((acc, curr) => acc + curr.volume, 0) / 21;
    const avgVol3M = histData.slice(0, 63).reduce((acc, curr) => acc + curr.volume, 0) / 63;

    return { ret1W, ret1M, ret3M, ret6M, retYTD, ret1Y, high52, low52, avgVol1M, avgVol3M };
  }, [histData]);

  // 3. Subsidiary Asset Calculation
  const totalSubAssets = useMemo(() => {
    let total = 0;
    profileData?.subsidiary_companies?.forEach((sub: Subsidiary) => {
       const val = Number(sub.total_asset.replace(/\./g, ''));
       if(!isNaN(val)) total += val;
    });
    return total;
  }, [profileData]);

  // 4. Seasonality Calculation
  const seasonality = useMemo(() => {
    if (histData.length === 0) return [];
    const monthlyData: Record<string, { first: number, last: number }> = {};
    
    histData.forEach(d => {
      const month = d.date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { first: d.close, last: d.close };
      } else {
        monthlyData[month].first = d.close;
      }
    });

    return Object.entries(monthlyData).map(([month, prices]) => {
      const returnPct = ((prices.last - prices.first) / prices.first) * 100;
      return { month, returnPct };
    }).sort((a, b) => a.month.localeCompare(b.month));
  }, [histData]);

  // =========================================================================

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] font-sans border border-[#2d2d2d] rounded-lg overflow-hidden shadow-lg">
      
      {/* --- HEADER NAVIGATION TABS --- */}
      <div className="flex border-b border-[#2d2d2d] bg-[#121212] px-1 shrink-0 overflow-x-auto hide-scrollbar">
        {SUB_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 text-[10px] font-bold whitespace-nowrap transition-all duration-200 uppercase tracking-widest ${
                isActive 
                  ? "border-b-2 border-white text-white" 
                  : "border-b-2 border-transparent text-neutral-500 hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] relative p-2">
        
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-[#121212]/90 backdrop-blur-sm flex flex-col justify-center items-center">
            <div className="w-8 h-8 border-2 border-[#2d2d2d] border-t-white rounded-full animate-spin mb-2"></div>
            <span className="text-white text-[10px] font-bold animate-pulse tracking-widest uppercase">Engine Data Sync...</span>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 1: KEYSTATS (Market Data & Valuation)          */}
        {/* ================================================== */}
        {activeTab === "Keystats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-300">
            
            {/* Kolom 1 */}
            <div className="flex flex-col border border-[#2d2d2d] rounded bg-[#121212] overflow-hidden">
              <SectionHeader title="Market Action" icon={Activity} />
              <div className="p-1.5 pt-0">
                 <MetricRow label="Current Price" value={formatCurrency(currentPrice)} valClass="text-white font-black text-[12px]" />
                 <MetricRow label="Price Change" value={`${priceData?.change > 0 ? '+' : ''}${priceData?.change_pct?.toFixed(2)}%`} valClass={priceData?.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"} />
                 <MetricRow label="Day Range" value={`${formatCurrency(priceData?.low)} - ${formatCurrency(priceData?.high)}`} />
                 <MetricRow label="Volume" value={formatShortNum(priceData?.volume)} />
                 <MetricRow label="Est. Turnover" value={`Rp ${formatShortNum((priceData?.volume || 0) * currentPrice)}`} />
              </div>
            </div>

            {/* Kolom 2 */}
            <div className="flex flex-col border border-[#2d2d2d] rounded bg-[#121212] overflow-hidden">
              <SectionHeader title="Capitalization" icon={Building2} />
              <div className="p-1.5 pt-0">
                 <MetricRow label="Market Cap" value={`Rp ${formatShortNum(marketCap)}`} valClass="text-white font-black text-[12px]" />
                 <MetricRow label="Outstanding Shares" value={`${formatShortNum(outShares)}`} />
                 <MetricRow label="Free Float Est." value={`${(100 - (profileData?.ipo_percentage || 0)).toFixed(2)}%`} valClass="text-[#eab308]" />
                 <MetricRow label="IPO Offering Price" value={`Rp ${formatCurrency(profileData?.ipo_offering_price)}`} />
                 <MetricRow label="IPO Fund Raised" value={`Rp ${formatShortNum(profileData?.ipo_fund_raised)}`} />
              </div>
            </div>

            {/* Kolom 3 */}
            <div className="flex flex-col border border-[#2d2d2d] rounded bg-[#121212] overflow-hidden">
              <SectionHeader title="Smart Money (EOD)" icon={Users} />
              <div className="p-1.5 pt-0">
                 <MetricRow 
                   label="Net Foreign Flow" 
                   value={`${smartMoney.netForeign > 0 ? '+' : ''}${formatShortNum(smartMoney.netForeign)}`} 
                   valClass={`font-black text-[12px] ${smartMoney.netForeign >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`} 
                 />
                 <MetricRow label="Top Buyer" value={smartMoney.topBuyer} valClass="text-[#10b981] font-bold" />
                 <MetricRow label="Top Seller" value={smartMoney.topSeller} valClass="text-[#ef4444] font-bold" />
                 
                 <div className="mt-3 p-1.5 border border-[#2d2d2d] rounded">
                    <span className="text-[9px] text-neutral-500 font-bold uppercase block mb-1">Foreign Action Bias</span>
                    <div className="w-full h-1 bg-[#2d2d2d] rounded-full overflow-hidden flex">
                       <div className="h-full bg-[#10b981]" style={{ width: smartMoney.netForeign > 0 ? '70%' : '30%' }}></div>
                       <div className="h-full bg-[#ef4444]" style={{ width: smartMoney.netForeign > 0 ? '30%' : '70%' }}></div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 2: ANALYSIS (Performance & Volatility)         */}
        {/* ================================================== */}
        {activeTab === "Analysis" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full animate-in fade-in duration-300">
             
             {/* Performance Matrix */}
             <div className="border border-[#2d2d2d] rounded bg-[#121212]">
                <SectionHeader title="Performance Matrix" icon={Activity} />
                <div className="grid grid-cols-2 gap-2 p-2 pt-0">
                   {[
                     { label: "1 Week Return", val: perf?.ret1W },
                     { label: "1 Month Return", val: perf?.ret1M },
                     { label: "3 Month Return", val: perf?.ret3M },
                     { label: "6 Month Return", val: perf?.ret6M },
                     { label: "YTD Return", val: perf?.retYTD },
                     { label: "1 Year Return", val: perf?.ret1Y },
                   ].map((item, idx) => (
                     <div key={idx} className="flex flex-col p-2 bg-[#121212] border border-[#2d2d2d] rounded hover:border-[#eab308]/50 transition-colors">
                       <span className="text-neutral-500 text-[9px] font-bold uppercase">{item.label}</span>
                       <span className={`text-sm font-black tabular-nums ${item.val && item.val >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                         {item.val ? `${item.val > 0 ? '+' : ''}${item.val.toFixed(2)}%` : "-"}
                       </span>
                     </div>
                   ))}
                </div>
             </div>

             {/* Volatility & Range */}
             <div className="border border-[#2d2d2d] rounded bg-[#121212]">
                <SectionHeader title="Volatility & Liquidity" icon={Globe} />
                <div className="p-2 pt-0">
                   <MetricRow label="52-Week High" value={formatCurrency(perf?.high52)} valClass="text-[#10b981] font-bold" />
                   <MetricRow label="52-Week Low" value={formatCurrency(perf?.low52)} valClass="text-[#ef4444] font-bold" />
                   
                   <div className="mt-3 mb-3 px-1">
                      <div className="flex justify-between text-[8px] text-neutral-500 font-bold mb-1 uppercase">
                        <span>L: {perf?.low52}</span><span>H: {perf?.high52}</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#2d2d2d] rounded-full relative overflow-hidden">
                         {perf?.high52 && perf?.low52 && (
                           <div 
                             className="absolute top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ffffff] transform -translate-x-1/2"
                             style={{ left: `${((currentPrice - perf.low52) / (perf.high52 - perf.low52)) * 100}%` }}
                           ></div>
                         )}
                      </div>
                   </div>

                   <MetricRow label="Avg Daily Vol (1M)" value={formatShortNum(perf?.avgVol1M)} />
                   <MetricRow label="Avg Daily Vol (3M)" value={formatShortNum(perf?.avgVol3M)} />
                </div>
             </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 3: FINANCIALS (Subsidiary Assets Consolidation)*/}
        {/* ================================================== */}
        {activeTab === "Financials" && (
          <div className="flex flex-col h-full animate-in fade-in duration-300 bg-[#121212] border border-[#2d2d2d] rounded p-2">
            <div className="flex justify-between items-center mb-2 border-b border-[#2d2d2d] pb-2 px-1">
               <h3 className="text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5"><Briefcase size={12} className="text-[#eab308]"/> Asset Consolidation</h3>
               <span className="text-[9px] text-[#eab308] font-bold tabular-nums">Total: Rp {formatShortNum(totalSubAssets)}</span>
            </div>
            
            {profileData?.subsidiary_companies && profileData.subsidiary_companies.length > 0 ? (
              <div className="overflow-x-auto hide-scrollbar flex-1">
                <table className="w-full text-[10px] text-left">
                  <thead className="bg-[#121212] text-neutral-500 uppercase sticky top-0">
                    <tr>
                      <th className="px-2 py-2 font-bold border-b border-[#2d2d2d]">Company Name</th>
                      <th className="px-2 py-2 font-bold border-b border-[#2d2d2d]">Sector</th>
                      <th className="px-2 py-2 font-bold border-b border-[#2d2d2d] text-right">Total Asset</th>
                      <th className="px-2 py-2 font-bold border-b border-[#2d2d2d] text-right">Own %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profileData.subsidiary_companies.map((sub: Subsidiary, i: number) => (
                      <tr key={i} className="hover:bg-[#1e1e1e] border-b border-[#2d2d2d]/30 last:border-0 transition-colors">
                        <td className="px-2 py-1.5 font-bold text-white max-w-[200px] truncate" title={sub.name}>{sub.name}</td>
                        <td className="px-2 py-1.5 text-neutral-400 truncate max-w-[100px]" title={sub.sector}>{sub.sector}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums text-white">{sub.total_asset}</td>
                        <td className="px-2 py-1.5 text-right font-black text-[#eab308]">{sub.percentage_own}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-neutral-500 flex-1">
                <Briefcase size={20} className="mb-2 opacity-30"/>
                <p className="text-[10px]">Emiten tidak memiliki data Entitas Anak.</p>
              </div>
            )}
            
            <div className="mt-auto pt-2 flex gap-2 items-start bg-[#121212] px-2 py-1.5 rounded border border-[#2d2d2d]">
              <ShieldAlert size={12} className="text-[#eab308] shrink-0 mt-0.5" />
              <p className="text-[8px] text-neutral-500 leading-relaxed text-justify">
                <strong>FINANCIAL STATEMENT NOTE:</strong> Modul Laporan Keuangan (Income Statement, Balance Sheet, Cash Flow) sedang menunggu rilis resmi endpoint API. Data tabel ini menampilkan konsolidasi aset Entitas Anak riil dari data profil perusahaan.
              </p>
            </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 4: SEASONALITY (Historical Monthly Returns)    */}
        {/* ================================================== */}
        {activeTab === "Seasonality" && (
          <div className="border border-[#2d2d2d] rounded bg-[#121212] p-2 h-full animate-in fade-in duration-300">
             <div className="flex items-center gap-1.5 border-b border-[#2d2d2d] pb-2 mb-3 px-1">
                <CalendarClock size={12} className="text-white"/>
                <h3 className="text-white text-[11px] font-bold uppercase tracking-widest">Seasonality Heatmap (1 Year)</h3>
             </div>
             
             {seasonality.length > 0 ? (
               <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                 {seasonality.map((item, i) => {
                   const isUp = item.returnPct >= 0;
                   return (
                     <div key={i} className={`p-2 flex flex-col items-center justify-center rounded border ${isUp ? 'bg-[#10b981]/10 border-[#10b981]/30' : 'bg-[#ef4444]/10 border-[#ef4444]/30'}`}>
                       <span className="text-neutral-400 text-[9px] font-bold mb-0.5">{item.month}</span>
                       <span className={`text-[11px] font-black tabular-nums ${isUp ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                         {isUp ? '+' : ''}{item.returnPct.toFixed(2)}%
                       </span>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="text-center text-neutral-500 text-[10px] py-10">Data historikal tidak cukup untuk Seasonality.</div>
             )}
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 5: CORP ACTION (IPO & Status)                  */}
        {/* ================================================== */}
        {activeTab === "Corp. Action" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-300">
             <div className="border border-[#2d2d2d] rounded bg-[#121212]">
               <SectionHeader title="IPO Statistics" icon={Building2} />
               <div className="p-1.5 pt-0">
                 <MetricRow label="Listing Date" value={profileData?.ipo_listing_date || "-"} valClass="text-white font-bold" />
                 <MetricRow label="Offering Price" value={`Rp ${formatCurrency(profileData?.ipo_offering_price)}`} />
                 <MetricRow label="Founders Shares" value={formatShortNum(profileData?.ipo_founders_shares)} />
                 <MetricRow label="Total Listed Shares" value={formatShortNum(profileData?.ipo_total_listed_shares)} />
                 <MetricRow label="IPO Percentage" value={`${profileData?.ipo_percentage || 0}%`} />
                 <MetricRow label="Fund Raised" value={`Rp ${formatShortNum(profileData?.ipo_fund_raised)}`} valClass="text-[#eab308] font-bold" />
               </div>
             </div>
             
             <div className="border border-[#2d2d2d] rounded bg-[#121212]">
               <SectionHeader title="Market Status" icon={ShieldAlert} />
               <div className="p-1.5 pt-0">
                 <MetricRow label="Status" value={profileData?.status || "-"} valClass={profileData?.status === "LISTED" ? "text-[#10b981] font-black" : "text-[#ef4444] font-black"} />
                 <MetricRow label="Is Suspended" value={profileData?.is_suspended ? "YES" : "NO"} valClass={profileData?.is_suspended ? "text-[#ef4444] font-black" : "text-[#10b981] font-black"} />
                 <MetricRow label="Admin Bureau" value={profileData?.ipo_securities_administration_bureau || "-"} valClass="text-[9px] text-right max-w-[150px] text-neutral-300" />
                 
                 <div className="mt-3 pt-2 border-t border-[#2d2d2d] px-2 pb-1">
                   <span className="text-neutral-500 text-[9px] font-bold uppercase mb-1.5 block">Special Notations</span>
                   <div className="flex gap-1 flex-wrap">
                     {profileData?.special_notations?.length > 0 ? (
                       profileData.special_notations.map((note: string, i: number) => (
                         <span key={i} className="px-2 py-0.5 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30 rounded text-[9px] font-black">{note}</span>
                       ))
                     ) : (
                       <span className="px-2 py-0.5 bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 rounded text-[9px] font-black">NO NOTATION</span>
                     )}
                   </div>
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 6: INSIDER (Management & Komisaris)            */}
        {/* ================================================== */}
        {activeTab === "Insider" && profileData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full animate-in fade-in duration-300">
             <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col overflow-hidden">
                <SectionHeader title="Board of Directors" icon={Users} />
                <div className="p-1.5 flex-1 overflow-y-auto hide-scrollbar">
                  {profileData.directors?.map((dir: Management, idx: number) => (
                    <div key={`d-${idx}`} className="flex justify-between items-center text-[10px] p-2 hover:bg-[#1e1e1e] border-b border-[#2d2d2d]/30 last:border-0 transition-colors">
                      <span className="text-white font-bold truncate pr-2">{dir.name}</span>
                      <span className="text-neutral-400 text-right font-semibold whitespace-nowrap">{dir.role}</span>
                    </div>
                  ))}
                </div>
             </div>
             
             <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col overflow-hidden">
                <SectionHeader title="Commissioners & Audit" icon={Users} />
                <div className="p-1.5 flex-1 overflow-y-auto hide-scrollbar">
                  {profileData.commissioners?.map((kom: Management, idx: number) => (
                    <div key={`k-${idx}`} className="flex justify-between items-center text-[10px] p-2 hover:bg-[#1e1e1e] border-b border-[#2d2d2d]/30 transition-colors">
                      <span className="text-white font-bold truncate pr-2">{kom.name}</span>
                      <span className="text-[#eab308] text-right font-semibold whitespace-nowrap">{kom.role}</span>
                    </div>
                  ))}
                  
                  {profileData.audit_committee?.map((aud: Management, idx: number) => (
                    <div key={`a-${idx}`} className="flex justify-between items-center text-[10px] p-2 hover:bg-[#1e1e1e] border-b border-[#2d2d2d]/30 last:border-0 transition-colors">
                      <span className="text-neutral-300 truncate pr-2">{aud.name}</span>
                      <span className="text-neutral-500 text-right whitespace-nowrap">{aud.role}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* ================================================== */}
        {/* TAB 7: PROFILE (Info Perusahaan & Pemegang Saham)  */}
        {/* ================================================== */}
        {activeTab === "Profile" && profileData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full animate-in fade-in duration-300">
             
             {/* KIRI: Info & Deskripsi */}
             <div className="flex flex-col gap-3">
                <div className="flex gap-3 items-center bg-[#121212] p-2 rounded border border-[#2d2d2d]">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={profileData.logo || `https://s3.goapi.io/logo/${symbol}.jpg`} alt={symbol} className="w-12 h-12 rounded bg-white p-1 object-contain shrink-0" onError={(e) => e.currentTarget.src='https://s3.goapi.io/logo/IHSG.jpg'}/>
                   <div className="flex flex-col">
                     <h2 className="text-[12px] font-black text-white leading-tight uppercase tracking-wider">{profileData.name}</h2>
                     <p className="text-neutral-400 text-[9px] font-bold mt-0.5">{profileData.sector_name} • {profileData.industry_name}</p>
                   </div>
                </div>

                <div className="text-[9px] text-neutral-400 text-justify leading-relaxed bg-[#121212] p-3 rounded border border-[#2d2d2d] flex-1">
                  {profileData.about || "Deskripsi perusahaan belum tersedia."}
                </div>

                <div className="bg-[#121212] border border-[#2d2d2d] rounded">
                  <SectionHeader title="Contact Details" />
                  <div className="p-1.5 pt-0">
                    <MetricRow label="Website" value={profileData.website || "-"} valClass="text-white hover:underline cursor-pointer" />
                    <MetricRow label="Email" value={profileData.email || "-"} />
                    <MetricRow label="Phone" value={profileData.phone || "-"} />
                    <MetricRow label="NPWP" value={profileData.npwp || "-"} valClass="text-neutral-500 font-mono" />
                  </div>
                </div>
             </div>

             {/* KANAN: Major Shareholders */}
             <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col overflow-hidden">
                <SectionHeader title="Major Shareholders" icon={Users} />
                <div className="p-1.5 flex-1 overflow-y-auto hide-scrollbar">
                  {profileData.shareholders?.length > 0 ? profileData.shareholders.map((sh: Shareholder, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[10px] bg-[#121212] p-2 rounded hover:bg-[#1e1e1e] border-b border-[#2d2d2d]/30 last:border-0 transition-colors">
                      <div className="flex flex-col flex-1 pr-2">
                        <span className="font-bold text-white leading-tight">{sh.name}</span>
                        <span className="text-neutral-500 mt-0.5 text-[9px]">{sh.holding_type}</span>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                         <span className="font-black text-[#eab308] text-[11px]">{sh.percentage}%</span>
                         <span className="text-neutral-400 text-[8px] mt-0.5 tabular-nums">{formatShortNum(Number(sh.amount.replace(/\./g, '')))} Lbr</span>
                      </div>
                    </div>
                  )) : (
                    <span className="text-neutral-500 text-[10px] text-center w-full py-4 block">Data pemegang saham tidak tersedia.</span>
                  )}
                </div>
             </div>

          </div>
        )}

      </div>
    </div>
  );
}