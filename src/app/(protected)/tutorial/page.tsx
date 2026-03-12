'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { GraduationCap, FileText, PlayCircle, ArrowRight, ArrowLeft, BookOpen, Film, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video';
  cover_url: string;
  content: string;
  created_at: string;
}

export default function TutorialPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'article' | 'video'>('all');
  const supabase = createClient();

  useEffect(() => {
    const fetchTutorials = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) setTutorials(data as Tutorial[]);
      setIsLoading(false);
    };
    fetchTutorials();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pemisahan data berdasarkan tipe
  const articles = tutorials.filter(t => t.type === 'article');
  const videos = tutorials.filter(t => t.type === 'video');

  // Komponen Reusable untuk Kartu Tutorial
  const TutorialCard = ({ tut }: { tut: Tutorial }) => (
    <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl overflow-hidden hover:border-[#06b6d4] transition-all duration-300 group cursor-pointer shadow-lg flex flex-col hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(6,182,212,0.15)]">
      {/* Cover Image */}
      <div className="h-44 relative bg-neutral-800 overflow-hidden border-b border-[#2d2d2d]">
        <Image 
          src={tut.cover_url} 
          alt={tut.title} 
          fill 
          className="object-cover group-hover:scale-105 transition-transform duration-500" 
          unoptimized
        />
        {tut.type === 'video' ? (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
            <div className="w-14 h-14 bg-[#ef4444]/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.5)] group-hover:scale-110 transition-transform">
              <PlayCircle className="text-white ml-1" size={32} />
            </div>
          </div>
        ) : (
          <div className="absolute top-3 right-3 bg-[#06b6d4]/90 backdrop-blur-sm px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-lg">
            <BookOpen size={14} className="text-white" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Artikel</span>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-white font-bold text-base mb-2 line-clamp-2 leading-tight group-hover:text-[#06b6d4] transition-colors">{tut.title}</h3>
        <p className="text-neutral-400 text-xs mb-4 line-clamp-2 leading-relaxed">{tut.description}</p>
        <div className="mt-auto pt-4 border-t border-[#2d2d2d] flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">
            {new Date(tut.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <span className={`text-xs font-bold flex items-center gap-1 ${tut.type === 'video' ? 'text-[#ef4444]' : 'text-[#06b6d4]'}`}>
            {tut.type === 'video' ? 'Tonton' : 'Baca'} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar">
      
      {/* Header Utama */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <GraduationCap className="text-[#34d399]" size={36} /> 
            Pusat Edukasi VorteStocks
          </h1>
          <p className="text-neutral-400 text-sm mt-2 max-w-2xl leading-relaxed">
            Tingkatkan akurasi analisis tradingmu. Pelajari konsep bandarmologi, analisis teknikal lanjutan, hingga cara membaca Smart Money.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={40} className="text-[#06b6d4] animate-spin mb-4" />
          <p className="text-neutral-500 font-medium animate-pulse">Memuat materi edukasi...</p>
        </div>
      ) : (
        <>
          {/* =========================================
              MODE: VIEW ALL (Detail Kategori)
             ========================================= */}
          {viewMode !== 'all' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button 
                onClick={() => setViewMode('all')}
                className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white mb-6 transition-colors bg-[#1e1e1e] px-4 py-2 rounded-lg border border-[#2d2d2d] hover:border-[#06b6d4]"
              >
                <ArrowLeft size={16} /> Kembali ke Beranda Edukasi
              </button>
              
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#2d2d2d]">
                {viewMode === 'article' ? <FileText size={24} className="text-[#06b6d4]"/> : <Film size={24} className="text-[#ef4444]"/>}
                <h2 className="text-xl font-bold text-white">
                  Semua {viewMode === 'article' ? 'Artikel Bacaan' : 'Video Tutorial'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(viewMode === 'article' ? articles : videos).map(tut => (
                  <TutorialCard key={tut.id} tut={tut} />
                ))}
                {(viewMode === 'article' ? articles : videos).length === 0 && (
                  <div className="col-span-full py-10 text-center text-neutral-500 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] border-dashed">
                    Belum ada konten di kategori ini.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================
              MODE: ALL (Dashboard Overview)
             ========================================= */}
          {viewMode === 'all' && (
            <div className="space-y-12 animate-in fade-in duration-500">
              
              {/* Seksi 1: Artikel */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#06b6d4]/10 rounded-lg border border-[#06b6d4]/20">
                      <FileText className="text-[#06b6d4]" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Artikel Terbaru</h2>
                  </div>
                  {articles.length > 4 && (
                    <button onClick={() => setViewMode('article')} className="text-sm font-bold text-[#06b6d4] hover:text-[#34d399] flex items-center gap-1 transition-colors">
                      Lihat Semua <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                
                {articles.length === 0 ? (
                  <div className="py-8 text-center text-neutral-500 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] border-dashed">Belum ada artikel.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {articles.slice(0, 4).map(tut => <TutorialCard key={tut.id} tut={tut} />)}
                  </div>
                )}
              </section>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-[#2d2d2d] to-transparent"></div>

              {/* Seksi 2: Video */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#ef4444]/10 rounded-lg border border-[#ef4444]/20">
                      <Film className="text-[#ef4444]" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Video Edukasi</h2>
                  </div>
                  {videos.length > 4 && (
                    <button onClick={() => setViewMode('video')} className="text-sm font-bold text-[#ef4444] hover:text-[#f97316] flex items-center gap-1 transition-colors">
                      Lihat Semua <ArrowRight size={16} />
                    </button>
                  )}
                </div>
                
                {videos.length === 0 ? (
                  <div className="py-8 text-center text-neutral-500 bg-[#1e1e1e] rounded-xl border border-[#2d2d2d] border-dashed">Belum ada video.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {videos.slice(0, 4).map(tut => <TutorialCard key={tut.id} tut={tut} />)}
                  </div>
                )}
              </section>

            </div>
          )}
        </>
      )}
    </div>
  );
}