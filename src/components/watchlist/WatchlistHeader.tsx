"use client";

import React from 'react';
import { Search, Plus, AlertCircle, Activity, Edit2, Trash2 } from 'lucide-react';
import { WatchlistGroup } from '@/type/watchlist';

interface WatchlistHeaderProps {
  activeWatchlist: WatchlistGroup | undefined;
  watchlistsCount: number;
  inputSymbol: string;
  setInputSymbol: (val: string) => void;
  inputError: string | null;
  setInputError: (err: string | null) => void;
  handleAddSymbol: (e: React.FormEvent) => void;
  activeFilter: "ALL" | "GAINERS" | "LOSERS";
  setActiveFilter: (filter: "ALL" | "GAINERS" | "LOSERS") => void;
  setEditingListId: (id: string) => void;
  setEditListName: (name: string) => void;
  triggerDeleteGroup: () => void;
}

export default function WatchlistHeader({
  activeWatchlist, watchlistsCount, inputSymbol, setInputSymbol, inputError,
  setInputError, handleAddSymbol, activeFilter, setActiveFilter, 
  setEditingListId, setEditListName, triggerDeleteGroup
}: WatchlistHeaderProps) {
  
  const activeSymbols = activeWatchlist?.symbols || [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 shrink-0 border-b border-[#2d2d2d] mb-4">
      {/* KOLOM PENCARIAN & TAMBAH */}
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

      {/* KONTROL & FILTER */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 bg-[#1e1e1e] px-3 py-1.5 rounded-full border border-[#2d2d2d]">
          <Activity size={14} className="text-[#06b6d4]" />
          <span className="truncate max-w-[120px]" title={activeWatchlist?.name}>{activeWatchlist?.name}</span>
          <span className="text-neutral-600 ml-1">({activeSymbols.length}/20)</span>
          
          <div 
            onClick={() => { if(activeWatchlist) { setEditingListId(activeWatchlist.id); setEditListName(activeWatchlist.name); } }}
            className="ml-2 border-l border-[#2d2d2d] pl-2 cursor-pointer hover:text-[#06b6d4] transition-colors flex items-center"
            title={`Ganti Nama ${activeWatchlist?.name}`}
          >
            <Edit2 size={13} strokeWidth={2.5} />
          </div>

          {watchlistsCount > 1 && (
            <div 
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
  );
}