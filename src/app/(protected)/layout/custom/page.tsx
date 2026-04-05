// src/app/(protected)/layout/custom/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, LayoutDashboard, Save, Trash2 } from 'lucide-react';

// FIX UTAMA: Import 'Responsive' lalu konversi menjadi 'any' untuk mem-bypass 
// deklarasi tipe prop bawaan @types/react-grid-layout yang cacat (kehilangan isDraggable, dll).
import { Responsive } from 'react-grid-layout';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResponsiveGridLayout = Responsive as any;

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// --- 1. IMPORT CUSTOM HOOK TANGGAL DARI LAYOUT ---
import { useLayoutDate } from '../layout';

// --- IMPORT SEMUA WIDGET DARI LAYOUTS ---
import RadarWidget from '@/components/layouts/RadarWidget';
import AdvancedChartWidget from '@/components/layouts/AdvancedChartWidget';
import VolumeActivityWidget from '@/components/layouts/VolumeActivityWidget';
import BrokerDistWidget from '@/components/layouts/BrokerDistWidget';
import CompanyProfileWidget from '@/components/layouts/CompanyProfileWidget';
import StockStatsWidget from '@/components/layouts/StockStatsWidget';
import BrokerSummaryWidget from '@/components/layouts/BrokerSummaryWidget';
import SmartMoneyOrderBookWidget from '@/components/layouts/SmartMoneyOrderBookWidget';

// --- IMPORT SEMUA WIDGET DARI DASHBOARD ---
import TechnicalAnalysisWidget from '@/components/dashboard/TechnicalAnalysisWidget';
import TopBrokerTable from '@/components/dashboard/TopBrokerTable';

// --- IMPORT SEMUA WIDGET DARI FUNDAMENTAL ---
import FundamentalTablePanel from '@/components/fundamental/FundamentalTablePanel';
import FundamentalComparisonPanel from '@/components/fundamental/FundamentalComparisonPanel';
import FundamentalChartPanel from '@/components/fundamental/FundamentalChartPanel';

// ==========================================
// TIPE DATA & REGISTRY WIDGET
// ==========================================
type WidgetConfig = {
  name: string;
  component: React.ElementType; 
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
  props?: Record<string, string | number | boolean>; 
};

