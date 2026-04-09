// src/app/(protected)/journal/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  X, 
  Wallet,
  Clock,
  CheckCircle2,
  FileText,
  Trash2,
  BarChart2
} from 'lucide-react';

export type TradeSide = 'BUY' | 'SELL';

export interface TradingJournal {
  id: string;
  user_id: string;
  symbol: string;
  side: TradeSide;
  entry_price: number;
  exit_price: number | null;
  lot_size: number;
  trade_date: string;
  timeframe?: string;
  setup?: string;
  notes: string | null;
  pnl: number | null;
  created_at: string;
  updated_at: string;
}

// --- HELPER FUNCTIONS ---
const calculatePnL = (side: TradeSide, entry: number, exit: number, volume: number) => {
  return side === 'BUY' ? (exit - entry) * volume : (entry - exit) * volume;
};

const formatUSD = (number: number) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// --- SUB-KOMPONEN LIVE FLOATING PNL ---
function LivePnLCell({ trade }: { trade: TradingJournal }) {
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchLivePrice = async () => {
      try {
        const res = await fetch(`/api/market?endpoint=stock/idx/${trade.symbol}`);
        if (!res.ok) throw new Error("Not Found");
        const json = await res.json();
        
        if (isMounted && json?.data?.results?.close) {
          setLivePrice(json.data.results.close);
        } else if (isMounted) {
          setLivePrice(null);
        }
      } catch (error: unknown) {
        // PERBAIKAN: Menggunakan variabel error agar lolos dari ESLint
        console.error(`Peringatan: Gagal mengambil harga live untuk ${trade.symbol}. Detail:`, error);
        if (isMounted) setLivePrice(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLivePrice();
    const intervalId = setInterval(fetchLivePrice, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [trade.symbol]);

  if (loading) return <span className="animate-pulse text-xs text-neutral-500 flex items-center justify-end"><Activity size={12} className="mr-1"/> Fetching...</span>;
  if (!livePrice) return <span className="text-xs text-neutral-500 italic">No Live Data</span>;

  const floatingPnL = calculatePnL(trade.side, trade.entry_price, livePrice, trade.lot_size);
  
  return (
    <div className="flex flex-col items-end">
      <span className={`font-bold ${floatingPnL > 0 ? 'text-[#34d399]' : floatingPnL < 0 ? 'text-[#ef4444]' : 'text-neutral-400'}`}>
        {floatingPnL > 0 ? '+' : ''}{formatUSD(floatingPnL)}
      </span>
      <span className="text-[10px] text-neutral-500 flex items-center mt-1">
        <Activity size={10} className="mr-1 text-[#06b6d4] animate-pulse"/>
        Live: {formatUSD(livePrice)}
      </span>
    </div>
  );
}

export default function JournalPage() {
  // PERBAIKAN: Menyimpan instance Supabase di useMemo agar tidak dire-create setiap kali render (menghindari memory leak & infinite loop)
  const supabase = useMemo(() => createClient(), []);
  
  const [journals, setJournals] = useState<TradingJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    symbol: '', side: 'BUY' as TradeSide, entry_price: '', lot_size: '', 
    timeframe: 'H1', setup: '', trade_date: new Date().toISOString().slice(0, 16)
  });

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [tradeToClose, setTradeToClose] = useState<TradingJournal | null>(null);
  const [exitPrice, setExitPrice] = useState('');

  const [showNotesModal, setShowNotesModal] = useState(false);
  const [tradeForNotes, setTradeForNotes] = useState<TradingJournal | null>(null);
  const [notesText, setNotesText] = useState('');

  // PERBAIKAN: Membungkus fungsi Fetch di dalam useCallback untuk memenuhi syarat Depedency Array ESLint
  const fetchJournals = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('trading_journals')
        .select('*')
        .order('trade_date', { ascending: false });

      if (error) throw error;
      setJournals(data || []);
    } catch (error: unknown) {
      console.error('Gagal menarik data jurnal:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // PERBAIKAN: fetchJournals sekarang masuk ke dependency array tanpa memicu infinite loop
  useEffect(() => { 
    fetchJournals(); 
  }, [fetchJournals]);

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('trading_journals')
        .insert([{
            user_id: userId,
            symbol: formData.symbol.toUpperCase(),
            side: formData.side,
            entry_price: Number(formData.entry_price),
            lot_size: Number(formData.lot_size),
            timeframe: formData.timeframe,
            setup: formData.setup,
            trade_date: new Date(formData.trade_date).toISOString(),
        }]);

      if (error) throw error;
      setShowAddModal(false);
      setFormData({ symbol: '', side: 'BUY', entry_price: '', lot_size: '', timeframe: 'H1', setup: '', trade_date: new Date().toISOString().slice(0, 16) });
      fetchJournals();
    } catch (error: unknown) {
      console.error('Gagal menambah jurnal:', error);
      alert('Gagal menyimpan jurnal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeToClose || !exitPrice) return;
    setIsSubmitting(true);

    try {
      const exitValue = Number(exitPrice);
      const calculatedPnl = calculatePnL(tradeToClose.side, tradeToClose.entry_price, exitValue, tradeToClose.lot_size);

      const { error } = await supabase
        .from('trading_journals')
        .update({
          exit_price: exitValue,
          pnl: calculatedPnl,
          updated_at: new Date().toISOString()
        })
        .eq('id', tradeToClose.id);

      if (error) throw error;
      setShowCloseModal(false);
      setTradeToClose(null);
      setExitPrice('');
      fetchJournals();
    } catch (error: unknown) {
      console.error('Gagal menutup posisi:', error);
      alert('Terjadi kesalahan saat menyimpan harga exit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradeForNotes) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('trading_journals')
        .update({ notes: notesText, updated_at: new Date().toISOString() })
        .eq('id', tradeForNotes.id);
      
      if (error) throw error;
      
      setShowNotesModal(false);
      setTradeForNotes(null);
      fetchJournals();
    } catch (error: unknown) { 
      // PERBAIKAN: Catch error digunakan
      console.error('Error saat menyimpan notes:', error);
      alert('Terjadi kesalahan saat menyimpan catatan.'); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleDeleteTrade = async (id: string, symbol: string) => {
    if (!window.confirm(`Yakin ingin menghapus riwayat trade ${symbol}?`)) return;
    try {
      const { error } = await supabase.from('trading_journals').delete().eq('id', id);
      if (error) throw error;
      fetchJournals();
    } catch (error: unknown) { 
      // PERBAIKAN: Catch error digunakan
      console.error('Error saat menghapus trade:', error);
      alert('Terjadi kesalahan saat menghapus data.'); 
    }
  };

  const closedTrades = journals.filter(j => j.exit_price !== null && j.pnl !== null);
  const winningTrades = closedTrades.filter(j => (j.pnl || 0) > 0);
  const losingTrades = closedTrades.filter(j => (j.pnl || 0) < 0);

  const totalPnL = closedTrades.reduce((acc, curr) => acc + (curr.pnl || 0), 0);
  const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
  const bestTrade = closedTrades.length > 0 ? closedTrades.reduce((max, curr) => ((curr.pnl || 0) > (max.pnl || 0) ? curr : max)) : null;
  const worstTrade = closedTrades.length > 0 ? closedTrades.reduce((min, curr) => ((curr.pnl || 0) < (min.pnl || 0) ? curr : min)) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto h-full overflow-y-auto pb-24">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Trading Journal</h1>
          <p className="text-neutral-400 mt-1">Evaluasi Setup & Timeframe Anda secara mendalam.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-gradient-to-r from-[#06b6d4] to-[#34d399] hover:opacity-90 text-white px-6 py-2.5 rounded-full font-bold shadow-[0_4px_15px_rgba(52,211,153,0.3)] transition-all">
          <Plus size={18} /><span>Tambah Trade</span>
        </button>
      </div>

      {/* DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={64} /></div>
          <p className="text-sm text-neutral-400 font-medium mb-1">Total PnL (Realized)</p>
          <h3 className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-[#34d399]' : 'text-[#ef4444]'}`}>
            {totalPnL > 0 ? '+' : ''}{formatUSD(totalPnL)}
          </h3>
          <p className="text-xs text-neutral-500 mt-2">Dari {closedTrades.length} trade yang ditutup</p>
        </div>
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={64} /></div>
          <p className="text-sm text-neutral-400 font-medium mb-1">Win Rate</p>
          <h3 className="text-2xl font-bold text-white">{winRate.toFixed(1)}%</h3>
          <p className="text-xs text-neutral-500 mt-2"><span className="text-[#34d399]">{winningTrades.length} Win</span> / <span className="text-[#ef4444]">{losingTrades.length} Loss</span></p>
        </div>
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={64} /></div>
          <p className="text-sm text-neutral-400 font-medium mb-1">Best Trade</p>
          <h3 className="text-2xl font-bold text-[#34d399]">{bestTrade ? bestTrade.symbol : '-'}</h3>
          <p className="text-xs text-neutral-500 mt-2">{bestTrade ? `+${formatUSD(bestTrade.pnl || 0)}` : 'Belum ada data'}</p>
        </div>
        <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown size={64} /></div>
          <p className="text-sm text-neutral-400 font-medium mb-1">Worst Trade</p>
          <h3 className="text-2xl font-bold text-[#ef4444]">{worstTrade ? worstTrade.symbol : '-'}</h3>
          <p className="text-xs text-neutral-500 mt-2">{worstTrade ? formatUSD(worstTrade.pnl || 0) : 'Belum ada data'}</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-[#2d2d2d] flex justify-between items-center bg-[#1a1a1a]">
          <h2 className="text-lg font-bold text-white flex items-center">
            <Activity className="mr-2 text-[#06b6d4]" size={20}/> Riwayat Transaksi
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-400">
            <thead className="bg-[#1e1e1e] text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Tanggal & Setup</th>
                <th className="px-6 py-4 font-semibold">Symbol</th>
                <th className="px-6 py-4 font-semibold">Aksi</th>
                <th className="px-6 py-4 font-semibold">Entry / Size</th>
                <th className="px-6 py-4 font-semibold">Exit</th>
                <th className="px-6 py-4 font-semibold text-right">Profit / Loss</th>
                <th className="px-6 py-4 font-semibold text-center">Opsi</th> 
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">Memuat data...</td></tr>
              ) : journals.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-neutral-500 italic">Belum ada riwayat transaksi.</td></tr>
              ) : (
                journals.map((journal) => (
                  <tr key={journal.id} className="border-b border-[#2d2d2d] hover:bg-[#1a1a1a] transition-colors">
                    
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{new Date(journal.trade_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                      <div className="flex items-center mt-1 space-x-2">
                        {journal.timeframe && (
                          <span className="text-[10px] bg-[#2d2d2d] text-neutral-300 px-1.5 py-0.5 rounded border border-[#333] flex items-center">
                            <Clock size={10} className="mr-1"/> {journal.timeframe}
                          </span>
                        )}
                        {journal.setup && (
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider truncate max-w-[100px]" title={journal.setup}>
                            {journal.setup}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-bold text-white text-lg tracking-wider">{journal.symbol}</td>
                    
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${journal.side === 'BUY' ? 'bg-[#34d399]/10 text-[#34d399]' : 'bg-[#ef4444]/10 text-[#ef4444]'}`}>
                        {journal.side}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className="text-white">${journal.entry_price}</span>
                      <span className="text-neutral-500 text-xs block mt-0.5">Vol: {journal.lot_size}</span>
                    </td>
                    
                    <td className="px-6 py-4">
                      {journal.exit_price ? <span className="text-white">${journal.exit_price}</span> : (
                        <button 
                          onClick={() => { setTradeToClose(journal); setExitPrice(''); setShowCloseModal(true); }}
                          className="flex items-center text-xs font-bold text-[#022c22] bg-[#34d399] hover:bg-[#10b981] px-3 py-1.5 rounded transition-colors whitespace-nowrap"
                        >
                          <CheckCircle2 size={14} className="mr-1.5"/> Close
                        </button>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      {journal.pnl !== null ? (
                        <span className={`font-bold text-base ${journal.pnl > 0 ? 'text-[#34d399]' : journal.pnl < 0 ? 'text-[#ef4444]' : 'text-neutral-400'}`}>
                          {journal.pnl > 0 ? '+' : ''}{formatUSD(journal.pnl)}
                        </span>
                      ) : (
                        <LivePnLCell trade={journal} />
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-3">
                        <button onClick={() => { setTradeForNotes(journal); setNotesText(journal.notes || ''); setShowNotesModal(true); }} title="Catatan Trading" className={`p-1.5 rounded-md transition-colors ${journal.notes ? 'bg-[#06b6d4]/10 text-[#06b6d4] hover:bg-[#06b6d4]/20' : 'text-neutral-500 hover:bg-[#2d2d2d] hover:text-white'}`}>
                          <FileText size={18} />
                        </button>
                        <button onClick={() => handleDeleteTrade(journal.id, journal.symbol)} title="Hapus Jurnal" className="p-1.5 rounded-md text-neutral-500 hover:bg-[#ef4444]/10 hover:text-[#ef4444] transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL ADD ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-[#2d2d2d]">
              <h2 className="text-xl font-bold text-white flex items-center"><BarChart2 className="mr-2 text-[#06b6d4]"/> Catat Trade Baru</h2>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddTrade} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Symbol / Pair</label>
                  <input type="text" required placeholder="XAUUSD / AAPL" value={formData.symbol} onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})} className="w-full bg-[#1e1e1e] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#06b6d4] uppercase font-bold tracking-wide" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Aksi (Side)</label>
                  <select value={formData.side} onChange={(e) => setFormData({...formData, side: e.target.value as TradeSide})} className="w-full bg-[#1e1e1e] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#06b6d4] font-bold">
                    <option value="BUY">BUY / LONG</option>
                    <option value="SELL">SELL / SHORT</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Entry Price ($)</label>
                  <input type="number" step="any" required placeholder="1.00" value={formData.entry_price} onChange={(e) => setFormData({...formData, entry_price: e.target.value})} className="w-full bg-[#1e1e1e] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#06b6d4]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Volume (Size/Lot)</label>
                  <input type="number" step="any" required placeholder="0.01" value={formData.lot_size} onChange={(e) => setFormData({...formData, lot_size: e.target.value})} className="w-full bg-[#1e1e1e] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#06b6d4]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Timeframe</label>
                  <select value={formData.timeframe} onChange={(e) => setFormData({...formData, timeframe: e.target.value})} className="w-full bg-[#1e1e1e] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#06b6d4]">
                    <option value="M1">M1</option><option value="M5">M5</option><option value="M15">M15</option>
                    <option value="H1">H1</option><option value="H4">H4</option><option value="D1">D1</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Setup / Strategi</label>
                  <input type="text" placeholder="SND / Breakout / dll" value={formData.setup} onChange={(e) => setFormData({...formData, setup: e.target.value})} className="w-full bg-[#1e1e1e] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#06b6d4]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Waktu Entry</label>
                <input type="datetime-local" required value={formData.trade_date} onChange={(e) => setFormData({...formData, trade_date: e.target.value})} className="w-full bg-[#1e1e1e] border border-[#333] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#06b6d4]" style={{ colorScheme: 'dark' }}/>
              </div>
              <div className="pt-4 border-t border-[#2d2d2d] flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting} className="bg-[#34d399] hover:bg-[#10b981] text-[#022c22] px-6 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CLOSE ================= */}
      {showCloseModal && tradeToClose && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-[#2d2d2d]">
              <h2 className="text-xl font-bold text-white flex items-center">
                Close <span className="ml-2 text-[#06b6d4]">{tradeToClose.symbol}</span>
              </h2>
              <button onClick={() => setShowCloseModal(false)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCloseTrade} className="p-5 space-y-5">
              <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#333] flex justify-between items-center">
                 <div>
                    <p className="text-xs text-neutral-500 mb-1">Entry Price</p>
                    <p className="text-sm font-bold text-white">${tradeToClose.entry_price}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs text-neutral-500 mb-1">Volume</p>
                    <p className="text-sm font-bold text-white">{tradeToClose.lot_size}</p>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Exit Price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-neutral-500 font-bold">$</span>
                  <input 
                    type="number" step="any" required placeholder="0.00" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
                    className="w-full bg-[#1e1e1e] border border-[#333] text-white rounded-lg pl-8 pr-4 py-2.5 focus:outline-none focus:border-[#06b6d4] text-lg font-bold" 
                  />
                </div>
              </div>

              {exitPrice && (
                <div className={`p-3 rounded-lg border ${
                  calculatePnL(tradeToClose.side, tradeToClose.entry_price, Number(exitPrice), tradeToClose.lot_size) > 0 
                  ? 'bg-[#34d399]/10 border-[#34d399]/30 text-[#34d399]' 
                  : calculatePnL(tradeToClose.side, tradeToClose.entry_price, Number(exitPrice), tradeToClose.lot_size) < 0 
                    ? 'bg-[#ef4444]/10 border-[#ef4444]/30 text-[#ef4444]'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}>
                  <p className="text-xs mb-1 opacity-80">Estimasi PnL Bersih:</p>
                  <p className="text-lg font-bold">
                    {calculatePnL(tradeToClose.side, tradeToClose.entry_price, Number(exitPrice), tradeToClose.lot_size) > 0 ? '+' : ''}
                    {formatUSD(calculatePnL(tradeToClose.side, tradeToClose.entry_price, Number(exitPrice), tradeToClose.lot_size))}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCloseModal(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors">Batal</button>
                <button type="submit" disabled={isSubmitting || !exitPrice} className="bg-[#06b6d4] hover:bg-[#0891b2] text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50">
                  Realisasikan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL NOTES ================= */}
      {showNotesModal && tradeForNotes && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-[#2d2d2d] flex-shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center">
                <FileText className="mr-2 text-[#06b6d4]" size={20} />
                Catatan Trade <span className="ml-2 bg-[#1e1e1e] px-2 py-1 rounded text-sm">{tradeForNotes.symbol}</span>
              </h2>
              <button onClick={() => setShowNotesModal(false)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveNotes} className="p-5 flex-1 flex flex-col min-h-0">
              <div className="mb-4 text-sm text-neutral-400 bg-[#1e1e1e] p-3 rounded-lg border border-[#333]">
                Setup: <strong className="text-white">{tradeForNotes.setup || '-'}</strong> di TF <strong className="text-white">{tradeForNotes.timeframe}</strong>. Apa alasan masuk/keluar dari trade ini?
              </div>
              <textarea
                value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Tulis emosi, alasan eksekusi, dll..."
                className="w-full flex-1 bg-[#1e1e1e] border border-[#333] text-white rounded-lg p-4 focus:outline-none focus:border-[#06b6d4] resize-none min-h-[200px]"
              />
              <div className="pt-5 mt-auto flex justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowNotesModal(false)} className="px-5 py-2.5 text-sm font-medium text-neutral-400 hover:text-white">Batal</button>
                <button type="submit" disabled={isSubmitting} className="bg-[#06b6d4] hover:bg-[#0891b2] text-white px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50">
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}