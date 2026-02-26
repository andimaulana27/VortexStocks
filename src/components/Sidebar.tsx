"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LogOut, 
  LayoutDashboard, 
  Globe, 
  Star, 
  LayoutGrid,
  Filter, 
  TrendingUp, 
  Landmark, 
  CircleDollarSign, 
  Layers, 
  BookOpen, 
  GraduationCap, 
  Newspaper,
  Trophy,
  Terminal,
  Headset,
  Gem,
  Settings
} from "lucide-react";

// Daftar menu diurutkan persis sesuai dengan gambar UI terbaru
const menuItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] bg-[#121212] border-r border-[#2d2d2d] flex flex-col h-screen fixed left-0 top-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.2)]">
      
      {/* Logo (Animasi Candlestick) */}
      <div className="p-8 flex items-center justify-center shrink-0">
        <div className="flex items-end space-x-1.5 h-12">
           <div className="w-2.5 h-6 bg-[#ef4444] rounded-sm relative"><div className="absolute w-[2px] h-10 bg-[#ef4444] left-1/2 -translate-x-1/2 -top-2"></div></div>
           <div className="w-2.5 h-10 bg-[#10b981] rounded-sm mb-2 relative"><div className="absolute w-[2px] h-14 bg-[#10b981] left-1/2 -translate-x-1/2 -top-2"></div></div>
           <div className="w-2.5 h-8 bg-[#ef4444] rounded-sm relative"><div className="absolute w-[2px] h-12 bg-[#ef4444] left-1/2 -translate-x-1/2 -top-2"></div></div>
           <div className="w-2.5 h-5 bg-[#10b981] rounded-sm mt-4 relative"><div className="absolute w-[2px] h-8 bg-[#10b981] left-1/2 -translate-x-1/2 -top-1"></div></div>
        </div>
      </div>

      {/* Navigasi Utama dengan Ikon & Efek Premium */}
      <nav className="flex-1 overflow-y-auto my-2 px-4 space-y-1.5 hide-scrollbar">
        {menuItems.map((item) => {
          // PERBAIKAN: Logika isActive disesuaikan untuk mengenali child/sub-path
          const isActive = item.path === "/" 
            ? pathname === "/" 
            : pathname === item.path || pathname.startsWith(`${item.path}/`);

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`flex items-center space-x-3 px-5 py-2.5 rounded-full text-[13px] font-bold tracking-wide transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-[#06b6d4] to-[#34d399] text-white shadow-[0_4px_15px_rgba(52,211,153,0.3)] transform scale-[1.02]"
                  : "text-neutral-400 hover:text-white hover:bg-[#1e1e1e] hover:translate-x-1 border border-transparent hover:border-[#2d2d2d]"
              }`}
            >
              <item.icon 
                size={18} 
                className={`transition-colors duration-300 ${isActive ? "text-white" : "text-neutral-500 group-hover:text-[#34d399]"}`} 
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Profil & Tombol Logout Gradient Premium */}
      <div className="p-5 border-t border-[#2d2d2d] mt-auto shrink-0 bg-[#121212]">
        <div className="bg-[#1e1e1e] p-3 rounded-2xl mb-4 border border-[#2d2d2d] shadow-inner">
          <p className="text-sm font-bold text-white tracking-wide">Andi Maulana</p>
          <p className="text-[11px] text-neutral-400 truncate">andimaulana271219@gmail.com</p>
        </div>
        
        <button className="w-full btn-premium btn-grad-8 !rounded-full flex items-center justify-center space-x-2">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}