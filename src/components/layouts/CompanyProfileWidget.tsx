"use client";

import React, { useState } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Building2, Users, Info, Calendar } from 'lucide-react';

// --- TIPE DATA API GOAPI (PROFILE) ---
interface Shareholder {
  name: string;
  holding_type: string;
  amount: string;
  percentage: string;
}

interface Management {
  name: string;
  role: string;
}

interface CompanyProfileData {
  name: string;
  symbol: string;
  about: string;
  sector_name: string;
  industry_name: string;
  website: string;
  ipo_listing_date: string;
  ipo_offering_price: number;
  outstanding_shares: number;
  logo: string;
  shareholders: Shareholder[];
  directors: Management[];
  commissioners: Management[];
}

// --- HELPER FORMATTER ---
const formatShares = (num: number): string => {
  if (!num) return "-";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' Miliar';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' Juta';
  return num.toLocaleString('id-ID');
};

const fetchProfile = async (url: string) => {
  const res = await fetch(url, { 
    headers: { 'accept': 'application/json', 'X-API-KEY': process.env.NEXT_PUBLIC_GOAPI_KEY || '' } 
  });
  if (!res.ok) throw new Error("Gagal memuat profil perusahaan.");
  const json = await res.json();
  return json.data as CompanyProfileData;
};

