"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Konfigurasi Tab Switcher dengan Kombinasi Gradient Berbeda-beda
const TABS = [
  { 
    path: '/layout', 
    label: 'Default', 
    activeColor: 'bg-gradient-to-r from-[#a855f7] to-[#ec4899] text-white border-transparent shadow-[0_0_12px_rgba(168,85,247,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  },
  { 
    path: '/layout/fundamental', 
    label: 'Fundamental', 
    activeColor: 'bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] text-white border-transparent shadow-[0_0_12px_rgba(59,130,246,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  },
  { 
    path: '/layout/smart-money', 
    label: 'Smart Money', 
    activeColor: 'bg-gradient-to-r from-[#10b981] to-[#14b8a6] text-white border-transparent shadow-[0_0_12px_rgba(16,185,129,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  },
  { 
    path: '/layout/running-trade', 
    label: 'Running Trade', 
    activeColor: 'bg-gradient-to-r from-[#f97316] to-[#f59e0b] text-white border-transparent shadow-[0_0_12px_rgba(249,115,22,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  },
  { 
    path: '/layout/custom', 
    label: 'Custom', 
    activeColor: 'bg-gradient-to-r from-[#e11d48] to-[#f43f5e] text-white border-transparent shadow-[0_0_12px_rgba(225,29,72,0.5)]', 
    inactiveColor: 'bg-[#18181b] text-neutral-400 border-[#2d2d2d] hover:border-[#52525b] hover:text-white'
  }
];

export default function LayoutSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-[calc(100vh-42px)] p-2 overflow-hidden bg-[#121212]">
      
      {/* --- HEADER & TAB SWITCHER NEXT.JS LINK --- */}
      <div className="flex items-center gap-2 mb-2 shrink-0 w-full overflow-x-auto hide-scrollbar pb-1">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide transition-all duration-300 border whitespace-nowrap ${
                isActive ? tab.activeColor : tab.inactiveColor
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* --- AREA RENDER HALAMAN ANAK (pages) --- */}
      <div className="flex-1 overflow-hidden rounded-lg">
        {children}
      </div>

    </div>
  );
}