'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
// PERBAIKAN: Hapus impor 'Search' karena tidak digunakan
import { Inbox, Mail, MailOpen, CheckCircle, Trash2, Loader2, User, Clock, X } from 'lucide-react';

type ContactStatus = 'unread' | 'read' | 'resolved';
type ContactCategory = 'support' | 'billing' | 'bug' | 'other';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface Message {
  id: string;
  user_id: string;
  category: ContactCategory;
  subject: string;
  message: string;
  status: ContactStatus;
  created_at: string;
  profile?: Profile; 
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'resolved'>('all');
  const supabase = createClient();

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const { data: msgsData, error: msgsError } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (msgsError) throw msgsError;

      if (msgsData && msgsData.length > 0) {
        const userIds = [...new Set(msgsData.map(m => m.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const combinedData = msgsData.map((msg) => ({
          ...msg,
          profile: profilesData?.find((p) => p.id === msg.user_id)
        })) as Message[];

        setMessages(combinedData);
      } else {
        setMessages([]);
      }
    } catch (error: unknown) {
      console.error('Gagal memuat pesan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: string, newStatus: ContactStatus) => {
    try {
      const { error } = await supabase.from('contact_messages').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      if (selectedMessage?.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error: unknown) {
      // PERBAIKAN: Gunakan variabel error agar tidak muncul peringatan "defined but never used"
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal memperbarui status pesan: ' + errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pesan ini secara permanen?')) return;
    try {
      const { error } = await supabase.from('contact_messages').delete().eq('id', id);
      if (error) throw error;
      
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMessage?.id === id) setSelectedMessage(null);
    } catch (error: unknown) {
      // PERBAIKAN: Gunakan variabel error agar tidak muncul peringatan "defined but never used"
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert('Gagal menghapus pesan: ' + errorMessage);
    }
  };

  const handleOpenMessage = (msg: Message) => {
    setSelectedMessage(msg);
    if (msg.status === 'unread') {
      updateStatus(msg.id, 'read');
    }
  };

  const filteredMessages = messages.filter(m => {
    if (filter === 'unread') return m.status === 'unread';
    if (filter === 'resolved') return m.status === 'resolved';
    return true;
  });

  const getCategoryBadge = (cat: ContactCategory) => {
    switch (cat) {
      case 'bug': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#ef4444]/20 text-[#ef4444] uppercase tracking-wider">Bug</span>;
      case 'billing': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f97316]/20 text-[#f97316] uppercase tracking-wider">Tagihan</span>;
      case 'support': return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#06b6d4]/20 text-[#06b6d4] uppercase tracking-wider">Bantuan</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8b5cf6]/20 text-[#8b5cf6] uppercase tracking-wider">Lainnya</span>;
    }
  };

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar flex flex-col lg:flex-row gap-6">
      
      {/* ================= KOLOM KIRI: DAFTAR PESAN ================= */}
      <div className={`w-full ${selectedMessage ? 'hidden lg:block lg:w-1/2 xl:w-5/12' : 'block'}`}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Inbox className="text-[#06b6d4]" size={28} /> Pesan Masuk
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Kelola laporan dan pertanyaan dari pengguna.</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-4 bg-[#1e1e1e] p-1.5 rounded-xl border border-[#2d2d2d] w-fit">
          <button onClick={() => setFilter('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-[#2d2d2d] text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Semua</button>
          <button onClick={() => setFilter('unread')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${filter === 'unread' ? 'bg-[#06b6d4]/10 text-[#06b6d4] shadow-sm' : 'text-neutral-500 hover:text-white'}`}>
            <span className="w-2 h-2 rounded-full bg-[#06b6d4]"></span> Baru
          </button>
          <button onClick={() => setFilter('resolved')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${filter === 'resolved' ? 'bg-[#34d399]/10 text-[#34d399] shadow-sm' : 'text-neutral-500 hover:text-white'}`}>Selesai</button>
        </div>

        {/* List Card Pesan */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 size={24} className="animate-spin text-neutral-500" /></div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-10 text-center border border-[#2d2d2d] border-dashed rounded-2xl bg-[#121212]">
              <MailOpen size={32} className="text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-500 text-sm font-medium">Kotak masuk kosong.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div 
                key={msg.id} 
                onClick={() => handleOpenMessage(msg)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMessage?.id === msg.id ? 'bg-[#1e1e1e] border-[#06b6d4]' : msg.status === 'unread' ? 'bg-[#121212] border-[#2d2d2d] hover:border-[#06b6d4]' : 'bg-[#121212]/50 border-[#2d2d2d] opacity-75 hover:opacity-100'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {msg.status === 'unread' && <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>}
                    {getCategoryBadge(msg.category)}
                  </div>
                  <span className="text-[10px] text-neutral-500 font-medium flex items-center gap-1">
                    <Clock size={12}/> {new Date(msg.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <h3 className={`text-sm truncate mb-1 ${msg.status === 'unread' ? 'font-bold text-white' : 'font-semibold text-neutral-300'}`}>{msg.subject}</h3>
                <p className="text-xs text-neutral-500 truncate">{msg.profile?.full_name || msg.profile?.email || 'User'}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= KOLOM KANAN: DETAIL PESAN ================= */}
      {selectedMessage ? (
        <div className="w-full lg:w-1/2 xl:w-7/12 bg-[#121212] border border-[#2d2d2d] rounded-2xl flex flex-col h-[calc(100vh-8rem)] sticky top-6 shadow-2xl animate-in fade-in slide-in-from-right-4">
          
          {/* Header Detail */}
          <div className="p-6 border-b border-[#2d2d2d] flex items-start justify-between bg-[#1a1a1a] rounded-t-2xl">
            <div>
              <div className="flex items-center gap-2 mb-3">
                {getCategoryBadge(selectedMessage.category)}
                <span className="text-xs text-neutral-500">{new Date(selectedMessage.created_at).toLocaleString('id-ID')}</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-4 leading-tight">{selectedMessage.subject}</h2>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#06b6d4] to-[#34d399] flex items-center justify-center text-white shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{selectedMessage.profile?.full_name || 'Pengguna Tanpa Nama'}</p>
                  <p className="text-xs text-[#06b6d4]">{selectedMessage.profile?.email || 'Email tidak tersedia'}</p>
                </div>
              </div>
            </div>
            
            {/* Tombol Tutup (Mobile) */}
            <button onClick={() => setSelectedMessage(null)} className="lg:hidden p-2 text-neutral-400 hover:text-white bg-[#2d2d2d] rounded-lg">
              <X size={20}/>
            </button>
          </div>

          {/* Isi Pesan */}
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="prose prose-invert max-w-none text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {selectedMessage.message}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-5 border-t border-[#2d2d2d] bg-[#1a1a1a] rounded-b-2xl flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2">
              {selectedMessage.status !== 'resolved' ? (
                <button onClick={() => updateStatus(selectedMessage.id, 'resolved')} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20 font-bold text-sm hover:bg-[#34d399] hover:text-black transition-colors">
                  <CheckCircle size={16} /> Tandai Selesai
                </button>
              ) : (
                <button onClick={() => updateStatus(selectedMessage.id, 'read')} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2d2d2d] text-neutral-400 font-bold text-sm hover:bg-[#3d3d3d] hover:text-white transition-colors">
                  <MailOpen size={16} /> Tandai Belum Selesai
                </button>
              )}
            </div>
            
            <button onClick={() => handleDelete(selectedMessage.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[#ef4444] font-bold text-sm hover:bg-[#ef4444]/10 transition-colors">
              <Trash2 size={16} /> Hapus Pesan
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex w-1/2 xl:w-7/12 flex-col items-center justify-center bg-[#121212] border border-[#2d2d2d] rounded-2xl border-dashed h-[calc(100vh-8rem)] sticky top-6 text-neutral-500">
          <Mail size={64} className="mb-4 text-[#2d2d2d]" />
          <p className="font-medium">Pilih pesan di samping untuk membaca detailnya.</p>
        </div>
      )}

    </div>
  );
}