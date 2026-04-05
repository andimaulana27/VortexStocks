// src/app/(protected)/layout/bandarmologi/page.tsx
"use client";

import React from 'react';

// IMPORT CUSTOM HOOK TANGGAL DARI LAYOUT BUNGKUSAN
import { useLayoutDate } from '../layout';

import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import RadarWidget from '@/components/layouts/RadarWidget';

export default function BandarmologiPage() {
  // PANGGIL STATE TANGGAL GLOBAL
  const dateProps = useLayoutDate();

  return (
    <div className="flex h-full w-full gap-1.5 p-1 bg-[#0a0a0a] overflow-hidden">
      
      {/* KOLOM KIRI: Radar Pencarian Saham Aktif */}
      <div className="w-[450px] flex flex-col h-full shrink-0 overflow-hidden">
         {/* Meneruskan props tanggal ke RadarWidget */}
         <RadarWidget {...dateProps} />
      </div>

      {/* KOLOM TENGAH: Broker Summary Tabel Lengkap */}
      <div className="flex-1 flex flex-col h-full min-w-[200px] overflow-hidden">
         {/* Meneruskan props tanggal ke BrokerSummaryWidget */}
         <BrokerSummaryWidget {...dateProps} />
      </div>

      {/* KOLOM KANAN: Visualisasi Data Bandar (Sankey & Volume Bar) */}
      <div className="w-[750px] flex flex-col gap-1.5 h-full shrink-0">
         <div className="flex-[1.2] overflow-hidden">
            {/* Meneruskan props tanggal ke BrokerDistWidget */}
            <BrokerDistWidget {...dateProps} />
         </div>
         <div className="flex-[0.8] overflow-hidden">
            {/* Meneruskan props tanggal ke VolumeActivityWidget */}
            <VolumeActivityWidget {...dateProps} />
         </div>
      </div>

    </div>
  );
}