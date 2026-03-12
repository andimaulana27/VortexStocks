'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Terminal, CheckCircle, XCircle, Loader2, User, Clock, X, Code2, Edit3, Trash2, Save } from 'lucide-react';

type LogicStatus = 'pending' | 'processing' | 'completed' | 'rejected';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface LogicRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: LogicStatus;
  admin_notes: string | null;
  created_at: string;
  profile?: Profile;
}

export default function AdminLogicRequestsPage() {
  const [requests, setRequests] = useState<LogicRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<LogicRequest | null>(null);
  const [filter, setFilter] = useState<'all' | LogicStatus>('all');
  
  // State untuk form update admin
  const [updateStatus, setUpdateStatus] = useState<LogicStatus>('pending');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const supabase = createClient();

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const { data: reqData, error: reqError } = await supabase
        .from('logic_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;

      if (reqData && reqData.length > 0) {
        const userIds = [...new Set(reqData.map(r => r.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const combinedData = reqData.map((req) => ({
          ...req,
          profile: profilesData?.find((p) => p.id === req.user_id)
        })) as LogicRequest[];

        setRequests(combinedData);
      } else {
        setRequests([]);
      }
    } catch (error: unknown) {
      console.error('Gagal memuat request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenRequest = (req: LogicRequest) => {
    setSelectedRequest(req);
    setUpdateStatus(req.status);
    setAdminNotes(req.admin_notes || '');
  };

  const handleSaveUpdate = async () => {
    if (!selectedRequest) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('logic_requests')
        .update({ 
          status: updateStatus, 
          admin_notes: adminNotes.trim() === '' ? null : adminNotes 
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;
      
      // Update state lokal
      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? { 
        ...r, 
        status: updateStatus, 
        admin_notes: adminNotes.trim() === '' ? null : adminNotes 
      } : r));
      
      setSelectedRequest(prev => prev ? { 
        ...prev, 
        status: updateStatus, 
        admin_notes: adminNotes.trim() === '' ? null : adminNotes 
      } : null);

      alert('Status dan catatan request berhasil diperbarui!');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal memperbarui request: ' + errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus request ini secara permanen?')) return;
    try {
      const { error } = await supabase.from('logic_requests').delete().eq('id', id);
      if (error) throw error;
      
      setRequests(prev => prev.filter(r => r.id !== id));
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal menghapus request: ' + errorMessage);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'all' ? true : r.status === filter);

  const getStatusBadge = (status: LogicStatus) => {
    switch (status) {
      case 'pending': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 flex items-center gap-1"><Clock size={10}/> Menunggu</span>;
      case 'processing': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20 flex items-center gap-1"><Loader2 size={10} className="animate-spin"/> Diproses</span>;
      case 'completed': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20 flex items-center gap-1"><CheckCircle size={10}/> Selesai</span>;
      case 'rejected': return <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 flex items-center gap-1"><XCircle size={10}/> Ditolak</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar flex flex-col lg:flex-row gap-6">
      
      {/* ================= KOLOM KIRI: DAFTAR REQUEST ================= */}
      <div className={`w-full ${selectedRequest ? 'hidden lg:block lg:w-1/2 xl:w-5/12' : 'block'}`}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Terminal className="text-[#06b6d4]" size={28} /> Manajemen Request
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Tinjau dan proses permintaan custom logic dari pengguna.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-[#1e1e1e] p-1.5 rounded-xl border border-[#2d2d2d] w-fit">
          <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Semua</button>
          <button onClick={() => setFilter('pending')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'pending' ? 'bg-neutral-500/10 text-neutral-400 shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Pending</button>
          <button onClick={() => setFilter('processing')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'processing' ? 'bg-[#3b82f6]/10 text-[#3b82f6] shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Proses</button>
          <button onClick={() => setFilter('completed')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'completed' ? 'bg-[#34d399]/10 text-[#34d399] shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Selesai</button>
        </div>

        {/* List Card Request */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 size={24} className="animate-spin text-neutral-500" /></div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-10 text-center border border-[#2d2d2d] border-dashed rounded-2xl bg-[#121212]">
              <Code2 size={32} className="text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm font-medium">Tidak ada request ditemukan.</p>
            </div>
          ) : (
            filteredRequests.map((req) => (
              <div 
                key={req.id} 
                onClick={() => handleOpenRequest(req)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedRequest?.id === req.id ? 'bg-[#1e1e1e] border-[#06b6d4]' : 'bg-[#121212] border-[#2d2d2d] hover:border-neutral-500'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-white truncate pr-2 w-2/3">{req.title}</h3>
                  {getStatusBadge(req.status)}
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
                  <span className="flex items-center gap-1 truncate max-w-[60%]">
                    <User size={12}/> {req.profile?.full_name || req.profile?.email || 'User'}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Clock size={12}/> {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= KOLOM KANAN: DETAIL & UPDATE ================= */}
      {selectedRequest ? (
        <div className="w-full lg:w-1/2 xl:w-7/12 bg-[#121212] border border-[#2d2d2d] rounded-2xl flex flex-col h-[calc(100vh-8rem)] sticky top-6 shadow-2xl animate-in fade-in slide-in-from-right-4">
          
          {/* Header Detail */}
          <div className="p-6 border-b border-[#2d2d2d] flex items-start justify-between bg-[#1a1a1a] rounded-t-2xl">
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                {getStatusBadge(selectedRequest.status)}
                <span className="text-xs text-neutral-500">{new Date(selectedRequest.created_at).toLocaleString('id-ID')}</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-4 leading-tight">{selectedRequest.title}</h2>
              
              <div className="flex items-center gap-3 p-3 bg-[#121212] rounded-xl border border-[#2d2d2d]">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#06b6d4] to-[#34d399] flex items-center justify-center text-white shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selectedRequest.profile?.full_name || 'Pengguna Tanpa Nama'}</p>
                  <p className="text-xs text-[#06b6d4]">{selectedRequest.profile?.email || 'Email tidak tersedia'}</p>
                </div>
              </div>
            </div>
            
            <button onClick={() => setSelectedRequest(null)} className="lg:hidden p-2 text-neutral-400 hover:text-white bg-[#2d2d2d] rounded-lg ml-4">
              <X size={20}/>
            </button>
          </div>

          {/* Isi Pesan & Form Update */}
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* Detail Logika dari User */}
            <div>
              <h3 className="text-sm font-bold text-neutral-400 mb-2 flex items-center gap-2"><Code2 size={16}/> Deskripsi Logika:</h3>
              <div className="bg-[#1e1e1e] p-4 rounded-xl border border-[#2d2d2d] text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {selectedRequest.description}
              </div>
            </div>

            <hr className="border-[#2d2d2d]" />

            {/* Form Update Admin */}
            <div>
              <h3 className="text-sm font-bold text-[#06b6d4] mb-4 flex items-center gap-2"><Edit3 size={16}/> Update Status & Catatan</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-400 block mb-1.5">Ubah Status</label>
                  <select 
                    value={updateStatus} 
                    onChange={(e) => setUpdateStatus(e.target.value as LogicStatus)}
                    className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-2.5 text-sm text-white focus:border-[#06b6d4] outline-none"
                  >
                    <option value="pending">Menunggu (Pending)</option>
                    <option value="processing">Sedang Diproses (Processing)</option>
                    <option value="completed">Selesai (Completed)</option>
                    <option value="rejected">Ditolak (Rejected)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-400 block mb-1.5">Catatan Admin (Opsional, dilihat oleh user)</label>
                  <textarea 
                    rows={4} 
                    value={adminNotes} 
                    onChange={(e) => setAdminNotes(e.target.value)} 
                    className="w-full bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg p-2.5 text-sm text-white focus:border-[#06b6d4] outline-none resize-none" 
                    placeholder="Contoh: Logika ini sedang kami coding, estimasi selesai besok..."
                  ></textarea>
                </div>
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="p-5 border-t border-[#2d2d2d] bg-[#1a1a1a] rounded-b-2xl flex items-center justify-between gap-4 flex-wrap">
            <button 
              onClick={handleSaveUpdate} 
              disabled={isUpdating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#06b6d4] text-white font-bold text-sm hover:bg-[#06b6d4]/80 transition-colors disabled:opacity-50"
            >
              {isUpdating ? <><Loader2 size={16} className="animate-spin" /> Menyimpan...</> : <><Save size={16} /> Simpan Perubahan</>}
            </button>
            
            <button onClick={() => handleDelete(selectedRequest.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-neutral-400 hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors text-sm font-bold">
              <Trash2 size={16} /> Hapus Permanen
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex w-1/2 xl:w-7/12 flex-col items-center justify-center bg-[#121212] border border-[#2d2d2d] rounded-2xl border-dashed h-[calc(100vh-8rem)] sticky top-6 text-neutral-500">
          <Terminal size={64} className="mb-4 text-[#2d2d2d]" />
          <p className="font-medium">Pilih request di samping untuk meninjau dan merespon.</p>
        </div>
      )}

    </div>
  );
}