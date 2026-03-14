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
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

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

  const toggleRole = async (userId: string, currentRole: string) => {
    if (userId === currentUserId) {
      alert("Aksi ditolak: Anda tidak bisa mengubah hak akses akun Anda sendiri.");
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

  return (
    <div className="p-6 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="text-[#06b6d4]" size={28} /> Manajemen Hak Akses
        </h1>
        <p className="text-neutral-400 text-sm mt-1">Atur hak akses admin dan data profil member. Untuk mengatur paket langganan, gunakan menu Manajemen Langganan.</p>
      </div>

      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl shadow-xl overflow-hidden">
        
        {/* TABLE HEADER (DIUBAH) */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[#1e1e1e] border-b border-[#2d2d2d] text-xs font-bold text-neutral-400 uppercase tracking-wider">
          <div className="col-span-6">Informasi Pengguna</div>
          <div className="col-span-3 text-center">Hak Akses (Role)</div>
          <div className="col-span-3 text-right">Bergabung</div>
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
                
                <div className="col-span-6 flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 shrink-0 relative rounded-full overflow-hidden border border-[#2d2d2d] bg-neutral-800 flex items-center justify-center">
                    {user.avatar_url ? (
                      <Image src={user.avatar_url} alt="Avatar" fill className="object-cover" unoptimized />
                    ) : (
                      <span className="text-white font-bold text-sm uppercase">{user.full_name?.charAt(0) || user.email.charAt(0)}</span>
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-white font-bold text-sm truncate">{user.full_name || 'Tanpa Nama'}</p>
                    <p className="text-neutral-500 text-xs truncate">{user.email}</p>
                  </div>
                </div>

                <div className="col-span-3 flex justify-center">
                  <button 
                    onClick={() => toggleRole(user.id, user.role)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      user.role === 'admin' 
                        ? 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30 hover:bg-[#ef4444] hover:text-white' 
                        : 'bg-[#1e1e1e] text-neutral-400 border-[#2d2d2d] hover:border-[#06b6d4] hover:text-[#06b6d4]'
                    } ${user.id === currentUserId ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
                  >
                    {user.role === 'admin' ? <ShieldAlert size={14} /> : <Shield size={14} />}
                    {user.role === 'admin' ? 'Super Admin' : 'User Biasa'}
                  </button>
                </div>

                <div className="col-span-3 text-right text-neutral-400 text-xs font-medium pr-2">
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