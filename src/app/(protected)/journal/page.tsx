"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import useSWR from 'swr';
import { 
  BookOpen, Plus, Activity, AlertCircle, Loader2, Target,
  TrendingUp, TrendingDown, Clock
} from 'lucide-react';
import AddJournalModal from '@/components/journal/AddJournalModal';
import CloseTradeModal from '@/components/journal/CloseTradeModal'; // IMPORT BARU

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface TradingJournal {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  exit_price: number | null;
  lot_size: number;
  trade_date: string;
  notes: string | null;
  pnl: number | null;
  updated_at: string;
}

interface PriceData {
  close: number;
  change: number;
  change_pct: number;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ==========================================
// KOMPONEN UTAMA
// ==========================================
export default function JournalPage() {
  const supabase = createClient();
  const [journals, setJournals] = useState<TradingJournal[]>([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [errorDB, setErrorDB] = useState<string | null>(null);
  
  // States Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // State untuk Close Trade Modal
  const [tradeToClose, setTradeToClose] = useState<TradingJournal | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  // 1. Fetch DB
  const fetchJournals = useCallback(async () => {
    setIsLoadingDB(true);
    try {
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;

      const { data, error } = await supabase
        .from('trading_journals')
        .select('*')
        .eq('user_id', userData.user?.id)
        .order('trade_date', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (err: unknown) {
      setErrorDB(err instanceof Error ? err.message : "Gagal memuat jurnal");
    } finally {
      setIsLoadingDB(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchJournals();
  }, [fetchJournals]);

  // 2. Pemisahan Data
  const openPositions = useMemo(() => journals.filter(j => j.exit_price === null), [journals]);
  const closedPositions = useMemo(() => journals.filter(j => j.exit_price !== null).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()), [journals]); // Urutkan history terbaru

  const openSymbols = useMemo(() => Array.from(new Set(openPositions.map(j => j.symbol))).join(','), [openPositions]);

  // 3. SWR Harga Live
  const { data: priceData, isLoading: isLoadingPrices } = useSWR(
    openSymbols ? `/api/market?endpoint=stock/idx/prices&symbols=${openSymbols}` : null,
    fetcher,
    { refreshInterval: 15000, dedupingInterval: 5000 }
  );

  const livePrices = useMemo(() => {
    const map: Record<string, PriceData> = {};
    if (priceData?.status === 'success' && priceData?.data?.results) {
      priceData.data.results.forEach((p: PriceData & {symbol: string}) => {
        map[p.symbol] = { close: p.close, change: p.change, change_pct: p.change_pct };
      });
    }
    return map;
  }, [priceData]);

  // 4. Analytics Kalkulasi Pintar
  const stats = useMemo(() => {
    let totalRealizedPnL = 0;
    let totalUnrealizedPnL = 0;
    let winCount = 0;

    closedPositions.forEach(j => {
      if (j.pnl) {
        totalRealizedPnL += Number(j.pnl);
        if (Number(j.pnl) > 0) winCount++;
      }
    });

    openPositions.forEach(j => {
      const live = livePrices[j.symbol];
      if (live) {
        const floatingPnL = (live.close - j.entry_price) * j.lot_size * 100;
        totalUnrealizedPnL += floatingPnL;
      }
    });

    const winRate = closedPositions.length > 0 ? (winCount / closedPositions.length) * 100 : 0;

    return { totalRealizedPnL, totalUnrealizedPnL, winRate, totalTrades: closedPositions.length };
  }, [closedPositions, openPositions, livePrices]);

  // Handler Buka Modal Close
  const handleOpenCloseTrade = (journal: TradingJournal) => {
    setTradeToClose(journal);
    setIsCloseModalOpen(true);
  };

  if (isLoadingDB && journals.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <Loader2 size={32} className="animate-spin text-[#8b5cf6]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-white custom-tv-scroll pb-20">
      
      {/* MODALS */}
      <AddJournalModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSuccess={fetchJournals} 
      />

      <CloseTradeModal 
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        onSuccess={fetchJournals}
        journal={tradeToClose}
        livePrice={tradeToClose ? livePrices[tradeToClose.symbol]?.close : null} // Inject harga live!
      />

      {/* Header & Actions */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <BookOpen className="text-[#8b5cf6]" />
            Trading Journal
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Lacak performa portofolio dan riwayat transaksi Anda</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold rounded-lg shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all"
        >
          <Plus size={18} /> Catat Trade Baru
        </button>
      </div>

      {errorDB && (
        <div className="bg-rose-500/10 border border-rose-500/50 text-rose-500 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm">{errorDB}</p>
        </div>
      )}

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10"><Activity size={80}/></div>
          <div className="text-neutral-500 text-xs font-bold uppercase mb-2">Realized PnL (Closed)</div>
          <div className={`text-2xl font-black ${stats.totalRealizedPnL >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
            Rp {stats.totalRealizedPnL.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10"><TrendingUp size={80}/></div>
          <div className="text-neutral-500 text-xs font-bold uppercase mb-2">Floating PnL (Open)</div>
          <div className={`text-2xl font-black ${stats.totalUnrealizedPnL >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
             {isLoadingPrices ? <Loader2 size={24} className="animate-spin text-neutral-500" /> : `Rp ${stats.totalUnrealizedPnL.toLocaleString('id-ID')}`}
          </div>
        </div>
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10"><Target size={80}/></div>
          <div className="text-neutral-500 text-xs font-bold uppercase mb-2">Win Rate</div>
          <div className="text-2xl font-black text-white">{stats.winRate.toFixed(1)}%</div>
        </div>
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 opacity-10"><BookOpen size={80}/></div>
          <div className="text-neutral-500 text-xs font-bold uppercase mb-2">Total Closed Trades</div>
          <div className="text-2xl font-black text-white">{stats.totalTrades}</div>
        </div>
      </div>

      {/* SECTION: OPEN POSITIONS (Live Portofolio) */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Activity className="text-emerald-400" /> Live Portofolio (Open Positions)
        </h2>
        {openPositions.length === 0 ? (
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-8 text-center text-neutral-500 text-sm">
            Tidak ada posisi trading yang sedang aktif.
          </div>
        ) : (
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl overflow-hidden shadow-lg border-l-4 border-l-emerald-500">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1e1e1e]">
                <tr>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider">Saham</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider">Tgl Entry</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider text-right">Avg Entry</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider text-right">Lot</th>
                  <th className="py-3 px-5 text-[11px] font-black text-emerald-400 uppercase tracking-wider text-right">Last Price (Live)</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider text-right">Floating PnL</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d2d]">
                {openPositions.map((j) => {
                  const live = livePrices[j.symbol];
                  const currentPrice = live ? live.close : j.entry_price;
                  const floatingPnL = (currentPrice - j.entry_price) * j.lot_size * 100;
                  const floatingPct = ((currentPrice - j.entry_price) / j.entry_price) * 100;

                  return (
                    <tr key={j.id} className="hover:bg-[#1e1e1e]/50 transition-colors">
                      <td className="py-4 px-5 font-black text-[14px]">
                        {j.symbol} 
                        <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded">{j.side}</span>
                      </td>
                      <td className="py-4 px-5 text-[13px] text-neutral-400">{new Date(j.trade_date).toLocaleDateString('id-ID')}</td>
                      <td className="py-4 px-5 text-[13px] font-mono text-right">{j.entry_price.toLocaleString('id-ID')}</td>
                      <td className="py-4 px-5 text-[13px] font-mono text-right">{j.lot_size.toLocaleString('id-ID')}</td>
                      <td className="py-4 px-5 text-[13px] font-mono text-right font-bold text-white">
                        {isLoadingPrices && !live ? <Loader2 size={12} className="animate-spin inline mr-2" /> : currentPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-[13px] font-bold ${floatingPnL >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                            {floatingPnL > 0 ? '+' : ''}Rp {floatingPnL.toLocaleString('id-ID')}
                          </span>
                          <span className={`text-[10px] font-bold ${floatingPct >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                            {floatingPct > 0 ? '+' : ''}{floatingPct.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button 
                          onClick={() => handleOpenCloseTrade(j)}
                          className="px-3 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded text-[11px] font-bold transition-colors"
                        >
                          Close Trade
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION: CLOSED POSITIONS (Trade History) */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-neutral-300">
          <Clock className="text-[#8b5cf6]" /> Trade History
        </h2>
        {closedPositions.length === 0 ? (
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-8 text-center text-neutral-500 text-sm">
            Belum ada riwayat transaksi yang diselesaikan.
          </div>
        ) : (
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl overflow-hidden shadow-lg opacity-80 hover:opacity-100 transition-opacity">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1e1e1e]">
                <tr>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider">Saham</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider text-right">Avg Entry</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider text-right">Avg Exit</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider text-right">Lot</th>
                  <th className="py-3 px-5 text-[11px] font-black text-neutral-500 uppercase tracking-wider text-right">Realized PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2d2d]">
                {closedPositions.map((j) => {
                  const pnl = j.pnl || 0;
                  const pnlPct = ((j.exit_price! - j.entry_price) / j.entry_price) * 100;
                  
                  return (
                    <tr key={j.id} className="hover:bg-[#1e1e1e]/50 transition-colors">
                      <td className="py-4 px-5">
                        <span className="font-black text-[14px] text-white">{j.symbol}</span>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{new Date(j.updated_at).toLocaleDateString('id-ID')}</p>
                      </td>
                      <td className="py-4 px-5 text-[13px] font-mono text-right text-neutral-400">{j.entry_price.toLocaleString('id-ID')}</td>
                      <td className="py-4 px-5 text-[13px] font-mono text-right text-neutral-400">{j.exit_price!.toLocaleString('id-ID')}</td>
                      <td className="py-4 px-5 text-[13px] font-mono text-right text-neutral-400">{j.lot_size.toLocaleString('id-ID')}</td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`text-[13px] font-bold flex items-center gap-1 ${pnl >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                            {pnl >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                            {pnl > 0 ? '+' : ''}Rp {pnl.toLocaleString('id-ID')}
                          </span>
                          <span className={`text-[10px] font-bold ${pnlPct >= 0 ? 'text-[#10b981]' : 'text-rose-500'}`}>
                            {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%
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