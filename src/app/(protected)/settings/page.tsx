// src/app/(protected)/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { User, Mail, Save, CheckCircle, Phone, MapPin, ShieldAlert, Cpu } from 'lucide-react';

// 1. Definisikan Interface untuk Profile
interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  subscription_status: string;
  phone_number?: string | null;
  address?: string | null;
  technical_settings?: Record<string, boolean>;
}

// Daftar indikator
const TECHNICAL_INDICATORS = [
  { id: 'ma_ema', label: 'Ma+Ema' }, { id: 'macd', label: 'Macd' }, { id: 'stoch_rsi', label: 'Stoch Rsi' },
  { id: 'rsi', label: 'RSI' }, { id: 'big_volume', label: 'Big Volume' }, { id: 'breakout_ch', label: 'Breakout Ch' },
  { id: 'trendline_atr', label: 'Trendline ATR' }, { id: 'dtfx_zone', label: 'DTFX Zone' }, { id: 'zig_zag', label: 'Zig-Zag Ch' },
  { id: 'money_flow', label: 'Money Flow' }, { id: 'atr_supertrend', label: 'ATR SuperTrend' }, { id: 'reversal', label: 'Reversal' },
];

const SMART_MONEY_INDICATORS = [
  { id: 'foreign', label: 'Foreign' }, { id: 'bid_offer', label: 'Bid Offer' }, { id: 'volume_sm', label: 'Volume' },
  { id: 'smart_money', label: 'Smart Money' }, { id: 'anomali_broker', label: 'Anomali Broker' }, { id: 'top_acum', label: 'Top Acum' },
  { id: 'shareholders', label: 'Shareholders' }, { id: 'haki', label: 'HAKI' }, { id: 'haka', label: 'HAKA' },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  
  // State untuk Form Edit Profil
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const supabase = createClient();

  const fetchProfile = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!error && data) {
        setProfile(data as UserProfile);
        setSettings(data.technical_settings || {});
        // Inisialisasi form
        setEditName(data.full_name || "");
        setEditPhone(data.phone_number || "");
        setEditAddress(data.address || "");
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fungsi Toggle Indikator
  const handleToggle = (id: string) => {
    setSettings(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Simpan ke Database
  const saveSettings = async () => {
    if (!profile) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        technical_settings: settings,
        full_name: editName,
        phone_number: editPhone,
        address: editAddress
      })
      .eq('id', profile.id);

    setIsSaving(false);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, full_name: editName, phone_number: editPhone, address: editAddress } : null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full bg-[#121212] items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <div className="p-4 md:p-6 h-[calc(100vh-42px)] overflow-y-auto hide-scrollbar bg-[#121212]">
      
      {/* SECTION 1: PROFIL PENGGUNA (Ultra Clean & Futuristic) */}
      <div className={`bg-[#121212] border rounded-xl p-6 flex flex-col md:flex-row items-center md:items-start gap-6 mb-6 relative overflow-hidden transition-all duration-500
        ${isAdmin ? 'border-[#f59e0b]/40 shadow-[0_0_30px_rgba(245,158,11,0.05)]' : 'border-[#2d2d2d]'}`}
      >
        {/* Hiasan Background Sudut (Sangat Subtle) */}
        <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] pointer-events-none transition-colors duration-500
          ${isAdmin ? 'bg-[#f59e0b]/10' : 'bg-[#10b981]/5'}`}
        ></div>

        {/* Avatar */}
        <div className={`relative w-20 h-20 rounded-lg border shadow-lg overflow-hidden shrink-0 z-10 
          ${isAdmin ? 'border-[#f59e0b]/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-[#2d2d2d]'}`}
        >
          <Image 
            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'User'}&background=1e1e1e&color=${isAdmin ? 'f59e0b' : '10b981'}`} 
            alt="Avatar" 
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        
        <div className="flex-1 text-center md:text-left z-10 w-full flex flex-col justify-center">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
             <h1 className="text-2xl font-black text-white tracking-wide uppercase">{profile?.full_name || 'TRADER MISTERIUS'}</h1>
             {isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black border border-[#f59e0b] text-[#f59e0b] bg-[#f59e0b]/10 tracking-widest uppercase">
                  <ShieldAlert size={12} /> System Admin
                </span>
             )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-xs text-neutral-400 font-medium tracking-wide">
            <span className="flex items-center gap-1.5"><Mail size={14} className="text-[#06b6d4]" /> {profile?.email}</span>
            <span className="text-[#2d2d2d]">|</span>
            <span className="flex items-center gap-1.5">
               <Cpu size={14} className={isAdmin ? 'text-[#f59e0b]' : 'text-[#10b981]'} /> 
               Status: {
                 isAdmin ? 'Unlimited Access' : 
                 profile?.subscription_status === 'whale' ? 'Whale (Tier-1)' : 
                 profile?.subscription_status === 'pro' ? 'Pro Trader' : 'Guest'
               }
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
        
        {/* SECTION 2A: FORM DATA DIRI */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-6">
            <h2 className="text-[13px] font-black text-white mb-5 flex items-center gap-2 tracking-widest uppercase">
              <User size={16} className={isAdmin ? 'text-[#f59e0b]' : 'text-[#10b981]'} /> Data Personal
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2d2d2d] text-white text-xs font-medium rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="Masukkan nama lengkap..."
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Nomor Telepon</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="tel" 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] text-white text-xs font-medium rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#10b981] transition-colors"
                    placeholder="Contoh: 08123456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Alamat Domisili</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-3 text-neutral-500" />
                  <textarea 
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2d2d2d] text-white text-xs font-medium rounded-lg pl-9 pr-4 py-2.5 min-h-[90px] focus:outline-none focus:border-[#10b981] transition-colors resize-none custom-scrollbar"
                    placeholder="Masukkan alamat lengkap..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PANEL ADMIN KHUSUS */}
          {isAdmin && (
             <div className="bg-[#121212] border border-[#f59e0b]/40 rounded-xl p-5 shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b]"></div>
                <h3 className="text-[#f59e0b] text-[11px] font-black tracking-widest flex items-center gap-2 mb-2 uppercase">
                   <ShieldAlert size={14} /> Hak Istimewa
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium leading-relaxed mb-4">
                   Mode Administrator aktif. Anda memiliki otorisasi penuh (*Bypass RLS*) untuk menyetujui, menolak, dan memvalidasi portofolio seluruh pengguna pada jaringan database.
                </p>
                <div className="w-full h-[2px] bg-[#2d2d2d] overflow-hidden">
                   <div className="h-full bg-[#f59e0b] w-full animate-pulse"></div>
                </div>
             </div>
          )}
        </div>

        {/* SECTION 2B: TECHNICAL & NOTIFICATION SETTINGS */}
        <div className="lg:col-span-2">
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl overflow-hidden h-full flex flex-col">
            
            <div className="px-6 py-4 border-b border-[#2d2d2d] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-[#181818] border border-[#2d2d2d] rounded"><Cpu size={16} className="text-[#06b6d4]" /></div>
                <div>
                  <h2 className="text-[13px] font-black text-white tracking-widest uppercase">Modul Analisis</h2>
                  <p className="text-[10px] font-medium text-neutral-500 tracking-wide mt-0.5">Konfigurasi indikator aktif pada dashboard utama.</p>
                </div>
              </div>
              
              <button 
                onClick={saveSettings} 
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 px-5 py-2 text-white text-[11px] font-black uppercase tracking-widest rounded transition-all disabled:opacity-50 shrink-0 border
                  ${isAdmin ? 'bg-[#f59e0b]/10 border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#10b981]/10 border-[#10b981] text-[#10b981] hover:bg-[#10b981] hover:text-black shadow-[0_0_15px_rgba(16,185,129,0.2)]'}`}
              >
                {isSaving ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <Save size={14} />}
                {isSaving ? 'MEMPROSES...' : 'SIMPAN SETUP'}
              </button>
            </div>

            <div className="p-6 flex-1 bg-[#121212]">
              {showSuccess && (
                <div className="mb-6 p-3 bg-[#10b981]/10 border border-[#10b981] rounded text-[#10b981] text-[11px] font-black tracking-widest flex items-center gap-2 uppercase animate-in fade-in slide-in-from-top-2">
                  <CheckCircle size={14} /> Sinkronisasi Database Berhasil!
                </div>
              )}

              {/* Kategori: Technical */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <h3 className="text-white text-[11px] font-black tracking-widest uppercase">Indikator Teknikal</h3>
                  <div className="flex gap-1">
                    {['5m', '15m', '30m', '1h', '4h', '1d', '1w'].map(tf => (
                      <span key={tf} className="text-[9px] font-black text-neutral-600 border border-[#2d2d2d] px-1.5 py-0.5 rounded cursor-pointer hover:text-white hover:border-neutral-400 transition-colors">{tf}</span>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {TECHNICAL_INDICATORS.map(ind => {
                    const isActive = settings[ind.id] === true;
                    return (
                      <button
                        key={ind.id}
                        onClick={() => handleToggle(ind.id)}
                        className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all border ${
                          isActive 
                            ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981] shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                            : 'bg-[#181818] text-neutral-500 border-[#2d2d2d] hover:border-neutral-400 hover:text-white'
                        }`}
                      >
                        {ind.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kategori: Smart Money */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-white text-[11px] font-black tracking-widest uppercase">Smart Money Flow</h3>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {SMART_MONEY_INDICATORS.map(ind => {
                    const isActive = settings[ind.id] === true;
                    return (
                      <button
                        key={ind.id}
                        onClick={() => handleToggle(ind.id)}
                        className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider transition-all border ${
                          isActive 
                            ? 'bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4] shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                            : 'bg-[#181818] text-neutral-500 border-[#2d2d2d] hover:border-neutral-400 hover:text-white'
                        }`}
                      >
                        {ind.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

    </div>
  );
}