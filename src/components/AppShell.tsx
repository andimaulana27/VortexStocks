"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import GlobalInit from '@/components/GlobalInit';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a]" />;

  const isAuthPage = pathname.startsWith('/auth');
  const isGuestLanding = pathname === '/' && !isAuthenticated;

  // FIX UTAMA: Tambahkan overflow-y-auto di sini agar Landing Page bisa di-scroll!
  if (isAuthPage || isGuestLanding) {
    return (
      <main className="flex-1 w-full h-screen bg-[#0a0a0a] overflow-x-hidden overflow-y-auto custom-scrollbar">
        {children}
      </main>
    );
  }

  // Jika sudah login, Dashboard tetap terkunci (overflow-hidden)
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