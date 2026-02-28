"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { 
  LogOut, LayoutDashboard, Globe, Star, LayoutGrid, Filter, 
  TrendingUp, Landmark, CircleDollarSign, Layers, BookOpen, 
  GraduationCap, Newspaper, Trophy, Terminal, Headset, Gem, 
  Settings, ShieldCheck, Users
} from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  email: string;
  subscription_status: string;
}

const basicMenuItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "All Market", path: "/all-market", icon: Globe },
  { name: "Watchlist", path: "/watchlist", icon: Star },
  { name: "Layout", path: "/layout", icon: LayoutGrid },
  { name: "Screener", path: "/screener", icon: Filter },
  { name: "Technical", path: "/technical", icon: TrendingUp },
  { name: "Fundamental", path: "/fundamental", icon: Landmark },
  { name: "Smart Money", path: "/smart-money", icon: CircleDollarSign },
  { name: "Combination", path: "/combination", icon: Layers },
  { name: "Journal Trading", path: "/journal", icon: BookOpen },
  { name: "Tutorial", path: "/tutorial", icon: GraduationCap },
  { name: "News", path: "/news", icon: Newspaper },
  { name: "Top Trader", path: "/top-trader", icon: Trophy },
  { name: "Request Logic", path: "/request-logic", icon: Terminal },
  { name: "Contact Us", path: "/contact", icon: Headset },
  { name: "Subscription", path: "/subscription", icon: Gem },
  { name: "Settings", path: "/settings", icon: Settings },
];

const adminMenuItems = [
  { name: "Review Portofolio", path: "/admin/applications", icon: ShieldCheck },
  { name: "Manajemen User", path: "/admin/users", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let isMounted = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fetchProfileData = async (sessionUser: any) => {
      if (!sessionUser) return;

      // 1. Set Fallback segera agar UI tidak kosong (UX lebih baik)
      setProfile({
        id: sessionUser.id,
        full_name: sessionUser.user_metadata?.full_name || "Pengguna",
        email: sessionUser.email || "Email tidak ditemukan",
        role: 'user',
        avatar_url: sessionUser.user_metadata?.avatar_url || null,
        subscription_status: 'none'
      });

      // 2. Panggil data dari database (Sekarang sudah aman dari Infinite Loop)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error) {
        console.error("Gagal menarik profil:", error.message);
      }

      if (data && isMounted) {
        setProfile(data as UserProfile); 
        if (data.role === 'admin') setIsAdmin(true);
      }
    };

    // A. Cek sesi saat komponen pertama kali dimuat
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && isMounted) fetchProfileData(session.user);
    });

    // B. Pasang Listener untuk perubahan sesi secara real-time
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) fetchProfileData(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-[240px] bg-[#121212] border-r border-[#2d2d2d] flex flex-col h-screen fixed left-0 top-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      
      <div className="py-6 px-8 flex items-center justify-center shrink-0">
        <Link href="/" className="transition-transform hover:scale-105 duration-300">
          <Image src="/VorteStocks.svg" alt="VorteStocks Logo" width={160} height={48} priority className="object-contain drop-shadow-[0_4px_12px_rgba(16,185,129,0.15)]"/>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto my-2 px-4 space-y-1.5 hide-scrollbar">
        
        {isAdmin && (
          <div className="mb-4">
            <p className="px-5 text-[10px] font-black text-[#ef4444] uppercase tracking-widest mb-2">Super Admin</p>
            {adminMenuItems.map((item) => {
              const isActive = pathname.startsWith(item.path);
              return (
                <Link key={item.name} href={item.path} className={`flex items-center space-x-3 px-5 py-2.5 rounded-full text-[13px] font-bold tracking-wide transition-all duration-300 mb-1.5 ${isActive ? "bg-gradient-to-r from-[#ef4444] to-[#f97316] text-white shadow-[0_4px_15px_rgba(239,68,68,0.3)] transform scale-[1.02]" : "text-neutral-400 hover:text-white hover:bg-[#1e1e1e] hover:translate-x-1 border border-transparent hover:border-[#2d2d2d]"}`}>
                  <item.icon size={18} className={isActive ? "text-white" : "text-neutral-500"} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <div className="h-px w-full bg-[#2d2d2d] my-3"></div>
          </div>
        )}

        <p className="px-5 text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-2">Main Menu</p>
        {basicMenuItems.map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link key={item.name} href={item.path} className={`flex items-center space-x-3 px-5 py-2.5 rounded-full text-[13px] font-bold tracking-wide transition-all duration-300 ${isActive ? "bg-gradient-to-r from-[#06b6d4] to-[#34d399] text-white shadow-[0_4px_15px_rgba(52,211,153,0.3)] transform scale-[1.02]" : "text-neutral-400 hover:text-white hover:bg-[#1e1e1e] hover:translate-x-1 border border-transparent hover:border-[#2d2d2d]"}`}>
              <item.icon size={18} className={isActive ? "text-white" : "text-neutral-500"} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-5 border-t border-[#2d2d2d] mt-auto shrink-0 bg-[#121212]">
        <div className="bg-[#1e1e1e] p-3 rounded-2xl mb-4 border border-[#2d2d2d] shadow-inner flex items-center gap-3">
          
          {profile?.avatar_url ? (
            <div className="w-10 h-10 shrink-0 relative rounded-full overflow-hidden border border-[#2d2d2d]">
              <Image 
                src={profile.avatar_url} 
                alt="Avatar" 
                fill 
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-500 flex items-center justify-center text-white font-bold text-sm border border-[#2d2d2d]">
               {profile?.email?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
          
          <div className="overflow-hidden">
            {isAdmin ? (
              <>
                <p className="text-[13px] font-bold text-[#ef4444] tracking-wide truncate">Super Admin</p>
                <p className="text-[10px] text-neutral-400 font-medium tracking-widest uppercase mt-0.5">Administrator</p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-white tracking-wide truncate">{profile?.full_name || "Pengguna"}</p>
                <p className="text-[10px] text-[#06b6d4] truncate mt-0.5">{profile?.email}</p>
              </>
            )}
          </div>
        </div>
        
        <button onClick={handleLogout} className="w-full btn-premium btn-grad-8 !rounded-full flex items-center justify-center space-x-2">
          <LogOut size={16} /><span>Logout</span>
        </button>
      </div>
    </aside>
  );
}