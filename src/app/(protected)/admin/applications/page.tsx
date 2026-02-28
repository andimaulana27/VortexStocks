// src/app/(protected)/admin/applications/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { CheckCircle, XCircle, Eye, Clock, ShieldCheck, Phone, MapPin } from 'lucide-react';

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
    phone_number: string | null;
    address: string | null;
  };
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // STATE BARU: Digunakan sebagai trigger/pemicu agar useEffect memuat ulang data
  const [refreshKey, setRefreshKey] = useState(0); 
  
  const supabase = createClient();

  // Logika fetch dimasukkan ke DALAM useEffect agar Linter React tidak protes
  useEffect(() => {
    let isMounted = true; // Flag untuk mencegah "memory leak" atau state update saat unmount

    const loadData = async () => {
      const { data, error } = await supabase
        .from('screening_applications')
        .select(`
          *,
          profiles ( full_name, email, avatar_url, phone_number, address )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Hanya update state jika komponen masih aktif (mounted)
      if (isMounted) {
        if (!error && data) {
          setApplications(data as unknown as Application[]);
        } else if (error) {
          console.error("Gagal mengambil data aplikasi:", error.message);
        }
        setIsLoading(false);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [refreshKey, supabase]); // Efek ini akan berjalan ulang SETIAP KALI refreshKey berubah

  const handleAction = async (appId: string, action: 'approved' | 'rejected') => {
    const actionText = action === 'approved' ? 'MENYETUJUI' : 'MENOLAK';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} portofolio pendaftar ini?`)) return;

    setIsLoading(true);

    const { error: appError } = await supabase
      .from('screening_applications')
      .update({ status: action })
      .eq('id', appId);

    if (appError) {
      alert(`Gagal memproses: ${appError.message}`);
      setIsLoading(false);
    } else {
      // FIX UTAMA: Ubah angka refreshKey, yang otomatis memicu useEffect untuk menarik data baru
      setRefreshKey((prev) => prev + 1);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="text-[#10b981]" size={28} /> Review Portofolio Pendaftar
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Pendaftar yang disetujui di sini akan diarahkan ke halaman Pemilihan Paket & Pembayaran.
        </p>
      </div>

      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-xl overflow-hidden">
        
        {/* TABLE HEADER */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#1e1e1e] border-b border-[#2d2d2d] text-xs font-bold text-neutral-400 uppercase tracking-wider">
          <div className="col-span-4">Informasi Pendaftar</div>
          <div className="col-span-2 text-right">Klaim Saldo (Rp)</div>
          <div className="col-span-2 text-center">Bukti Portofolio</div>
          <div className="col-span-2 text-center">Tanggal Daftar</div>
          <div className="col-span-2 text-center">Aksi</div>
        </div>

        {/* TABLE BODY */}
        {isLoading ? (
          <div className="p-10 text-center text-neutral-500 animate-pulse">Memuat antrean...</div>
        ) : applications.length === 0 ? (
          <div className="p-10 text-center text-neutral-500 flex flex-col items-center">
            <Clock size={40} className="mb-3 opacity-20 text-[#10b981]" />
            <p className="font-medium">Tidak ada pendaftar yang mengantre saat ini.</p>
            <p className="text-xs mt-1 opacity-60">Semua aplikasi sudah diproses.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2d2d2d]">
            {applications.map((app) => (
              <div key={app.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[#1e1e1e]/50 transition-colors">
                
                {/* Kolom 1: Profil (Ditambah No HP & Domisili) */}
                <div className="col-span-4 flex items-start gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 mt-1 relative rounded-full overflow-hidden border border-[#2d2d2d] bg-neutral-800 flex items-center justify-center">
                    {app.profiles?.avatar_url ? (
                      <Image 
                        src={app.profiles.avatar_url} 
                        alt="Avatar" 
                        fill
                        className="object-cover"
                        unoptimized 
                      />
                    ) : (
                      <span className="text-white font-bold text-sm uppercase">
                        {app.profiles?.full_name?.charAt(0) || app.profiles?.email?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-white font-bold text-sm truncate">{app.profiles?.full_name || 'Tanpa Nama'}</p>
                    <p className="text-neutral-500 text-xs truncate mb-1">{app.profiles?.email}</p>
                    
                    <div className="flex flex-col gap-0.5 text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1">
                        <Phone size={10} className="text-[#06b6d4]" /> {app.profiles?.phone_number || '-'}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin size={10} className="text-[#06b6d4]" /> {app.profiles?.address || '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kolom 2: Nominal Saldo */}
                <div className="col-span-2 text-right font-bold text-[#10b981]">
                  {Number(app.estimated_balance).toLocaleString('id-ID')}
                </div>

                {/* Kolom 3: Link Foto Portofolio */}
                <div className="col-span-2 flex justify-center">
                  <a 
                    href={app.portfolio_image_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center justify-center w-10 h-10 bg-[#1e1e1e] border border-[#2d2d2d] hover:border-[#06b6d4] text-[#06b6d4] hover:bg-[#06b6d4]/10 rounded-xl transition-all"
                    title="Lihat Gambar"
                  >
                    <Eye size={18} />
                  </a>
                </div>

                {/* Kolom 4: Waktu Pendaftaran */}
                <div className="col-span-2 text-center text-neutral-400 text-xs font-medium">
                  {new Date(app.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                {/* Kolom 5: Aksi (Approve/Reject) */}
                <div className="col-span-2 flex justify-center gap-3">
                  <button 
                    onClick={() => handleAction(app.id, 'approved')} 
                    className="p-2.5 bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981] hover:text-white rounded-lg transition-all hover:scale-110 border border-[#10b981]/20" 
                    title="Setujui Portofolio (Arahkan ke Pembayaran)"
                  >
                    <CheckCircle size={18} />
                  </button>
                  <button 
                    onClick={() => handleAction(app.id, 'rejected')} 
                    className="p-2.5 bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444] hover:text-white rounded-lg transition-all hover:scale-110 border border-[#ef4444]/20" 
                    title="Tolak Pendaftar (Minta Upload Ulang)"
                  >
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