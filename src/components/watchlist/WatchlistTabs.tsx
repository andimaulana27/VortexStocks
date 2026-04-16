"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { WatchlistGroup } from '@/type/watchlist';

interface WatchlistTabsProps {
  watchlists: WatchlistGroup[];
  activeListId: string;
  setActiveListId: (id: string) => void;
  editingListId: string | null;
  // setEditingListId dihapus dari sini karena tidak terpakai
  editListName: string;
  setEditListName: (name: string) => void;
  handleRenameSubmit: (e?: React.FormEvent) => void;
  showNewListInput: boolean;
  setShowNewListInput: (show: boolean) => void;
  newListName: string;
  setNewListName: (name: string) => void;
  handleAddWatchlist: () => void;
}

export default function WatchlistTabs({
  watchlists, activeListId, setActiveListId, editingListId, 
  editListName, setEditListName, handleRenameSubmit, showNewListInput,
  setShowNewListInput, newListName, setNewListName, handleAddWatchlist
}: WatchlistTabsProps) {
  return (
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
  );
}