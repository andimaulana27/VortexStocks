"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// ==========================================
// TYPE DEFINITIONS
// ==========================================
interface TradingJournal {
  id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  entry_price: number;
  lot_size: number;
}

interface CloseTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  journal: TradingJournal | null;
  livePrice: number | null; // Menerima harga live dari parent
}

export default function CloseTradeModal({ isOpen, onClose, onSuccess, journal, livePrice }: CloseTradeModalProps) {
  const supabase = createClient();
  
  const [exitPrice, setExitPrice] = useState<number | ''>('');
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-fill harga jual menggunakan harga live saat modal dibuka
  useEffect(() => {
    if (isOpen && livePrice) {
      setExitPrice(livePrice);
    } else if (isOpen && !livePrice && journal) {
      setExitPrice(journal.entry_price); // Fallback ke harga beli jika live price gagal
    }
  }, [isOpen, livePrice, journal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journal) return;
    
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (!exitPrice || !exitDate) throw new Error("Harga keluar dan tanggal wajib diisi.");

      const finalExitPrice = Number(exitPrice);
      
      // Kalkulasi PnL Realized
      // Jika BUY: (Jual - Beli) * Lot * 100
      // Jika SHORT/SELL: (Beli - Jual) * Lot * 100
      let calculatedPnL = 0;
      if (journal.side === 'BUY') {
        calculatedPnL = (finalExitPrice - journal.entry_price) * journal.lot_size * 100;
      } else {
        calculatedPnL = (journal.entry_price - finalExitPrice) * journal.lot_size * 100;
      }

      // Update baris di Supabase
      const { error: updateErr } = await supabase
        .from('trading_journals')
        .update({
          exit_price: finalExitPrice,
          pnl: calculatedPnL,
          notes: notes ? notes : null, // Bisa update notes alasan close
          updated_at: new Date().toISOString()
        })
        .eq('id', journal.id);

      if (updateErr) throw updateErr;

      // Sukses
      setExitPrice('');
      setNotes('');
      onSuccess(); 
      onClose();   

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menutup trade.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !journal) return null;

  const isProfit = Number(exitPrice) > journal.entry_price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2d2d2d] bg-[#1e1e1e]/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Tutup Posisi <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] px-2 py-0.5 rounded text-[12px]">{journal.symbol}</span>
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#2d2d2d] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          <div className="bg-[#1e1e1e] p-3 rounded-lg border border-[#2d2d2d] flex justify-between items-center">
            <div>
              <p className="text-[11px] text-neutral-500 font-bold uppercase">Harga Masuk (Avg)</p>
              <p className="text-white font-mono font-bold">{journal.entry_price.toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-neutral-500 font-bold uppercase">Porsi</p>
              <p className="text-white font-mono font-bold">{journal.lot_size.toLocaleString('id-ID')} Lot</p>
            </div>
          </div>

          <div className="space-y-1.5 mt-2">
            <label className="text-xs font-bold text-neutral-400 uppercase flex justify-between">
              Harga Keluar (Exit) *
              {exitPrice !== '' && (
                <span className={isProfit ? 'text-[#10b981]' : 'text-rose-500'}>
                  {isProfit ? 'Profit' : 'Loss'}
                </span>
              )}
            </label>
            <input 
              type="number" 
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-[#121212] border border-[#8b5cf6]/50 rounded-lg px-3 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase">Tanggal Keluar *</label>
            <input 
              type="date" 
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#8b5cf6] transition-all [color-scheme:dark]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase">Evaluasi / Catatan Exit</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Kena trailing stop, harga mulai reversal..."
              rows={2}
              className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-[#8b5cf6] transition-all resize-none text-sm"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-2 py-3 mt-4 text-white font-bold rounded-lg transition-colors shadow-lg disabled:opacity-50 ${isProfit ? 'bg-[#10b981] hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {isSubmitting ? 'Mengeksekusi...' : 'Konfirmasi Close Trade'}
          </button>

        </form>
      </div>
    </div>
  );
}