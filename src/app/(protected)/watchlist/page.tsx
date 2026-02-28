"use client";

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { ArrowUpDown, ArrowUp, ArrowDown, Plus, Trash2, Search, Activity, Star, AlertCircle, X, Edit2, AlertTriangle } from 'lucide-react';
import { useCompanyStore } from '@/store/useCompanyStore';

// --- TIPE DATA UTAMA ---
interface StockData {
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  change: number;
  percent: number;
  volume: number;
  value: number; 
  logoUrl: string;
}

type SortKey = 'symbol' | 'price' | 'percent' | 'value' | 'volume';
type SortDirection = 'asc' | 'desc';

interface GoApiPriceItem {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  change: number;
  change_pct: number;
  volume: number;
  company?: { name?: string; logo?: string; };
}

interface WatchlistGroup {
  id: string;
  name: string;
  symbols: string[];
}

const DEFAULT_WATCHLIST = ["BBCA", "BBRI", "BMRI", "BBNI", "GOTO", "TLKM", "ASII"];

const formatNumber = (num: number): string => {
  if (!num) return "-";
  const absNum = Math.abs(num);
  if (absNum >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (absNum >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toLocaleString("id-ID");
};

// --- ENTERPRISE ENGINE: FETCHER WATCHLIST SWR ---
const fetchWatchlistPrices = async (keyArgs: [string, string[]]) => {
  const symbols = keyArgs[1];
  if (!symbols || symbols.length === 0) return [];

  const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
  const headers = { 'accept': 'application/json', 'X-API-KEY': apiKey };

  const batches: string[] = [];
  for (let i = 0; i < symbols.length; i += 50) {
    batches.push(symbols.slice(i, i + 50).join(','));
  }

  const promises = batches.map(batch => 
    fetch(`https://api.goapi.io/stock/idx/prices?symbols=${batch}`, { headers }).then(res => res.json())
  );

  const results = await Promise.all(promises);
  const allStocksRaw: GoApiPriceItem[] = [];
  
  results.forEach(batchResult => {
    if (batchResult?.status === "success" && Array.isArray(batchResult?.data?.results)) {
      allStocksRaw.push(...batchResult.data.results);
    }
  });

  return allStocksRaw;
};

export default function WatchlistPage() {
  // STATE MANAJEMEN MULTI-WATCHLIST
  const [watchlists, setWatchlists] = useState<WatchlistGroup[]>([]);
  const [activeListId, setActiveListId] = useState<string>("default");
  
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [inputSymbol, setInputSymbol] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "GAINERS" | "LOSERS">("ALL");

  const [sortKey, setSortKey] = useState<SortKey>('percent');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // State untuk Tab Tambah & Rename Kustom
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState("");

  // NEW STATE: UNTUK CUSTOM MODAL DELETE
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'GROUP' | 'SYMBOL' | null;
    targetId: string | null;
    targetName: string;
  }>({ isOpen: false, type: null, targetId: null, targetName: "" });

  const getCompany = useCompanyStore(state => state.getCompany);

  // Inisialisasi Data Multi-Watchlist dari LocalStorage
  useEffect(() => {
    const loadWatchlists = () => {
      const savedV2 = localStorage.getItem('premium_watchlists_v2');
      if (savedV2) {
        try {
          const parsed = JSON.parse(savedV2);
          setWatchlists(parsed);
          if (parsed.length > 0) setActiveListId(parsed[0].id);
        } catch {
          createDefaultWatchlist();
        }
      } else {
        const oldSaved = localStorage.getItem('premium_watchlist');
        const initialSymbols = oldSaved ? JSON.parse(oldSaved) : DEFAULT_WATCHLIST;
        const defaultList = [{ id: 'default', name: 'Default', symbols: initialSymbols }];
        setWatchlists(defaultList);
        setActiveListId('default');
        localStorage.setItem('premium_watchlists_v2', JSON.stringify(defaultList));
      }
      setIsInitialized(true);
    };

    const createDefaultWatchlist = () => {
      const defaultList = [{ id: 'default', name: 'Default', symbols: DEFAULT_WATCHLIST }];
      setWatchlists(defaultList);
      setActiveListId('default');
      localStorage.setItem('premium_watchlists_v2', JSON.stringify(defaultList));
    };

    loadWatchlists();
  }, []);

  const saveWatchlists = (updatedLists: WatchlistGroup[]) => {
    setWatchlists(updatedLists);
    localStorage.setItem('premium_watchlists_v2', JSON.stringify(updatedLists));
  };

  const activeWatchlist = watchlists.find(w => w.id === activeListId) || watchlists[0];
  const activeSymbols = activeWatchlist?.symbols || [];

  const { data: rawStocks, error, isLoading } = useSWR(
    activeSymbols.length > 0 ? ['watchlist-prices', activeSymbols] : null,
    fetchWatchlistPrices,
    { refreshInterval: 15000, dedupingInterval: 2000 }
  );

  const filteredStocks = useMemo<StockData[]>(() => {
    if (!rawStocks) return [];

    let mapped: StockData[] = rawStocks.map(item => {
      const masterData = getCompany(item.symbol);
      const currentPrice = item.close || 0;
      const currentVolume = item.volume || 0;

      return {
        symbol: item.symbol,
        name: masterData?.name || item.company?.name || item.symbol,
        price: currentPrice,
        open: item.open || currentPrice,
        high: item.high || currentPrice,
        low: item.low || currentPrice,
        change: item.change || 0,
        percent: item.change_pct || 0,
        volume: currentVolume,
        value: currentPrice * currentVolume, 
        logoUrl: masterData?.logo || item.company?.logo || `https://s3.goapi.io/logo/${item.symbol}.jpg`
      };
    });

    if (activeFilter === "GAINERS") mapped = mapped.filter(s => s.change > 0);
    if (activeFilter === "LOSERS") mapped = mapped.filter(s => s.change < 0);

    return mapped.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [rawStocks, getCompany, activeFilter, sortKey, sortDir]);

  const handleAddSymbol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWatchlist) return;

    const newSym = inputSymbol.trim().toUpperCase();
    if (!newSym) return;
    
    if (activeWatchlist.symbols.length >= 20) {
      setInputError(`Watchlist "${activeWatchlist.name}" sudah mencapai batas (20 Saham).`);
      return;
    }
    
    const masterDataCount = Object.keys(useCompanyStore.getState().companies).length;
    if (masterDataCount > 0) {
      const isExistInMarket = getCompany(newSym);
      if (!isExistInMarket) {
        setInputError(`Kode emiten ${newSym} tidak terdaftar di bursa.`);
        return;
      }
    }

    if (activeWatchlist.symbols.includes(newSym)) {
      setInputError(`Saham ${newSym} sudah ada di Watchlist ini.`);
      return;
    }

    const updatedLists = watchlists.map(w => 
      w.id === activeListId ? { ...w, symbols: [...w.symbols, newSym] } : w
    );
    
    saveWatchlists(updatedLists);
    setInputSymbol("");
    setInputError(null);
  };

  const handleAddWatchlist = () => {
    if (watchlists.length >= 20) {
      alert("Batas Maksimal 20 Grup Watchlist telah tercapai!");
      setShowNewListInput(false);
      return;
    }

    const trimmedName = newListName.trim();
    if (!trimmedName) {
      setShowNewListInput(false);
      return;
    }
    
    const newList: WatchlistGroup = {
      id: `list_${Date.now()}`,
      name: trimmedName,
      symbols: []
    };

    saveWatchlists([...watchlists, newList]);
    setActiveListId(newList.id);
    setNewListName("");
    setShowNewListInput(false);
  };

  const handleRenameSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = editListName.trim();
    
    if (!trimmedName || !editingListId) {
      setEditingListId(null);
      return;
    }

    const updatedLists = watchlists.map(w => 
      w.id === editingListId ? { ...w, name: trimmedName } : w
    );

    saveWatchlists(updatedLists);
    setEditingListId(null);
  };

  // --- TRIGGER MODAL DELETE ---
  const triggerDeleteGroup = () => {
    if (watchlists.length <= 1) return;
    setDeleteModal({ isOpen: true, type: 'GROUP', targetId: activeListId, targetName: activeWatchlist.name });
  };

  const triggerDeleteSymbol = (symbol: string) => {
    setDeleteModal({ isOpen: true, type: 'SYMBOL', targetId: symbol, targetName: symbol });
  };

  // --- EKSEKUSI DELETE DARI MODAL ---
  const confirmDeleteAction = () => {
    if (deleteModal.type === 'GROUP') {
      const updatedLists = watchlists.filter(w => w.id !== deleteModal.targetId);
      saveWatchlists(updatedLists);
      setActiveListId(updatedLists[0].id);
    } else if (deleteModal.type === 'SYMBOL') {
      const updatedLists = watchlists.map(w => 
        w.id === activeListId ? { ...w, symbols: w.symbols.filter(s => s !== deleteModal.targetId) } : w
      );
      saveWatchlists(updatedLists);
    }
    closeDeleteModal();
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, type: null, targetId: null, targetName: "" });
  };

  const handleSort = (key: SortKey) => {
    setSortDir(sortKey === key && sortDir === 'asc' ? 'desc' : 'asc');
    setSortKey(key);
  };

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={12} className="text-neutral-600 ml-1" />;
    return sortDir === 'asc' ? <ArrowUp size={12} className="text-[#10b981] ml-1" /> : <ArrowDown size={12} className="text-[#ef4444] ml-1" />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-42px)] overflow-hidden p-4 relative">
      
      {/* TABS MULTI-WATCHLIST */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto hide-scrollbar shrink-0 pb-1">
        {watchlists.map(w => (
          editingListId === w.id ? (
            <form key={`edit-${w.id}`} onSubmit={handleRenameSubmit} className="flex items-center shrink-0">
              <input
                autoFocus
                value={editListName}
                onChange={e => setEditListName(e.target.value)}
                onBlur={() => handleRenameSubmit()}
                className="bg-[#1e1e1e] border border-[#ff4d94] focus:shadow-[0_0_10px_rgba(255,77,148,0.2)] text-white text-[12px] font-bold px-4 py-1.5 rounded-full w-[140px] outline-none transition-all placeholder-neutral-600"
                maxLength={15}
                placeholder="Nama Watchlist..."
              />
            </form>
          ) : (
            <button
              key={w.id}
              onClick={() => setActiveListId(w.id)}
              className={`px-5 py-2 rounded-full text-[12px] font-bold whitespace-nowrap transition-all duration-300 ${
                activeListId === w.id
                  ? "bg-gradient-to-r from-[#ff4d94] to-[#ff79b0] text-white border border-transparent shadow-[0_4px_12px_rgba(255,77,148,0.3)] transform scale-[1.02]"
                  : "bg-transparent text-neutral-400 border border-[#b45309]/80 hover:bg-[#b45309]/10 hover:text-white"
              }`}
            >
              {w.name}
            </button>
          )
        ))}
        
        {!showNewListInput ? (
          watchlists.length < 20 && (
            <button 
              onClick={() => setShowNewListInput(true)} 
              className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shrink-0 hover:bg-neutral-200 transition-colors shadow-sm ml-1"
              title="Buat Watchlist Baru"
            >
              <Plus size={18} strokeWidth={3.5} />
            </button>
          )
        ) : (
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAddWatchlist(); }} 
            className="flex items-center ml-1 shrink-0"
          >
            <input
              type="text"
              autoFocus
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onBlur={() => { if (!newListName.trim()) setShowNewListInput(false); }}
              className="bg-[#1e1e1e] border border-[#ff4d94] focus:shadow-[0_0_10px_rgba(255,77,148,0.2)] text-white text-[12px] font-bold px-4 py-1.5 rounded-full w-[140px] outline-none transition-all placeholder-neutral-600"
              placeholder="Nama Kustom..."
              maxLength={15}
            />
          </form>
        )}
      </div>

      {/* KONTROL ATAS */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 shrink-0 border-b border-[#2d2d2d] mb-4">
        
        <div className="flex flex-col relative">
          <form onSubmit={handleAddSymbol} className="flex items-center gap-2">
            <div className={`flex items-center bg-[#1e1e1e] border ${inputError ? 'border-[#ef4444]' : 'border-[#2d2d2d]'} rounded-full px-3 py-1.5 focus-within:border-[#10b981] transition-colors w-[220px]`}>
              <Search size={14} className="text-neutral-500 mr-2 shrink-0" />
              <input 
                type="text" 
                value={inputSymbol}
                onChange={(e) => {
                  setInputSymbol(e.target.value.toUpperCase());
                  setInputError(null);
                }}
                placeholder={`TAMBAH KE "${activeWatchlist?.name.toUpperCase()}"`}
                className="bg-transparent text-white font-bold outline-none w-full placeholder-neutral-600 uppercase text-[11px]"
                maxLength={4}
                disabled={activeSymbols.length >= 20}
              />
            </div>
            <button 
              type="submit"
              disabled={!inputSymbol || activeSymbols.length >= 20}
              className="bg-gradient-to-r from-[#10b981] to-[#34d399] text-white p-1.5 rounded-full hover:shadow-[0_4px_15px_rgba(52,211,153,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Plus size={18} />
            </button>
          </form>
          {inputError && (
            <div className="absolute top-full mt-1.5 left-0 flex items-center gap-1 text-[#ef4444] text-[9px] font-bold bg-[#ef4444]/10 px-2 py-1 rounded z-50">
              <AlertCircle size={10} /> {inputError}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 bg-[#1e1e1e] px-3 py-1.5 rounded-full border border-[#2d2d2d]">
            <Activity size={14} className="text-[#06b6d4]" />
            <span className="truncate max-w-[120px]" title={activeWatchlist?.name}>{activeWatchlist?.name}</span>
            <span className="text-neutral-600 ml-1">({activeSymbols.length}/20)</span>
            
            <div 
              onClick={() => { setEditingListId(activeListId); setEditListName(activeWatchlist?.name || ""); }}
              className="ml-2 border-l border-[#2d2d2d] pl-2 cursor-pointer hover:text-[#06b6d4] transition-colors flex items-center"
              title={`Ganti Nama ${activeWatchlist?.name}`}
            >
              <Edit2 size={13} strokeWidth={2.5} />
            </div>

            {watchlists.length > 1 && (
              <div 
                // TRIGGER POPUP CUSTOM
                onClick={triggerDeleteGroup}
                className="ml-1.5 border-l border-[#2d2d2d] pl-2 cursor-pointer hover:text-[#ef4444] transition-colors flex items-center"
                title={`Hapus Watchlist ${activeWatchlist?.name}`}
              >
                <Trash2 size={13} strokeWidth={2.5} />
              </div>
            )}
          </div>

          <div className="flex bg-[#1e1e1e] p-1 rounded-full border border-[#2d2d2d]">
            <button 
              onClick={() => setActiveFilter("ALL")}
              className={`px-4 py-1 rounded-full text-[10px] font-bold transition-colors ${activeFilter === "ALL" ? "bg-[#2d2d2d] text-white" : "text-neutral-500 hover:text-white"}`}
            >
              All
            </button>
            <button 
              onClick={() => setActiveFilter("GAINERS")}
              className={`px-4 py-1 rounded-full text-[10px] font-bold transition-colors ${activeFilter === "GAINERS" ? "bg-[#10b981]/20 text-[#10b981]" : "text-neutral-500 hover:text-[#10b981]"}`}
            >
              Gainers
            </button>
            <button 
              onClick={() => setActiveFilter("LOSERS")}
              className={`px-4 py-1 rounded-full text-[10px] font-bold transition-colors ${activeFilter === "LOSERS" ? "bg-[#ef4444]/20 text-[#ef4444]" : "text-neutral-500 hover:text-[#ef4444]"}`}
            >
              Losers
            </button>
          </div>
        </div>

      </div>

      {/* TABEL DATA UTAMA WATCHLIST */}
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-xl flex-1 flex flex-col overflow-hidden shadow-lg relative">
        
        <div className="grid grid-cols-[3fr_2fr_3fr_2fr_2fr_40px] gap-2 px-4 py-3 bg-[#1e1e1e]/50 border-b border-[#2d2d2d] text-[10px] font-bold text-neutral-400 shrink-0 select-none uppercase tracking-wider">
          <div className="flex items-center cursor-pointer group hover:text-white" onClick={() => handleSort('symbol')}>
            Company {getSortIcon('symbol')}
          </div>
          <div className="flex items-center justify-end cursor-pointer group hover:text-white" onClick={() => handleSort('percent')}>
            Price & Chg {getSortIcon('percent')}
          </div>
          <div className="flex items-center justify-center text-center">
            Intraday Range (OHLC)
          </div>
          <div className="flex items-center justify-end cursor-pointer group hover:text-white" onClick={() => handleSort('volume')}>
            Volume {getSortIcon('volume')}
          </div>
          <div className="flex items-center justify-end cursor-pointer group hover:text-white" onClick={() => handleSort('value')}>
            Turnover {getSortIcon('value')}
          </div>
          <div className="flex items-center justify-center">
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {!isInitialized || (isLoading && !rawStocks) ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <div className="w-6 h-6 border-2 border-[#ff4d94] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[#ff4d94] text-xs font-bold animate-pulse">Menyelaraskan {activeWatchlist?.name}...</span>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-full text-[#ef4444] text-xs font-medium">{error.message}</div>
          ) : activeSymbols.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-neutral-500 text-xs font-medium space-y-2">
              <Star size={32} className="text-neutral-700" />
              <span>Daftar &quot;{activeWatchlist?.name}&quot; masih kosong.</span>
              <span>Ketik kode saham di atas untuk menambahkan (Maks 20).</span>
            </div>
          ) : filteredStocks.length === 0 ? (
             <div className="flex justify-center items-center h-full text-neutral-500 text-xs font-medium">Tidak ada saham yang sesuai dengan filter.</div>
          ) : (
            filteredStocks.map((stock) => {
              
              const rangeDiff = stock.high - stock.low;
              let openPercent = 0;
              let closePercent = 0;

              if (rangeDiff > 0) {
                openPercent = ((stock.open - stock.low) / rangeDiff) * 100;
                closePercent = ((stock.price - stock.low) / rangeDiff) * 100;
              } else {
                openPercent = 50; closePercent = 50;
              }

              const isIntradayUp = stock.price >= stock.open;
              const bodyColor = isIntradayUp ? 'bg-[#10b981]' : 'bg-[#ef4444]';
              
              const fillLeft = Math.min(openPercent, closePercent);
              const fillWidth = Math.max(Math.abs(closePercent - openPercent), 2);

              return (
                <div key={stock.symbol} className="grid grid-cols-[3fr_2fr_3fr_2fr_2fr_40px] gap-2 px-4 py-2.5 border-b border-[#2d2d2d]/50 hover:bg-[#1e1e1e] transition-colors items-center group">
                  
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-neutral-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={stock.logoUrl} alt={stock.symbol} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = 'https://s3.goapi.io/logo/IHSG.jpg'; }} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-[13px] tabular-nums tracking-tight group-hover:text-[#ff4d94] transition-colors">{stock.symbol}</span>
                      <span className="text-neutral-400 text-[10px] truncate max-w-[150px]">{stock.name}</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center items-end tabular-nums">
                    <span className="text-white font-bold text-[13px]">{stock.price.toLocaleString("id-ID")}</span>
                    <span className={`text-[10px] font-bold ${stock.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                      {stock.change > 0 ? "+" : ""}{stock.change.toLocaleString("id-ID")} ({stock.change > 0 ? "+" : ""}{stock.percent.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="flex items-center justify-center px-4 relative cursor-crosshair group/ohlc">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover/ohlc:flex bg-[#1e1e1e] border border-[#2d2d2d] text-white text-[9px] px-2 py-1 rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] whitespace-nowrap z-[100]">
                      O: {stock.open.toLocaleString('id-ID')} | H: {stock.high.toLocaleString('id-ID')} | L: {stock.low.toLocaleString('id-ID')} | C: {stock.price.toLocaleString('id-ID')}
                    </div>

                    <span className="text-[10px] font-medium text-neutral-500 mr-2 w-8 text-right tabular-nums">{stock.low}</span>
                    
                    <div className="flex-1 h-1.5 bg-[#2d2d2d] rounded-full relative shadow-inner overflow-hidden flex items-center">
                      {rangeDiff > 0 ? (
                        <>
                          <div 
                            className={`absolute h-full ${bodyColor} opacity-90`}
                            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
                          />
                          <div 
                            className="absolute h-[150%] w-[2px] bg-white z-10 rounded-sm"
                            style={{ left: `${openPercent}%`, transform: 'translateX(-50%)' }}
                          />
                        </>
                      ) : (
                        <div className={`absolute h-[150%] w-[3px] ${bodyColor} z-10 rounded-sm`} style={{ left: '50%', transform: 'translateX(-50%)' }} />
                      )}
                    </div>

                    <span className="text-[10px] font-medium text-neutral-500 ml-2 w-8 text-left tabular-nums">{stock.high}</span>
                  </div>

                  <div className="flex flex-col justify-center items-end tabular-nums">
                    <span className="text-neutral-200 font-bold text-[12px]">{formatNumber(stock.volume)}</span>
                    <span className="text-neutral-500 text-[9px] font-medium uppercase tracking-wider">Shares</span>
                  </div>

                  <div className="flex flex-col justify-center items-end tabular-nums">
                    <span className="text-white font-bold text-[12px]">{formatNumber(stock.value)}</span>
                    <span className="text-neutral-500 text-[9px] font-medium uppercase tracking-wider">IDR</span>
                  </div>

                  <div className="flex items-center justify-center">
                    <button 
                      // TRIGGER POPUP CUSTOM
                      onClick={() => triggerDeleteSymbol(stock.symbol)}
                      className="p-1.5 bg-[#ef4444]/10 text-[#ef4444] rounded-md opacity-0 group-hover:opacity-100 hover:bg-[#ef4444] hover:text-white transition-all duration-200"
                      title={`Hapus ${stock.symbol} dari Watchlist`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* --- CUSTOM MODAL DELETE MODERN (BACKDROP BLUR) --- */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
            
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-[#ef4444]/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={28} className="text-[#ef4444]" />
              </div>
              
              <h3 className="text-white text-lg font-bold mb-2">
                {deleteModal.type === 'GROUP' ? "Hapus Watchlist?" : "Hapus Saham?"}
              </h3>
              
              <p className="text-neutral-400 text-[13px] mb-6 leading-relaxed">
                {deleteModal.type === 'GROUP' 
                  ? <>Apakah Anda yakin ingin menghapus keseluruhan grup <b>{deleteModal.targetName}</b>? Tindakan ini tidak dapat dibatalkan.</>
                  : <>Apakah Anda yakin ingin menghapus <b>{deleteModal.targetName}</b> dari daftar pantauan?</>
                }
              </p>
              
              <div className="flex items-center w-full gap-3">
                <button 
                  onClick={closeDeleteModal}
                  className="flex-1 py-2.5 rounded-xl border border-[#2d2d2d] text-neutral-300 font-bold text-[12px] hover:bg-[#2d2d2d] hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDeleteAction}
                  className="flex-1 py-2.5 rounded-xl bg-[#ef4444] text-white font-bold text-[12px] hover:bg-[#dc2626] shadow-[0_4px_12px_rgba(239,68,68,0.3)] transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>

            {/* Tombol X (Close) Sudut Atas */}
            <button 
              onClick={closeDeleteModal}
              className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}