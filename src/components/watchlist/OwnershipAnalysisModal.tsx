// src/components/watchlist/OwnershipAnalysisModal.tsx
"use client";

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { 
  X, PieChart, Users, ShieldCheck, Activity, 
  Building2, CalendarDays, Layers, Briefcase 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell 
} from 'recharts';

interface OwnershipAnalysisModalProps {
  symbol: string | null;
  onClose: () => void;
}

// --- INTERFACES UNTUK GOAPI ---
interface ProfileDirector {
  name: string;
  role: string;
}
interface ProfileCommissioner {
  name: string;
  role: string;
}
interface ProfileShareholder {
  name: string;
  holding_type: string;
  amount: string | number;
  percentage: string | number;
}
interface GoApiProfileData {
  name: string;
  symbol: string;
  about: string;
  sector_name: string;
  industry_name: string;
  ipo_listing_date: string;
  outstanding_shares: number;
  directors: ProfileDirector[];
  commissioners: ProfileCommissioner[];
  shareholders: ProfileShareholder[];
}
interface GoApiBrokerItem {
  investor?: string;
  side?: string;
  value?: number;
}
interface GoApiHistoryItem {
  date: string;
}

const formatNumber = (num: number): string => {
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (absNum / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(2) + 'K';
  return absNum.toLocaleString("id-ID");
};

// Helper untuk parsing amount string ("67.729.950.000" -> 67729950000)
const parseAmount = (amt: string | number): number => {
  if (typeof amt === 'number') return amt;
  if (!amt) return 0;
  return Number(amt.replace(/\./g, '').replace(/,/g, ''));
};

const chunkArray = <T,>(arr: T[], size: number): T[][] => 
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

// --- ENTERPRISE FETCHER ---
const fetchOwnershipData = async (keyArgs: [string, string]) => {
  const [, symbol] = keyArgs;
  if (!symbol) return null;

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };

  try {
    // 1. Tarik Data Profil (Shareholders, Directors, Overview, dll)
    const profileRes = await fetch(`https://api.goapi.io/stock/idx/${symbol}/profile`, { headers }).then(r => r.json());
    const profileData: GoApiProfileData = profileRes?.data;

    // 2. Dapatkan Hari Perdagangan Aktif (Bukan sekadar kurang 14 hari kalender)
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 30); // Tarik 30 hari kebelakang untuk memastikan dapat 14 hari bursa
    
    const fromDate = past.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const histRes = await fetch(`https://api.goapi.io/stock/idx/${symbol}/historical?from=${fromDate}&to=${toDate}`, { headers }).then(r => r.json());
    const history: GoApiHistoryItem[] = histRes?.data?.results || [];
    
    // Ambil 14 tanggal perdagangan terakhir secara persis
    const validDates = history.map(h => h.date).slice(-14);

    // 3. Tarik Data Broker Summary (HANYA FOREIGN untuk akurasi net)
    // Logika: Karena pasar saham adalah sistem tertutup (Total Buy = Total Sell), 
    // maka Local Net = Minus dari Foreign Net. Ini lebih akurat dan mencegah bug dari API saat investor=ALL.
    const flowDataMap: Record<string, { foreignNet: number; localNet: number }> = {};
    const dateChunks = chunkArray(validDates, 7); 
    
    for (const chunk of dateChunks) {
      const promises = chunk.map(date => 
        fetch(`https://api.goapi.io/stock/idx/${symbol}/broker_summary?date=${date}&investor=FOREIGN`, { headers })
          .then(r => r.json())
          .then(res => {
            const brokers: GoApiBrokerItem[] = res?.data?.results || [];
            let fNet = 0;
            brokers.forEach(b => {
              const val = Number(b.value) || 0;
              const side = b.side?.toUpperCase();
              if (side === 'BUY') fNet += val;
              else if (side === 'SELL') fNet -= val;
            });
            // Pantulan matematis sempurna: Apa yang Asing beli, itu yang Lokal jual
            return { date, fNet, lNet: -fNet }; 
          })
          .catch(() => ({ date, fNet: 0, lNet: 0 }))
      );
      const results = await Promise.all(promises);
      results.forEach(r => { flowDataMap[r.date] = { foreignNet: r.fNet, localNet: r.lNet }; });
    }

    return { profileData, flowDataMap, validDates };
  } catch (error) {
    console.error("Ownership Fetch Error:", error);
    return null;
  }
};

