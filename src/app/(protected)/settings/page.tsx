// src/app/settings/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { User, Mail, Star, Crown, Bell, Save, CheckCircle } from 'lucide-react';

// 1. Definisikan Interface untuk Profile
interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  subscription_status: string;
  technical_settings?: Record<string, boolean>;
}

// Daftar indikator berdasarkan UI gambar Anda
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
  // 2. Terapkan interface pada State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const supabase = createClient();

  // 3. Pindahkan deklarasi fungsi ke ATAS useEffect
  const fetchProfile = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!error && data) {
        setProfile(data as UserProfile);
        // Load JSON settings dari database, jika kosong gunakan object kosong
        setSettings(data.technical_settings || {});
      }
    }
    setIsLoading(false);
  };

  // 4. useEffect memanggil fungsi yang sudah diinisialisasi
  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fungsi Toggle Indikator
  const handleToggle = (id: string) => {
    setSettings(prev => ({
      ...prev,
      [id]: !prev[id] // Balikkan nilai (true -> false, false -> true)
    }));
  };

  // Simpan ke Database
  const saveSettings = async () => {
    if (!profile) return;
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ technical_settings: settings })
      .eq('id', profile.id);

    setIsSaving(false);
    
    if (!error) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000); // Hilangkan notif setelah 3 detik
    }
  };

  if (isLoading) {
    return <div className="p-8 text-neutral-500 animate-pulse">Memuat profil Anda...</div>;
  }

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
      
      {/* SECTION 1: PROFIL PENGGUNA */}
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-xl mb-6 relative overflow-hidden">
        {/* Hiasan Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#10b981]/10 to-transparent blur-3xl pointer-events-none"></div>

        {/* 5. Ganti tag <img> menjadi Next.js <Image /> */}
        <div className="relative w-24 h-24 rounded-full border-2 border-[#10b981] shadow-[0_0_20px_rgba(16,185,129,0.2)] overflow-hidden shrink-0 z-10">
          <Image 
            src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name}&background=10b981&color=fff`} 
            alt="Avatar" 
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        
        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="text-3xl font-bold text-white mb-1">{profile?.full_name || 'Trader Misterius'}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-neutral-400 mb-4">
            <span className="flex items-center gap-1.5 bg-[#1e1e1e] px-3 py-1 rounded-full border border-[#2d2d2d]"><Mail size={14} className="text-[#06b6d4]" /> {profile?.email}</span>
            <span className="flex items-center gap-1.5 bg-[#1e1e1e] px-3 py-1 rounded-full border border-[#2d2d2d]"><User size={14} className="text-[#f59e0b]" /> {profile?.role === 'admin' ? 'Super Admin' : 'Member'}</span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1e1e1e] border border-[#2d2d2d]">
            <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Status Langganan:</span>
            {profile?.subscription_status === 'whale' ? (
              <span className="flex items-center gap-1.5 text-[#10b981] font-bold text-sm px-2 py-0.5 bg-[#10b981]/10 rounded-md"><Crown size={16} /> Whale (Tier-1)</span>
            ) : profile?.subscription_status === 'pro' ? (
              <span className="flex items-center gap-1.5 text-[#f97316] font-bold text-sm px-2 py-0.5 bg-[#f97316]/10 rounded-md"><Star size={16} /> Pro Trader</span>
            ) : (
              <span className="flex items-center gap-1.5 text-neutral-400 font-bold text-sm px-2 py-0.5 bg-neutral-800 rounded-md">Guest (Pending)</span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: TECHNICAL & NOTIFICATION SETTINGS */}
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-xl overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-[#2d2d2d] flex items-center justify-between bg-[#1e1e1e]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#ef4444]/10 rounded-full"><Bell size={20} className="text-[#ef4444]" /></div>
            <div>
              <h2 className="text-lg font-bold text-white">Notification & Dashboard Settings</h2>
              <p className="text-xs text-neutral-400">Pilih indikator yang ingin diaktifkan pada layout Technical Anda.</p>
            </div>
          </div>
          
          <button 
            onClick={saveSettings} 
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#06b6d4] to-[#10b981] hover:from-[#0891b2] hover:to-[#059669] text-white text-sm font-bold rounded-full transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={16} />}
            {isSaving ? 'Menyimpan...' : 'Simpan Setup'}
          </button>
        </div>

        <div className="p-6">
          {showSuccess && (
            <div className="mb-6 p-3 bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg flex items-center gap-2 text-[#10b981] text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <CheckCircle size={18} /> Setup indikator berhasil disimpan ke database!
            </div>
          )}

          {/* Kategori: Technical */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-white font-bold text-lg">Technical</h3>
              <div className="flex gap-1">
                {['5m', '15m', '30m', '1h', '4h', '1d', '1w'].map(tf => (
                  <span key={tf} className="text-[10px] font-bold text-neutral-500 bg-[#1e1e1e] border border-[#2d2d2d] px-2 py-1 rounded cursor-pointer hover:text-white hover:border-neutral-500 transition-colors">{tf}</span>
                ))}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              {TECHNICAL_INDICATORS.map(ind => {
                const isActive = settings[ind.id] === true;
                return (
                  <button
                    key={ind.id}
                    onClick={() => handleToggle(ind.id)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border ${
                      isActive 
                        ? 'bg-[#ec4899]/10 text-[#ec4899] border-[#ec4899] shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                        : 'bg-transparent text-neutral-400 border-[#2d2d2d] hover:border-neutral-500 hover:text-white'
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
              <h3 className="text-white font-bold text-lg">Smart Money</h3>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              {SMART_MONEY_INDICATORS.map(ind => {
                const isActive = settings[ind.id] === true;
                return (
                  <button
                    key={ind.id}
                    onClick={() => handleToggle(ind.id)}
                    className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all border ${
                      isActive 
                        ? 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6] shadow-[0_0_10px_rgba(139,92,246,0.2)]' 
                        : 'bg-transparent text-neutral-400 border-[#2d2d2d] hover:border-neutral-500 hover:text-white'
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
  );
}