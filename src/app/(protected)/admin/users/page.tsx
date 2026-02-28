// Lokasi baru yang benar: src/app/(protected)/admin/users/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { Users, Shield, ShieldAlert } from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: string;
  subscription_status: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchUsers = async () => {
    setIsLoading(true);
    
    // Ambil ID user yang sedang login untuk proteksi
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    // Mengambil semua data profil pengguna
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data as UserProfile[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fungsi untuk mengubah Role (Admin / User)
  const toggleRole = async (userId: string, currentRole: string) => {
    // PROTEKSI: Mencegah admin men-downgrade dirinya sendiri
    if (userId === currentUserId) {
      alert("Aksi ditolak: Anda tidak bisa mengubah atau menurunkan hak akses akun Anda sendiri saat sedang login.");
      return;
    }

    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmMsg = newRole === 'admin' 
      ? "Jadikan pengguna ini sebagai Super Admin?" 
      : "Turunkan pengguna ini menjadi User biasa?";
      
    if (!confirm(confirmMsg)) return;

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) fetchUsers(); 
  };

  // Fungsi untuk mengubah status Subscription (Whale / Pro / None)
  const changeSubscription = async (userId: string, newStatus: string) => {
    const { error } = await supabase.from('profiles').update({ subscription_status: newStatus }).eq('id', userId);
    if (!error) fetchUsers(); 
  };

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-[#06b6d4]" size={28} /> Manajemen Pengguna
        </h1>
        <p className="text-neutral-400 text-sm mt-1">Atur hak akses, langganan, dan data profil member VorteStocks.</p>
      </div>

      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-xl overflow-hidden">
        
        {/* TABLE HEADER */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#1e1e1e] border-b border-[#2d2d2d] text-xs font-bold text-neutral-400 uppercase tracking-wider">
          <div className="col-span-4">Informasi Pengguna</div>
          <div className="col-span-3 text-center">Hak Akses (Role)</div>
          <div className="col-span-3 text-center">Status Langganan</div>
          <div className="col-span-2 text-center">Bergabung</div>
        </div>

        {/* TABLE BODY */}
        {isLoading ? (
          <div className="p-10 text-center text-neutral-500 animate-pulse">Memuat data pengguna...</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">Belum ada pengguna terdaftar.</div>
        ) : (
          <div className="divide-y divide-[#2d2d2d]">
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[#1e1e1e]/50 transition-colors">
                
                {/* Kolom 1: Info Profil & Avatar */}
                <div className="col-span-4 flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 relative rounded-full overflow-hidden border border-[#2d2d2d] bg-neutral-800 flex items-center justify-center">
                    {user.avatar_url ? (
                      <Image 
                        src={user.avatar_url} 
                        alt="Avatar" 
                        fill
                        className="object-cover"
                        unoptimized 
                      />
                    ) : (
                      <span className="text-white font-bold text-sm uppercase">{user.full_name?.charAt(0) || user.email.charAt(0)}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-white font-bold text-sm truncate">{user.full_name || 'Tanpa Nama'}</p>
                    <p className="text-neutral-500 text-xs truncate">{user.email}</p>
                  </div>
                </div>

                {/* Kolom 2: Hak Akses (Role Toggle) */}
                <div className="col-span-3 flex justify-center">
                  <button 
                    onClick={() => toggleRole(user.id, user.role)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      user.role === 'admin' 
                        ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30 hover:bg-[#ef4444] hover:text-white' 
                        : 'bg-[#1e1e1e] text-neutral-400 border-[#2d2d2d] hover:border-[#06b6d4] hover:text-[#06b6d4]'
                    } ${user.id === currentUserId ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
                    title={user.id === currentUserId ? 'Anda tidak bisa mengubah role Anda sendiri' : ''}
                  >
                    {user.role === 'admin' ? <ShieldAlert size={14} /> : <Shield size={14} />}
                    {user.role === 'admin' ? 'Super Admin' : 'User Biasa'}
                  </button>
                </div>

                {/* Kolom 3: Status Langganan (Dropdown Interaktif) */}
                <div className="col-span-3 flex justify-center">
                  <select
                    value={user.subscription_status}
                    onChange={(e) => changeSubscription(user.id, e.target.value)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full outline-none border cursor-pointer appearance-none text-center ${
                      user.subscription_status === 'whale' 
                        ? 'bg-gradient-to-r from-[#10b981] to-[#06b6d4] text-white border-transparent'
                        : user.subscription_status === 'pro'
                        ? 'bg-gradient-to-r from-[#f97316] to-[#fbbf24] text-white border-transparent'
                        : 'bg-[#1e1e1e] text-neutral-400 border-[#2d2d2d] hover:border-neutral-500'
                    }`}
                  >
                    <option value="none" className="bg-[#121212] text-white">Guest (None)</option>
                    <option value="pro" className="bg-[#121212] text-[#f97316]">Pro Trader</option>
                    <option value="whale" className="bg-[#121212] text-[#10b981]">Whale (Tier-1)</option>
                  </select>
                </div>

                {/* Kolom 4: Tanggal Bergabung */}
                <div className="col-span-2 text-center text-neutral-400 text-xs font-medium">
                  {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}