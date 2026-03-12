'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Terminal, Send, Loader2, Clock, CheckCircle, XCircle, Code2, FileText, AlertCircle } from 'lucide-react';

type LogicStatus = 'pending' | 'processing' | 'completed' | 'rejected';

interface LogicRequest {
  id: string;
  title: string;
  description: string;
  status: LogicStatus;
  admin_notes: string | null;
  created_at: string;
}

export default function RequestLogicPage() {
  const [requests, setRequests] = useState<LogicRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const supabase = createClient();

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // RLS otomatis hanya akan mengambil data milik user yang sedang login
      const { data, error } = await supabase
        .from('logic_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRequests(data as LogicRequest[]);
    } catch (error) {
      console.error('Gagal memuat riwayat request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Mohon isi judul dan detail logika yang Anda inginkan!');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi pengguna tidak ditemukan.");

      const { error } = await supabase.from('logic_requests').insert([{
        user_id: user.id,
        title,
        description
      }]);

      if (error) throw error;

      setIsSuccess(true);
      setTitle('');
      setDescription('');
      fetchRequests(); // Refresh daftar riwayat
      
      setTimeout(() => setIsSuccess(false), 5000);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal mengirim request: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: LogicStatus) => {
    switch (status) {
      case 'pending': 
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"><Clock size={12}/> Menunggu</span>;
      case 'processing': 
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"><Loader2 size={12} className="animate-spin"/> Diproses</span>;
      case 'completed': 
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20"><CheckCircle size={12}/> Selesai</span>;
      case 'rejected': 
        return <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20"><XCircle size={12}/> Ditolak</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Terminal className="text-[#06b6d4]" size={36} /> 
          Request Custom Logic
        </h1>
        <p className="text-neutral-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Punya strategi trading unik? Request pembuatan rumus screener atau indikator teknikal khusus di sini. Tim admin VorteStocks akan membuatkan logikanya untuk Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ================= BAGIAN FORMULIR (KIRI) ================= */}
        <div className="lg:col-span-5 space-y-6 h-fit">
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Code2 className="text-[#06b6d4]" size={20}/> Buat Request Baru
            </h2>
            
            {isSuccess && (
              <div className="mb-6 p-4 bg-[#34d399]/10 border border-[#34d399] rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="w-8 h-8 rounded-full bg-[#34d399] flex items-center justify-center text-black shrink-0">✓</div>
                <div>
                  <p className="text-sm font-bold text-[#34d399]">Request Terkirim!</p>
                  <p className="text-xs text-[#34d399]/80 mt-0.5">Admin akan segera meninjau dan memproses logika Anda.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-bold text-neutral-400 mb-1.5 block">Judul Strategi / Logika</label>
                <input 
                  required 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-3 text-sm text-white focus:border-[#06b6d4] focus:ring-1 focus:ring-[#06b6d4] outline-none transition-colors" 
                  placeholder="Contoh: Screener MA Cross Volume Breakout..." 
                />
              </div>
              
              <div>
                {/* PERBAIKAN: Hapus 'block', sisakan 'flex items-center justify-between' */}
                <label className="text-sm font-bold text-neutral-400 mb-1.5 flex items-center justify-between">
                  <span>Detail Kondisi & Aturan</span>
                  <span className="text-[10px] text-neutral-500 font-normal">Jelaskan se-spesifik mungkin</span>
                </label>
                <textarea 
                  required 
                  rows={8} 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-3 text-sm text-white focus:border-[#06b6d4] focus:ring-1 focus:ring-[#06b6d4] outline-none transition-colors resize-none" 
                  placeholder="Contoh:&#10;1. Harga saat ini memotong EMA 20 dari bawah ke atas.&#10;2. Volume hari ini 2x lipat lebih besar dari rata-rata volume 5 hari terakhir.&#10;3. YTD asing akumulasi > 10 Miliar."
                ></textarea>
              </div>

              <button 
                disabled={isSubmitting} 
                type="submit" 
                className="w-full px-8 py-3 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#34d399] text-white font-bold text-sm shadow-[0_4px_15px_rgba(52,211,153,0.3)] hover:scale-[1.02] transition-transform flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Mengirim...</> : <><Send size={18} /> Kirim Request</>}
              </button>
            </form>
          </div>
        </div>

        {/* ================= BAGIAN RIWAYAT (KANAN) ================= */}
        <div className="lg:col-span-7 bg-[#121212] border border-[#2d2d2d] rounded-2xl p-6 shadow-xl h-fit">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="text-[#34d399]" size={20}/> Riwayat Request Anda
          </h2>

          <div className="space-y-4">
            {isLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-neutral-500">
                <Loader2 size={32} className="animate-spin mb-3 text-[#06b6d4]" />
                <p className="text-sm font-medium animate-pulse">Memuat riwayat...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="py-12 text-center border border-[#2d2d2d] border-dashed rounded-xl bg-[#1e1e1e]">
                <Terminal size={40} className="text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-400 text-sm font-medium">Anda belum pernah membuat request logika.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-5 hover:border-[#06b6d4] transition-colors group">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <h3 className="text-base font-bold text-white group-hover:text-[#06b6d4] transition-colors">{req.title}</h3>
                    {getStatusBadge(req.status)}
                  </div>
                  
                  <div className="text-sm text-neutral-400 whitespace-pre-wrap mb-4 bg-[#121212] p-3 rounded-lg border border-[#2d2d2d]">
                    {req.description}
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-[#2d2d2d] pt-4">
                    <span className="text-xs font-medium text-neutral-500">
                      Dikirim pada: {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Catatan Admin (Jika Ada) */}
                  {req.admin_notes && (
                    <div className={`mt-4 p-3 rounded-lg border flex items-start gap-3 ${req.status === 'rejected' ? 'bg-[#ef4444]/10 border-[#ef4444]/20' : 'bg-[#34d399]/10 border-[#34d399]/20'}`}>
                      <AlertCircle size={16} className={`shrink-0 mt-0.5 ${req.status === 'rejected' ? 'text-[#ef4444]' : 'text-[#34d399]'}`} />
                      <div>
                        <p className={`text-xs font-bold mb-1 ${req.status === 'rejected' ? 'text-[#ef4444]' : 'text-[#34d399]'}`}>Catatan Admin:</p>
                        <p className="text-sm text-white whitespace-pre-wrap">{req.admin_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}