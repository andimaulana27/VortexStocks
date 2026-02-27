// src/app/auth/verify-portfolio/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
// 1. Hapus DollarSign dari import karena tidak digunakan
import { UploadCloud, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function VerifyPortfolioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  // Pastikan user sudah login sebelum mengakses halaman ini
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      }
    };
    checkUser();
  }, [router, supabase]); // Tambahkan supabase ke dependency array

  // Handler format angka Rupiah
  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Hanya angka
    setBalance(value);
  };

  // Handler Upload File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) { // Limit 5MB
        setError("Ukuran gambar maksimal 5MB.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  // Handler Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericBalance = Number(balance);
    if (numericBalance < 300000000) {
      setError("Mohon maaf, minimum portofolio untuk bergabung adalah Rp 300.000.000.");
      return;
    }

    if (!file) {
      setError("Silakan unggah screenshot portofolio Anda.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Dapatkan ID User yang sedang login
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Gagal mengautentikasi pengguna.");

      // 2. Upload file ke Supabase Storage (Bucket: 'portfolios')
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // 2. Hapus variabel uploadData yang tidak terpakai
      const { error: uploadError } = await supabase.storage
        .from('portfolios')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw new Error("Gagal mengunggah gambar. Pastikan format benar.");

      // 3. Dapatkan Public URL gambar
      const { data: { publicUrl } } = supabase.storage
        .from('portfolios')
        .getPublicUrl(fileName);

      // 4. Masukkan data ke tabel screening_applications (dari SQL Tahap 1)
      const { error: insertError } = await supabase
        .from('screening_applications')
        .insert({
          user_id: user.id,
          portfolio_image_url: publicUrl,
          estimated_balance: numericBalance,
          status: 'pending'
        });

      if (insertError) throw new Error("Gagal mengirim aplikasi pendaftaran.");

      // Berhasil!
      setIsSuccess(true);
      
    // 3. Gunakan tipe unknown lalu lakukan pengecekan tipe error (Praktik Profesional TypeScript)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan sistem. Silakan coba lagi.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- TAMPILAN JIKA SUKSES SUBMIT ---
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#121212] border border-[#2d2d2d] rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#10b981] to-[#06b6d4] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <CheckCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Aplikasi Diterima</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-8">
            Terima kasih telah mengajukan akses ke VorteStocks Elite. Tim kami akan memverifikasi portofolio Anda dalam waktu 1x24 jam. Kami akan mengabari Anda via Email.
          </p>
          <button 
            onClick={() => router.push('/auth')}
            className="w-full bg-[#1e1e1e] border border-[#2d2d2d] text-white font-bold py-3 rounded-xl hover:bg-[#2d2d2d] transition-colors"
          >
            Kembali ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  // --- TAMPILAN FORM VERIFIKASI ---
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#06b6d4]/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-lg bg-[#121212] border border-[#2d2d2d] rounded-2xl p-8 shadow-2xl z-10">
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ShieldCheck size={48} className="text-[#10b981] drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verifikasi Portofolio</h1>
          <div className="w-12 h-1 bg-gradient-to-r from-[#06b6d4] to-[#10b981] mx-auto rounded-full mb-4"></div>
          <p className="text-neutral-400 text-sm">
            VorteStocks adalah komunitas Tier-1. Silakan verifikasi aset Anda untuk mendapatkan persetujuan Admin.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg flex items-center gap-2 text-[#ef4444] text-[12px] font-medium">
            <AlertCircle size={14} className="shrink-0" /> <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Input Estimasi Saldo */}
          <div>
            <label className="block text-white text-[13px] font-bold mb-2">Estimasi Total Saldo (IDR)</label>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-[#1e1e1e] border-r border-[#2d2d2d] rounded-l-xl text-neutral-400 font-bold">
                Rp
              </div>
              <input 
                type="text" required
                value={Number(balance).toLocaleString('id-ID')}
                onChange={handleBalanceChange}
                placeholder="Minimal 300.000.000"
                className="w-full bg-[#1e1e1e] border border-[#2d2d2d] focus:border-[#10b981] text-white rounded-xl pl-16 pr-4 py-3.5 outline-none transition-colors text-[14px] font-bold tracking-wider placeholder-neutral-600"
              />
            </div>
          </div>

          {/* Area Upload Gambar */}
          <div>
            <label className="block text-white text-[13px] font-bold mb-2">Screenshot Portofolio (Aset Aktif)</label>
            <div className="relative border-2 border-dashed border-[#2d2d2d] hover:border-[#10b981] bg-[#1e1e1e]/50 rounded-xl p-6 transition-colors flex flex-col items-center justify-center text-center cursor-pointer group overflow-hidden">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              
              {previewUrl ? (
                <div className="absolute inset-0 w-full h-full">
                  <Image src={previewUrl} alt="Preview" fill className="object-cover opacity-60" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold text-sm bg-black/60 px-4 py-2 rounded-full">Ganti Gambar</span>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud size={36} className="text-neutral-500 group-hover:text-[#10b981] mb-3 transition-colors" />
                  <p className="text-white text-sm font-bold mb-1">Klik atau Drag & Drop gambar</p>
                  <p className="text-neutral-500 text-[11px]">PNG, JPG maksimal 5MB</p>
                </>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading || !file || Number(balance) < 300000000}
            className="w-full bg-gradient-to-r from-[#06b6d4] to-[#10b981] hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-white font-bold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex justify-center items-center"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Kirim Aplikasi untuk Review"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}