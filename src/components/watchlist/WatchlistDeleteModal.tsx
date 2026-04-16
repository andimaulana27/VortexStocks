"use client";

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { DeleteModalState } from '@/type/watchlist';

interface WatchlistDeleteModalProps {
  deleteModal: DeleteModalState;
  closeDeleteModal: () => void;
  confirmDeleteAction: () => void;
}

export default function WatchlistDeleteModal({
  deleteModal, closeDeleteModal, confirmDeleteAction
}: WatchlistDeleteModalProps) {
  
  if (!deleteModal.isOpen) return null;

  return (
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

        {/* Tombol X (Close) */}
        <button 
          onClick={closeDeleteModal}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}