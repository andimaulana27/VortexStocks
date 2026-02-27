// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { ShieldCheck, Lock } from "lucide-react";

// Komponen Landing Page Eksternal
import LandingPage from "@/components/landing/LandingPage";

// Komponen Dashboard Aktual (Pastikan file-file ini ada di proyek Anda)
import MoversTable from "@/components/dashboard/MoversTable";
import IHSGChart from "@/components/dashboard/IHSGChart";
import CalendarTable from "@/components/dashboard/CalendarTable";
import TopBrokerTable from "@/components/dashboard/TopBrokerTable";
import MajorIndicesPanel from "@/components/dashboard/MajorIndicesPanel";
import MarketOverviewPanel from "@/components/dashboard/MarketOverviewPanel";
import TechnicalAnalysisWidget from "@/components/dashboard/TechnicalAnalysisWidget";

// --- PRAKTIK PROFESIONAL: MENDIFINISIKAN TIPE DATA ---
// Mengganti 'any' agar TypeScript mengenali properti objek dengan aman
interface UserProfile {
  id: string;
  full_name: string | null;
  role: 'admin' | 'user';
  subscription_status: 'none' | 'pro' | 'whale';
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Menerapkan interface UserProfile yang sudah dibuat
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setIsAuthenticated(true);
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (data) {
          // Melakukan type-casting data Supabase menjadi UserProfile
          setProfile(data as UserProfile);
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, [supabase]);

  // --- VIEW 1: LOADING ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] space-y-4">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- VIEW 2: MURNI GUEST -> Panggil Komponen Khusus Landing Page ---
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  // --- VIEW 3: USER PENDING (DIKUNCI) ---
  if (profile && profile.subscription_status === 'none' && profile.role !== 'admin') {
    return (
      <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#121212] border border-[#2d2d2d] rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]"></div>
          <div className="w-20 h-20 bg-[#f59e0b]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={36} className="text-[#f59e0b]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Akses Terkunci</h2>
          <p className="text-neutral-400 text-sm leading-relaxed mb-6">
            Halo <b>{profile.full_name}</b>, aplikasi verifikasi portofolio Anda sedang dalam antrean peninjauan oleh tim Admin.
          </p>
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-4 flex items-start gap-3 text-left">
            <ShieldCheck size={20} className="text-[#10b981] shrink-0 mt-0.5" />
            <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
              Anda akan menerima notifikasi via email setelah akun Anda di-upgrade ke status <span className="text-[#10b981] font-bold">Whale</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW 4: USER APPROVED (PRO/WHALE/ADMIN) -> Render Dashboard ---
  return (
    <div className="p-2 h-full w-full overflow-hidden bg-[#0a0a0a] animate-in fade-in duration-500">
      <div className="grid grid-cols-12 gap-2 h-full">
        <div className="col-span-2 h-full overflow-hidden"><MoversTable /></div>
        <div className="col-span-5 h-full flex flex-col gap-2 overflow-hidden">
          <div className="flex-[1.3] overflow-hidden"><IHSGChart /></div>
          <div className="flex-[0.7] overflow-hidden"><CalendarTable /></div>
        </div>
        <div className="col-span-3 h-full overflow-hidden"><TopBrokerTable /></div>
        <div className="col-span-2 h-full flex flex-col gap-2 overflow-hidden">
           <div className="flex-[0.8] overflow-hidden"><MajorIndicesPanel /></div>
           <div className="flex-[0.9] overflow-hidden"><MarketOverviewPanel /></div>
           <div className="flex-[0.8] overflow-hidden"><TechnicalAnalysisWidget /></div>
        </div>
      </div>
    </div>
  );
}