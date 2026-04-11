"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Save, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface AddJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Trigger refresh data di halaman utama
}

export default function AddJournalModal({ isOpen, onClose, onSuccess }: AddJournalModalProps) {
  const supabase = createClient();
  
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [entryPrice, setEntryPrice] = useState<number | ''>('');
  const [lotSize, setLotSize] = useState<number | ''>('');
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Efek Auto-Fill Harga Pintar (Debounced)
  useEffect(() => {
    const cleanSymbol = symbol.toUpperCase().trim();
    if (cleanSymbol.length >= 4 && entryPrice === '') {
      const timer = setTimeout(async () => {
        setIsFetchingPrice(true);
        try {
          const res = await fetch(`/api/market?endpoint=stock/idx/prices&symbols=${cleanSymbol}`);
          const data = await res.json();
          if (data?.status === 'success' && data?.data?.results?.[0]) {
            setEntryPrice(data.data.results[0].close);
          }
        } catch (err) {
          console.error("Gagal menarik harga otomatis", err);
        } finally {
          setIsFetchingPrice(false);
        }
      }, 500); // Tunggu user selesai mengetik 500ms

      return () => clearTimeout(timer);
    }
  }, [symbol, entryPrice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (!symbol || !entryPrice || !lotSize || !tradeDate) {
        throw new Error("Mohon lengkapi semua field yang wajib.");
      }

      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userData.user) throw new Error("Anda belum login.");

      const { error: insertErr } = await supabase
        .from('trading_journals')
        .insert({
          user_id: userData.user.id,
          symbol: symbol.toUpperCase().trim(),
          side,
          entry_price: Number(entryPrice),
          lot_size: Number(lotSize),
          trade_date: tradeDate,
          notes: notes || null,
          exit_price: null, // Default null karena posisi baru dibuka
          pnl: null
        });

      if (insertErr) throw insertErr;

      // Sukses
      setSymbol('');
      setEntryPrice('');
      setLotSize('');
      setNotes('');
      onSuccess(); // Panggil fungsi refresh di parent
      onClose();   // Tutup modal

    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menyimpan jurnal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2d2d2d] bg-[#1e1e1e]/40">
          <h2 className="text-lg font-bold text-white">Catat Trade Baru</h2>
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

          <div className="grid grid-cols-2 gap-4">
            {/* Symbol */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase">Kode Saham *</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input 
                  type="text" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="BBCA"
                  maxLength={4}
                  className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg pl-9 pr-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6] transition-all"
                />
              </div>
            </div>

            {/* Side */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase">Aksi *</label>
              <div className="flex bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-1">
                <button 
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-all ${side === 'BUY' ? 'bg-[#10b981] text-white shadow-md' : 'text-neutral-500 hover:text-white'}`}
                >
                  BUY
                </button>
                <button 
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`flex-1 text-sm font-bold py-1.5 rounded-md transition-all ${side === 'SELL' ? 'bg-[#ef4444] text-white shadow-md' : 'text-neutral-500 hover:text-white'}`}
                >
                  SHORT
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Entry Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase flex items-center justify-between">
                Harga Masuk *
                {isFetchingPrice && <Loader2 size={12} className="animate-spin text-[#8b5cf6]" />}
              </label>
              <input 
                type="number" 
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#8b5cf6] transition-all"
              />
            </div>

            {/* Lot Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase">Jumlah (Lot) *</label>
              <input 
                type="number" 
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value ? Number(e.target.value) : '')}
                placeholder="100"
                className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#8b5cf6] transition-all"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase">Tanggal Trading *</label>
            <input 
              type="date" 
              value={tradeDate}
              onChange={(e) => setTradeDate(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#8b5cf6] transition-all [color-scheme:dark]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase">Catatan / Alasan Entry</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Breakout resisten dengan volume tinggi..."
              rows={3}
              className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-[#8b5cf6] transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-3 mt-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white font-bold rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSubmitting ? 'Menyimpan...' : 'Simpan Jurnal'}
          </button>

        </form>
      </div>
    </div>
  );
}