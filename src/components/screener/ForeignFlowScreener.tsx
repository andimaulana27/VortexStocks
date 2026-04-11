// src/components/screener/ForeignFlowScreener.tsx
"use client";

import React, { useState } from 'react';
import { 
  Globe, Play, Loader2, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Settings2, ShieldCheck,
  TrendingDown, TrendingUp
} from 'lucide-react';

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface BrokerData {
  broker: { code: string; name: string };
  side: 'BUY' | 'SELL';
  lot: number;
  value: number; 
  avg: number;
}

interface PriceData {
  close: number;
  change: number;
  change_pct: number;
}

// Interface untuk menangkap response mentah dari endpoint harga
interface RawPriceResponse {
  symbol: string;
  close: number;
  change: number;
  change_pct: number;
}

interface ForeignScanResult {
  symbol: string;
  status: 'Accum on Weakness' | 'Mark Up' | 'Dist on Strength' | 'Mark Down' | 'Neutral';
  topBuyers: BrokerData[];
  topSellers: BrokerData[];
  netLot: number;
  netValue: number; 
  price: PriceData | null;
}

// Helper untuk format Rupiah (M = Juta, B = Miliar, T = Triliun)
const formatCurrency = (value: number) => {
  const absVal = Math.abs(value);
  if (absVal >= 1e12) return `Rp ${(value / 1e12).toFixed(2)} T`;
  if (absVal >= 1e9) return `Rp ${(value / 1e9).toFixed(2)} M`;
  if (absVal >= 1e6) return `Rp ${(value / 1e6).toFixed(2)} Jt`;
  return `Rp ${value.toLocaleString('id-ID')}`;
};

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function ForeignFlowScreener() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ForeignScanResult[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [progress, setProgress] = useState({ current: 0, total: 0, symbol: '' });
  const [targetIndex, setTargetIndex] = useState('LQ45');

  const getLatestMarketDate = async () => {
    const res = await fetch(`/api/market?endpoint=stock/idx/prices&symbols=BBCA`);
    if (!res.ok) throw new Error("Gagal mengecek status market");
    const data = await res.json();
    if (!data?.data?.results?.[0]?.date) throw new Error("Format tanggal market tidak valid");
    return data.data.results[0].date;
  };

  // Fungsi Utama Scanner (UPGRADED: Price Divergence & Chunking)
  const runScanner = async () => {
    setIsScanning(true);
    setErrorMsg(null);
    setScanResults([]);

    try {
      setProgress({ current: 0, total: 0, symbol: 'Mengecek kalender bursa...' });
      const marketDate = await getLatestMarketDate();

      setProgress({ current: 0, total: 0, symbol: `Menyiapkan target dari ${targetIndex.toUpperCase()}...` });
      let symbolsToScan: string[] = [];

      if (targetIndex === 'trending') {
        const res = await fetch(`/api/market?endpoint=stock/idx/trending`);
        const data = await res.json();
        symbolsToScan = data.data?.results?.slice(0, 50).map((s: { symbol: string }) => s.symbol) || [];
      } else {
        const res = await fetch(`/api/market?endpoint=stock/idx/index/${targetIndex}/items`);
        const data = await res.json();
        symbolsToScan = data.data?.results?.slice(0, 50) || [];
      }

      if (symbolsToScan.length === 0) throw new Error("Tidak ada saham yang ditemukan untuk di-scan.");

      // Fetch Harga Real-time sekaligus (Maksimal 50 symbol per hit ke GoAPI)
      setProgress({ current: 0, total: 0, symbol: 'Menganalisis korelasi harga...' });
      const priceRes = await fetch(`/api/market?endpoint=stock/idx/prices&symbols=${symbolsToScan.join(',')}`);
      const priceData = await priceRes.json();
      
      const priceMap: Record<string, PriceData> = {};
      if (priceData.status === 'success' && priceData.data?.results) {
        // PERBAIKAN: Mengganti (p: any) dengan tipe spesifik RawPriceResponse
        priceData.data.results.forEach((p: RawPriceResponse) => {
          priceMap[p.symbol] = { close: p.close, change: p.change, change_pct: p.change_pct };
        });
      }

      // Chunking Batching
      const resultsArray: ForeignScanResult[] = [];
      const chunkSize = 5; 
      let scannedCount = 0;
      
      for (let i = 0; i < symbolsToScan.length; i += chunkSize) {
        const chunk = symbolsToScan.slice(i, i + chunkSize);
        setProgress({ current: scannedCount, total: symbolsToScan.length, symbol: chunk.join(', ') });
        
        const fetchPromises = chunk.map(async (sym) => {
          try {
            const brokerRes = await fetch(`/api/market?endpoint=stock/idx/${sym}/broker_summary&date=${marketDate}&investor=FOREIGN`);
            const brokerData = await brokerRes.json();

            if (brokerData.status === 'success' && brokerData.data?.results) {
              const foreignBrokers: BrokerData[] = brokerData.data.results;

              const buyers = foreignBrokers.filter(b => b.side === 'BUY').sort((a, b) => b.value - a.value);
              const sellers = foreignBrokers.filter(b => b.side === 'SELL').sort((a, b) => b.value - a.value);

              const totalBuyLot = buyers.reduce((sum, b) => sum + b.lot, 0);
              const totalSellLot = sellers.reduce((sum, b) => sum + b.lot, 0);
              const totalBuyValue = buyers.reduce((sum, b) => sum + b.value, 0);
              const totalSellValue = sellers.reduce((sum, b) => sum + b.value, 0);

              const netLot = totalBuyLot - totalSellLot;
              const netValue = totalBuyValue - totalSellValue;
              const pData = priceMap[sym] || null;

              // UPGRADE LOGIKA: Mendeteksi Divergence Harga vs Volume Asing
              let status: ForeignScanResult['status'] = 'Neutral';
              
              if (netValue > 1000000000) {
                // Asing Net Buy > 1 Miliar
                if (pData && pData.change < 0) status = 'Accum on Weakness';
                else status = 'Mark Up';
              } else if (netValue < -1000000000) {
                // Asing Net Sell > 1 Miliar
                if (pData && pData.change > 0) status = 'Dist on Strength';
                else status = 'Mark Down';
              }

              return {
                symbol: sym,
                status,
                topBuyers: buyers.slice(0, 3),
                topSellers: sellers.slice(0, 3),
                netLot,
                netValue,
                price: pData
              };
            }
          } catch (e) {
             console.error(`Error scanning foreign flow for ${sym}:`, e);
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

      // Prioritaskan Accum on Weakness (Sinyal Terbaik), lalu urutkan berdasarkan Net Value
      resultsArray.sort((a, b) => {
        if (a.status === 'Accum on Weakness' && b.status !== 'Accum on Weakness') return -1;
        if (b.status === 'Accum on Weakness' && a.status !== 'Accum on Weakness') return 1;
        return b.netValue - a.netValue;
      });
      
      setScanResults(resultsArray);

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan saat melacak dana asing.");
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
          <div className="w-10 h-10 bg-[#3b82f6]/10 rounded-lg flex items-center justify-center border border-[#3b82f6]/20">
            <Globe size={20} className="text-[#3b82f6]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Net Foreign Radar</h2>
            <p className="text-neutral-500 text-[12px]">Lacak korelasi harga & akumulasi Dana Asing</p>
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
              <option value="LQ45">LQ45 Bluechips</option>
              <option value="IDX30">IDX30 Core</option>
              <option value="IDXHIDIV20">High Dividend 20</option>
              <option value="JII">Syariah (JII)</option>
              <option value="trending">Top Trending Stocks</option>
            </select>
          </div>

          <button 
            onClick={runScanner}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#3b82f6] to-[#1d4ed8] hover:from-[#2563eb] hover:to-[#1e40af] text-white text-[12px] font-bold rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} 
            {isScanning ? 'Memindai Asing...' : 'Mulai Radar'}
          </button>
        </div>
      </div>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {!isScanning && scanResults.length === 0 && !errorMsg && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
            <div className="w-20 h-20 bg-[#1e1e1e] border border-[#2d2d2d] rounded-full flex items-center justify-center mb-5 relative">
              <Globe size={32} className="text-[#3b82f6] opacity-50" />
            </div>
            <h3 className="text-white font-bold text-[16px] mb-2">Smart Divergence Radar</h3>
            <p className="text-neutral-500 text-[13px] max-w-md">
              Sistem kini menganalisis pergerakan Harga vs Volume Asing. Kami akan mencari saham yang sedang turun (merah) tetapi diborong oleh asing secara masif <span className="text-[#10b981] font-bold">(Accumulation on Weakness)</span>.
            </p>
          </div>
        )}

        {errorMsg && !isScanning && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-rose-500">
            <AlertCircle size={40} className="mb-4 opacity-80" />
            <h3 className="font-bold text-[15px] mb-1">Koneksi Terputus</h3>
            <p className="text-[12px] text-rose-400">{errorMsg}</p>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 z-20 bg-[#121212]/90 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-2 border-[#3b82f6]/20 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe size={28} className="text-[#3b82f6] animate-pulse" />
              </div>
            </div>
            <h3 className="text-white font-bold text-[16px] mb-2 tracking-wider animate-pulse">
              MENCOCOKKAN HARGA & ALIRAN DANA...
            </h3>
            <div className="bg-[#1e1e1e] border border-[#2d2d2d] px-4 py-2 rounded-lg flex items-center gap-3 min-w-[300px]">
              <span className="text-[#3b82f6] font-black text-[14px]">
                {progress.current}/{progress.total || '-'}
              </span>
              <div className="w-px h-4 bg-[#2d2d2d]"></div>
              <span className="text-neutral-300 text-[12px] font-mono truncate max-w-[200px]">
                Batch: {progress.symbol}
              </span>
            </div>
            
            <div className="w-[300px] h-1.5 bg-[#1e1e1e] rounded-full mt-4 overflow-hidden">
              <div 
                className="h-full bg-[#3b82f6] transition-all duration-300"
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
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d]">Sinyal Divergence</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d]">Harga (CHG)</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider border-b border-[#2d2d2d] text-right">Net Asing (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d2d] bg-[#121212]">
                {scanResults.map((res, idx) => {
                  
                  // Config visual berdasarkan status
                  let statusConfig = { icon: ShieldCheck, color: 'text-neutral-400', bg: 'bg-neutral-800' };
                  if (res.status === 'Accum on Weakness') statusConfig = { icon: TrendingDown, color: 'text-[#10b981]', bg: 'bg-[#10b981]/20' };
                  if (res.status === 'Mark Up') statusConfig = { icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
                  if (res.status === 'Dist on Strength') statusConfig = { icon: TrendingUp, color: 'text-rose-400', bg: 'bg-rose-400/10' };
                  if (res.status === 'Mark Down') statusConfig = { icon: ArrowDownRight, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/20' };

                  return (
                    <tr key={idx} className="hover:bg-[#1e1e1e]/50 transition-colors">
                      <td className="py-4 px-5">
                        <span className="text-[14px] font-black text-white">{res.symbol}</span>
                      </td>
                      <td className="py-4 px-5">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                          <statusConfig.icon size={14} strokeWidth={2.5} />
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
                      <td className="py-4 px-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-[13px] font-bold flex items-center gap-1 ${res.netValue > 0 ? 'text-[#10b981]' : res.netValue < 0 ? 'text-[#ef4444]' : 'text-neutral-400'}`}>
                            {res.netValue > 0 ? '+' : ''}{formatCurrency(res.netValue)}
                          </span>
                          <span className="text-[10px] text-neutral-500 mt-0.5">
                            {res.netLot > 0 ? '+' : ''}{res.netLot.toLocaleString('id-ID')} Lot
                          </span>
                        </div>
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