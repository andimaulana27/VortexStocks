"use client";

import React, { useEffect, useRef, memo } from 'react';

const TradingViewScreener = memo(() => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    
    // Bersihkan script lama jika terjadi re-render untuk menghindari duplikasi
    container.current.innerHTML = '';

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
    script.type = "text/javascript";
    script.async = true;
    
    // Setting disesuaikan persis dengan gambar referensi Anda sebelumnya
    script.innerHTML = `
      {
        "width": "100%",
        "height": "100%",
        "defaultColumn": "performance",
        "defaultScreen": "top_gainers",
        "market": "indonesia",
        "showToolbar": true,
        "colorTheme": "dark",
        "locale": "en",
        "isTransparent": true
      }`;
      
    container.current.appendChild(script);
  }, []);

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex-1 w-full h-full shadow-lg relative overflow-hidden custom-tv-scroll animate-in fade-in zoom-in-95 duration-300">
      
      {/* INJEKSI CSS KHUSUS SCROLLBAR ELEGAN */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-tv-scroll ::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
        }
        .custom-tv-scroll ::-webkit-scrollbar-track {
          background: #121212 !important;
        }
        .custom-tv-scroll ::-webkit-scrollbar-thumb {
          background: #3f3f46 !important;
          border-radius: 4px !important;
        }
        .custom-tv-scroll ::-webkit-scrollbar-thumb:hover {
          background: #52525b !important;
        }
      `}} />

      <div className="tradingview-widget-container h-full w-full" ref={container}>
        <div className="tradingview-widget-container__widget h-full w-full"></div>
      </div>
    </div>
  );
});

TradingViewScreener.displayName = "TradingViewScreener";

export default TradingViewScreener;