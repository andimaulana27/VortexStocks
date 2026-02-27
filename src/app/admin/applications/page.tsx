// src/app/admin/applications/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { CheckCircle, XCircle, Eye, Clock, ShieldCheck } from 'lucide-react';

interface Application {
  id: string;
  user_id: string;
  estimated_balance: number;
  portfolio_image_url: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Inisialisasi client Supabase
  const supabase = createClient();

  // Fungsi fetch standar tanpa useCallback agar terhindar dari cascading re-renders
  const fetchApplications = async () => {
    // Pastikan loading aktif saat mengambil atau merefresh data
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('screening_applications')
      .select(`
        *,
        profiles ( full_name, email, avatar_url )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data as unknown as Application[]);
    }
    
    setIsLoading(false);
  };

  // Gunakan dependency array kosong [] agar dipanggil tepat SATU KALI saat komponen mount
  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (appId: string, userId: string, action: 'approved' | 'rejected') => {
    if (!confirm(`Apakah Anda yakin ingin me-${action} pendaftar ini?`)) return;

    setIsLoading(true);

    await supabase.from('screening_applications').update({ status: action }).eq('id', appId);

    if (action === 'approved') {
      await supabase.from('profiles').update({ subscription_status: 'whale' }).eq('id', userId);
    }

    // Refresh data setelah action berhasil
    fetchApplications();
  };

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="text-[#10b981]" size={28} /> Review Pendaftar Whale
        </h1>
        <p className="text-neutral-400 text-sm mt-1">Kelola antrean verifikasi portofolio dari pendaftar baru.</p>
      </div>

      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-xl overflow-hidden">
        
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#1e1e1e] border-b border-[#2d2d2d] text-xs font-bold text-neutral-400 uppercase tracking-wider">
          <div className="col-span-3">User Info</div>
          <div className="col-span-2 text-right">Klaim Saldo (Rp)</div>
          <div className="col-span-3 text-center">Bukti Portofolio</div>
          <div className="col-span-2 text-center">Tanggal Daftar</div>
          <div className="col-span-2 text-center">Aksi</div>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="p-10 text-center text-neutral-500 animate-pulse">Memuat data pendaftar...</div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center text-neutral-500 flex flex-col items-center">
            <Clock size={40} className="mb-3 opacity-50" />
            <p>Tidak ada pendaftar yang mengantre saat ini.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2d2d2d]">
            {applications.map((app) => (
              <div key={app.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[#1e1e1e]/50 transition-colors">
                
                {/* Kolom 1: Profil */}
                <div className="col-span-3 flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 relative rounded-full overflow-hidden border border-[#2d2d2d]">
                    <Image 
                      src={app.profiles.avatar_url || `https://ui-avatars.com/api/?name=${app.profiles.full_name}&background=10b981&color=fff`} 
                      alt="Avatar" 
                      fill
                      className="object-cover"
                      unoptimized 
                    />
                  </div>
                  <div className="truncate">
                    <p className="text-white font-bold text-sm truncate">{app.profiles.full_name || 'Tanpa Nama'}</p>
                    <p className="text-neutral-500 text-xs truncate">{app.profiles.email}</p>
                  </div>
                </div>

                {/* Kolom 2: Nominal */}
                <div className="col-span-2 text-right font-bold text-[#10b981]">
                  {Number(app.estimated_balance).toLocaleString('id-ID')}
                </div>

                {/* Kolom 3: Foto Portofolio */}
                <div className="col-span-3 flex justify-center">
                  <a href={app.portfolio_image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-1.5 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#06b6d4] text-[#06b6d4] rounded-full text-xs font-bold transition-all">
                    <Eye size={14} /> Lihat Foto
                  </a>
                </div>

                {/* Kolom 4: Waktu */}
                <div className="col-span-2 text-center text-neutral-400 text-xs font-medium">
                  {new Date(app.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                {/* Kolom 5: Aksi (Approve/Reject) */}
                <div className="col-span-2 flex justify-center gap-2">
                  <button onClick={() => handleAction(app.id, app.user_id, 'approved')} className="p-2 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981] hover:text-white rounded-lg transition-colors" title="Terima Pendaftar">
                    <CheckCircle size={18} />
                  </button>
                  <button onClick={() => handleAction(app.id, app.user_id, 'rejected')} className="p-2 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444] hover:text-white rounded-lg transition-colors" title="Tolak Pendaftar">
                    <XCircle size={18} />
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}