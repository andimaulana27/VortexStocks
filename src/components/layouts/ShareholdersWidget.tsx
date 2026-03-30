// src/components/layouts/ShareholdersWidget.tsx
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';
import { Search, Users, PieChart, Info, Circle } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// --- TIPE DATA GOAPI ---
interface GoApiProfileShareholder {
  name: string;
  percentage: string;
  amount: string;
  holding_type: string;
}

interface GoApiProfileData {
  symbol: string;
  name: string;
  outstanding_shares: number;
  shareholders: GoApiProfileShareholder[];
}

interface GoApiBrokerItem {
  side: string;
  value: number;
}

// Interface untuk Recharts Tooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
  }>;
}

// --- PALET WARNA PROFESIONAL UNTUK GRAFIK ---
const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#14b8a6', '#f97316', '#ef4444', '#64748b'];

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

// HELPER: Format Persentase Dinamis (Presisi tinggi untuk saham porsi mikro)
const formatDynamicPercentage = (val: number) => {
  if (val === 0) return "0.00%";
  if (val < 0.001) return "< 0.001%";          // Jika sangat amat kecil
  if (val < 0.01) return val.toFixed(4) + "%"; // Tampilkan 4 angka di belakang koma
  if (val < 0.1) return val.toFixed(3) + "%";  // Tampilkan 3 angka di belakang koma
  return val.toFixed(2) + "%";                 // Tampilkan 2 angka standar
};

