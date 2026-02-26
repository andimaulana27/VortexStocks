"use client";

import React, { useState } from 'react';
import useSWR from 'swr';

// --- DEFINISI TIPE (Mengatasi Error 'any') ---
interface Shareholder {
  name: string;
  holding_type: string;
  amount: string;
  percentage: string;
}

const SUB_TABS = [
  "Keystats", "Analysis", "Financials", "Seasonality", "Corp. Action", "Insider", "Profile"
];

// --- FETCHER GLOBAL ---
const fetcher = (url: string) => fetch(url, { 
  headers: { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' } 
}).then(res => res.json());

// --- HELPER FORMATTING ---
const formatNum = (num?: number) => {
  if (!num) return "-";
  if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' M';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' Jt';
  return num.toLocaleString('id-ID');
};

const formatPrice = (num?: number) => {
  if (!num) return "-";
  return num.toLocaleString('id-ID');
};

// --- KOMPONEN HELPER ---
const MetricRow = ({ label, value, highlight = false, valueClass = "" }: { label: string, value: string | React.ReactNode, highlight?: boolean, valueClass?: string }) => (
  <div className="flex justify-between items-center py-1.5 px-1 -mx-1 rounded group border-b border-[#2d2d2d]/30 last:border-0 bg-[#121212]">
    <span className="text-neutral-400 text-[10px] group-hover:text-white transition-colors">{label}</span>
    <span className={`text-[10px] tabular-nums font-semibold ${highlight ? 'text-white font-bold' : 'text-neutral-300'} ${valueClass}`}>
      {value}
    </span>
  </div>
);

const SectionTitle = ({ title }: { title: string }) => (
  <h3 className="text-white text-[11px] font-bold mt-4 mb-2 pb-1.5 border-b border-[#2d2d2d] uppercase tracking-wide bg-[#121212]">
    {title}
  </h3>
);

export default function FundamentalTablePanel({ symbol }: { symbol: string }) {
  const [activeTab, setActiveTab] = useState("Keystats");

  // 1. Fetch Real-time Price
  const { data: priceRes, isLoading: loadPrice } = useSWR(
    `https://api.goapi.io/stock/idx/prices?symbols=${symbol}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  // 2. Fetch Company Profile
  const { data: profileRes, isLoading: loadProfile } = useSWR(
    `https://api.goapi.io/stock/idx/${symbol}/profile`,
    fetcher,
    { dedupingInterval: 60000 }
  );

  const priceData = priceRes?.data?.results?.[0];
  const profileData = profileRes?.data;
  const isLoading = loadPrice || loadProfile;

  // --- KALKULASI REAL GOAPI ---
  const currentPrice = priceData?.close || 0;
  const changePct = priceData?.change_pct || 0;
  const outShares = profileData?.outstanding_shares || 0;
  
  // Market Cap = Harga Close Realtime * Total Saham Beredar
  const marketCap = currentPrice * outShares;

  return (
    <div className="flex flex-col h-full w-full bg-[#121212]">
      
      {/* --- INNER NAVIGATION TABS --- */}
      <div className="flex border-b border-[#2d2d2d] bg-[#121212] px-2 shrink-0 overflow-x-auto hide-scrollbar">
        {SUB_TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[10px] font-bold whitespace-nowrap border-b-2 transition-all duration-200 bg-[#121212] ${
                isActive 
                  ? "border-[#10b981] text-[#10b981]" 
                  : "border-transparent text-neutral-500 hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4 bg-[#121212] relative">
        
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-[#121212]/80 backdrop-blur-sm flex justify-center items-center">
            <span className="text-[#10b981] text-xs font-bold animate-pulse">Menarik Data Real GoAPI...</span>
          </div>
        )}

        {/* VIEW: KEYSTATS (100% REAL GOAPI DATA) */}
        {activeTab === "Keystats" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full animate-in fade-in duration-300 bg-[#121212]">
            
            {/* KOLOM 1: MARKET DATA & VALUATION */}
            <div className="flex flex-col bg-[#121212]">
              <SectionTitle title="Market Action" />
              <MetricRow label="Current Price" value={`Rp ${formatPrice(currentPrice)}`} highlight />
              <MetricRow 
                label="Price Change (%)" 
                value={`${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`} 
                valueClass={changePct >= 0 ? "text-[#10b981]" : "text-[#ef4444]"} 
              />
              <MetricRow label="Volume (Shares)" value={formatNum(priceData?.volume)} />
              <MetricRow label="Open" value={formatPrice(priceData?.open)} />
              <MetricRow label="High" value={formatPrice(priceData?.high)} />
              <MetricRow label="Low" value={formatPrice(priceData?.low)} />

              <SectionTitle title="Valuation (Calculated)" />
              <MetricRow label="Current Share Outstanding" value={`${formatNum(outShares)} Lbr`} highlight />
              
              <div className="bg-[#121212] p-3 rounded border border-[#2d2d2d] mt-3 flex flex-col items-center justify-center">
                 <span className="text-neutral-500 text-[9px] uppercase tracking-widest font-bold mb-1">Market Capitalization</span>
                 <span className="text-[#10b981] text-lg font-black tabular-nums">Rp {formatNum(marketCap)}</span>
              </div>
            </div>

            {/* KOLOM 2: IPO STATISTICS & PROFILE OVERVIEW */}
            <div className="flex flex-col bg-[#121212]">
              <SectionTitle title="IPO Statistics" />
              <MetricRow label="Listing Date" value={profileData?.ipo_listing_date || "-"} highlight />
              <MetricRow label="Offering Price" value={`Rp ${formatPrice(profileData?.ipo_offering_price)}`} />
              <MetricRow label="Founders Shares" value={formatNum(profileData?.ipo_founders_shares)} />
              <MetricRow label="Total Listed Shares" value={formatNum(profileData?.ipo_total_listed_shares)} />
              <MetricRow label="IPO Percentage" value={`${profileData?.ipo_percentage || 0}%`} />
              <MetricRow label="Fund Raised" value={`Rp ${formatNum(profileData?.ipo_fund_raised)}`} highlight />

              <SectionTitle title="Company Information" />
              <MetricRow label="Sector" value={profileData?.sector_name || "-"} />
              <MetricRow label="Sub-Sector" value={profileData?.sub_sector_name || "-"} />
              <MetricRow label="Industry" value={profileData?.industry_name || "-"} />
              <MetricRow label="Website" value={profileData?.website || "-"} highlight />
              <MetricRow label="Status" value={profileData?.status || "-"} 
                valueClass={profileData?.status === "LISTED" ? "text-[#10b981]" : "text-[#ef4444]"} 
              />
            </div>

            {/* KOLOM 3: TOP SHAREHOLDERS */}
            <div className="flex flex-col bg-[#121212]">
              <SectionTitle title="Major Shareholders" />
              {profileData?.shareholders && profileData.shareholders.length > 0 ? (
                <div className="flex flex-col gap-2 mt-1">
                  {/* PERBAIKAN: Tipe 'sh' kini menggunakan interface Shareholder */}
                  {profileData.shareholders.slice(0, 5).map((sh: Shareholder, i: number) => (
                    <div key={i} className="bg-[#121212] p-2.5 rounded border border-[#2d2d2d]">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white text-[10px] font-bold leading-tight flex-1 pr-2">{sh.name}</span>
                        <span className="text-[#10b981] text-[11px] font-black">{sh.percentage}%</span>
                      </div>
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-neutral-500">{sh.holding_type}</span>
                        <span className="text-neutral-400 font-semibold">{formatNum(Number(sh.amount.replace(/\./g, '')))} Lbr</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-neutral-500 text-[10px]">Data pemegang saham tidak tersedia.</span>
              )}
            </div>

          </div>
        )}

        {/* Placeholder untuk tab selain Keystats */}
        {activeTab !== "Keystats" && (
           <div className="flex items-center justify-center h-full bg-[#121212]">
              <span className="text-neutral-500 text-xs font-semibold">Konten {activeTab} untuk {symbol} mengandalkan data eksternal / sedang disiapkan.</span>
           </div>
        )}

      </div>
    </div>
  );
}