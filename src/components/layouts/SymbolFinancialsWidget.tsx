"use client";

import React, { useEffect, useRef } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';

export default function SymbolFinancialsWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSymbol = useCompanyStore((state) => state.activeSymbol);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = ''; // Bersihkan widget sebelumnya

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "colorTheme": "dark",
      "isTransparent": true,
      "largeChartUrl": "",
      "displayMode": "regular",
      "width": "100%",
      "height": "100%",
      "symbol": `IDX:${activeSymbol}`,
      "locale": "id"
    });

    containerRef.current.appendChild(script);
  }, [activeSymbol]);

  return (
    <div className="w-full h-full bg-[#121212] border border-[#2d2d2d] rounded-xl overflow-hidden flex flex-col relative">
      <div className="px-3 py-1.5 border-b border-[#2d2d2d] bg-[#1e1e1e]/50 shrink-0">
        <h2 className="text-white text-[11px] font-bold tracking-wide">Financials</h2>
      </div>
      <div className="flex-1 w-full h-full p-1" ref={containerRef} />
    </div>
  );
}