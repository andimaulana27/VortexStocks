// src/app/(auth)/login/page.tsx
'use client'; 

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AuthPage() {
  const [isRegisterView, setIsRegisterView] = useState(false);
  // NEW STATE: Untuk mendeteksi apakah email konfirmasi sudah dikirim
  const [isEmailSent, setIsEmailSent] = useState(false); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      router.push('/dashboard'); 
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Email atau password salah.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=10b981&color=fff`
          },
          // LOGIKA PENTING: Arahkan ke verify-portfolio setelah klik link di email!
          emailRedirectTo: `${window.location.origin}/verify-portfolio`
        }
      });
      if (signUpError) throw signUpError;
      
      // UPDATE: Jangan langsung redirect. Tampilkan popup konfirmasi email.
      setIsEmailSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Gagal melakukan pendaftaran.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // KELAS TAILWIND REUSABLE
  const inputClasses = "w-full bg-[#1e1e1e] border border-[#2d2d2d] focus:border-[#10b981] text-white rounded-xl pl-10 pr-4 py-3.5 outline-none transition-colors text-[13px] placeholder-neutral-500";
  const primaryBtnClasses = "w-full bg-gradient-to-r from-[#06b6d4] to-[#10b981] hover:shadow-[0_4px_15px_rgba(16,185,129,0.3)] text-white font-bold py-3.5 rounded-xl transition-all duration-300 disabled:opacity-50 mt-4";
  const overlayBtnClasses = "mt-6 inline-block bg-transparent border-2 border-white text-white font-bold py-2.5 px-10 rounded-full transition-all duration-300 hover:bg-white hover:text-[#121212]";
  
  const mobileTabClasses = "flex-1 py-3 text-sm font-bold rounded-full transition-all duration-300";
  const activeTabClasses = "bg-[#2d2d2d] text-white shadow-md";
  const inactiveTabClasses = "text-neutral-500 hover:text-white";

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-4 relative overflow-hidden">
      
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#10b981]/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#06b6d4]/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="flex flex-col items-center text-center w-full z-10 mb-6">
        <Image src="/VorteStocks.svg" alt="VorteStocks Logo" width={220} height={60} priority className="mb-4 drop-shadow-[0_4px_12px_rgba(16,185,129,0.15)]" />
      </div>

      {/* MOBILE TOGGLE TABS */}
      {!isEmailSent && (
        <div className="md:hidden w-full max-w-md mb-6 p-1 bg-[#121212] border border-[#2d2d2d] rounded-full flex z-10">
          <button 
            onClick={() => { setIsRegisterView(false); setError(null); }} 
            className={`${mobileTabClasses} ${!isRegisterView ? activeTabClasses : inactiveTabClasses}`}
          >
            Login
          </button>
          <button 
            onClick={() => { setIsRegisterView(true); setError(null); }} 
            className={`${mobileTabClasses} ${isRegisterView ? activeTabClasses : inactiveTabClasses}`}
          >
            Register
          </button>
        </div>
      )}

      {/* KOTAK UTAMA */}
      <div className="relative w-full max-w-[900px] h-auto md:h-[550px] bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-2xl overflow-hidden flex items-center z-10">
        
        {/* TAMPILAN POPUP CEK EMAIL */}
        {isEmailSent ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#121212] z-50 animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-[#10b981]/10 border border-[#10b981]/30 rounded-full flex items-center justify-center mb-6">
              <Mail size={40} className="text-[#10b981]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Cek Kotak Masuk Anda</h2>
            <p className="text-neutral-400 text-sm max-w-md mb-8 leading-relaxed">
              Kami telah mengirimkan tautan konfirmasi ke <span className="text-white font-bold">{email}</span>. Silakan klik tautan tersebut untuk mengaktifkan akun Anda sebelum masuk.
            </p>
            <button 
              onClick={() => { 
                setIsEmailSent(false); 
                setIsRegisterView(false); 
                setEmail(''); 
                setPassword(''); 
              }}
              className="px-8 py-3.5 bg-[#1e1e1e] border border-[#2d2d2d] text-white font-bold text-sm rounded-xl hover:bg-[#2d2d2d] transition-colors"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        ) : (
          <div className="relative md:absolute top-0 left-0 w-full h-full flex flex-col md:flex-row">
            
            {/* FORM LOGIN */}
            <div className={`w-full md:w-1/2 flex-col justify-center p-8 md:p-12 transition-all duration-300 ${isRegisterView ? 'hidden md:flex' : 'flex'}`}>
              <h2 className="text-2xl font-bold text-white mb-2">Login ke Dashboard</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-[#06b6d4] to-[#10b981] rounded-full mb-4"></div>
              <p className="text-neutral-500 text-[13px] mb-8">Masuk untuk mengakses analitik premium Anda.</p>
              
              {error && !isRegisterView && (
                <div className="mb-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg flex items-center gap-2 text-[#ef4444] text-[12px] font-medium">
                  <AlertCircle size={14} className="shrink-0" /> <span className="leading-snug">{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="email" required placeholder="Email Address"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="password" required placeholder="Password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="flex justify-end">
                  <Link href="#" className="text-[12px] text-[#06b6d4] hover:underline">Lupa Password?</Link>
                </div>
                <button type="submit" disabled={isLoading} className={primaryBtnClasses}>
                  {isLoading ? 'Memproses...' : 'Masuk Sekarang'}
                </button>
              </form>
            </div>

            {/* FORM REGISTER */}
            <div className={`w-full md:w-1/2 flex-col justify-center p-8 md:p-12 transition-all duration-300 ${!isRegisterView ? 'hidden md:flex' : 'flex'}`}>
              <h2 className="text-2xl font-bold text-white mb-2">Ajukan Akses</h2>
              <div className="w-12 h-1 bg-gradient-to-r from-[#06b6d4] to-[#10b981] rounded-full mb-4"></div>
              <p className="text-neutral-500 text-[13px] mb-8">Daftar untuk diseleksi menjadi member Premium.</p>

              {error && isRegisterView && (
                <div className="mb-4 p-3 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg flex items-center gap-2 text-[#ef4444] text-[12px] font-medium">
                  <AlertCircle size={14} className="shrink-0" /> <span className="leading-snug">{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="text" required placeholder="Nama Lengkap"
                    value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="email" required placeholder="Email Address"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="password" required minLength={6} placeholder="Buat Password (Min. 6 Karakter)"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className={inputClasses}
                  />
                </div>
                <button type="submit" disabled={isLoading} className={primaryBtnClasses}>
                  {isLoading ? 'Memproses...' : 'Lanjut ke Verifikasi'}
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* PANEL OVERLAY GESER (Disembunyikan saat tampil pesan Cek Email) */}
        {!isEmailSent && (
          <div className={`hidden md:block absolute top-0 left-0 w-[50%] h-full bg-gradient-to-br from-[#10b981] to-[#06b6d4] transition-transform duration-700 ease-in-out z-20 overflow-hidden ${isRegisterView ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>

            <div className="relative w-full h-full flex items-center justify-center p-12 text-center text-white">
              
              <div className={`absolute transition-all duration-500 transform ${isRegisterView ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
                <h2 className="text-3xl font-bold mb-3">Join the Elite</h2>
                <p className="text-sm font-medium text-white/90 leading-relaxed max-w-[260px] mx-auto">
                  Akses eksklusif Smart Money Screener. Verifikasi portofolio Anda sekarang.
                </p>
                <button onClick={() => { setIsRegisterView(true); setError(null); }} className={overlayBtnClasses}>
                  Daftar Sekarang
                </button>
              </div>

              <div className={`absolute transition-all duration-500 transform ${isRegisterView ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'}`}>
                <h2 className="text-3xl font-bold mb-3">Welcome Back</h2>
                <p className="text-sm font-medium text-white/90 leading-relaxed max-w-[260px] mx-auto">
                  Lanjutkan analisa Tape Reading dan pantau pergerakan bandar secara real-time.
                </p>
                <button onClick={() => { setIsRegisterView(false); setError(null); }} className={overlayBtnClasses}>
                  Masuk Kembali
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}