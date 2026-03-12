'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Calendar, Loader2, PlayCircle, BookOpen } from 'lucide-react';
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

export default function TutorialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTutorialDetail = async () => {
      if (!params.id) return;
      
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tutorials')
        .select('*')
        .eq('id', params.id as string)
        .single();
        
      if (!error && data) {
        setTutorial(data as Tutorial);
      }
      setIsLoading(false);
    };

    fetchTutorialDetail();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <Loader2 size={48} className="text-[#06b6d4] animate-spin mb-4" />
        <p className="text-neutral-500 font-medium animate-pulse">Memuat konten edukasi...</p>
      </div>
    );
  }

  if (!tutorial) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <BookOpen size={64} className="text-neutral-700 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Konten Tidak Ditemukan</h2>
        <p className="text-neutral-500 mb-6">Tutorial yang kamu cari mungkin sudah dihapus atau tidak tersedia.</p>
        <button onClick={() => router.push('/tutorial')} className="px-6 py-2.5 bg-[#1e1e1e] border border-[#2d2d2d] rounded-full text-white font-bold hover:border-[#06b6d4] transition-colors">
          Kembali ke Pusat Edukasi
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 h-full overflow-y-auto custom-scrollbar">
      
      {/* Tombol Kembali */}
      <button 
        onClick={() => router.push('/tutorial')}
        className="flex items-center gap-2 text-sm font-bold text-neutral-400 hover:text-white mb-8 transition-colors bg-[#1e1e1e] w-fit px-4 py-2 rounded-lg border border-[#2d2d2d] hover:border-[#06b6d4]"
      >
        <ArrowLeft size={16} /> Kembali
      </button>

      <div className="max-w-4xl mx-auto">
        {/* Header Artikel / Video */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-sm uppercase tracking-wider ${tutorial.type === 'video' ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#06b6d4]/20 text-[#06b6d4]'}`}>
              {tutorial.type === 'video' ? 'Video Edukasi' : 'Artikel Bacaan'}
            </span>
            <span className="text-neutral-500 text-sm flex items-center gap-1.5 font-medium">
              <Calendar size={14} />
              {new Date(tutorial.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
            {tutorial.title}
          </h1>
          <p className="text-lg text-neutral-400 leading-relaxed">
            {tutorial.description}
          </p>
        </div>

        {/* =========================================
            TAMPILAN VIDEO
           ========================================= */}
        {tutorial.type === 'video' && (
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl overflow-hidden shadow-2xl mb-12">
            <video 
              src={tutorial.content} 
              controls 
              className="w-full aspect-video object-cover bg-black"
              poster={tutorial.cover_url}
            >
              Browser kamu tidak mendukung pemutaran video HTML5.
            </video>
            <div className="p-6 bg-[#1a1a1a]">
              <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-2">
                <PlayCircle className="text-[#ef4444]" size={20} /> Tentang Video Ini
              </h3>
              <p className="text-neutral-400 text-sm">{tutorial.description}</p>
            </div>
          </div>
        )}

        {/* =========================================
            TAMPILAN ARTIKEL (Rich Text / HTML)
           ========================================= */}
        {tutorial.type === 'article' && (
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-3xl p-6 md:p-10 shadow-2xl mb-12 relative overflow-hidden">
            
            {/* Cover Image Artikel */}
            <div className="w-full h-[300px] md:h-[400px] relative rounded-2xl overflow-hidden mb-10 border border-[#2d2d2d]">
              <Image 
                src={tutorial.cover_url} 
                alt={tutorial.title} 
                fill 
                className="object-cover" 
                unoptimized
              />
            </div>

            {/* Custom Styling untuk merender output HTML dari Tiptap */}
            <style jsx global>{`
              .article-content h1 { font-size: 2rem; font-weight: 800; color: #ffffff; margin-top: 2rem; margin-bottom: 1rem; line-height: 1.3; }
              .article-content h2 { font-size: 1.5rem; font-weight: 700; color: #06b6d4; margin-top: 2rem; margin-bottom: 1rem; }
              .article-content h3 { font-size: 1.25rem; font-weight: 700; color: #34d399; margin-top: 1.5rem; margin-bottom: 0.75rem; }
              .article-content p { font-size: 1.05rem; line-height: 1.8; color: #d4d4d8; margin-bottom: 1.25rem; }
              .article-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1.5rem; color: #d4d4d8; }
              .article-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1.5rem; color: #d4d4d8; }
              .article-content li { margin-bottom: 0.5rem; line-height: 1.6; }
              .article-content a { color: #06b6d4; text-decoration: underline; text-underline-offset: 4px; }
              .article-content a:hover { color: #34d399; }
              .article-content strong { color: #ffffff; font-weight: 700; }
              .article-content blockquote { border-left: 4px solid #06b6d4; padding-left: 1.25rem; font-style: italic; color: #a3a3a3; margin: 2rem 0; background: #1a1a1a; padding: 1.5rem; border-radius: 0 0.5rem 0.5rem 0; }
              .article-content img { border-radius: 0.75rem; border: 1px solid #2d2d2d; max-width: 100%; height: auto; margin: 2rem auto; display: block; }
              .article-content iframe { width: 100%; aspect-ratio: 16 / 9; border-radius: 0.75rem; margin: 2rem 0; border: 1px solid #2d2d2d; }
              .article-content hr { border-color: #2d2d2d; margin: 3rem 0; }
              
              /* Utilities untuk Text Align yang dikirim oleh Tiptap */
              .article-content [style*="text-align: center"] { text-align: center; }
              .article-content [style*="text-align: right"] { text-align: right; }
              .article-content [style*="text-align: justify"] { text-align: justify; }
            `}</style>

            {/* Render HTML dari Database */}
            <div 
              className="article-content"
              dangerouslySetInnerHTML={{ __html: tutorial.content }} 
            />
          </div>
        )}

      </div>
    </div>
  );
}