// src/app/(protected)/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { User, Mail, Save, CheckCircle, Phone, MapPin, ShieldAlert, Cpu, Info, X, BookOpen } from 'lucide-react';

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

// Hanya Indikator Teknikal yang dipertahankan
const TECHNICAL_INDICATORS = [
  { id: 'ma_ema', label: 'MA+EMA' }, 
  { id: 'macd', label: 'MACD' }, 
  { id: 'stoch_rsi', label: 'Stoch RSI' },
  { id: 'rsi', label: 'RSI' }, 
  { id: 'big_volume', label: 'Big Volume' }
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // State untuk Modal Logic Info
  const [isLogicModalOpen, setIsLogicModalOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!error && data) {
          setProfile(data as UserProfile);
          setSettings(data.technical_settings || {});
          setEditName(data.full_name || "");
          setEditPhone(data.phone_number || "");
          setEditAddress(data.address || "");
        }
      }
      setIsLoading(false);
    };

    fetchProfile();
  }, []);

  const handleToggle = (id: string) => {
    setSettings(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const saveSettings = async () => {
    if (!profile) return;
    setIsSaving(true);
    
    const supabase = createClient();
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
    <div className="p-4 md:p-6 h-[calc(100vh-42px)] overflow-y-auto hide-scrollbar bg-[#121212] relative">
      
      {/* SECTION 1: PROFIL PENGGUNA */}
      <div className={`bg-[#181818] rounded-2xl p-6 flex flex-col md:flex-row items-center md:items-start gap-6 mb-6 relative overflow-hidden transition-all duration-500
        ${isAdmin ? 'border border-[#f59e0b]/30 shadow-[0_0_30px_rgba(245,158,11,0.05)]' : 'border border-[#2d2d2d]'}`}
      >
        <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] pointer-events-none transition-colors duration-500
          ${isAdmin ? 'bg-[#f59e0b]/10' : 'bg-[#10b981]/5'}`}
        ></div>

        <div className={`relative w-20 h-20 rounded-full border-2 overflow-hidden shrink-0 z-10 
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
             <h1 className="text-xl font-bold text-white tracking-wide">{profile?.full_name || 'Trader'}</h1>
             {isAdmin && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-[#f59e0b]/50 text-[#f59e0b] bg-[#f59e0b]/10 tracking-widest uppercase">
                  <ShieldAlert size={12} /> Admin
                </span>
             )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-neutral-400 font-medium">
            <span className="flex items-center gap-1.5"><Mail size={14} className="text-[#06b6d4]" /> {profile?.email}</span>
            <span className="flex items-center gap-1.5">
               <Cpu size={14} className={isAdmin ? 'text-[#f59e0b]' : 'text-[#10b981]'} /> 
               {isAdmin ? 'Unlimited Access' : profile?.subscription_status === 'whale' ? 'Whale Tier' : profile?.subscription_status === 'pro' ? 'Pro Tier' : 'Guest'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
        
        {/* KOLOM KIRI: FORM DATA DIRI */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-[#181818] border border-[#2d2d2d] rounded-2xl p-6 h-fit">
            <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
              <User size={16} className={isAdmin ? 'text-[#f59e0b]' : 'text-[#10b981]'} /> Profile Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-2">Full Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2d2d2d] text-white text-xs font-medium rounded-xl px-4 py-3 focus:outline-none focus:border-[#10b981] transition-colors"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input 
                    type="tel" 
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2d2d2d] text-white text-xs font-medium rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-[#10b981] transition-colors"
                    placeholder="e.g. 08123456789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-2">Address</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-4 top-3.5 text-neutral-500" />
                  <textarea 
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2d2d2d] text-white text-xs font-medium rounded-xl pl-10 pr-4 py-3 min-h-[100px] focus:outline-none focus:border-[#10b981] transition-colors resize-none custom-scrollbar"
                    placeholder="Enter full address"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: TECHNICAL SETTINGS & ADMIN PRIVILEGES */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* CARD 1: TECHNICAL SETTINGS */}
          <div className="bg-[#181818] border border-[#2d2d2d] rounded-2xl overflow-hidden h-fit flex flex-col">
            <div className="px-6 py-5 border-b border-[#2d2d2d] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#121212] border border-[#2d2d2d] rounded-xl"><Cpu size={16} className="text-[#06b6d4]" /></div>
                <div>
                  <h2 className="text-sm font-bold text-white">Analysis Modules</h2>
                  <p className="text-[11px] text-neutral-500 mt-1">Configure active indicators for your technical dashboard.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* TOMBOL INFO LOGIKA */}
                <button 
                  onClick={() => setIsLogicModalOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] font-bold rounded-full transition-all text-neutral-300 bg-[#1e1e1e] border border-[#2d2d2d] hover:bg-[#2a2a2a] hover:text-white"
                >
                  <Info size={14} className="text-[#06b6d4]" /> Logic Info
                </button>

                <button 
                  onClick={saveSettings} 
                  disabled={isSaving}
                  className={`flex items-center justify-center gap-2 px-6 py-2.5 text-[11px] font-bold rounded-full transition-all disabled:opacity-50 shrink-0 border
                    ${isAdmin ? 'bg-[#f59e0b] border-[#f59e0b] text-black hover:bg-[#d97706]' : 'bg-[#10b981] border-[#10b981] text-black hover:bg-[#059669]'}`}
                >
                  {isSaving ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div> : <Save size={14} />}
                  {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </div>

            <div className="p-6">
              {showSuccess && (
                <div className="mb-6 p-4 bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl text-[#10b981] text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle size={16} /> Configuration saved successfully.
                </div>
              )}

              {/* Kategori: Technical Saja */}
              <div>
                <h3 className="text-white text-xs font-bold mb-4">Technical Indicators</h3>
                <div className="flex flex-wrap gap-2.5">
                  {TECHNICAL_INDICATORS.map(ind => {
                    const isActive = settings[ind.id] === true;
                    return (
                      <button
                        key={ind.id}
                        onClick={() => handleToggle(ind.id)}
                        className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all border ${
                          isActive 
                            ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/50' 
                            : 'bg-[#121212] text-neutral-500 border-[#2d2d2d] hover:border-neutral-500 hover:text-white'
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

          {/* CARD 2: ADMIN PRIVILEGES */}
          {isAdmin && (
             <div className="bg-[#181818] border border-[#f59e0b]/30 rounded-2xl p-5 relative overflow-hidden h-fit">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b]"></div>
                <h3 className="text-[#f59e0b] text-xs font-bold flex items-center gap-2 mb-2">
                   <ShieldAlert size={14} /> Admin Privileges
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">
                   Full RLS bypass active. You have authorization to manage, approve, and reject user portfolios across the network.
                </p>
             </div>
          )}

        </div>
      </div>

      {/* ========================================= */}
      {/* MODAL: LOGIC RULE & CALCULATION INFO      */}
      {/* ========================================= */}
      {isLogicModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181818] border border-[#2d2d2d] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-[#2d2d2d] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#121212] border border-[#2d2d2d] rounded-lg">
                  <BookOpen size={16} className="text-[#10b981]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Bot Calculation Logic</h2>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Rule-based algorithm rules used in the Calculation Status Widget.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLogicModalOpen(false)}
                className="text-neutral-500 hover:text-white transition-colors bg-[#121212] p-1.5 rounded-full border border-[#2d2d2d]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5 text-xs text-neutral-300">
              
              {/* MA + EMA */}
              <div className="p-4 bg-[#121212] rounded-xl border border-[#2d2d2d]">
                <h3 className="text-[#06b6d4] font-bold text-[13px] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]"></span> Moving Average (MA) & EMA
                </h3>
                <ul className="space-y-2.5 ml-4 list-disc list-outside text-neutral-400">
                  <li><strong className="text-white">Trend:</strong> <span className="text-[#10b981]">Uptrend</span> jika <code className="text-[#06b6d4]">Close &gt; EMA &gt; MA</code>. <span className="text-[#ef4444]">Downtrend</span> jika <code className="text-[#06b6d4]">Close &lt; EMA &lt; MA</code>.</li>
                  <li><strong className="text-white">Cross:</strong> <span className="text-[#10b981]">Golden Cross</span> jika hari ini EMA memotong MA ke atas. <span className="text-[#ef4444]">Death Cross</span> jika memotong ke bawah.</li>
                  <li><strong className="text-white">Status (Aksi):</strong> Muncul <span className="text-[#10b981] font-bold">Buy</span> jika terjadi Uptrend atau Golden Cross. Muncul <span className="text-[#ef4444] font-bold">Sell</span> jika Downtrend atau Death Cross.</li>
                </ul>
              </div>

              {/* MACD */}
              <div className="p-4 bg-[#121212] rounded-xl border border-[#2d2d2d]">
                <h3 className="text-[#f59e0b] font-bold text-[13px] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span> MACD (Moving Average Convergence Divergence)
                </h3>
                <ul className="space-y-2.5 ml-4 list-disc list-outside text-neutral-400">
                  <li><strong className="text-white">Status (Aksi):</strong> Muncul <span className="text-[#10b981] font-bold">Buy</span> jika MACD Line memotong Signal Line ke atas, ATAU MACD Line masih di atas Signal Line dan Histogram positif (&gt; 0).</li>
                  <li>Muncul <span className="text-[#ef4444] font-bold">Sell</span> jika MACD Line memotong ke bawah Signal Line.</li>
                </ul>
              </div>

              {/* Stoch RSI */}
              <div className="p-4 bg-[#121212] rounded-xl border border-[#2d2d2d]">
                <h3 className="text-[#8b5cf6] font-bold text-[13px] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]"></span> Stochastic RSI
                </h3>
                <ul className="space-y-2.5 ml-4 list-disc list-outside text-neutral-400">
                  <li><strong className="text-white">Zone:</strong> <span className="text-[#ef4444]">Overbought</span> jika Garis K & D berada di atas nilai 80. <span className="text-[#10b981]">Oversold</span> jika K & D di bawah nilai 20.</li>
                  <li><strong className="text-white">Status (Aksi):</strong> Muncul <span className="text-[#10b981] font-bold">Buy</span> ketika terjadi perpotongan ke atas (Garis K menyilang D) khusus di area <span className="text-[#10b981]">Oversold</span> (potensi *rebound*).</li>
                  <li>Muncul <span className="text-[#ef4444] font-bold">Sell</span> ketika Garis K memotong D ke bawah khusus di area <span className="text-[#ef4444]">Overbought</span>.</li>
                </ul>
              </div>

              {/* RSI */}
              <div className="p-4 bg-[#121212] rounded-xl border border-[#2d2d2d]">
                <h3 className="text-[#ec4899] font-bold text-[13px] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ec4899]"></span> Relative Strength Index (RSI)
                </h3>
                <ul className="space-y-2.5 ml-4 list-disc list-outside text-neutral-400">
                  <li><strong className="text-white">Zone:</strong> Sama seperti Stoch, di atas 70 adalah <span className="text-[#ef4444]">Overbought</span>, di bawah 30 adalah <span className="text-[#10b981]">Oversold</span>.</li>
                  <li><strong className="text-white">Status (Aksi):</strong> Muncul <span className="text-[#10b981] font-bold">Buy</span> jika RSI naik menembus nilai tengah (50), atau grafik sedang menanjak naik keluar dari zona Oversold.</li>
                  <li>Muncul <span className="text-[#ef4444] font-bold">Sell</span> jika menyentuh zona Overbought, atau harga anjlok menembus bawah nilai tengah (50).</li>
                </ul>
              </div>

              {/* Big Volume */}
              <div className="p-4 bg-[#121212] rounded-xl border border-[#2d2d2d]">
                <h3 className="text-[#10b981] font-bold text-[13px] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span> Big Volume (Spike Alert)
                </h3>
                <ul className="space-y-2.5 ml-4 list-disc list-outside text-neutral-400">
                  <li>Algoritma mendeteksi anomali ledakan volume. Disebut &quot;Spike&quot; jika volume hari ini <strong className="text-white">melebihi 2x lipat (2.0x)</strong> dari rata-rata volume 20 hari ke belakang (MA20 Volume).</li>
                  <li><strong className="text-white">Status (Aksi):</strong> Muncul <span className="text-[#10b981] font-bold">Buy</span> jika volume meledak dan *Candlestick* berwarna Hijau (Close &gt; Open). Muncul <span className="text-[#ef4444] font-bold">Sell</span> jika volume meledak tapi *Candlestick* berwarna Merah (Close &lt;= Open).</li>
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}