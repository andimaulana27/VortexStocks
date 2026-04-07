// src/app/(protected)/news/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Globe, TrendingUp, Bitcoin, ExternalLink, RefreshCw, LucideIcon } from 'lucide-react';

// 1. Definisikan tipe untuk kategori agar tidak perlu menggunakan 'any'
type NewsCategory = 'global' | 'indonesia' | 'crypto';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  fullHtmlContent: string;
  source: string;
  imageUrl: string | null;
  summary?: string; // 2. Tambahkan properti summary di sini (opsional)
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<NewsCategory>('global');

  const fetchNews = async (cat: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/news?category=${cat}`);
      const json = await res.json();
      if (json.status === 'success') {
        setNews(json.data);
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

  // Gunakan tipe yang sudah didefinisikan secara strict
  const tabs: { id: NewsCategory; name: string; icon: LucideIcon }[] = [
    { id: 'global', name: 'World Market', icon: Globe },
    { id: 'indonesia', name: 'IDX / Indonesia', icon: TrendingUp },
    { id: 'crypto', name: 'Cryptocurrency', icon: Bitcoin },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen pb-24">
      {/* Header & Kategori */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-wide">Real-Time News</h1>
          <p className="text-neutral-400 mt-1">Berita finansial dan pasar modal otomatis dari seluruh dunia.</p>
        </div>
        
        <div className="flex bg-[#121212] border border-[#2d2d2d] rounded-full p-1">
          {tabs.map((tab) => {
            const isActive = category === tab.id;
            return (
              <button
                key={tab.id}
                // Sekarang aman tanpa menggunakan 'as any'
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {news.map((item) => (
            <div key={item.id} className="bg-[#121212] border border-[#2d2d2d] rounded-2xl overflow-hidden hover:border-[#4d4d4d] transition-colors duration-300 flex flex-col shadow-lg">
              
              {item.imageUrl && (
                <div className="w-full h-48 relative overflow-hidden bg-[#1e1e1e]">
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
                
                <h2 className="text-lg font-bold text-white leading-snug mb-3 hover:text-[#34d399] transition-colors line-clamp-3">
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                </h2>

                {/* Menggunakan property summary yang sudah tervalidasi di TypeScript */}
                <div className="text-sm text-neutral-400 line-clamp-4 leading-relaxed flex-grow">
                   <div dangerouslySetInnerHTML={{ __html: item.fullHtmlContent || item.summary || '' }} />
                </div>

                <div className="mt-5 pt-4 border-t border-[#2d2d2d] flex justify-between items-center">
                  <span className="text-xs text-neutral-500">
                    {new Date(item.pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs font-bold text-[#34d399] hover:text-white transition-colors">
                    Baca Full <ExternalLink size={12} className="ml-1" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}