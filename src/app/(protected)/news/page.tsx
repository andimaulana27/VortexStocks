// src/app/(protected)/news/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { 
  Globe, 
  TrendingUp, 
  Bitcoin, 
  ExternalLink, 
  RefreshCw, 
  LucideIcon, 
  ChevronLeft, 
  ChevronRight,
  X,
  Sparkles,
  Activity
} from 'lucide-react';

type NewsCategory = 'global' | 'indonesia' | 'crypto';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  fullHtmlContent: string;
  source: string;
  imageUrl: string | null;
  summary?: string;
}

// Interface baru untuk hasil dari AI
interface AiAnalysisResult {
  points: string[];
  impact: string;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<NewsCategory>('global');

  // State Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // State Modal & AI
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // STATE CACHE
  const [analysisCache, setAnalysisCache] = useState<Record<string, AiAnalysisResult>>({});

  // Ambil daftar berita
  const fetchNews = async (cat: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?category=${cat}`);
      const json = await res.json();
      if (json.status === 'success') {
        setNews(json.data);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("Gagal menarik berita:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(category);
  }, [category]);

  // FUNGSI UPDATE: Menganalisis Artikel (Aman dari peringatan useEffect)
  const analyzeArticleWithAI = async (article: NewsItem) => {
    if (analysisCache[article.id]) {
      setAiAnalysis(analysisCache[article.id]);
      return; 
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/analyze-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: article.title, 
          content: article.fullHtmlContent || article.summary 
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setAiAnalysis(json.data);
        setAnalysisCache(prev => ({ ...prev, [article.id]: json.data }));
      }
    } catch (error) {
      console.error("Gagal menganalisis berita dengan AI:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // FUNGSI BARU: Menangani klik buka artikel + Jalankan AI
  const handleOpenArticle = (item: NewsItem) => {
    setSelectedArticle(item);
    analyzeArticleWithAI(item);
  };

  // EFEK UPDATE: Hanya mengatur scroll body, AI diurus oleh handleOpenArticle
  useEffect(() => {
    if (selectedArticle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setAiAnalysis(null); // Reset hasil AI saat modal ditutup
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedArticle]); // <--- Warning akan hilang!

  const tabs: { id: NewsCategory; name: string; icon: LucideIcon }[] = [
    { id: 'global', name: 'World Market', icon: Globe },
    { id: 'indonesia', name: 'IDX / Indonesia', icon: TrendingUp },
    { id: 'crypto', name: 'Cryptocurrency', icon: Bitcoin },
  ];

  const totalPages = Math.ceil(news.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentNews = news.slice(startIndex, startIndex + itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const getSafeSummary = (article: NewsItem | null) => {
    if (!article) return '';
    const rawTextSummary = article.summary ? article.summary.replace(/<[^>]*>?/gm, '').trim() : '';
    if (rawTextSummary.length < 10) {
      const rawTextContent = article.fullHtmlContent ? article.fullHtmlContent.replace(/<[^>]*>?/gm, '').trim() : '';
      if (rawTextContent.length > 0) {
        return `<p>${rawTextContent.substring(0, 180)}...</p>`;
      }
      return '<i>Tidak ada cuplikan teks yang tersedia.</i>';
    }
    return article.summary as string;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full overflow-y-auto pb-24">
      
      {/* Header & Kategori */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Real-Time News</h1>
          <p className="text-neutral-400 mt-1">Berita pasar modal dengan Analisis AI Sentimen.</p>
        </div>
        
        <div className="flex bg-[#121212] border border-[#2d2d2d] rounded-full p-1">
          {tabs.map((tab) => {
            const isActive = category === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={`flex items-center space-x-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  isActive 
                    ? "bg-gradient-to-r from-[#06b6d4] to-[#34d399] text-white shadow-[0_4px_15px_rgba(52,211,153,0.3)]" 
                    : "text-neutral-400 hover:text-white hover:bg-[#1e1e1e]"
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Konten Berita */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-neutral-500">
          <RefreshCw className="animate-spin mb-4" size={32} />
          <p>Menarik berita terkini dari {category.toUpperCase()}...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentNews.map((item) => (
              <div key={item.id} className="bg-[#121212] border border-[#2d2d2d] rounded-2xl overflow-hidden hover:border-[#4d4d4d] transition-colors duration-300 flex flex-col shadow-lg">
                
                {item.imageUrl && (
                  <div 
                    className="w-full h-48 relative overflow-hidden bg-[#1e1e1e] cursor-pointer"
                    onClick={() => handleOpenArticle(item)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                  </div>
                )}
                
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-black text-[#06b6d4] uppercase tracking-widest bg-[#06b6d4]/10 px-2.5 py-1 rounded-md">
                      {item.source}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      {new Date(item.pubDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                  
                  <h2 
                    onClick={() => handleOpenArticle(item)}
                    className="text-lg font-bold text-white leading-snug mb-3 hover:text-[#34d399] transition-colors line-clamp-3 cursor-pointer"
                  >
                    {item.title}
                  </h2>

                  <div className="text-sm text-neutral-400 line-clamp-3 leading-relaxed flex-grow">
                     <div dangerouslySetInnerHTML={{ __html: getSafeSummary(item) }} />
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#2d2d2d] flex justify-between items-center">
                    <span className="text-xs text-neutral-500">
                      {new Date(item.pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => handleOpenArticle(item)}
                      className="flex items-center text-xs font-bold text-[#34d399] hover:text-white transition-colors cursor-pointer"
                    >
                      Buka & Analisis <Sparkles size={12} className="ml-1.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {news.length > 0 && (
            <div className="flex justify-center items-center mt-12 space-x-4">
              <button onClick={handlePrevPage} disabled={currentPage === 1} className={`p-2 rounded-full border ${currentPage === 1 ? 'border-[#2d2d2d] text-neutral-600 cursor-not-allowed' : 'border-[#4d4d4d] text-white hover:bg-[#1e1e1e] transition-colors'}`}>
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-medium text-neutral-400">
                Halaman <strong className="text-white">{currentPage}</strong> dari <strong className="text-white">{totalPages}</strong>
              </span>
              <button onClick={handleNextPage} disabled={currentPage === totalPages} className={`p-2 rounded-full border ${currentPage === totalPages ? 'border-[#2d2d2d] text-neutral-600 cursor-not-allowed' : 'border-[#4d4d4d] text-white hover:bg-[#1e1e1e] transition-colors'}`}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ==================================================== */}
      {/* MODAL BACA BERITA FULL & AI ANALYSIS */}
      {/* ==================================================== */}
      {selectedArticle && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-sm">
          <div className="bg-[#121212] border border-[#2d2d2d] rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            
            <div className="flex justify-between items-center p-5 border-b border-[#2d2d2d] bg-[#1a1a1a]">
               <div className="flex items-center space-x-3">
                  <span className="text-xs font-black text-[#06b6d4] uppercase tracking-widest bg-[#06b6d4]/10 px-2.5 py-1 rounded-md">
                    {selectedArticle.source}
                  </span>
                  <span className="text-sm text-neutral-400 hidden sm:inline">
                    {new Date(selectedArticle.pubDate).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB
                  </span>
               </div>
               <button onClick={() => setSelectedArticle(null)} className="p-2 bg-[#2d2d2d] hover:bg-[#ef4444] rounded-full text-neutral-300 hover:text-white transition-colors">
                 <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-10">
              {selectedArticle.imageUrl && (
                 // eslint-disable-next-line @next/next/no-img-element
                 <img src={selectedArticle.imageUrl} alt={selectedArticle.title} className="w-full h-[250px] md:h-[400px] object-cover rounded-xl mb-8" />
              )}
              
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-8 leading-tight">
                {selectedArticle.title}
              </h1>

              {/* BOX HIGHLIGHT: AI RINGKASAN & PENGARUH SAHAM */}
              <div className="bg-gradient-to-br from-[#1e1e1e] to-[#121212] border border-[#2d2d2d] rounded-xl p-6 mb-10 border-l-4 border-l-[#06b6d4] shadow-lg">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#2d2d2d]">
                  <div className="flex items-center">
                    <Sparkles className="text-[#06b6d4] mr-2" size={22} />
                    <h3 className="text-lg md:text-xl font-bold text-white tracking-wide">VorteStocks AI Analysis</h3>
                  </div>
                  {isAnalyzing && (
                    <span className="text-xs font-medium text-[#34d399] flex items-center bg-[#34d399]/10 px-3 py-1 rounded-full animate-pulse">
                      <RefreshCw className="animate-spin mr-2" size={14} /> Menganalisis...
                    </span>
                  )}
                </div>
                
                {isAnalyzing ? (
                  <div className="py-6 flex flex-col items-center justify-center text-neutral-400 space-y-3">
                    <Activity className="animate-bounce text-[#06b6d4]" size={32} />
                    <p className="text-sm font-medium animate-pulse">AI sedang membaca dan mengekstrak sentimen pasar...</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-6">
                    {/* Hasil: Poin Ringkasan */}
                    <div>
                      <h4 className="text-sm font-bold text-neutral-400 mb-3 uppercase tracking-wider">Ringkasan Berita:</h4>
                      <ul className="space-y-2">
                        {aiAnalysis.points.map((pt, idx) => (
                          <li key={idx} className="flex items-start text-neutral-200">
                            <span className="text-[#06b6d4] mr-3 mt-1.5 text-[10px]">●</span>
                            <span className="leading-relaxed text-[15px]">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Hasil: Pengaruh Saham */}
                    <div className="bg-[#06b6d4]/5 border border-[#06b6d4]/20 rounded-lg p-5">
                      <h4 className="text-sm font-bold text-[#34d399] mb-2 uppercase tracking-wider flex items-center">
                        <TrendingUp size={16} className="mr-2" /> Pengaruh ke Saham / Pasar:
                      </h4>
                      <p className="text-neutral-300 text-[15px] leading-relaxed">
                        {aiAnalysis.impact}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-neutral-400 italic text-sm">
                    Gagal memuat analisis AI. Anda tetap bisa membaca berita lengkapnya di bawah ini.
                  </div>
                )}
              </div>

              <div 
                className="text-neutral-400 text-base md:text-lg leading-relaxed 
                           [&>p]:mb-6 
                           [&>img]:w-full [&>img]:rounded-xl [&>img]:my-8 
                           [&>a]:text-[#06b6d4] [&>a]:underline hover:[&>a]:text-[#34d399]
                           [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4
                           [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-white [&>h3]:mt-8 [&>h3]:mb-3
                           [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-6 [&>ul>li]:mb-2
                           [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:mb-6 [&>ol>li]:mb-2
                           [&>blockquote]:border-l-4 [&>blockquote]:border-[#34d399] [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-neutral-300 [&>blockquote]:my-6"
                dangerouslySetInnerHTML={{ __html: selectedArticle.fullHtmlContent || '' }} 
              />

              <div className="mt-12 pt-8 border-t border-[#2d2d2d] flex flex-col sm:flex-row items-center justify-between gap-4">
                 <p className="text-sm text-neutral-500">
                   Hak cipta berita sepenuhnya dimiliki oleh {selectedArticle.source}.
                 </p>
                 <a 
                   href={selectedArticle.link} 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   className="inline-flex items-center space-x-2 text-[#34d399] hover:text-white bg-[#34d399]/10 hover:bg-[#34d399]/20 px-4 py-2.5 rounded-lg transition-colors font-medium whitespace-nowrap"
                 >
                   <span>Buka di Halaman Asli</span>
                   <ExternalLink size={16} />
                 </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}