export default function OwnershipAnalysisModal({ symbol, onClose }: OwnershipAnalysisModalProps) {
  const { data, isLoading } = useSWR(
    symbol ? ['ownership-data', symbol] : null,
    fetchOwnershipData,
    { dedupingInterval: 120000, revalidateOnFocus: false }
  );

  const processedData = useMemo(() => {
    if (!data || !data.profileData) return null;
    const { profileData, flowDataMap, validDates } = data;
    const totalShares = profileData.outstanding_shares || 0;

    // 1. Olah Daftar Pemegang Saham & Identifikasi Insider & Publik
    let totalMajorPct = 0;
    let explicitPublicPct = 0;

    const shareholders = (profileData.shareholders || []).map(sh => {
      const nameUpper = sh.name.toUpperCase();
      let pct = Number(sh.percentage) || 0;
      const amtNum = parseAmount(sh.amount);

      // Kalkulasi manual jika API mengembalikan persentase 0% tapi memiliki amount lembar saham
      if (pct === 0 && amtNum > 0 && totalShares > 0) {
        pct = (amtNum / totalShares) * 100;
      }

      // Cek apakah data ini sebenarnya adalah data publik (Masyarakat)
      const isPublic = nameUpper.includes('MASYARAKAT') || nameUpper.includes('PUBLIK');

      if (isPublic) {
        explicitPublicPct += pct;
      } else {
        totalMajorPct += pct;
      }

      let role = '-';
      let isInsider = false;
      
      const isPengendali = sh.holding_type?.toLowerCase().includes('pengendali') || pct >= 50;

      const isDir = profileData.directors?.some(d => d.name.toUpperCase() === nameUpper);
      if (isDir) { role = 'direksi'; isInsider = true; }
      
      const isKom = profileData.commissioners?.some(c => c.name.toUpperCase() === nameUpper);
      if (isKom) { role = role === '-' ? 'komisaris' : `${role} & komisaris`; isInsider = true; }

      return {
        name: sh.name,
        percentage: pct,
        amountNum: amtNum,
        role: isPengendali && !isPublic ? 'pengendali' : role,
        isInsider,
        isPublic
      };
    }).sort((a, b) => b.percentage - a.percentage);

    // Hitung sisa persentase untuk publik jika API tidak memberikannya secara eksplisit
    const calculatedPublicPct = Math.max(0, 100 - totalMajorPct);
    const finalPublicPct = explicitPublicPct > 0 ? explicitPublicPct : calculatedPublicPct;

    // 2. Olah Data Pie Chart (Pisahkan antara Institusi/Major dan Publik)
    const topNonPublic = shareholders.filter(s => !s.isPublic).slice(0, 4);
    const pieData = topNonPublic.map(s => ({ name: s.name, value: s.percentage }));
    
    if (finalPublicPct > 0) {
       pieData.push({ name: 'Masyarakat / Publik', value: finalPublicPct });
    }

    // 3. Olah Data Flow Chart (Kumulatif 14 Hari Bursa)
    let cumForeign = 0;
    let cumLocal = 0;
    const flowChartData = validDates.map((d: string) => {
      cumForeign += (flowDataMap[d]?.foreignNet || 0);
      cumLocal += (flowDataMap[d]?.localNet || 0);
      return {
        date: d.slice(5), // Ambil MM-DD
        Foreign: cumForeign,
        Local: cumLocal
      };
    });

    return {
      profile: profileData,
      shareholders,
      pieData,
      flowChartData,
      finalPublicPct,
      explicitPublicPct,
      totalShares
    };
  }, [data]);

  if (!symbol) return null;

  const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#2d2d2d] w-[95vw] max-w-[1400px] h-[95vh] rounded-xl flex flex-col shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d2d] bg-[#1e1e1e]/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full flex items-center justify-center">
              <PieChart className="text-[#3b82f6]" size={20} />
            </div>
            <div>
              <h2 className="text-white font-black text-xl flex items-center gap-2">
                {symbol} <span className="bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-400 text-[10px] px-2 py-0.5 rounded-full uppercase">Ownership & Profile</span>
              </h2>
              <p className="text-neutral-500 text-[11px] font-medium">{processedData?.profile?.name || 'Loading...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-[#ef4444] rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 bg-[#121212]">
          
          {isLoading || !processedData ? (
             <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
               <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
               <span className="text-[#3b82f6] font-bold text-xs animate-pulse">Menarik Data KSEI & Sinkronisasi Arus Bandar...</span>
             </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* PANEL COMPANY OVERVIEW */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#1e1e1e] border border-[#2d2d2d] p-4 rounded-xl flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-[#8b5cf6]/10 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-[#8b5cf6]" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Sektor</p>
                    <p className="text-white font-bold text-[13px] truncate" title={processedData.profile.sector_name}>{processedData.profile.sector_name || '-'}</p>
                  </div>
                </div>
                
                <div className="bg-[#1e1e1e] border border-[#2d2d2d] p-4 rounded-xl flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-[#06b6d4]/10 flex items-center justify-center shrink-0">
                    <Layers size={18} className="text-[#06b6d4]" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Industri</p>
                    <p className="text-white font-bold text-[13px] truncate" title={processedData.profile.industry_name}>{processedData.profile.industry_name || '-'}</p>
                  </div>
                </div>

                <div className="bg-[#1e1e1e] border border-[#2d2d2d] p-4 rounded-xl flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-[#f59e0b]/10 flex items-center justify-center shrink-0">
                    <CalendarDays size={18} className="text-[#f59e0b]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Tanggal IPO (Listing)</p>
                    <p className="text-white font-bold text-[13px]">{processedData.profile.ipo_listing_date || '-'}</p>
                  </div>
                </div>

                <div className="bg-[#1e1e1e] border border-[#2d2d2d] p-4 rounded-xl flex items-center gap-4 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center shrink-0">
                    <Activity size={18} className="text-[#10b981]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Outstanding Shares</p>
                    <p className="text-white font-bold text-[13px] tabular-nums">{processedData.totalShares.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>

              {/* GRID CHART: PIE CHART & TREN FLOW */}
              <div className="grid grid-cols-3 gap-6 h-[320px]">
                
                {/* 1. Komposisi Kepemilikan (Pie Chart) */}
                <div className="col-span-1 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-5 flex flex-col relative shadow-sm">
                  <h3 className="text-white font-bold text-[13px] flex items-center gap-2 mb-2">
                    <Users size={16} className="text-[#f59e0b]" /> Komposisi Kepemilikan
                  </h3>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={processedData.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                          {processedData.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#121212', borderColor: '#2d2d2d', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                          itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          formatter={(value: number | string | readonly (string | number)[] | undefined) => {
                            const numValue = Array.isArray(value) ? Number(value[0]) : Number(value) || 0;
                            return `${numValue.toFixed(2)}%`;
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                      <span className="text-neutral-500 text-[10px] font-bold">PUBLIK</span>
                      <span className="text-white font-black text-[16px]">{processedData.finalPublicPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Tren Akumulasi Net Asing vs Lokal (Area Chart) */}
                <div className="col-span-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-5 flex flex-col shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-[13px] flex items-center gap-2">
                      <Activity size={16} className="text-[#10b981]" /> Tren Akumulasi Net (14 Hari Bursa)
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] font-bold">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#3b82f6] rounded-sm"></div><span className="text-neutral-400">Asing (Foreign)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#10b981] rounded-sm"></div><span className="text-neutral-400">Lokal (Domestic)</span></div>
                    </div>
                  </div>
                  <div className="flex-1 w-full">
                    {processedData.flowChartData.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-neutral-500 text-[11px]">Data riwayat transaksi tidak ditemukan.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={processedData.flowChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorForeign" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorLocal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2d2d2d" vertical={false} />
                          <XAxis dataKey="date" stroke="#525252" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                          <YAxis stroke="#525252" fontSize={10} tickFormatter={(v) => formatNumber(v)} axisLine={false} tickLine={false} width={55} />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#121212', borderColor: '#2d2d2d', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                            formatter={(value: number | string | readonly (string | number)[] | undefined) => {
                              const numValue = Array.isArray(value) ? Number(value[0]) : Number(value) || 0;
                              return formatNumber(numValue);
                            }}
                          />
                          <Area type="monotone" dataKey="Foreign" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorForeign)" />
                          <Area type="monotone" dataKey="Local" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLocal)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

              </div>

              {/* GRID BAWAH: TABLE SHAREHOLDERS & DIRECTORS */}
              <div className="grid grid-cols-2 gap-6 items-start">
                
                {/* KIRI: PEMEGANG SAHAM UTAMA */}
                <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-[#2d2d2d] flex justify-between items-center bg-[#1e1e1e]">
                    <h3 className="text-white font-bold text-[13px] flex items-center gap-2">
                      <ShieldCheck size={16} className="text-[#3b82f6]" /> Pemegang Saham Utama (&gt;5%)
                    </h3>
                  </div>
                  <div className="grid grid-cols-[3fr_1.5fr_1fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-500 tracking-wider uppercase">
                    <div>Pemegang Saham</div>
                    <div>Jabatan / Status</div>
                    <div className="text-right">Kepemilikan</div>
                  </div>
                  <div className="flex flex-col max-h-[300px] overflow-y-auto hide-scrollbar">
                    {processedData.shareholders.length === 0 ? (
                      <div className="p-8 text-center text-neutral-500 text-[11px] font-medium">Data pemegang saham utama tidak tersedia.</div>
                    ) : (
                      processedData.shareholders.map((sh, idx) => (
                        <div key={idx} className="grid grid-cols-[3fr_1.5fr_1fr] px-5 py-3 border-b border-[#2d2d2d]/50 hover:bg-[#2d2d2d]/30 transition-colors items-center">
                          <div className="flex flex-col gap-1 pr-2">
                            <span className="text-white font-black text-[11px] leading-snug">{sh.name}</span>
                            <div className="flex flex-wrap gap-1">
                              <span className="text-neutral-500 text-[9px] tabular-nums">{sh.amountNum.toLocaleString('id-ID')} Lembar</span>
                              {sh.isInsider && (
                                <span className="bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#a855f7] text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Insider</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center">
                            {sh.role !== '-' ? (
                              <span className="bg-[#2d2d2d] border border-[#3e3e3e] text-neutral-300 text-[9px] font-medium px-2 py-0.5 rounded-full capitalize">{sh.role}</span>
                            ) : (
                              <span className="text-neutral-600">-</span>
                            )}
                          </div>
                          <div className="text-right text-white font-black text-[12px] tabular-nums">
                            {sh.percentage.toFixed(2)}%
                          </div>
                        </div>
                      ))
                    )}

                    {/* Tampilkan baris Manual Publik jika API tidak menyediakan data masyarakat secara detail */}
                    {processedData.explicitPublicPct === 0 && processedData.finalPublicPct > 0 && (
                      <div className="grid grid-cols-[3fr_1.5fr_1fr] px-5 py-3 bg-[#121212]/80 items-center border-t border-[#2d2d2d]">
                        <div className="flex flex-col gap-1">
                          <span className="text-neutral-300 font-black text-[11px]">MASYARAKAT NON WARKAT (PUBLIK)</span>
                        </div>
                        <div><span className="text-neutral-600">-</span></div>
                        <div className="text-right text-white font-black text-[12px] tabular-nums">
                          {processedData.finalPublicPct.toFixed(2)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* KANAN: DIREKSI & KOMISARIS */}
                <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-[#2d2d2d] flex justify-between items-center bg-[#1e1e1e]">
                    <h3 className="text-white font-bold text-[13px] flex items-center gap-2">
                      <Briefcase size={16} className="text-[#f59e0b]" /> Susunan Direksi & Komisaris
                    </h3>
                  </div>
                  <div className="grid grid-cols-[1fr_2fr] px-5 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-500 tracking-wider uppercase">
                    <div>Posisi / Jabatan</div>
                    <div>Nama Lengkap</div>
                  </div>
                  <div className="flex flex-col max-h-[300px] overflow-y-auto hide-scrollbar p-0">
                    
                    {/* Render Komisaris */}
                    {processedData.profile.commissioners?.map((com, idx) => (
                      <div key={`com-${idx}`} className="grid grid-cols-[1fr_2fr] px-5 py-2.5 border-b border-[#2d2d2d]/50 hover:bg-[#2d2d2d]/30 transition-colors items-center">
                        <div>
                          <span className="bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 text-[9px] font-bold px-2 py-0.5 rounded capitalize">
                            {com.role.toLowerCase()}
                          </span>
                        </div>
                        <div className="text-white font-bold text-[11px] truncate" title={com.name}>
                          {com.name}
                        </div>
                      </div>
                    ))}

                    {/* Render Direksi */}
                    {processedData.profile.directors?.map((dir, idx) => (
                      <div key={`dir-${idx}`} className="grid grid-cols-[1fr_2fr] px-5 py-2.5 border-b border-[#2d2d2d]/50 hover:bg-[#2d2d2d]/30 transition-colors items-center">
                        <div>
                          <span className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 text-[9px] font-bold px-2 py-0.5 rounded capitalize">
                            {dir.role.toLowerCase()}
                          </span>
                        </div>
                        <div className="text-white font-bold text-[11px] truncate" title={dir.name}>
                          {dir.name}
                        </div>
                      </div>
                    ))}

                    {(!processedData.profile.commissioners?.length && !processedData.profile.directors?.length) && (
                       <div className="p-8 text-center text-neutral-500 text-[11px] font-medium">Data Direksi dan Komisaris tidak tersedia.</div>
                    )}

                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}