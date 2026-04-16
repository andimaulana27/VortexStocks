"use client";

import React, { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { useCompanyStore } from '@/store/useCompanyStore';

// Import Types & Komponen
import { 
  StockData, SortKey, SortDirection, GoApiPriceItem, 
  WatchlistGroup, DeleteModalState 
} from '@/type/watchlist';
import WatchlistTabs from '@/components/watchlist/WatchlistTabs';
import WatchlistHeader from '@/components/watchlist/WatchlistHeader';
import WatchlistChart from '@/components/watchlist/WatchlistChart'; // <--- IMPORT BARU
import WatchlistTable from '@/components/watchlist/WatchlistTable';
import WatchlistDeleteModal from '@/components/watchlist/WatchlistDeleteModal';

const DEFAULT_WATCHLIST = ["BBCA", "BBRI", "BMRI", "BBNI", "GOTO", "TLKM", "ASII"];

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
  const [watchlists, setWatchlists] = useState<WatchlistGroup[]>([]);
  const [activeListId, setActiveListId] = useState<string>("default");
  
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [inputSymbol, setInputSymbol] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "GAINERS" | "LOSERS">("ALL");

  const [sortKey, setSortKey] = useState<SortKey>('percent');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState("");

  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ 
    isOpen: false, type: null, targetId: null, targetName: "" 
  });

  const getCompany = useCompanyStore(state => state.getCompany);

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

  const triggerDeleteGroup = () => {
    if (watchlists.length <= 1) return;
    setDeleteModal({ isOpen: true, type: 'GROUP', targetId: activeListId, targetName: activeWatchlist.name });
  };

  const triggerDeleteSymbol = (symbol: string) => {
    setDeleteModal({ isOpen: true, type: 'SYMBOL', targetId: symbol, targetName: symbol });
  };

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

  return (
    <div className="flex flex-col h-[calc(100vh-42px)] overflow-hidden p-4 relative overflow-y-auto hide-scrollbar">
      
      <WatchlistTabs 
        watchlists={watchlists}
        activeListId={activeListId}
        setActiveListId={setActiveListId}
        editingListId={editingListId}
        editListName={editListName}
        setEditListName={setEditListName}
        handleRenameSubmit={handleRenameSubmit}
        showNewListInput={showNewListInput}
        setShowNewListInput={setShowNewListInput}
        newListName={newListName}
        setNewListName={setNewListName}
        handleAddWatchlist={handleAddWatchlist}
      />

      <WatchlistHeader 
        activeWatchlist={activeWatchlist}
        watchlistsCount={watchlists.length}
        inputSymbol={inputSymbol}
        setInputSymbol={setInputSymbol}
        inputError={inputError}
        setInputError={setInputError}
        handleAddSymbol={handleAddSymbol}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        setEditingListId={setEditingListId}
        setEditListName={setEditListName}
        triggerDeleteGroup={triggerDeleteGroup}
      />

      {/* --- INJEKSI KOMPONEN CHART BARU --- */}
      <WatchlistChart activeSymbols={activeSymbols} />
      {/* ---------------------------------- */}

      <WatchlistTable 
        isInitialized={isInitialized}
        isLoading={isLoading}
        error={error}
        hasRawStocksData={!!rawStocks}
        activeWatchlist={activeWatchlist}
        filteredStocks={filteredStocks}
        sortKey={sortKey}
        sortDir={sortDir}
        handleSort={handleSort}
        triggerDeleteSymbol={triggerDeleteSymbol}
      />

      <WatchlistDeleteModal 
        deleteModal={deleteModal}
        closeDeleteModal={closeDeleteModal}
        confirmDeleteAction={confirmDeleteAction}
      />

    </div>
  );
}