"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, AlertTriangle } from "lucide-react";

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
  subscription_status: string; // 'none', 'pro', 'whale' (Kita anggap 'whale' sebagai Premium Access)
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 1. Ambil data profil
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileData) {
          setProfile(profileData as UserProfile);

          // 2. LOGIKA KETAT: Jika belum premium ('none') dan bukan admin
          if (profileData.subscription_status === 'none' && profileData.role !== 'admin') {
            
            // Cek apakah dia sudah pernah upload bukti pembayaran/portofolio
            const { data: appData } = await supabase
              .from('screening_applications')
              .select('status')
              .eq('user_id', session.user.id)
              .maybeSingle(); // maybeSingle mencegah error jika data kosong

            if (!appData) {
              // ALUR BARU: Jika tidak ada data upload sama sekali, LEMPAR PAKSA ke halaman verifikasi!
              router.push('/verify-portfolio');
              return; 
            } else {
              // Jika sudah upload, simpan statusnya (pending/rejected) untuk ditampilkan di UI
              setApplicationStatus(appData.status);
            }
          }
        }
      }
      setIsLoading(false);
    };

    fetchProfileData();
  }, [supabase, router]);

  // --- VIEW 1: LOADING PROFIL ---
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a] space-y-4">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- VIEW 2: USER PENDING/REJECTED (LAYAR DIKUNCI) ---
  if (profile && profile.subscription_status === 'none' && profile.role !== 'admin') {
    return (
      <div className="h-full w-full bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#121212] border border-[#2d2d2d] rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden">
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
              : ' aplikasi verifikasi pembayaran Premium Anda sedang dalam antrean peninjauan oleh tim Admin.'}
          </p>

          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl p-4 flex items-start gap-3 text-left mb-6">
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