// HELPER: Warna Badge Status Kepemilikan & Jabatan
const getHoldingBadgeStyle = (type: string, name: string) => {
  const t = type.toLowerCase();
  const n = name.toLowerCase();

  // 1. Prioritas Utama: Identifikasi Masyarakat/Publik
  if (t.includes('masyarakat') || t.includes('public') || t.includes('non warkat') || n.includes('masyarakat') || n.includes('non warkat')) {
    return "bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]"; // Hijau (Emerald)
  }
  // 2. Identifikasi Jabatan (Direksi / Komisaris)
  if (t.includes('direksi') || n.includes('direktur') || n.includes('direksi') || t.includes('komisaris') || n.includes('komisaris')) {
    return "bg-[#eab308]/15 border-[#eab308]/40 text-[#eab308]"; // Kuning Emas
  }
  // 3. Status Signifikansi Pemegang Saham Umum
  if (t.includes('lebih')) {
    return "bg-[#3b82f6]/15 border-[#3b82f6]/40 text-[#3b82f6]"; // Biru (Signifikan > 5%)
  }
  if (t.includes('kurang')) {
    return "bg-[#f97316]/15 border-[#f97316]/40 text-[#f97316]"; // Oranye (Minoritas < 5%)
  }
  if (t.includes('pengendali')) {
    return "bg-[#8b5cf6]/15 border-[#8b5cf6]/40 text-[#8b5cf6]"; // Ungu (Pengendali)
  }
  
  return "bg-[#2d2d2d]/50 border-[#3e3e3e] text-neutral-300"; // Abu-abu (Default)
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

export default function ShareholdersWidget({ customDate }: { customDate?: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  
  // State Global
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "BBCA";
  const setGlobalSymbol = useCompanyStore(state => state.setActiveSymbol);
  const getCompany = useCompanyStore(state => state.getCompany);
  const companyMaster = getCompany(globalSymbol);

  // State Internal
  const [activeTab, setActiveTab] = useState<'SHAREHOLDERS' | 'FREE_FLOAT'>('SHAREHOLDERS');
  const [searchInput, setSearchInput] = useState("");
  const dateToUse = customDate || getEffectiveDateAPI();

  // Reset search input jika globalSymbol berubah dari luar widget
  useEffect(() => {
    setSearchInput(globalSymbol);
  }, [globalSymbol]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setGlobalSymbol(searchInput.trim().toUpperCase());
    }
  };

  // 1. Fetch Profil Perusahaan
  const { data: profileData, isLoading: isLoadingProfile } = useSWR<GoApiProfileData>(
    `profile-detail-${globalSymbol}`,
    async () => {
      const res = await fetch(`https://api.goapi.io/stock/idx/${globalSymbol}/profile`, { 
        headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }
      });
      if (!res.ok) throw new Error("Gagal mengambil data profil");
      const json = await res.json();
      return json.data;
    },
    { refreshInterval: 60000, dedupingInterval: 10000 }
  );

  // 2. Fetch Harga Terkini (Untuk Kalkulasi Market Cap)
  const { data: priceData } = useSWR(
    `price-${globalSymbol}`,
    () => fetch(`https://api.goapi.io/stock/idx/prices?symbols=${globalSymbol}`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()),
    { refreshInterval: 15000 }
  );

  // 3. Fetch Broker Summary (Net Foreign pada tanggal spesifik)
  const { data: brokerData, isLoading: isLoadingBroker } = useSWR(
    `foreign-net-${globalSymbol}-${dateToUse}`,
    () => fetch(`https://api.goapi.io/stock/idx/${globalSymbol}/broker_summary?date=${dateToUse}&investor=FOREIGN`, { headers: { 'accept': 'application/json', 'X-API-KEY': apiKey } }).then(res => res.json()),
    { refreshInterval: 60000 }
  );

  // --- KALKULASI DATA ---
  const { publicPct, publicShares, isKering, enhancedShareholders, netForeignVal, marketCap, chartDataFreeFloat } = useMemo(() => {
    let pct = 0, sharesAmount = 0, netF = 0, mCap = 0;
    const sorted: (GoApiProfileShareholder & { numericValue: number; rawAmount: number; color: string })[] = [];

    // Hitung Net Foreign
    if (brokerData?.data?.results) {
      brokerData.data.results.forEach((item: GoApiBrokerItem) => {
        if (item.side === "BUY") netF += item.value;
        else netF -= item.value;
      });
    }

    if (profileData?.shareholders) {
      const shareholders = profileData.shareholders;
      const outstanding = profileData.outstanding_shares || 0;

      // Hitung Market Cap
      const closePrice = priceData?.data?.results?.[0]?.close || 0;
      mCap = closePrice * outstanding;

      // Urutkan dan berikan warna untuk grafik
      const rawSorted = [...shareholders].sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
      
      rawSorted.forEach((sh, idx) => {
        const rawAmount = parseInt(sh.amount.replace(/\./g, '')) || 0;
        let numericValue = parseFloat(sh.percentage);
        
        // FIX API ERROR: Hitung manual jika API memberikan "0.00" tapi lembar sahamnya ada (> 0)
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

      // Deteksi Porsi Masyarakat (Sama menggunakan pencarian kata kunci yang kuat)
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

  const isLoading = isLoadingProfile || isLoadingBroker;

  // Custom Tooltip untuk Grafik
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
        {/* IDENTITAS SAHAM */}
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

        {/* TABS & SEARCH BAR */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1 bg-[#1e1e1e] p-1 rounded-lg border border-[#2d2d2d]">
            <button
              onClick={() => setActiveTab('SHAREHOLDERS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                activeTab === 'SHAREHOLDERS' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <Users size={12} /> Pemegang Saham
            </button>
            <button
              onClick={() => setActiveTab('FREE_FLOAT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                activeTab === 'FREE_FLOAT' ? 'bg-[#10b981] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <PieChart size={12} /> Free Float Analysis
            </button>
          </div>

          <div className="h-6 w-px bg-[#2d2d2d]"></div>

          <form onSubmit={handleSearchSubmit} className="flex items-center bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-2 py-1.5 focus-within:border-[#10b981] transition-colors shadow-inner w-[160px]">
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
        
        {/* ========================================= */}
        {/* TAB 1: PETA PEMEGANG SAHAM (SHAREHOLDERS) */}
        {/* ========================================= */}
        {activeTab === 'SHAREHOLDERS' && (
          <>
            {/* SISI KIRI: GRAFIK DONUT */}
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
              {/* Pusat Donut Label */}
              <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <div className="text-white font-black text-[20px]">{globalSymbol}</div>
                <div className="text-neutral-500 text-[10px]">Saham</div>
              </div>
            </div>

            {/* SISI KANAN: TABEL DETAIL */}
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
                          {/* BADGE WARNA DINAMIS BERDASARKAN NAMA DAN TIPE */}
                          <span className={`border px-2.5 py-1 rounded text-[10px] font-bold tracking-wider ${getHoldingBadgeStyle(sh.holding_type, sh.name)}`}>
                            {sh.holding_type || 'TERDAFTAR'}
                          </span>
                        </div>
                        <div className="text-right text-neutral-400 font-medium tabular-nums">{sh.rawAmount.toLocaleString('id-ID')}</div>
                        {/* PERSENTASE DINAMIS TANPA PEMBULATAN YANG MENYESESATKAN */}
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

        {/* ========================================= */}
        {/* TAB 2: FREE FLOAT ANALYSIS                */}
        {/* ========================================= */}
        {activeTab === 'FREE_FLOAT' && (
          <>
            {/* SISI KIRI: GRAFIK KEPEMILIKAN */}
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

            {/* SISI KANAN: METRIK TABULAR */}
            <div className="w-[65%] flex flex-col h-full overflow-hidden">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-3 bg-[#181818] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-500 uppercase tracking-widest items-center shrink-0">
                <div>Metrik Bandarmologi</div>
                <div className="text-right">Nilai / Lembar</div>
                <div className="text-right">Persentase</div>
                <div className="text-center">Indikator & Status</div>
              </div>

              <div className="flex flex-col flex-1 overflow-y-auto pb-4 hide-scrollbar">
                {/* ROW 1: OUTSTANDING SHARES */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-5 items-center text-[12px] border-b border-[#2d2d2d]/40 hover:bg-[#1e1e1e] transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-white font-bold tracking-wide">Total Saham Beredar</span>
                    <span className="text-neutral-500 text-[10px]">Outstanding Shares (100%)</span>
                  </div>
                  <div className="text-right text-white font-bold tabular-nums">{formatShares(profileData?.outstanding_shares || 0)}</div>
                  <div className="text-right text-neutral-400 font-semibold tabular-nums">100.00%</div>
                  <div className="flex justify-center">
                      <span className="bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/30 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-wide">
                        Market Cap: Rp {formatShortVal(marketCap)}
                      </span>
                  </div>
                </div>

                {/* ROW 2: CONTROLLING SHARES */}
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

                {/* ROW 3: FREE FLOAT */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-5 items-center text-[12px] border-b border-[#2d2d2d]/40 hover:bg-[#1e1e1e] transition-colors bg-[#1e1e1e]/30">
                  <div className="flex flex-col gap-1.5">
                    <span className={`font-bold tracking-wide ${isKering ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>Porsi Masyarakat (Free Float)</span>
                    <span className="text-neutral-500 text-[10px]">Saham Ritel & Publik (&lt;5%)</span>
                  </div>
                  <div className={`text-right font-bold tabular-nums ${isKering ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{formatShares(publicShares)}</div>
                  <div className={`text-right font-black tabular-nums text-[14px] ${isKering ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{publicPct.toFixed(2)}%</div>
                  <div className="flex justify-center gap-2 items-center">
                      <span className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm ${isKering ? 'bg-[#10b981] text-white' : 'bg-[#ef4444] text-white'}`}>
                        {isKering ? 'SAHAM KERING' : 'SAHAM BASAH'}
                      </span>
                  </div>
                </div>

                {/* ROW 4: NET FOREIGN */}
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1.5fr] px-5 py-5 items-center text-[12px] border-b border-[#2d2d2d]/40 hover:bg-[#1e1e1e] transition-colors">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-white font-bold tracking-wide flex items-center gap-2">Aktivitas Asing (Net Foreign)</span>
                    <span className="text-neutral-500 text-[10px] flex items-center gap-1">Pada Tanggal: <span className="text-[#3b82f6] font-bold">{dateToUse}</span></span>
                  </div>
                  <div className={`text-right font-black tabular-nums text-[13px] ${netForeignVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {netForeignVal > 0 ? '+' : ''}Rp {formatShortVal(netForeignVal)}
                  </div>
                  <div className="text-right text-neutral-500 font-semibold tabular-nums">-</div>
                  <div className="flex justify-center gap-2 items-center">
                      <span className={`px-4 py-1.5 rounded-md border text-[10px] font-bold tracking-wide ${netForeignVal >= 0 ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981]' : 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'}`}>
                        {netForeignVal >= 0 ? 'AKUMULASI ASING' : 'DISTRIBUSI ASING'}
                      </span>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </div>

      {/* FOOTER WIDGET */}
      <div className="px-4 py-2 border-t border-[#2d2d2d] bg-[#121212] shrink-0 text-center z-10">
        <span className="text-[10px] text-neutral-500 flex items-center justify-center gap-1.5 font-medium">
           <Info size={12} /> Arahkan kursor pada grafik untuk melihat detail persentase. Gunakan Search Bar untuk mengganti emiten.
        </span>
      </div>

    </div>
  );
}