"use client";
import React, { useEffect, useRef, memo, useId, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';

interface TVWidgetConfig {
  width: string;
  height: string;
  autosize?: boolean;
  symbol: string;
  interval: string;
  timezone: string;
  theme: string;
  style: string;
  locale: string;
  enable_publishing: boolean;
  backgroundColor: string;
  gridColor: string;
  hide_top_toolbar: boolean;
  hide_legend: boolean;
  hide_side_toolbar: boolean;
  allow_symbol_change: boolean;
  save_image: boolean;
  container_id: string;
}

interface CustomWindow extends Window {
  TradingView?: {
    widget: new (config: TVWidgetConfig) => void;
  };
}

const TVAdvancedChart = memo(({ symbol }: { symbol: string }) => {
  const container = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const containerId = `tv_chart_${rawId.replace(/:/g, '')}`;

  useEffect(() => {
    if (!container.current) return;

    const initWidget = () => {
      if (!container.current) return;
      container.current.innerHTML = '';

      const customWindow = window as unknown as CustomWindow;
      if (customWindow.TradingView) {
        new customWindow.TradingView.widget({
          width: "100%",
          height: "100%",
          symbol: `IDX:${symbol}`, 
          interval: "D", 
          timezone: "Asia/Jakarta",
          theme: "dark", 
          style: "1", 
          locale: "en", 
          enable_publishing: false,
          backgroundColor: "#121212", 
          gridColor: "#2d2d2d", 
          hide_top_toolbar: false, 
          hide_side_toolbar: false, 
          allow_symbol_change: true,
          hide_legend: false, 
          save_image: false, 
          container_id: containerId
        });
      }
    };

    const customWindow = window as unknown as CustomWindow;
    
    if (customWindow.TradingView) {
      initWidget();
    } else {
      const scriptId = 'tv-adv-script-main';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      
      if (script) {
        script.addEventListener('load', initWidget);
      } else {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = initWidget;
        document.head.appendChild(script);
      }
    }
  }, [symbol, containerId]);

  return <div id={containerId} ref={container} className="absolute inset-0 w-full h-full" />;
});

TVAdvancedChart.displayName = "TVAdvancedChart";

interface AdvancedChartWidgetProps {
  customSymbol?: string;
}

export default function AdvancedChartWidget({ customSymbol }: AdvancedChartWidgetProps) {
  const globalSymbol = useCompanyStore(state => state.activeSymbol) || "BUMI";
  const activeSymbol = customSymbol || globalSymbol;
  
  // SMART POLLING: Evaluasi Live Market
  const isLiveMarket = useMemo(() => {
    const day = new Date().getDay();
    return day !== 0 && day !== 6;
  }, []);

  const { data: activePrice } = useSWR(
    `layout-price-${activeSymbol}`, 
    () => fetch(`/api/market?endpoint=stock/idx/prices&symbols=${activeSymbol}`).then(res => res.json()), 
    { refreshInterval: isLiveMarket ? 5000 : 0 } // Matikan polling jika market tutup
  );
  
  const priceData = activePrice?.data?.results?.[0] || null;

  return (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded overflow-hidden relative group h-full w-full flex flex-col min-h-0">
      <div className="absolute top-3 right-16 z-20 bg-[#1e1e1e]/80 backdrop-blur px-3 py-1.5 rounded border border-[#2d2d2d] flex items-center gap-2 transition-opacity duration-300 hover:opacity-10 cursor-default shadow-md pointer-events-none">
        <span className="text-white font-bold text-xs">{activeSymbol}</span>
        <span className="text-neutral-400 text-[10px]">{priceData?.close?.toLocaleString('id-ID')}</span>
        <span className={priceData && priceData.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}>
          {priceData?.change_pct?.toFixed(2)}%
        </span>
      </div>
      
      <div className="flex-1 w-full relative min-h-0">
        <TVAdvancedChart symbol={activeSymbol} />
      </div>
    </div>
  );
}