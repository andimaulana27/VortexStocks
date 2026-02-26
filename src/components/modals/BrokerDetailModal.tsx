"use client";

import React from 'react';
import { X, ExternalLink, Info } from 'lucide-react';

// --- INTERFACES ---
export interface StockActivity {
  symbol: string;
  name: string;
  buyVal: number;
  sellVal: number;
  netVal: number;
  avgPrice: number;
}

interface BrokerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  brokerCode: string;
  brokerName: string;
  investorType: string;
  totalNetVal: number;
  totalNetLot: number;
  avgPrice: number;
  activities: StockActivity[];
  isLoadingData?: boolean; // Indikator loading saat memindai banyak saham
}

// --- HELPER FORMATTING ---
const formatValue = (num: number) => {
  const abs = Math.abs(num);
  if (abs >= 1e9) return (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (abs / 1e3).toFixed(2) + 'K';
  return num.toString();
};

// FIX LOGIKA WARNA KONSISTEN (Merah Asing, Hijau BUMN, Ungu Lokal)
const getBrokerColorClass = (code: string, type: string) => {
  const bumnCodes = ["CC", "NI", "OD"];
  const foreignCodes = ["AK", "BK", "CS", "CG", "DB", "DX", "FS", "GW", "KZ", "ML", "MS", "RX", "ZP", "YU", "BB"];
  
  if (type.toUpperCase() === 'FOREIGN' || foreignCodes.includes(code.toUpperCase())) {
    return "text-[#ef4444]"; // Merah
  }
  if (bumnCodes.includes(code.toUpperCase())) {
    return "text-[#10b981]"; // Hijau
  }
  return "text-[#a855f7]"; // Ungu
};

export default function BrokerDetailModal({
  isOpen,
  onClose,
  brokerCode,
  brokerName,
  investorType,
  totalNetVal,
  totalNetLot,
  avgPrice,
  activities,
  isLoadingData = false
}: BrokerDetailModalProps) {
  if (!isOpen) return null;

  const brokerColor = getBrokerColorClass(brokerCode, investorType);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#121212] border border-[#2d2d2d] w-full max-w-4xl rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] overflow-hidden transform transition-all">
        
        {/* HEADER SECTION */}
        <div className="p-4 border-b border-[#2d2d2d] flex justify-between items-start shrink-0 bg-[#121212]">
          <div className="flex gap-4 items-center">
            {/* Box Kode Broker - Warnanya mengikuti logic (Merah/Hijau/Ungu) */}
            <div className={`text-3xl font-black px-4 py-2 bg-[#1e1e1e] rounded-lg border border-[#2d2d2d] ${brokerColor} shadow-inner`}>
              {brokerCode}
            </div>
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                {brokerName || "Unknown Broker"} <ExternalLink size={14} className="text-neutral-500 hover:text-white cursor-pointer" />
              </h2>
              <div className="flex gap-3 mt-1.5 items-center">
                <span className={`text-[9px] bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#2d2d2d] font-black tracking-widest ${brokerColor}`}>
                  {investorType.toUpperCase()}
                </span>
                <span className="text-[10px] text-neutral-500 flex items-center gap-1 font-semibold">
                   Broker Summary Profiler <Info size={10} />
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors border border-transparent hover:border-[#2d2d2d]">
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        {/* SUMMARY STATS GRID */}
        <div className="grid grid-cols-3 gap-0 border-b border-[#2d2d2d] bg-[#121212] shrink-0">
          <div className="p-4 border-r border-[#2d2d2d] flex flex-col justify-center">
            <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Net Value</p>
            <p className={`text-xl font-black tabular-nums ${totalNetVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
              {totalNetVal > 0 ? '+' : ''}{formatValue(totalNetVal)}
            </p>
          </div>
          <div className="p-4 border-r border-[#2d2d2d] flex flex-col justify-center">
            <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Net Lot</p>
            <p className="text-xl font-black text-white tabular-nums">{formatValue(totalNetLot)}</p>
          </div>
          <div className="p-4 flex flex-col justify-center">
            <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider mb-1">Avg Price Est.</p>
            <p className="text-xl font-black text-[#60a5fa] tabular-nums">{Math.round(avgPrice).toLocaleString('id-ID')}</p>
          </div>
        </div>
        

        {/* TABLE CONTENT */}
        <div className="flex-1 overflow-y-auto bg-[#121212] hide-scrollbar relative">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#121212] text-neutral-500 font-bold uppercase tracking-wider z-10 border-b border-[#2d2d2d]">
              <tr>
                <th className="px-4 py-3 font-semibold">Stock Active</th>
                <th className="px-4 py-3 text-right font-semibold">Buy Val</th>
                <th className="px-4 py-3 text-right font-semibold">Sell Val</th>
                <th className="px-4 py-3 text-right font-semibold">Net Val</th>
                <th className="px-4 py-3 text-right font-semibold">Avg Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d2d2d]/50">
              {isLoadingData ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                       <div className="w-5 h-5 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
                       <span className={`text-[10px] font-bold animate-pulse ${brokerColor}`}>
                         Menyisir aktivitas {brokerCode} di pasar...
                       </span>
                    </div>
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500 text-[10px]">
                    Tidak ada aktivitas signifikan di pasar aktif hari ini.
                  </td>
                </tr>
              ) : (
                activities.sort((a, b) => Math.abs(b.netVal) - Math.abs(a.netVal)).map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#1e1e1e] transition-colors group cursor-pointer">
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-black text-white text-[12px] group-hover:text-[#10b981] transition-colors">{item.symbol}</span>
                        <span className="text-[9px] text-neutral-500 truncate max-w-[150px]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#10b981] font-medium tabular-nums">{formatValue(item.buyVal)}</td>
                    <td className="px-4 py-2.5 text-right text-[#ef4444] font-medium tabular-nums">{formatValue(item.sellVal)}</td>
                    <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${item.netVal >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {item.netVal > 0 ? '+' : ''}{formatValue(item.netVal)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-neutral-300 font-mono tabular-nums">{Math.round(item.avgPrice).toLocaleString('id-ID')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="p-2.5 bg-[#121212] border-t border-[#2d2d2d] flex justify-between items-center shrink-0">
          <p className="text-[9px] text-neutral-500 font-medium tracking-wider uppercase">
             Scanned ~50 Most Active Stocks
          </p>
          <p className="text-[9px] text-[#10b981] font-bold flex items-center gap-1">
             <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
             LIVE DATA
          </p>
        </div>
      </div>
    </div>
  );
}