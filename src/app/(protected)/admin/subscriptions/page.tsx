'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Gem, Loader2, User, Calendar, Shield, Edit3, X, CheckCircle, Clock, XCircle, Search, Save } from 'lucide-react';

type PlanTier = 'free' | 'pro' | 'premium';
type SubStatus = 'active' | 'expired' | 'cancelled' | 'past_due';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UserSubscription {
  id: string;
  user_id: string;
  plan: PlanTier;
  status: SubStatus;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  profile?: Profile;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State untuk Modal Edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<UserSubscription | null>(null);
  const [editPlan, setEditPlan] = useState<PlanTier>('free');
  const [editStatus, setEditStatus] = useState<SubStatus>('active');
  const [editEndDate, setEditEndDate] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Ambil semua profil user
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profilesError) throw profilesError;

      // 2. Ambil semua data subscription
      const { data: subsData, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('*');

      if (subsError) throw subsError;

      // 3. Gabungkan data. Jika user belum punya row di user_subscriptions, anggap sebagai 'free'
      const combinedData: UserSubscription[] = (profilesData || []).map((profile) => {
        const userSub = (subsData || []).find(s => s.user_id === profile.id);
        
        if (userSub) {
          return { ...userSub, profile };
        } else {
          // Data default untuk user yang belum pernah langganan (Free)
          return {
            id: `temp-${profile.id}`,
            user_id: profile.id,
            plan: 'free',
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: null,
            auto_renew: false,
            profile: profile
          };
        }
      });

      setSubscriptions(combinedData);
    } catch (error) {
      console.error('Gagal memuat data langganan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditModal = (sub: UserSubscription) => {
    setSelectedSub(sub);
    setEditPlan(sub.plan);
    setEditStatus(sub.status);
    // Format tanggal untuk input type="date" (YYYY-MM-DD)
    setEditEndDate(sub.end_date ? new Date(sub.end_date).toISOString().split('T')[0] : '');
    setIsEditModalOpen(true);
  };

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setIsUpdating(true);

    try {
      const isTempRecord = selectedSub.id.startsWith('temp-');
      const payload = {
        user_id: selectedSub.user_id,
        plan: editPlan,
        status: editStatus,
        end_date: editEndDate ? new Date(editEndDate).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (isTempRecord) {
        // Insert baru jika user belum pernah punya record langganan
        const { error } = await supabase.from('user_subscriptions').insert([payload]);
        if (error) throw error;
      } else {
        // Update record yang sudah ada
        const { error } = await supabase.from('user_subscriptions').update(payload).eq('id', selectedSub.id);
        if (error) throw error;
      }

      alert('Paket langganan pengguna berhasil diperbarui!');
      setIsEditModalOpen(false);
      fetchData(); // Refresh data

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal memperbarui langganan: ' + errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredSubs = subscriptions.filter(sub => 
    sub.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.profile?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPlanBadge = (plan: PlanTier) => {
    if (plan === 'premium') return <span className="px-2.5 py-1 bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/20 rounded uppercase text-[10px] font-black tracking-widest">Premium</span>;
    if (plan === 'pro') return <span className="px-2.5 py-1 bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/20 rounded uppercase text-[10px] font-black tracking-widest">Pro</span>;
    return <span className="px-2.5 py-1 bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 rounded uppercase text-[10px] font-black tracking-widest">Free</span>;
  };

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar relative">
      
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gem className="text-[#06b6d4]" size={28} /> Manajemen Langganan User
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Pantau dan kelola paket berlangganan pengguna secara manual.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
          <input 
            type="text" 
            placeholder="Cari nama atau email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-full py-2 pl-9 pr-4 text-sm text-white focus:border-[#06b6d4] outline-none"
          />
        </div>
      </div>

      {/* Tabel Data */}
      <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-[#2d2d2d] text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Pengguna</th>
                <th className="p-4">Paket (Plan)</th>
                <th className="p-4">Status</th>
                <th className="p-4">Berakhir Pada</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d2d2d]">
              {isLoading ? (
                <tr><td colSpan={5} className="p-10 text-center"><Loader2 size={24} className="animate-spin text-[#06b6d4] mx-auto mb-2"/> Memuat data...</td></tr>
              ) : filteredSubs.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-neutral-500 font-medium">Pengguna tidak ditemukan.</td></tr>
              ) : (
                filteredSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#1e1e1e] transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#06b6d4] to-[#34d399] flex items-center justify-center text-white shrink-0 font-bold text-xs">
                          {sub.profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-[#06b6d4] transition-colors">{sub.profile?.full_name || 'Pengguna'}</p>
                          <p className="text-xs text-neutral-500">{sub.profile?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getPlanBadge(sub.plan)}</td>
                    <td className="p-4">
                      {sub.status === 'active' ? (
                         <span className="flex items-center gap-1.5 text-xs font-bold text-[#34d399]"><CheckCircle size={14}/> Aktif</span>
                      ) : sub.status === 'expired' ? (
                         <span className="flex items-center gap-1.5 text-xs font-bold text-[#ef4444]"><XCircle size={14}/> Expired</span>
                      ) : (
                         <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-500"><Clock size={14}/> {sub.status}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs text-neutral-300">
                        <Calendar size={14} className="text-neutral-500" />
                        {sub.end_date ? new Date(sub.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Selamanya (Free)'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => openEditModal(sub)} className="p-2 bg-[#2d2d2d] text-neutral-300 hover:text-white hover:bg-[#06b6d4] rounded-lg transition-colors flex justify-center mx-auto" title="Edit Langganan">
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL EDIT LANGGANAN ================= */}
      {isEditModalOpen && selectedSub && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between p-5 border-b border-[#2d2d2d] bg-[#1a1a1a]">
              <h3 className="text-white font-bold text-lg flex items-center gap-2"><Shield size={18} className="text-[#06b6d4]"/> Edit Akses Pengguna</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-500 hover:text-white transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleSaveUpdate} className="p-6 space-y-5">
              
              {/* Info User */}
              <div className="bg-[#121212] p-3 rounded-xl border border-[#2d2d2d] flex items-center gap-3">
                 <div className="p-2 bg-[#2d2d2d] rounded-lg"><User size={16} className="text-neutral-400"/></div>
                 <div>
                   <p className="text-sm font-bold text-white">{selectedSub.profile?.full_name}</p>
                   <p className="text-xs text-neutral-500">{selectedSub.profile?.email}</p>
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1.5">Tipe Paket (Plan)</label>
                <select value={editPlan} onChange={(e) => setEditPlan(e.target.value as PlanTier)} className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg p-3 text-sm text-white focus:border-[#06b6d4] outline-none">
                  <option value="free">Free (Dasar)</option>
                  <option value="pro">Pro (Menengah)</option>
                  <option value="premium">Premium (Lengkap)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1.5">Status Berlangganan</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as SubStatus)} className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg p-3 text-sm text-white focus:border-[#06b6d4] outline-none">
                  <option value="active">Active (Aktif)</option>
                  <option value="expired">Expired (Kedaluwarsa)</option>
                  <option value="cancelled">Cancelled (Dibatalkan)</option>
                  <option value="past_due">Past Due (Menunggak)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-400 block mb-1.5">Tanggal Kedaluwarsa (End Date)</label>
                <input 
                  type="date" 
                  value={editEndDate} 
                  onChange={(e) => setEditEndDate(e.target.value)} 
                  className="w-full bg-[#121212] border border-[#2d2d2d] rounded-lg p-3 text-sm text-white focus:border-[#06b6d4] outline-none"
                />
                <p className="text-[10px] text-neutral-500 mt-1">* Kosongkan jika paket adalah Free (berlaku selamanya).</p>
              </div>

              <div className="pt-4 border-t border-[#2d2d2d] flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-neutral-400 hover:text-white transition-colors">Batal</button>
                <button type="submit" disabled={isUpdating} className="px-5 py-2.5 text-sm font-bold bg-[#06b6d4] text-white rounded-lg hover:bg-[#06b6d4]/80 transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isUpdating ? <><Loader2 size={16} className="animate-spin"/> Menyimpan</> : <><Save size={16}/> Simpan</>}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}