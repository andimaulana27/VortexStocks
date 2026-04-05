// src/app/(protected)/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, AlertTriangle, Calendar } from "lucide-react";

// Komponen Dashboard Aktual
import MoversTable from "@/components/dashboard/MoversTable";
import IHSGChart from "@/components/dashboard/IHSGChart";
import CalendarTable from "@/components/dashboard/CalendarTable";
import TopBrokerTable from "@/components/dashboard/TopBrokerTable";
import MajorIndicesPanel from "@/components/dashboard/MajorIndicesPanel";
import MarketOverviewPanel from "@/components/dashboard/MarketOverviewPanel";
import TechnicalAnalysisWidget from "@/components/dashboard/TechnicalAnalysisWidget";

interface UserProfile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'user';
}

// Helper Tanggal Default (dari Smart Money)
const getDefaultApiDate = () => {
  const now = new Date();
  const day = now.getDay();
  const hours = now.getHours();
  let offset = 0;
  if (day === 0) offset = 2; else if (day === 6) offset = 1; else if (day === 1 && hours < 16) offset = 3; else if (hours < 16) offset = 1; 
  now.setDate(now.getDate() - offset);
  return now.toISOString().split('T')[0];
};

export default function DashboardPage() {
  // --- STATE AUTH & SUBSCRIPTION ---
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  
  // --- STATE MANAJEMEN TANGGAL GLOBAL DASHBOARD ---
  const [dateMode, setDateMode] = useState<'single' | '1w' | '1m' | '1y' | 'custom'>('single');
  const [selectedDate, setSelectedDate] = useState<string>(getDefaultApiDate());
  const [startDate, setStartDate] = useState<string>(getDefaultApiDate());
  const [endDate, setEndDate] = useState<string>(getDefaultApiDate());
  
  const dateInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();
  const router = useRouter();

  // --- EFFECT AUTHENTICATION ---
  useEffect(() => {
    const fetchProfileAndSubscription = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('id', session.user.id)
          .single();
          
        if (profileData) {
          setProfile(profileData as UserProfile);
          const isAdmin = profileData.role === 'admin';

          const { data: subData } = await supabase
            .from('user_subscriptions')
            .select('status, plan')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const hasActiveSub = subData?.status === 'active';
          setIsPremium(hasActiveSub);

          if (!hasActiveSub && !isAdmin) {
            const { data: appData } = await supabase
              .from('screening_applications')
              .select('status')
              .eq('user_id', session.user.id)
              .maybeSingle(); 

            if (!appData) {
              router.push('/verify-portfolio');
              return; 
            } else {
              setApplicationStatus(appData.status);
            }
          }
        }
      }
      setIsLoading(false);
    };

    fetchProfileAndSubscription();
  }, [supabase, router]);

  // --- LOGIKA PERUBAHAN PRESET TANGGAL ---
  const handleOpenDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      try { ref.current.showPicker(); } catch { ref.current.focus(); }
    }
  };

  const handleModeChange = (mode: 'single' | '1w' | '1m' | '1y' | 'custom') => {
    setDateMode(mode);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    
    if (mode === '1w') {
      const start = new Date(); start.setDate(start.getDate() - 7);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (mode === '1m') {
      const start = new Date(); start.setMonth(start.getMonth() - 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (mode === '1y') {
      const start = new Date(); start.setFullYear(start.getFullYear() - 1);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(endStr);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    if (dateMode !== 'custom') setDateMode('custom');
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    if (dateMode !== 'custom') setDateMode('custom');
  };

  // Props Global untuk didistribusikan ke widget
  const dateProps = {
    customDate: selectedDate, 
    dateMode: dateMode === 'single' ? 'single' : ('range' as 'single' | 'range'), 
    startDate: startDate,
    endDate: endDate
  };

  // --- VIEW 1: LOADING PROFIL ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#121212] space-y-4">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- VIEW 2: USER PENDING/REJECTED ATAU BELUM AKTIF SUBSCRIPTION-NYA ---
  if (profile && !isPremium && profile.role !== 'admin') {
    return (
      <div className="h-full w-full bg-[#121212] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1 ${applicationStatus === 'rejected' ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]'}`}></div>
          
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${applicationStatus === 'rejected' ? 'bg-red-500/10' : 'bg-[#f59e0b]/10'}`}>
            {applicationStatus === 'rejected' ? (
              <AlertTriangle size={36} className="text-red-500" />
            ) : (
              <Lock size={36} className="text-[#f59e0b]" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">
            {applicationStatus === 'rejected' ? 'Aplikasi Ditolak' : 'Akses Terkunci'}
          </h2>
          
          <p className="text-neutral-400 text-sm leading-relaxed mb-6">
            Halo <b>{profile.full_name || 'Trader'}</b>, 
            {applicationStatus === 'rejected' 
              ? ' mohon maaf, bukti pembayaran atau portofolio yang Anda unggah tidak valid atau ditolak oleh Admin.' 
              : ' aplikasi verifikasi pembayaran Premium Anda sedang dalam antrean peninjauan oleh tim Admin atau Anda belum memiliki paket aktif.'}
          </p>

          <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl p-4 flex items-start gap-3 text-left mb-6">
            <ShieldCheck size={20} className="text-[#10b981] shrink-0 mt-0.5" />
            <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
              Anda akan menerima akses penuh ke seluruh fitur VorteStocks setelah akun Anda di-upgrade ke status <span className="text-[#10b981] font-bold">Premium Access</span>.
            </p>
          </div>

          {applicationStatus === 'rejected' && (
            <button 
              onClick={() => router.push('/verify-portfolio')}
              className="w-full btn-premium btn-grad-8 !rounded-xl py-3 text-sm font-bold"
            >
              Unggah Ulang Bukti Pembayaran
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- VIEW 3: USER APPROVED (PREMIUM/ADMIN) -> Render Dashboard ---
  return (
    <div className="p-2 h-full w-full overflow-hidden bg-[#121212] animate-in fade-in duration-500 flex flex-col gap-2">
      
      {/* HEADER TANGGAL GLOBAL */}
      <div className="flex items-center justify-between shrink-0 px-1 mt-1">
        <h1 className="text-white font-bold text-sm tracking-wide hidden md:block">Global Market Dashboard</h1>
        
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {/* Toggle Preset */}
          <div className="flex bg-[#1e1e1e] rounded-lg p-1 border border-[#2d2d2d] items-center">
            <button 
              onClick={() => handleModeChange('single')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === 'single' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              Single
            </button>
            <div className="w-px h-3 bg-[#3e3e3e] mx-1"></div>
            <button 
              onClick={() => handleModeChange('1w')} 
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === '1w' ? 'bg-[#10b981]/20 text-[#10b981] shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              1W
            </button>
            <button 
              onClick={() => handleModeChange('1m')} 
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === '1m' ? 'bg-[#3b82f6]/20 text-[#3b82f6] shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              1M
            </button>
            <button 
              onClick={() => handleModeChange('1y')} 
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === '1y' ? 'bg-[#f59e0b]/20 text-[#f59e0b] shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              1Y
            </button>
            <div className="w-px h-3 bg-[#3e3e3e] mx-1"></div>
            <button 
              onClick={() => handleModeChange('custom')} 
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                dateMode === 'custom' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Input Tanggal */}
          {dateMode === 'single' ? (
            <div onClick={() => handleOpenDatePicker(dateInputRef)} className="relative flex items-center gap-2 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg px-3 py-1.5 hover:border-[#10b981] transition-all duration-300 shadow-sm cursor-pointer group">
              <Calendar size={14} className="text-[#10b981] group-hover:scale-110 transition-transform duration-300" />
              <input 
                ref={dateInputRef} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[110px]"
                max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} 
              />
            </div>
          ) : (
            <div className={`flex items-center gap-2 bg-[#1e1e1e] border rounded-lg px-3 py-1.5 shadow-sm transition-colors ${dateMode === 'custom' ? 'border-[#3b82f6]' : 'border-[#2d2d2d]'}`}>
              <div onClick={() => handleOpenDatePicker(startDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981] transition-colors">
                <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                <input 
                  ref={startDateInputRef} type="date" value={startDate} onChange={handleStartDateChange}
                  className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[100px]"
                  max={endDate} onClick={(e) => e.stopPropagation()} 
                />
              </div>
              <span className="text-neutral-500 text-[10px] font-bold">-</span>
              <div onClick={() => handleOpenDatePicker(endDateInputRef)} className="relative flex items-center gap-1.5 cursor-pointer group hover:text-[#10b981] transition-colors">
                <Calendar size={12} className="text-[#10b981] group-hover:scale-110 transition-transform" />
                <input 
                  ref={endDateInputRef} type="date" value={endDate} onChange={handleEndDateChange}
                  className="bg-transparent text-white text-[11px] font-bold outline-none cursor-pointer uppercase tracking-wider custom-date-input [color-scheme:dark] w-[100px]"
                  min={startDate} max={new Date().toISOString().split('T')[0]} onClick={(e) => e.stopPropagation()} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GRID WIDGETS */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 h-full">
          {/* Meneruskan props ke MoversTable */}
          <div className="col-span-2 h-full overflow-hidden"><MoversTable {...dateProps} /></div>
          <div className="col-span-5 h-full flex flex-col gap-2 overflow-hidden">
            {/* Meneruskan props ke IHSGChart dan CalendarTable */}
            <div className="flex-[1.3] overflow-hidden"><IHSGChart {...dateProps} /></div>
            <div className="flex-[0.7] overflow-hidden"><CalendarTable /></div>
          </div>
          {/* Meneruskan props ke TopBrokerTable */}
          <div className="col-span-3 h-full overflow-hidden"><TopBrokerTable {...dateProps} /></div>
          <div className="col-span-2 h-full flex flex-col gap-2 overflow-hidden">
             {/* Meneruskan props ke MajorIndicesPanel & MarketOverviewPanel */}
             <div className="flex-[0.8] overflow-hidden"><MajorIndicesPanel {...dateProps} /></div>
             <div className="flex-[0.9] overflow-hidden"><MarketOverviewPanel {...dateProps} /></div>
             {/* PENGECUALIAN: TechnicalAnalysisWidget TIDAK menerima dateProps */}
             <div className="flex-[0.8] overflow-hidden"><TechnicalAnalysisWidget /></div>
          </div>
        </div>
      </div>

      {/* STYLE CSS KHUSUS INPUT DATE */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-date-input::-webkit-calendar-picker-indicator {
            opacity: 0; position: absolute; left: 0; top: 0; width: 100%; height: 100%; cursor: pointer;
        }
        .custom-date-input { position: relative; }
      `}} />
    </div>
  );
}