// Menambahkan komponen Dashboard dan Fundamental ke dalam Registry
const WIDGET_REGISTRY: Record<string, WidgetConfig> = {
  // Widget Chart & Harga
  AdvancedChart: { name: "Advanced Chart", component: AdvancedChartWidget, defaultW: 6, defaultH: 4, minW: 4, minH: 3, props: { initialSymbol: "IHSG", customSymbol: "IHSG" } },
  Radar: { name: "Radar Market", component: RadarWidget, defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
  StockStats: { name: "Stock Statistics", component: StockStatsWidget, defaultW: 2, defaultH: 3, minW: 2, minH: 2 },
  
  // Widget Bandarmologi & Transaksi
  BrokerSummary: { name: "Broker Summary", component: BrokerSummaryWidget, defaultW: 3, defaultH: 4, minW: 2, minH: 3 },
  BrokerDist: { name: "Broker Distribution (Sankey)", component: BrokerDistWidget, defaultW: 4, defaultH: 4, minW: 3, minH: 3 },
  VolumeActivity: { name: "Volume Activity", component: VolumeActivityWidget, defaultW: 6, defaultH: 3, minW: 4, minH: 2 },
  SmartMoneyOB: { name: "Smart Money Order Book", component: SmartMoneyOrderBookWidget, defaultW: 2, defaultH: 4, minW: 2, minH: 3 },
  
  // Widget Dashboard & Teknikal
  TechnicalAnalysis: { name: "Technical Speedometer", component: TechnicalAnalysisWidget, defaultW: 3, defaultH: 3, minW: 2, minH: 2 },
  TopBroker: { name: "Top Broker Action", component: TopBrokerTable, defaultW: 4, defaultH: 4, minW: 3, minH: 3 },
  
  // Widget Fundamental & Profil
  CompanyProfile: { name: "Company Profile", component: CompanyProfileWidget, defaultW: 3, defaultH: 3, minW: 2, minH: 2 },
  FundamentalTable: { name: "Fundamental Data", component: FundamentalTablePanel, defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  FundamentalCompare: { name: "Fundamental Compare", component: FundamentalComparisonPanel, defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
  FundamentalChart: { name: "Fundamental Chart", component: FundamentalChartPanel, defaultW: 6, defaultH: 4, minW: 4, minH: 3 },
};

type WidgetType = keyof typeof WIDGET_REGISTRY;

// Interface Independen
interface WidgetLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  type: WidgetType;
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function CustomPage() {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState<WidgetLayoutItem[]>([]);
  const [isEditing, setIsEditing] = useState(true);
  
  // 2. PANGGIL STATE TANGGAL GLOBAL
  const dateProps = useLayoutDate();

  // Custom Auto-Sizer State
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // Load Layout dari LocalStorage
  useEffect(() => {
    let isMounted = true;

    const initializeLayout = () => {
      try {
        const savedLayout = localStorage.getItem('vortestocks_custom_layout');
        if (savedLayout && isMounted) {
           setLayout(JSON.parse(savedLayout));
           setIsEditing(false); 
        }
      } catch (e) {
        console.error("Gagal load layout", e);
      }
      
      if (isMounted) {
         setMounted(true);
      }
    };

    initializeLayout();
    return () => { isMounted = false; };
  }, []);

  // ResizeObserver untuk lebar grid dinamis
  useEffect(() => {
    if (!containerRef.current) return;
    
    setContainerWidth(containerRef.current.offsetWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [mounted]);

  // Handler: Tambah Widget Baru
  const handleAddWidget = (type: WidgetType) => {
    const config = WIDGET_REGISTRY[type];
    const newId = `${String(type)}_${new Date().getTime()}`;
    
    const newItem: WidgetLayoutItem = {
      i: newId,
      x: (layout.length * 2) % 12,
      y: Infinity,
      w: config.defaultW,
      h: config.defaultH,
      minW: config.minW,
      minH: config.minH,
      type: type,
    };

    setLayout([...layout, newItem]);
    setIsEditing(true); 
  };

  // Handler: Hapus Widget
  const handleRemoveWidget = (idToRemove: string) => {
    setLayout(layout.filter(item => item.i !== idToRemove));
  };

  // Handler: Perubahan Drag/Resize
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = (currentLayout: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedLayout = (currentLayout as any[]).map((nl: any) => {
      const existing = layout.find((l) => l.i === nl.i);
      return { ...existing, ...nl } as WidgetLayoutItem;
    });
    setLayout(updatedLayout);
  };

  // Handler: Simpan
  const handleSaveLayout = () => {
    localStorage.setItem('vortestocks_custom_layout', JSON.stringify(layout));
    setIsEditing(false);
  };

  // Handler: Reset
  const handleResetLayout = () => {
    if (confirm("Anda yakin ingin mereset/menghapus semua widget di Custom Layout?")) {
      setLayout([]);
      localStorage.removeItem('vortestocks_custom_layout');
      setIsEditing(true);
    }
  };

  if (!mounted) {
    return (
      <div className="h-full w-full bg-[#121212] flex items-center justify-center animate-pulse text-[#0ea5e9]">
        Memuat Custom Canvas...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] overflow-hidden rounded-lg border border-[#2d2d2d] relative">
      
      {/* --- TOOLBAR HEADER --- */}
      <div className="p-3 border-b border-[#2d2d2d] bg-[#121212] flex flex-wrap items-center justify-between gap-3 shrink-0 z-50">
        
        <div className="flex items-center gap-2 text-white text-[12px] font-bold uppercase tracking-widest">
           <LayoutDashboard size={14} className="text-[#0ea5e9]" />
           Custom Canvas
        </div>

        <div className="flex items-center gap-2">
           
           {/* DROPDOWN ADD WIDGET */}
           <div className="relative group flex items-center">
             <button className="bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#2d2d2d] hover:border-[#0ea5e9] text-white px-3 py-1.5 rounded flex items-center gap-1.5 text-[10px] font-bold transition-all z-10">
                <Plus size={12} className="text-[#0ea5e9]" /> ADD WIDGET
             </button>
             
             <div className="absolute top-full right-0 mt-1 w-64 bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
                <div className="max-h-[350px] overflow-y-auto hide-scrollbar py-1">
                   {Object.keys(WIDGET_REGISTRY).map((key) => {
                     const widgetKey = key as WidgetType;
                     return (
                       <button 
                         key={widgetKey}
                         onClick={() => handleAddWidget(widgetKey)}
                         className="w-full text-left px-4 py-2.5 text-[11px] text-neutral-300 font-bold hover:bg-[#2d2d2d] hover:text-[#0ea5e9] border-b border-[#2d2d2d]/50 last:border-0 transition-colors"
                       >
                         {WIDGET_REGISTRY[widgetKey].name}
                       </button>
                     );
                   })}
                </div>
             </div>
           </div>

           <div className="h-4 w-px bg-[#2d2d2d] mx-1"></div>

           {/* TOGGLE EDIT/SAVE */}
           {isEditing ? (
             <button onClick={handleSaveLayout} className="bg-gradient-to-r from-[#10b981] to-[#059669] text-white px-4 py-1.5 rounded flex items-center gap-1.5 text-[10px] font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-transform hover:scale-105">
                <Save size={12} /> SAVE LAYOUT
             </button>
           ) : (
             <button onClick={() => setIsEditing(true)} className="bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-[#2d2d2d] text-white px-4 py-1.5 rounded flex items-center gap-1.5 text-[10px] font-bold transition-all">
                EDIT LAYOUT
             </button>
           )}

           {layout.length > 0 && isEditing && (
             <button onClick={handleResetLayout} className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] px-3 py-1.5 rounded flex items-center gap-1 text-[10px] font-bold transition-all ml-1">
                <Trash2 size={12} /> CLEAR
             </button>
           )}

        </div>
      </div>

      {/* --- GRID RENDER AREA WITH AUTO-SIZER --- */}
      <div 
        ref={containerRef} 
        className="flex-1 overflow-y-auto hide-scrollbar bg-[#0a0a0a] relative p-1 custom-grid-bg"
      >
        {layout.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-500 gap-3">
             <LayoutDashboard size={40} className="opacity-20" />
             <p className="text-[12px] font-semibold tracking-wider">Canvas Kosong. Klik &quot;ADD WIDGET&quot; untuk mulai menyusun.</p>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            width={containerWidth} 
            layouts={{ lg: layout }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={90} 
            onLayoutChange={handleLayoutChange}
            isDraggable={isEditing} 
            isResizable={isEditing} 
            margin={[6, 6]} 
            containerPadding={[0, 0]}
          >
            {layout.map((item) => {
              const widgetConfig = WIDGET_REGISTRY[item.type];
              if (!widgetConfig) return <div key={item.i}>Widget Error</div>;
              
              const WidgetComponent = widgetConfig.component;
              const widgetProps = widgetConfig.props || {};

              return (
                <div key={item.i} className={`group relative h-full w-full rounded-lg ${isEditing ? 'border-2 border-dashed border-[#2d2d2d] cursor-move' : ''}`}>
                  
                  {isEditing && (
                    <button 
                      onClick={() => handleRemoveWidget(item.i)}
                      onMouseDown={(e) => e.stopPropagation()} 
                      className="absolute -top-2 -right-2 z-50 bg-[#ef4444] text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                    >
                      <X size={12} />
                    </button>
                  )}

                  <div className={`w-full h-full overflow-hidden rounded-lg bg-[#121212] ${isEditing ? 'pointer-events-none opacity-80' : ''}`}>
                     {/* 3. SUNTIKKAN dateProps BERSAMA DENGAN widgetProps */}
                     <WidgetComponent {...widgetProps} {...dateProps} />
                  </div>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* STYLING GRID & RESIZE HANDLE */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-grid-bg {
          background-image: radial-gradient(#2d2d2d 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .react-grid-item > .react-resizable-handle {
          background-image: none !important;
          width: 15px;
          height: 15px;
          bottom: 2px;
          right: 2px;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-right: 2px solid #0ea5e9;
          border-bottom: 2px solid #0ea5e9;
          border-radius: 2px;
          opacity: 0.5;
        }
        .react-grid-item:hover > .react-resizable-handle::after {
          opacity: 1;
        }
      `}} />
    </div>
  );
}