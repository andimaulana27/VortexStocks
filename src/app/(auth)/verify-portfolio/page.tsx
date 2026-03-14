// src/app/(auth)/verify-portfolio/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  UploadCloud, AlertCircle, CheckCircle, Clock, 
  User, MapPin, Phone, CreditCard, ShieldCheck, ArrowRight, Lock 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function VerifyPortfolioPage() {
  const router = useRouter();
  const supabase = createClient();

  // STATE UNTUK ALUR STEPPER
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // STATE STEP 1: PROFIL
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: ''
  });

  // STATE STEP 2: PORTOFOLIO
  const [userStatus, setUserStatus] = useState<'form' | 'pending' | 'rejected' | 'approved'>('form');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('');

  // STATE STEP 3: PEMBAYARAN
  // SINKRONISASI ENUM: Kita samakan dengan database ('pro' atau 'premium')
  const [selectedTier, setSelectedTier] = useState<'pro' | 'premium'>('pro');

  // INISIALISASI DATA
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Ambil Data Profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setProfile({
          fullName: profileData.full_name || '',
          email: profileData.email || '',
          phone: profileData.phone_number || '',
          address: profileData.address || ''
        });
      }

      // 2. CEK STATUS LANGGANAN DARI TABEL BARU (user_subscriptions)
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('plan, status')
        .eq('user_id', session.user.id)
        .single();

      // Jika dia Admin ATAU punya langganan aktif selain 'free', langsung ke Dashboard!
      if (profileData?.role === 'admin' || (subData && subData.plan !== 'free' && subData.status === 'active')) {
        router.push('/dashboard');
        return;
      }

      // 3. Cek Status Portofolio
      const { data: appData } = await supabase
        .from('screening_applications')
        .select('status')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (appData) {
        setUserStatus(appData.status as 'pending' | 'rejected' | 'approved');
        if (appData.status === 'pending' || appData.status === 'rejected') setCurrentStep(2);
        if (appData.status === 'approved') setCurrentStep(3);
      } else {
        setUserStatus('form');
        setCurrentStep(1);
      }
      
      setIsLoading(false);
    };

    fetchInitialData();
  }, [router, supabase]);

  // --- HANDLER STEP 1: SIMPAN PROFIL ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak ditemukan.");

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.fullName,
          phone_number: profile.phone,
          address: profile.address
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      setCurrentStep(2);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Gagal menyimpan profil.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLER STEP 2: UPLOAD PORTOFOLIO ---
  const handleUploadPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numericBalance = Number(balance);
    
    if (numericBalance < 300000000) {
      setError("Mohon maaf, minimum portofolio untuk bergabung adalah Rp 300.000.000."); return;
    }
    if (!file) {
      setError("Silakan unggah screenshot portofolio Anda."); return;
    }

    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Autentikasi gagal.");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('portfolios').upload(fileName, file, { upsert: true });
      if (uploadError) throw new Error("Gagal mengunggah gambar. Pastikan format benar.");

      const { data: { publicUrl } } = supabase.storage.from('portfolios').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('screening_applications').upsert({
        user_id: user.id, portfolio_image_url: publicUrl, estimated_balance: numericBalance, status: 'pending'
      });
      if (insertError) throw new Error("Gagal mengirim aplikasi pendaftaran.");

      setUserStatus('pending');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("Terjadi kesalahan sistem.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- HANDLER STEP 3: SIMULASI PEMBAYARAN (SINKRON DENGAN DB BARU) ---
  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User tidak valid.");

      // Hitung durasi 1 tahun dari sekarang
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(startDate.getFullYear() + 1);

      // 1. Simpan Langganan ke tabel user_subscriptions
      const payload = {
        user_id: user.id,
        plan: selectedTier, // 'pro' atau 'premium'
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: true
      };

      const { error: paymentError } = await supabase
        .from('user_subscriptions')
        .upsert(payload, { onConflict: 'user_id' }); // Upsert agar aman jika user sudah punya record 'free'

      if (paymentError) throw paymentError;

      // 2. Simpan Riwayat Transaksi (Opsional tapi direkomendasikan karena Anda punya tabelnya)
      const amount = selectedTier === 'pro' ? 5000000 : 15000000;
      await supabase.from('payment_transactions').insert({
        user_id: user.id,
        amount: amount,
        plan_name: selectedTier === 'pro' ? 'Pro Tier Tahunan' : 'Premium Tier Tahunan',
        payment_method: 'Transfer Bank (Simulasi)',
        status: 'success'
      });

      setCurrentStep(4);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError("Pembayaran gagal diproses: " + errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- KOMPONEN RENDER STEPPER UI ---
  const renderStepper = () => (
    <div className="w-full max-w-3xl mx-auto mb-8 px-4">
      <div className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#2d2d2d] z-0 rounded-full"></div>
        
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-[#06b6d4] to-[#10b981] z-0 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        ></div>

        {[
          { step: 1, label: 'Profil' },
          { step: 2, label: 'Portofolio' },
          { step: 3, label: 'Pembayaran' },
          { step: 4, label: 'Selesai' }
        ].map((item) => (
          <div key={item.step} className="relative z-10 flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
              currentStep >= item.step ? 'bg-[#10b981] text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-[#1e1e1e] text-neutral-500 border-2 border-[#2d2d2d]'
            }`}>
              {currentStep > item.step ? <CheckCircle size={20} /> : item.step}
            </div>
            <span className={`absolute top-12 text-[11px] font-bold whitespace-nowrap transition-colors ${
              currentStep >= item.step ? 'text-white' : 'text-neutral-500'
            }`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const inputClass = "w-full bg-[#1e1e1e] border border-[#2d2d2d] focus:border-[#10b981] text-white rounded-xl pl-10 pr-4 py-3 outline-none text-[13px] transition-colors";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col pt-12 pb-20 px-4 relative overflow-y-auto">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#06b6d4]/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="text-center mb-8 relative z-10">
        <h1 className="text-3xl font-bold text-white mb-2">Setup Akun Premium</h1>
        <p className="text-neutral-400 text-sm">Selesaikan 4 langkah mudah untuk bergabung dengan VorteStocks Elite.</p>
      </div>

      {renderStepper()}

      <div className="w-full max-w-xl mx-auto bg-[#121212] border border-[#2d2d2d] rounded-2xl p-6 md:p-8 shadow-2xl z-10 mt-6 relative overflow-hidden">
        
        {error && (
          <div className="mb-6 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg flex items-center gap-2 text-[#ef4444] text-[12px] font-medium">
            <AlertCircle size={14} className="shrink-0" /> <span>{error}</span>
          </div>
        )}

        {/* ================= STEP 1 ================= */}
        {currentStep === 1 && (
          <div className="animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <User className="text-[#10b981]" size={24} /> Informasi Pribadi
            </h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-neutral-400 text-[12px] font-bold mb-1.5">Email (Tidak bisa diubah)</label>
                <input type="email" value={profile.email} disabled className={`${inputClass} opacity-50 cursor-not-allowed pl-4`} />
              </div>
              <div className="relative">
                <label className="block text-neutral-400 text-[12px] font-bold mb-1.5">Nama Lengkap</label>
                <User size={16} className="absolute left-3.5 top-[38px] text-neutral-500" />
                <input type="text" required value={profile.fullName} onChange={(e) => setProfile({...profile, fullName: e.target.value})} className={inputClass} placeholder="Sesuai KTP / Rekening" />
              </div>
              <div className="relative">
                <label className="block text-neutral-400 text-[12px] font-bold mb-1.5">Nomor Telepon / WhatsApp</label>
                <Phone size={16} className="absolute left-3.5 top-[38px] text-neutral-500" />
                <input type="text" required value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className={inputClass} placeholder="08123456789" />
              </div>
              <div className="relative">
                <label className="block text-neutral-400 text-[12px] font-bold mb-1.5">Kota Domisili</label>
                <MapPin size={16} className="absolute left-3.5 top-[38px] text-neutral-500" />
                <input type="text" required value={profile.address} onChange={(e) => setProfile({...profile, address: e.target.value})} className={inputClass} placeholder="Contoh: Jakarta Selatan" />
              </div>
              
              <button type="submit" disabled={isProcessing} className="w-full bg-gradient-to-r from-[#06b6d4] to-[#10b981] hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-white font-bold py-3.5 rounded-xl transition-all mt-6 flex justify-center items-center gap-2">
                {isProcessing ? "Menyimpan..." : "Simpan & Lanjut"} <ArrowRight size={18} />
              </button>
            </form>
          </div>
        )}

        {/* ================= STEP 2 ================= */}
        {currentStep === 2 && (
          <div className="animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="text-[#10b981]" size={24} /> Verifikasi Portofolio
            </h2>

            {(userStatus === 'form' || userStatus === 'rejected') ? (
              <form onSubmit={handleUploadPortfolio} className="space-y-6">
                {userStatus === 'rejected' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-sm mb-4">
                    <strong>Portofolio Ditolak.</strong> Silakan unggah screenshot yang lebih jelas dan memenuhi kriteria.
                  </div>
                )}
                <div>
                  <label className="block text-white text-[13px] font-bold mb-2">Estimasi Total Saldo (IDR)</label>
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-[#1e1e1e] border-r border-[#2d2d2d] rounded-l-xl text-neutral-400 font-bold">Rp</div>
                    <input type="text" required value={Number(balance).toLocaleString('id-ID')} onChange={(e) => setBalance(e.target.value.replace(/\D/g, ''))} placeholder="Minimal 300.000.000" className={`${inputClass} pl-16 py-3.5 font-bold`} />
                  </div>
                </div>
                <div>
                  <label className="block text-white text-[13px] font-bold mb-2">Screenshot Portofolio (Aset Aktif)</label>
                  <div className="relative border-2 border-dashed border-[#2d2d2d] hover:border-[#10b981] bg-[#1e1e1e]/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                    <input type="file" accept="image/*" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if(f) { setFile(f); setPreviewUrl(URL.createObjectURL(f)); }
                    }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    {previewUrl ? (
                      <div className="absolute inset-0 w-full h-full"><Image src={previewUrl} alt="Preview" fill className="object-cover opacity-60" /></div>
                    ) : (
                      <><UploadCloud size={36} className="text-neutral-500 mb-3 group-hover:text-[#10b981] transition-colors" /><p className="text-white text-sm font-bold">Upload Gambar (Maks 5MB)</p></>
                    )}
                  </div>
                </div>
                
                {userStatus === 'form' ? (
                  <button type="submit" disabled={isProcessing || !file || Number(balance) < 300000000} className="w-full bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#10b981] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
                    {isProcessing ? "Mengunggah..." : "Kirim untuk Di-review Admin"}
                  </button>
                ) : (
                  <button type="submit" disabled={isProcessing || !file || Number(balance) < 300000000} className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50">
                    {isProcessing ? "Mengunggah Ulang..." : "Kirim Ulang Portofolio"}
                  </button>
                )}

                <button disabled className="w-full bg-[#2d2d2d]/50 text-neutral-500 font-bold py-3.5 rounded-xl cursor-not-allowed flex justify-center items-center gap-2 mt-2">
                  Lanjut ke Pembayaran <Lock size={18} />
                </button>
              </form>
            ) : null}

            {userStatus === 'pending' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#f59e0b]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock size={40} className="text-[#f59e0b] animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Menunggu Review Admin</h3>
                <p className="text-neutral-400 text-sm mb-8">Portofolio Anda sedang kami validasi. Mohon tunggu maksimal 1x24 jam.</p>
                
                <button disabled className="w-full bg-[#2d2d2d]/50 text-neutral-500 font-bold py-3.5 rounded-xl cursor-not-allowed flex justify-center items-center gap-2">
                  Lanjut ke Pembayaran <Lock size={18} />
                </button>
                <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="mt-4 text-[12px] text-[#06b6d4] hover:underline">Logout Sementara</button>
              </div>
            )}

            {userStatus === 'approved' && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-[#10b981]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} className="text-[#10b981]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Portofolio Disetujui!</h3>
                <p className="text-neutral-400 text-sm mb-8">Selamat, Anda memenuhi syarat untuk bergabung dengan Elite Club.</p>
                <button onClick={() => setCurrentStep(3)} className="w-full bg-gradient-to-r from-[#06b6d4] to-[#10b981] hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2">
                  Lanjut ke Pembayaran <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 3 ================= */}
        {currentStep === 3 && (
          <div className="animate-in slide-in-from-right-8 duration-500">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <CreditCard className="text-[#10b981]" size={24} /> Pilih Paket
            </h2>
            
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div onClick={() => setSelectedTier('pro')} className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${selectedTier === 'pro' ? 'border-[#10b981] bg-[#10b981]/10' : 'border-[#2d2d2d] bg-[#1e1e1e] hover:border-neutral-500'}`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-white text-lg">Pro Tier</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTier === 'pro' ? 'border-[#10b981]' : 'border-neutral-500'}`}>
                    {selectedTier === 'pro' && <div className="w-2.5 h-2.5 bg-[#10b981] rounded-full"></div>}
                  </div>
                </div>
                <p className="text-[12px] text-neutral-400">Akses Penuh Fitur Dashboard & Bandarmologi Standar</p>
                <div className="mt-4 text-[#10b981] font-bold text-xl">Rp 5.000.000 / Tahun</div>
              </div>

              <div onClick={() => setSelectedTier('premium')} className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${selectedTier === 'premium' ? 'border-[#06b6d4] bg-[#06b6d4]/10' : 'border-[#2d2d2d] bg-[#1e1e1e] hover:border-neutral-500'}`}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-white text-lg">Premium (Whale) Tier</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTier === 'premium' ? 'border-[#06b6d4]' : 'border-neutral-500'}`}>
                    {selectedTier === 'premium' && <div className="w-2.5 h-2.5 bg-[#06b6d4] rounded-full"></div>}
                  </div>
                </div>
                <p className="text-[12px] text-neutral-400">Semua Fitur Pro + Sinyal Bandar Real-Time & Data Historis Lengkap</p>
                <div className="mt-4 text-[#06b6d4] font-bold text-xl">Rp 15.000.000 / Tahun</div>
              </div>
            </div>

            <button onClick={handlePayment} disabled={isProcessing} className="w-full bg-gradient-to-r from-[#06b6d4] to-[#10b981] hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2">
              {isProcessing ? "Memproses..." : "Bayar Sekarang"} <CreditCard size={18} />
            </button>
          </div>
        )}

        {/* ================= STEP 4 ================= */}
        {currentStep === 4 && (
          <div className="animate-in slide-in-from-right-8 duration-500 text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#10b981] to-[#06b6d4] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Selamat Bergabung!</h2>
            <p className="text-neutral-400 text-sm leading-relaxed mb-8 max-w-md mx-auto">
              Pembayaran berhasil. Akun Anda kini berstatus <span className="text-[#10b981] font-bold uppercase">{selectedTier}</span>. Silakan masuk ke Dashboard untuk memulai perjalanan trading Anda!
            </p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full bg-gradient-to-r from-[#06b6d4] to-[#10b981] text-white font-bold py-3.5 rounded-xl hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] transition-all flex justify-center items-center gap-2"
            >
              Masuk ke Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}