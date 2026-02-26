"use client";

import React, { useEffect, useRef, memo } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';

function TechnicalAnalysisWidget() {
  const container = useRef<HTMLDivElement>(null);
  const activeSymbol = useCompanyStore(state => state.activeSymbol);

  useEffect(() => {
    if (!container.current) return;
    
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
    script.type = "text/javascript";
    script.async = true;
    
    // KUNCI OPTIMASI: 
    // Mengubah "displayMode": "multiple" menjadi "single". 
    // Mode 'single' merangkum indikator Oscillators & MAs menjadi 1 Speedometer besar
    // yang 100% responsif dan sempurna untuk panel sidebar.
    script.innerHTML = `
      {
        "interval": "15m",
        "width": "100%",
        "isTransparent": true,
        "height": "100%",
        "symbol": "IDX:${activeSymbol}",
        "showIntervalTabs": true,
        "displayMode": "single",
        "locale": "en",
        "colorTheme": "dark"
      }`;
      
    container.current.appendChild(script);
  }, [activeSymbol]);

  return (
    // Penambahan flex col dan min-h-0 mencegah container collapse
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-lg h-full w-full shadow-lg relative overflow-hidden custom-tv-scroll flex flex-col min-h-0">
       
       <style dangerouslySetInnerHTML={{__html: `
         .custom-tv-scroll ::-webkit-scrollbar {
           width: 3px !important;
           height: 3px !important;
         }
         .custom-tv-scroll ::-webkit-scrollbar-track {
           background: transparent !important;
         }
         .custom-tv-scroll ::-webkit-scrollbar-thumb {
           background: rgba(255, 255, 255, 0.1) !important;
           border-radius: 10px !important;
         }
         .custom-tv-scroll ::-webkit-scrollbar-thumb:hover {
           background: rgba(255, 255, 255, 0.25) !important;
         }
       `}} />

       <div className="flex-1 w-full relative min-h-0" ref={container}>
         <div className="absolute inset-0"></div>
       </div>
    </div>
  );
}

export default memo(TechnicalAnalysisWidget);