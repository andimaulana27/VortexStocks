'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Headset, Send, Loader2, Bug, CreditCard, LifeBuoy, MoreHorizontal, Mail, MapPin } from 'lucide-react';

// 1. PERBAIKAN: Definisikan tipe data kategori secara eksplisit
type CategoryType = 'support' | 'billing' | 'bug' | 'other';

export default function ContactUsPage() {
  // Gunakan tipe data yang sudah didefinisikan
  const [category, setCategory] = useState<CategoryType>('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert('Mohon isi subjek dan pesan Anda secara lengkap!');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi pengguna tidak ditemukan. Silakan login ulang.");

      const { error } = await supabase.from('contact_messages').insert([{
        user_id: user.id,
        category,
        subject,
        message
      }]);

      if (error) throw error;

      setIsSuccess(true);
      setSubject('');
      setMessage('');
      setCategory('support');
      
      setTimeout(() => setIsSuccess(false), 5000);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal mengirim pesan: ' + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: 'support', label: 'Bantuan Umum', icon: LifeBuoy, color: 'text-[#06b6d4]', bg: 'bg-[#06b6d4]/10', border: 'border-[#06b6d4]' },
    { id: 'billing', label: 'Langganan / Tagihan', icon: CreditCard, color: 'text-[#f97316]', bg: 'bg-[#f97316]/10', border: 'border-[#f97316]' },
    { id: 'bug', label: 'Lapor Bug / Error', icon: Bug, color: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10', border: 'border-[#ef4444]' },
    { id: 'other', label: 'Lainnya', icon: MoreHorizontal, color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/10', border: 'border-[#8b5cf6]' },
  ];

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Headset className="text-[#34d399]" size={36} /> 
          Hubungi Kami (Contact Us)
        </h1>
        <p className="text-neutral-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Punya pertanyaan, kendala teknis, atau saran untuk pengembangan VorteStocks? Jangan ragu untuk mengirimkan pesan kepada tim kami.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ================= BAGIAN INFO KONTAK (KIRI) ================= */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-6 shadow-xl">
            <h3 className="text-white font-bold text-lg mb-4">Informasi Kontak</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#1e1e1e] rounded-lg border border-[#2d2d2d] shrink-0">
                  <Mail className="text-[#06b6d4]" size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Email Dukungan</p>
                  <p className="text-xs text-neutral-400 mt-0.5">support@vortestocks.com</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#1e1e1e] rounded-lg border border-[#2d2d2d] shrink-0">
                  <Headset className="text-[#34d399]" size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Jam Operasional</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Senin - Jumat (08:00 - 17:00 WIB)</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#1e1e1e] rounded-lg border border-[#2d2d2d] shrink-0">
                  <MapPin className="text-[#f97316]" size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Lokasi Kami</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Jakarta, Indonesia</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-[#2d2d2d]">
              <p className="text-xs text-neutral-500 leading-relaxed">
                * Tim dukungan kami biasanya membalas pesan dalam waktu 1x24 jam pada hari kerja. Balasan akan dikirimkan ke alamat email yang Anda gunakan saat mendaftar.
              </p>
            </div>
          </div>
        </div>

        {/* ================= BAGIAN FORMULIR (KANAN) ================= */}
        <div className="lg:col-span-8 bg-[#121212] border border-[#2d2d2d] rounded-2xl p-6 md:p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Kirim Pesan Baru</h2>
          
          {isSuccess && (
            <div className="mb-6 p-4 bg-[#34d399]/10 border border-[#34d399] rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="w-8 h-8 rounded-full bg-[#34d399] flex items-center justify-center text-black shrink-0">✓</div>
              <div>
                <p className="text-sm font-bold text-[#34d399]">Pesan Berhasil Terkirim!</p>
                <p className="text-xs text-[#34d399]/80 mt-0.5">Terima kasih telah menghubungi kami. Tim kami akan segera menindaklanjuti laporan Anda.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Pemilihan Kategori */}
            <div>
              <label className="text-sm font-bold text-neutral-400 mb-3 block">Pilih Topik Pembahasan</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      // 2. PERBAIKAN: Gunakan as CategoryType alih-alih as any
                      onClick={() => setCategory(cat.id as CategoryType)}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 ${
                        isActive 
                          ? `${cat.bg} ${cat.border} shadow-[0_0_15px_rgba(0,0,0,0.1)] scale-[1.02]` 
                          : 'bg-[#1e1e1e] border-[#2d2d2d] hover:border-neutral-500 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Icon className={isActive ? cat.color : 'text-neutral-400'} size={24} />
                      <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-neutral-400'}`}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Subjek */}
            <div>
              <label className="text-sm font-bold text-neutral-400 mb-1.5 block">Subjek Pesan</label>
              <input 
                required 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-3 text-sm text-white focus:border-[#06b6d4] focus:ring-1 focus:ring-[#06b6d4] outline-none transition-colors" 
                placeholder="Contoh: Permintaan reset limit API / Laporan bug chart..." 
              />
            </div>
            
            {/* Input Pesan */}
            <div>
              <label className="text-sm font-bold text-neutral-400 mb-1.5 block">Detail Pesan</label>
              <textarea 
                required 
                rows={6} 
                value={message} 
                onChange={(e) => setMessage(e.target.value)} 
                className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-3 text-sm text-white focus:border-[#06b6d4] focus:ring-1 focus:ring-[#06b6d4] outline-none transition-colors resize-none" 
                placeholder="Jelaskan secara detail kendala atau pertanyaan yang Anda miliki..."
              ></textarea>
            </div>

            {/* Tombol Submit */}
            <button 
              disabled={isSubmitting} 
              type="submit" 
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-[#06b6d4] to-[#34d399] text-white font-bold text-sm shadow-[0_4px_15px_rgba(52,211,153,0.3)] hover:scale-[1.02] transition-transform flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
            >
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Mengirim...</> : <><Send size={18} /> Kirim Pesan</>}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}