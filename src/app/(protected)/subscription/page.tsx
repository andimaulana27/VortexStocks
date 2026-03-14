'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Gem, Calendar, CreditCard, Shield, Zap, AlertCircle, CheckCircle, Receipt, ArrowRight, Loader2, Clock, XCircle } from 'lucide-react';

type PlanTier = 'free' | 'pro' | 'premium';
type SubStatus = 'active' | 'expired' | 'cancelled' | 'past_due';
type PaymentStatus = 'success' | 'pending' | 'failed';

interface UserSubscription {
  id: string;
  plan: PlanTier;
  status: SubStatus;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
}

interface PaymentTransaction {
  id: string;
  amount: number;
  plan_name: string;
  payment_method: string;
  status: PaymentStatus;
  payment_date: string;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Ambil data langganan
        const { data: subData } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subData) {
          setSubscription(subData as UserSubscription);
        } else {
          // Jika belum ada data, asumsikan paket Free
          setSubscription({
            id: 'default',
            plan: 'free',
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: null,
            auto_renew: false
          });
        }

        // 2. Ambil riwayat transaksi
        const { data: transData } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('payment_date', { ascending: false });

        if (transData) setTransactions(transData as PaymentTransaction[]);

      } catch (error) {
        console.error('Gagal memuat data langganan:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscriptionData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Fungsi placeholder untuk aksi tombol
  const handleUpgrade = () => alert('Fitur integrasi payment gateway (Midtrans/Stripe) akan ditambahkan di tahap selanjutnya!');
  const handleToggleAutoRenew = () => alert('Fitur mengubah status perpanjangan otomatis sedang dalam pengembangan.');

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <Loader2 size={48} className="text-[#06b6d4] animate-spin mb-4" />
        <p className="text-neutral-500 font-medium animate-pulse">Memuat detail langganan Anda...</p>
      </div>
    );
  }

  const isPremium = subscription?.plan === 'premium';
  const isPro = subscription?.plan === 'pro';
  const isFree = subscription?.plan === 'free';

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar">
      
      {/* Header Utama */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Gem className="text-[#06b6d4]" size={36} /> 
          Manajemen Langganan
        </h1>
        <p className="text-neutral-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Kelola paket langganan Anda, perbarui metode pembayaran, dan lihat riwayat faktur tagihan akun VorteStocks Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* ================= BAGIAN KIRI: KARTU PLAN AKTIF ================= */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card Status Langganan */}
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            {/* Ornamen Latar Belakang */}
            <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none ${isPremium ? 'bg-[#f97316]' : isPro ? 'bg-[#06b6d4]' : 'bg-neutral-500'}`}></div>

            <div className="flex items-center justify-between mb-6 relative z-10">
              <span className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Paket Saat Ini</span>
              {subscription?.status === 'active' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20 rounded-full text-xs font-bold">
                  <CheckCircle size={12} /> Aktif
                </span>
              ) : subscription?.status === 'expired' ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-full text-xs font-bold">
                  <XCircle size={12} /> Berakhir
                </span>
              ) : null}
            </div>

            <div className="mb-8 relative z-10">
              <h2 className="text-4xl font-black text-white capitalize flex items-center gap-3 mb-2">
                {subscription?.plan} {isPremium && <Zap className="text-[#f97316]" size={28} fill="currentColor" />}
              </h2>
              <p className="text-sm text-neutral-400">
                {isFree ? 'Akses fitur dasar dan data market tertunda.' : 'Akses penuh ke semua fitur premium dan data real-time.'}
              </p>
            </div>

            <div className="space-y-4 mb-8 relative z-10">
              <div className="flex items-center justify-between p-3 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d]">
                <div className="flex items-center gap-3">
                  <Calendar className="text-neutral-400" size={18} />
                  <div>
                    <p className="text-xs text-neutral-500 font-bold mb-0.5">Tanggal Perpanjangan / Berakhir</p>
                    <p className="text-sm text-white font-medium">
                      {subscription?.end_date ? formatDate(subscription.end_date) : 'Selamanya (Akses Dasar)'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d]">
                <div className="flex items-center gap-3">
                  <Shield className="text-neutral-400" size={18} />
                  <div>
                    <p className="text-xs text-neutral-500 font-bold mb-0.5">Perpanjangan Otomatis</p>
                    <p className={`text-sm font-bold ${subscription?.auto_renew ? 'text-[#34d399]' : 'text-neutral-400'}`}>
                      {subscription?.auto_renew ? 'Aktif (Auto-Renew)' : 'Tidak Aktif'}
                    </p>
                  </div>
                </div>
                {!isFree && (
                  <button onClick={handleToggleAutoRenew} className="text-xs font-bold text-[#06b6d4] hover:text-white transition-colors">
                    Ubah
                  </button>
                )}
              </div>
            </div>

            <button 
              onClick={handleUpgrade}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-transform hover:scale-[1.02] shadow-lg relative z-10 ${
                isFree 
                  ? 'bg-gradient-to-r from-[#06b6d4] to-[#3b82f6] text-white shadow-[0_4px_15px_rgba(6,182,212,0.3)]' 
                  : 'bg-[#1e1e1e] text-white border border-[#2d2d2d] hover:border-[#06b6d4]'
              }`}
            >
              {isFree ? 'Tingkatkan ke Pro / Premium' : 'Kelola Metode Pembayaran'}
            </button>
          </div>

        </div>

        {/* ================= BAGIAN KANAN: RIWAYAT FAKTUR ================= */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-3xl p-6 shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="text-[#34d399]" size={20} /> Riwayat Faktur & Pembayaran
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center border border-[#2d2d2d] border-dashed rounded-2xl bg-[#1e1e1e]">
                  <AlertCircle size={32} className="text-neutral-600 mb-3" />
                  <p className="text-neutral-400 text-sm font-medium">Belum ada riwayat pembayaran.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((trx) => (
                    <div key={trx.id} className="p-4 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-500 transition-colors group">
                      
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-[#121212] rounded-lg border border-[#2d2d2d] shrink-0">
                          <CreditCard className="text-neutral-400" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white capitalize">{trx.plan_name} Plan</p>
                          <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
                            {formatDate(trx.payment_date)} • <span className="uppercase">{trx.payment_method}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 w-full sm:w-auto border-t border-[#2d2d2d] sm:border-t-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                        <span className="text-sm font-bold text-white">{formatRupiah(trx.amount)}</span>
                        {trx.status === 'success' ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20 uppercase tracking-widest">Berhasil</span>
                        ) : trx.status === 'pending' ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 uppercase tracking-widest flex items-center gap-1"><Clock size={10}/> Tertunda</span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 uppercase tracking-widest">Gagal</span>
                        )}
                      </div>

                      <button className="hidden sm:flex p-2 text-neutral-500 hover:text-[#06b6d4] bg-[#121212] rounded-lg border border-[#2d2d2d] hover:border-[#06b6d4] transition-colors" title="Unduh Invoice">
                        <ArrowRight size={16} className="-rotate-45" />
                      </button>

                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-[#2d2d2d]">
              <p className="text-xs text-neutral-500 leading-relaxed">
                * Jika Anda mengalami kendala pembayaran atau tagihan ganda, silakan hubungi tim dukungan kami melalui menu <span className="text-[#06b6d4] cursor-pointer hover:underline">Contact Us</span>.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}