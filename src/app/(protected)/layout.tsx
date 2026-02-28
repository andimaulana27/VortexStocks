// src/app/(protected)/layout.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import GlobalInit from '@/components/GlobalInit';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // 1. Jika tidak ada sesi login, lempar ke halaman login
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. Ambil profile user untuk mengecek status langganan dan role
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, role')
        .eq('id', session.user.id)
        .single();

      // 3. LOGIKA GATEKEEPING PENTING
      // Jika dia premium ('pro' / 'whale') atau admin, izinkan akses layout!
      if (profile?.role === 'admin' || profile?.subscription_status !== 'none') {
        setIsAuthorized(true);
      } else {
        // Jika status masih 'none', LEMPAR PAKSA ke halaman verifikasi!
        // Ini mencegah mereka melihat sekilas (ngintip) Sidebar atau Topbar
        router.push('/verify-portfolio');
      }
    };

    checkAuthorization();
  }, [router, supabase]);

  // Tampilkan layar loading kosong dengan animasi saat sedang mengecek status ke database
  // Ini mencegah terjadinya kedipan UI (FOUC) dari halaman yang seharusnya disembunyikan
  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full bg-[#0a0a0a] items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Jika sukses tervalidasi sebagai Premium/Admin, render struktur aplikasi utama
  return (
    <>
      <GlobalInit />
      <Sidebar />
      <main className="flex-1 ml-[240px] flex flex-col min-w-0 h-screen">
        <Topbar />
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </main>
    </>
  );
}