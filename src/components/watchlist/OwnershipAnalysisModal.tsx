// src/components/watchlist/OwnershipAnalysisModal.tsx
"use client";

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { X, PieChart, Users, ShieldCheck, Activity, AlertCircle } from 'lucide-react';
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

const formatNumber = (num: number): string => {
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (absNum / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (absNum / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (absNum / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (absNum / 1e3).toFixed(2) + 'K';
  return absNum.toLocaleString("id-ID");
};

// Fungsi helper penarikan tanggal 14 hari perdagangan terakhir
const getTradingDates = (days: number): string[] => {
  const dates: string[] = [];
  // PERBAIKAN: Menggunakan const alih-alih let
  const currentDate = new Date(); 
  while (dates.length < days) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(currentDate.toISOString().split('T')[0]);
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return dates.reverse();
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
    // 1. Tarik Data Profil (Shareholders, Directors, dll)
    const profileRes = await fetch(`https://api.goapi.io/stock/idx/${symbol}/profile`, { headers }).then(r => r.json());
    const profileData: GoApiProfileData = profileRes?.data;

    // 2. Tarik Data Broker Summary (14 Hari untuk Proxy Tren Kepemilikan)
    const dates = getTradingDates(14);
    const flowDataMap: Record<string, { foreignNet: number; localNet: number }> = {};
    
    const dateChunks = chunkArray(dates, 7); 
    for (const chunk of dateChunks) {
      const promises = chunk.map(date => 
        fetch(`https://api.goapi.io/stock/idx/${symbol}/broker_summary?date=${date}&investor=ALL`, { headers })
          .then(r => r.json())
          .then(res => {
            const brokers: GoApiBrokerItem[] = res?.data?.results || [];
            let fNet = 0; let lNet = 0;
            brokers.forEach(b => {
              const val = b.value || 0;
              if (b.investor === 'FOREIGN') { fNet += b.side === 'BUY' ? val : -val; }
              else if (b.investor === 'LOCAL') { lNet += b.side === 'BUY' ? val : -val; }
            });
            return { date, fNet, lNet };
          })
          .catch(() => ({ date, fNet: 0, lNet: 0 }))
      );
      const results = await Promise.all(promises);
      results.forEach(r => { flowDataMap[r.date] = { foreignNet: r.fNet, localNet: r.lNet }; });
    }

    return { profileData, flowDataMap, dates };
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
    const { profileData, flowDataMap, dates } = data;

    // 1. Olah Daftar Pemegang Saham & Identifikasi Insider
    let totalMajorPct = 0;
    const shareholders = (profileData.shareholders || []).map(sh => {
      const nameUpper = sh.name.toUpperCase();
      const pct = Number(sh.percentage) || 0;
      totalMajorPct += pct;

      let role = '-';
      let isInsider = false;
      
      // PERBAIKAN: Menggunakan const alih-alih let
      const isPengendali = sh.holding_type.toLowerCase().includes('pengendali') || pct >= 50;

      // Cek apakah Direksi
      const isDir = profileData.directors?.some(d => d.name.toUpperCase() === nameUpper);
      if (isDir) { role = 'direksi'; isInsider = true; }
      
      // Cek apakah Komisaris
      const isKom = profileData.commissioners?.some(c => c.name.toUpperCase() === nameUpper);
      if (isKom) { role = role === '-' ? 'komisaris' : `${role} & komisaris`; isInsider = true; }

      return {
        name: sh.name,
        percentage: pct,
        amount: sh.amount,
        role: isPengendali ? 'pengendali' : role,
        isInsider
      };
    }).sort((a, b) => b.percentage - a.percentage);

    const publicPct = Math.max(0, 100 - totalMajorPct);

    // 2. Olah Data Pie Chart
    const pieData = shareholders.slice(0, 4).map(s => ({ name: s.name, value: s.percentage }));
    if (publicPct > 0) pieData.push({ name: 'Masyarakat / Publik', value: publicPct });

    // 3. Olah Data Flow Chart (Kumulatif 14 Hari)
    let cumForeign = 0;
    let cumLocal = 0;
    const flowChartData = dates.map(d => {
      cumForeign += (flowDataMap[d]?.foreignNet || 0);
      cumLocal += (flowDataMap[d]?.localNet || 0);
      return {
        date: d.slice(5), // Ambil MM-DD
        Foreign: cumForeign,
        Local: cumLocal
      };
    });

    return {
      companyName: profileData.name,
      outstandingShares: profileData.outstanding_shares,
      shareholders,
      pieData,
      flowChartData,
      publicPct
    };
  }, [data]);

  if (!symbol) return null;

  const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#64748b'];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#2d2d2d] w-[95vw] max-w-[1300px] h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d2d] bg-[#1e1e1e]/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#3b82f6]/10 border border-[#3b82f6]/20 rounded-full flex items-center justify-center">
              <PieChart className="text-[#3b82f6]" size={20} />
            </div>
            <div>
              <h2 className="text-white font-black text-xl flex items-center gap-2">
                {symbol} <span className="bg-[#1e1e1e] border border-[#2d2d2d] text-neutral-400 text-[10px] px-2 py-0.5 rounded-full uppercase">Ownership</span>
              </h2>
              <p className="text-neutral-500 text-[11px] font-medium">{processedData?.companyName || 'Loading...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-500 hover:text-white hover:bg-[#ef4444] rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 bg-[#121212]">
          
          {isLoading || !processedData ? (
             <div className="w-full h-64 flex flex-col items-center justify-center space-y-4">
               <div className="w-8 h-8 border-4 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
               <span className="text-[#3b82f6] font-bold text-xs animate-pulse">Menarik Data Kepemilikan KSEI & Profil Emiten...</span>
             </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* PERINGATAN DATA (Transparansi) */}
              <div className="flex items-start gap-3 bg-[#3b82f6]/10 border border-[#3b82f6]/30 p-4 rounded-xl">
                <AlertCircle className="text-[#3b82f6] mt-0.5" size={18} shrink-0 />
                <div>
                  <p className="text-[#3b82f6] font-bold text-[12px] mb-1">Informasi Ketersediaan Data</p>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                    Akses API Market Publik tidak menyediakan rincian SID atau komposisi DPLK KSEI bulanan. 
                    Data di bawah ini diolah secara akurat dari Profil Pemegang Saham Utama (Biro Administrasi Efek) dan 
                    dikombinasikan dengan arus transaksi broker (Foreign vs Local Flow) selama 14 hari terakhir sebagai pengukur tren akumulasi.
                  </p>
                </div>
              </div>

              {/* GRID ATAS: PIE CHART & TREN FLOW */}
              <div className="grid grid-cols-3 gap-6 h-[300px]">
                
                {/* 1. Komposisi Kepemilikan (Pie Chart) */}
                <div className="col-span-1 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-5 flex flex-col relative">
                  <h3 className="text-white font-bold text-[13px] flex items-center gap-2 mb-2">
                    <Users size={16} className="text-[#f59e0b]" /> Komposisi Kepemilikan
                  </h3>
                  <div className="flex-1 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie data={processedData.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                          {processedData.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        {/* PERBAIKAN TYPE FORMATTER UNTUK TOOLTIP */}
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-neutral-500 text-[9px] font-bold">PUBLIK</span>
                      <span className="text-white font-black text-[14px]">{processedData.publicPct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Tren Akumulasi Net Asing vs Lokal (Area Chart) */}
                <div className="col-span-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-5 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-[13px] flex items-center gap-2">
                      <Activity size={16} className="text-[#10b981]" /> Tren Akumulasi Net (14 Hari)
                    </h3>
                    <div className="flex items-center gap-4 text-[10px] font-bold">
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#3b82f6] rounded-sm"></div><span className="text-neutral-400">Asing (Foreign)</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-[#10b981] rounded-sm"></div><span className="text-neutral-400">Lokal (Domestic)</span></div>
                    </div>
                  </div>
                  <div className="flex-1 w-full">
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
                        <YAxis stroke="#525252" fontSize={10} tickFormatter={(v) => formatNumber(v)} axisLine={false} tickLine={false} width={50} />
                        
                        {/* PERBAIKAN TYPE FORMATTER UNTUK TOOLTIP */}
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
                  </div>
                </div>

              </div>

              {/* TABEL PEMEGANG SAHAM UTAMA */}
              <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-[#2d2d2d] flex justify-between items-center bg-[#1e1e1e]">
                  <h3 className="text-white font-bold text-[14px] flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#3b82f6]" /> Pemegang Saham Utama (Detail)
                  </h3>
                  <span className="text-neutral-500 text-[10px] font-medium">Data diperbarui otomatis dari Biro Administrasi Efek</span>
                </div>
                
                {/* Headers */}
                <div className="grid grid-cols-[3fr_1.5fr_1fr] px-6 py-3 bg-[#121212] border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-500 tracking-wider uppercase">
                  <div>Pemegang Saham</div>
                  <div>Jabatan / Status</div>
                  <div className="text-right">Kepemilikan</div>
                </div>

                {/* Body */}
                <div className="flex flex-col">
                  {processedData.shareholders.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 text-xs font-medium">Data pemegang saham utama tidak tersedia untuk emiten ini.</div>
                  ) : (
                    processedData.shareholders.map((sh, idx) => (
                      <div key={idx} className="grid grid-cols-[3fr_1.5fr_1fr] px-6 py-3.5 border-b border-[#2d2d2d]/50 hover:bg-[#2d2d2d]/30 transition-colors items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-white font-black text-[12px]">{sh.name}</span>
                          {sh.isInsider && (
                            <span className="bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#a855f7] text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                              Insider
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          {sh.role !== '-' ? (
                            <span className="bg-[#2d2d2d] border border-[#3e3e3e] text-neutral-300 text-[10px] font-medium px-2.5 py-1 rounded-full capitalize">
                              {sh.role}
                            </span>
                          ) : (
                            <span className="text-neutral-600">-</span>
                          )}
                        </div>
                        <div className="text-right text-white font-black text-[13px] tabular-nums">
                          {sh.percentage.toFixed(2)}%
                        </div>
                      </div>
                    ))
                  )}

                  {/* Tambahan Baris Masyarakat/Publik */}
                  <div className="grid grid-cols-[3fr_1.5fr_1fr] px-6 py-4 bg-[#121212]/50 items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-black text-[12px]">MASYARAKAT NON WARKAT (PUBLIK)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-neutral-600">-</span>
                    </div>
                    <div className="text-right text-white font-black text-[13px] tabular-nums">
                      {processedData.publicPct.toFixed(2)}%
                    </div>
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