export default function CompanyProfileWidget() {
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "BBCA";
  const [activeTab, setActiveTab] = useState<"Shareholders" | "Management" | "About">("Shareholders");

  const { data: profile, error, isLoading } = useSWR(
    `profile-${globalSymbol}`, 
    () => fetchProfile(`https://api.goapi.io/stock/idx/${globalSymbol}/profile`),
    { refreshInterval: 60000, dedupingInterval: 10000 } // Jarang berubah, cache agak lama
  );

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded flex flex-col overflow-hidden h-full shadow-lg relative group w-full">
      
      {/* HEADER WIDGET */}
      <div className="p-3 border-b border-[#2d2d2d] bg-[#121212] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-[11px] tracking-wide uppercase">Company Profile</span>
          <span className="bg-[#1e1e1e] text-[#0ea5e9] px-1.5 rounded border border-[#2d2d2d] text-[8px] font-bold">
             {globalSymbol}
          </span>
        </div>
        <Building2 size={12} className="text-neutral-500" />
      </div>

      {/* BODY KONTEN */}
      <div className="flex-1 overflow-y-auto hide-scrollbar bg-[#121212] flex flex-col min-h-0">
        
        {isLoading ? (
          <div className="flex-1 flex justify-center items-center text-[#0ea5e9] animate-pulse text-[10px] font-bold">
            Memuat Data Fundamental...
          </div>
        ) : error ? (
          <div className="flex-1 flex justify-center items-center text-[#ef4444] text-[10px]">
            Data Profil tidak tersedia.
          </div>
        ) : profile ? (
          <>
            {/* SEKSI 1: BASIC INFO & LOGO */}
            <div className="p-4 flex items-start gap-3 border-b border-[#2d2d2d] bg-[#121212] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={profile.logo || `https://s3.goapi.io/logo/${profile.symbol}.jpg`} 
                alt={profile.symbol} 
                className="w-12 h-12 rounded-lg bg-white object-contain p-0.5 border border-[#2d2d2d] shrink-0"
                onError={(e) => { e.currentTarget.src = 'https://s3.goapi.io/logo/IHSG.jpg'; }}
              />
              <div className="flex flex-col flex-1 overflow-hidden">
                <span className="font-extrabold text-white text-[13px] truncate" title={profile.name}>{profile.name}</span>
                <span className="text-[#0ea5e9] text-[10px] font-semibold truncate mt-0.5">{profile.sector_name}</span>
                <span className="text-neutral-500 text-[9px] truncate">{profile.industry_name}</span>
              </div>
            </div>

            {/* SEKSI 2: KEY STATISTICS (Clean Look dengan Divide) */}
            <div className="grid grid-cols-3 divide-x divide-[#2d2d2d] border-b border-[#2d2d2d] bg-[#121212] shrink-0">
               <div className="p-2.5 flex flex-col justify-center items-center text-center">
                  <span className="text-neutral-500 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1"><Calendar size={9}/> IPO Date</span>
                  <span className="text-white text-[10px] font-semibold">{profile.ipo_listing_date || "-"}</span>
               </div>
               <div className="p-2.5 flex flex-col justify-center items-center text-center">
                  <span className="text-neutral-500 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1"><Info size={9}/> IPO Price</span>
                  <span className="text-[#10b981] text-[10px] font-bold">Rp {profile.ipo_offering_price?.toLocaleString('id-ID') || "-"}</span>
               </div>
               <div className="p-2.5 flex flex-col justify-center items-center text-center">
                  <span className="text-neutral-500 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 mb-1"><Users size={9}/> Out. Shares</span>
                  <span className="text-white text-[10px] font-semibold">{formatShares(profile.outstanding_shares)}</span>
               </div>
            </div>

            {/* SEKSI 3: TABS (Shareholders / Management / About) */}
            <div className="flex bg-[#121212] border-b border-[#2d2d2d] shrink-0 px-2">
               <button onClick={() => setActiveTab("Shareholders")} className={`flex-1 py-2 text-[9px] font-bold text-center border-b-2 transition-colors ${activeTab === "Shareholders" ? "border-[#0ea5e9] text-[#0ea5e9]" : "border-transparent text-neutral-500 hover:text-white"}`}>Shareholders</button>
               <button onClick={() => setActiveTab("Management")} className={`flex-1 py-2 text-[9px] font-bold text-center border-b-2 transition-colors ${activeTab === "Management" ? "border-[#0ea5e9] text-[#0ea5e9]" : "border-transparent text-neutral-500 hover:text-white"}`}>Management</button>
               <button onClick={() => setActiveTab("About")} className={`flex-1 py-2 text-[9px] font-bold text-center border-b-2 transition-colors ${activeTab === "About" ? "border-[#0ea5e9] text-[#0ea5e9]" : "border-transparent text-neutral-500 hover:text-white"}`}>About</button>
            </div>

            {/* KONTEN TABS BAWAH */}
            <div className="flex-1 overflow-y-auto hide-scrollbar p-3 bg-[#121212]">
               
               {/* TAB: SHAREHOLDERS */}
               {activeTab === "Shareholders" && (
                 <div className="flex flex-col">
                    {profile.shareholders?.length > 0 ? profile.shareholders.map((sh, idx) => (
                      <div key={idx} className="py-2.5 border-b border-[#2d2d2d] last:border-0 flex justify-between items-center group hover:bg-[#1e1e1e]/30 px-1 transition-colors rounded">
                         <div className="flex flex-col flex-1 pr-2">
                           <span className="text-white text-[10px] font-bold leading-tight group-hover:text-[#ffffff] transition-colors">{sh.name}</span>
                           <span className="text-neutral-500 text-[8px] mt-0.5">{sh.holding_type}</span>
                         </div>
                         <div className="flex flex-col items-end shrink-0">
                           <span className="text-[#0ea5e9] font-black text-[11px]">{sh.percentage}%</span>
                           <span className="text-neutral-400 text-[8px]">{Number(sh.amount.replace(/\./g, '')).toLocaleString('id-ID')} Lbr</span>
                         </div>
                      </div>
                    )) : (
                      <span className="text-neutral-500 text-[10px] text-center w-full py-4">Data pemegang saham tidak tersedia.</span>
                    )}
                 </div>
               )}

               {/* TAB: MANAGEMENT */}
               {activeTab === "Management" && (
                 <div className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest border-b border-[#2d2d2d] pb-1.5 mb-1.5">Dewan Direksi</span>
                      {profile.directors?.map((dir, idx) => (
                         <div key={`dir-${idx}`} className="flex justify-between items-start text-[10px] py-1">
                           <span className="text-white font-semibold flex-1 pr-2">{dir.name}</span>
                           <span className="text-neutral-400 shrink-0 max-w-[40%] text-right">{dir.role}</span>
                         </div>
                      ))}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-neutral-500 text-[9px] font-black uppercase tracking-widest border-b border-[#2d2d2d] pb-1.5 mb-1.5">Dewan Komisaris</span>
                      {profile.commissioners?.map((kom, idx) => (
                         <div key={`kom-${idx}`} className="flex justify-between items-start text-[10px] py-1">
                           <span className="text-white font-semibold flex-1 pr-2">{kom.name}</span>
                           <span className="text-neutral-400 shrink-0 max-w-[40%] text-right">{kom.role}</span>
                         </div>
                      ))}
                    </div>
                 </div>
               )}

               {/* TAB: ABOUT */}
               {activeTab === "About" && (
                 <div className="text-[10px] text-neutral-300 leading-relaxed text-justify px-1">
                    {profile.about ? profile.about : "Deskripsi perusahaan belum tersedia."}
                    {profile.website && (
                       <a href={`https://${profile.website}`} target="_blank" rel="noreferrer" className="block mt-3 text-[#0ea5e9] font-bold hover:underline">
                         {profile.website}
                       </a>
                    )}
                 </div>
               )}

            </div>
          </>
        ) : null}

      </div>
    </div>
  );
}