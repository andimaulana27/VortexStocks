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
      
      if (!session) {
        router.push('/login');
        return;
      }

      // 1. Ambil Role dari tabel profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // 2. Ambil Status Langganan dari tabel user_subscriptions
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('plan, status')
        .eq('user_id', session.user.id)
        .single();

      // 3. LOGIKA GATEKEEPING TERBARU (SINKRON DENGAN DB)
      const isAdmin = profile?.role === 'admin';
      const isPremiumUser = subscription && subscription.plan !== 'free' && subscription.status === 'active';

      if (isAdmin || isPremiumUser) {
        setIsAuthorized(true);
      } else {
        // Jika statusnya 'free' atau tidak punya langganan aktif, lempar ke verifikasi/upgrade
        router.push('/verify-portfolio');
      }
    };

    checkAuthorization();
  }, [router, supabase]);

  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full bg-[#0a0a0a] items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#10b981] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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