// src/components/screener/BandarmologiScreener.tsx
"use client";

import React, { useState } from 'react';
import { 
  Radar, Play, Loader2, AlertCircle, 
  TrendingUp, TrendingDown, ShieldCheck,
  Settings2, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface BrokerData {
  broker: { code: string; name: string };
  side: 'BUY' | 'SELL';
  lot: number;
  avg: number;
}

interface PriceData {
  close: number;
  change: number;
  change_pct: number;
}

interface RawPriceResponse {
  symbol: string;
  close: number;
  change: number;
  change_pct: number;
}

interface ScanResult {
  symbol: string;
  status: 'Accum on Weakness' | 'Strong Accum' | 'Dist on Strength' | 'Strong Dist' | 'Neutral';
  topBuyers: BrokerData[];
  topSellers: BrokerData[];
  netVolume: number; 
  ratio: number;
  price: PriceData | null;
}

// --- UPDATE KEAMANAN: FETCHER VIA PROXY INTERNAL ---
const fetchViaProxy = async (endpoint: string) => {
  const res = await fetch(`/api/market?endpoint=${encodeURIComponent(endpoint)}`);
  if (!res.ok) throw new Error('Gagal mengambil data dari proxy');
  return res.json();
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function BandarmologiScreener() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [progress, setProgress] = useState({ current: 0, total: 0, symbol: '' });
  const [targetIndex, setTargetIndex] = useState('trending'); 

  const getLatestMarketDate = async () => {
    const data = await fetchViaProxy('stock/idx/prices?symbols=BBCA');
    if (!data?.data?.results?.[0]?.date) throw new Error("Format tanggal market tidak valid");
    return data.data.results[0].date;
  };

  // Fungsi Utama Scanner (UPGRADED: Menggunakan Proxy)
  const runScanner = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setScanResults([]);

    try {
      setProgress({ current: 0, total: 0, symbol: 'Mengecek status market...' });
      const marketDate = await getLatestMarketDate();

      setProgress({ current: 0, total: 0, symbol: `Menyiapkan daftar dari ${targetIndex.toUpperCase()}...` });
      let symbolsToScan: string[] = [];

      if (targetIndex === 'trending') {
        const data = await fetchViaProxy('stock/idx/trending');
        symbolsToScan = data.data?.results?.slice(0, 50).map((s: { symbol: string }) => s.symbol) || [];
      } else {
        const data = await fetchViaProxy(`stock/idx/index/${targetIndex}/items`);
        symbolsToScan = data.data?.results?.slice(0, 50) || [];
      }

      if (symbolsToScan.length === 0) throw new Error("Tidak ada saham yang ditemukan untuk di-scan.");

      // Fetch Data Harga
      setProgress({ current: 0, total: 0, symbol: 'Menarik data harga...' });
      const priceData = await fetchViaProxy(`stock/idx/prices?symbols=${symbolsToScan.join(',')}`);
      
      const priceMap: Record<string, PriceData> = {};
      if (priceData.status === 'success' && priceData.data?.results) {
        priceData.data.results.forEach((p: RawPriceResponse) => {
          priceMap[p.symbol] = { close: p.close, change: p.change, change_pct: p.change_pct };
        });
      }

      const resultsArray: ScanResult[] = [];
      const chunkSize = 5; 
      let scannedCount = 0;

      for (let i = 0; i < symbolsToScan.length; i += chunkSize) {
        const chunk = symbolsToScan.slice(i, i + chunkSize);
        setProgress({ current: scannedCount, total: symbolsToScan.length, symbol: chunk.join(', ') });
        
        const fetchPromises = chunk.map(async (sym) => {
          try {
            const brokerData = await fetchViaProxy(`stock/idx/${sym}/broker_summary?date=${marketDate}&investor=ALL`);

            if (brokerData.status === 'success' && brokerData.data?.results) {
              const allBrokers: BrokerData[] = brokerData.data.results;

              const buyers = allBrokers.filter(b => b.side === 'BUY').sort((a, b) => b.lot - a.lot);
              const sellers = allBrokers.filter(b => b.side === 'SELL').sort((a, b) => b.lot - a.lot);

              const top3Buyers = buyers.slice(0, 3);
              const top3Sellers = sellers.slice(0, 3);

              const totalBuyLot = top3Buyers.reduce((sum, b) => sum + b.lot, 0);
              const totalSellLot = top3Sellers.reduce((sum, b) => sum + b.lot, 0);

              const ratio = totalSellLot > 0 ? totalBuyLot / totalSellLot : totalBuyLot > 0 ? 99 : 1;
              const netVolume = totalBuyLot - totalSellLot;
              const pData = priceMap[sym] || null;

              // UPGRADE LOGIKA BANDARMOLOGI
              let status: ScanResult['status'] = 'Neutral';
              
              if (ratio >= 1.1) {
                if (pData && pData.change < 0) status = 'Accum on Weakness'; 
                else status = 'Strong Accum'; 
              } else if (ratio <= 0.9) {
                if (pData && pData.change > 0) status = 'Dist on Strength'; 
                else status = 'Strong Dist';
              }

              return { symbol: sym, status, topBuyers: top3Buyers, topSellers: top3Sellers, netVolume, ratio, price: pData };
            }
          } catch (e) {
            console.error(`Error scanning ${sym}:`, e);
          }
          return null; 
        });

        const chunkResults = await Promise.all(fetchPromises);
        chunkResults.forEach(res => { if (res) resultsArray.push(res); });

        scannedCount += chunk.length;
        setProgress({ current: scannedCount, total: symbolsToScan.length, symbol: chunk.join(', ') });
        
        if (i + chunkSize < symbolsToScan.length) {
          await new Promise(resolve => setTimeout(resolve, 500)); 
        }
      }

      // Prioritaskan Sinyal Terbaik
      resultsArray.sort((a, b) => {
        if (a.status === 'Accum on Weakness' && b.status !== 'Accum on Weakness') return -1;
        if (b.status === 'Accum on Weakness' && a.status !== 'Accum on Weakness') return 1;
        return b.ratio - a.ratio;
      });

      setScanResults(resultsArray);

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat melakukan scan.");
    } finally {
      setIsScanning(false);
      setProgress(p => ({ ...p, current: p.total, symbol: 'Selesai' }));
    }
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex flex-col w-full h-full shadow-lg animate-in fade-in zoom-in-95 duration-300">
      
      {/* HEADER & CONTROLS */}
      <div className="flex items-center justify-between p-5 border-b border-[#2d2d2d] shrink-0 bg-[#1e1e1e]/40 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8b5cf6]/10 rounded-lg flex items-center justify-center border border-[#8b5cf6]/20">
            <Radar size={20} className="text-[#8b5cf6]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Smart Money Tracker</h2>
            <p className="text-neutral-500 text-[12px]">Lacak korelasi Harga vs Aksi Top 3 Broker</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#121212] border border-[#2d2d2d] rounded-lg px-3 py-1.5">
            <Settings2 size={14} className="text-neutral-400" />
            <select 
              value={targetIndex}
              onChange={(e) => setTargetIndex(e.target.value)}
              disabled={isScanning}
              className="bg-transparent text-[12px] font-bold text-white focus:outline-none cursor-pointer disabled:opacity-50"
            >
              <option value="trending">Top Trending Stocks</option>
              <option value="LQ45">LQ45 Bluechips</option>
              <option value="IDXSMC-LIQ">SMC Liquid</option>
            </select>
          </div>

          <button 
            onClick={runScanner}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] hover:from-[#7c3aed] hover:to-[#5b21b6] text-white text-[12px] font-bold rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} 
            {isScanning ? 'Menganalisis...' : 'Mulai Radar'}
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {!isScanning && scanResults.length === 0 && !errorMsg && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-[#1e1e1e] border border-[#2d2d2d] rounded-full flex items-center justify-center mb-5 relative">
              <Radar size={32} className="text-[#8b5cf6] opacity-50" />
            </div>
            <h3 className="text-white font-bold text-[16px] mb-2">Radar Bandar Siap</h3>
            <p className="text-neutral-500 text-[13px] max-w-md">
              Sistem kini menganalisis pergerakan Harga vs Volume Bandar. Temukan jebakan bandar seperti <span className="text-rose-400 font-bold">Distribution on Strength</span> (Harga naik, tapi bandar aslinya jualan).
            </p>
          </div>
        )}

        {errorMsg && !isScanning && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-rose-500">
            <AlertCircle size={40} className="mb-4 opacity-80" />
            <h3 className="font-bold text-[15px] mb-1">Gagal Menjalankan Radar</h3>
            <p className="text-[12px] text-rose-400">{errorMsg}</p>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 z-20 bg-[#121212]/90 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-2 border-[#8b5cf6]/20 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-[#8b5cf6] border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Radar size={28} className="text-[#8b5cf6] animate-pulse" />
              </div>
            </div>
            <h3 className="text-white font-bold text-[16px] mb-2 tracking-wider animate-pulse">
              MENYADAP TRANSAKSI BROKER...
            </h3>
            <div className="bg-[#1e1e1e] border border-[#2d2d2d] px-4 py-2 rounded-lg flex items-center gap-3 min-w-[300px]">
              <span className="text-[#8b5cf6] font-black text-[14px]">
                {progress.current}/{progress.total || '-'}
              </span>
              <div className="w-px h-4 bg-[#2d2d2d]"></div>
              <span className="text-neutral-300 text-[12px] font-mono truncate max-w-[200px]">
                Batch: {progress.symbol}
              </span>
            </div>
            
            <div className="w-[300px] h-1.5 bg-[#1e1e1e] rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-[#8b5cf6] transition-all duration-300"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}

        {scanResults.length > 0 && (
          <div className="flex-1 overflow-auto custom-tv-scroll">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1e1e1e] sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d]">Saham</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d]">Sinyal Bandar</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d]">Harga (CHG)</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d]">Top 3 Buyers</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d]">Top 3 Sellers</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d] text-right">Net Vol (Lot)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d2d] bg-[#121212]">
                {scanResults.map((res, idx) => {
                  
                  let statusConfig = { icon: ShieldCheck, color: 'text-neutral-400', bg: 'bg-neutral-800' };
                  if (res.status === 'Accum on Weakness') statusConfig = { icon: TrendingDown, color: 'text-[#10b981]', bg: 'bg-[#10b981]/20' };
                  if (res.status === 'Strong Accum') statusConfig = { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
                  if (res.status === 'Dist on Strength') statusConfig = { icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-400/10' };
                  if (res.status === 'Strong Dist') statusConfig = { icon: ArrowDownRight, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20' };

                  return (
                    <tr key={idx} className="hover:bg-[#1e1e1e]/50 transition-colors">
                      <td className="py-4 px-5">
                        <span className="text-[14px] font-black text-white">{res.symbol}</span>
                      </td>
                      <td className="py-4 px-5">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                          <statusConfig.icon size={12} strokeWidth={3} />
                          {res.status}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        {res.price ? (
                          <div className="flex flex-col">
                            <span className="text-[13px] font-bold text-white">{res.price.close.toLocaleString('id-ID')}</span>
                            <span className={`text-[10px] font-bold mt-0.5 ${res.price.change > 0 ? 'text-[#10b981]' : res.price.change < 0 ? 'text-[#ef4444]' : 'text-neutral-500'}`}>
                              {res.price.change > 0 ? '+' : ''}{res.price.change} ({res.price.change_pct.toFixed(2)}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-[12px]">-</span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex gap-1.5">
                          {res.topBuyers.map((b, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] rounded text-[10px] font-bold" title={`Avg: ${Math.round(b.avg)}`}>
                              {b.broker.code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex gap-1.5">
                          {res.topSellers.map((b, i) => (
                            <span key={i} className="px-2 py-0.5 bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] rounded text-[10px] font-bold" title={`Avg: ${Math.round(b.avg)}`}>
                              {b.broker.code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <span className={`text-[13px] font-bold ${res.netVolume > 0 ? 'text-[#10b981]' : res.netVolume < 0 ? 'text-[#ef4444]' : 'text-neutral-400'}`}>
                          {res.netVolume > 0 ? '+' : ''}{res.netVolume.toLocaleString('id-ID')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}