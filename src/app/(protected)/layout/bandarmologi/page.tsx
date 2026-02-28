"use client";

import React from 'react';
import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import RadarWidget from '@/components/layouts/RadarWidget';

export default function BandarmologiPage() {
  return (
    <div className="flex h-full w-full gap-1.5 p-1 bg-[#0a0a0a] overflow-hidden">
      
      {/* KOLOM KIRI: Radar Pencarian Saham Aktif */}
      <div className="w-[300px] flex flex-col h-full shrink-0 overflow-hidden">
         <RadarWidget />
      </div>

      {/* KOLOM TENGAH: Broker Summary Tabel Lengkap */}
      <div className="flex-1 flex flex-col h-full min-w-[350px] overflow-hidden">
         <BrokerSummaryWidget />
      </div>

      {/* KOLOM KANAN: Visualisasi Data Bandar (Sankey & Volume Bar) */}
      <div className="w-[450px] flex flex-col gap-1.5 h-full shrink-0">
         <div className="flex-[1.2] overflow-hidden">
            <BrokerDistWidget />
         </div>
         <div className="flex-[0.8] overflow-hidden">
            <VolumeActivityWidget />
         </div>
      </div>

    </div>
  );
}