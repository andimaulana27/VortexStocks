// src/hooks/useMarketData.ts
import useSWR from 'swr';

// 1. Fetcher Global mengarah ke Proxy Internal Next.js (Mencegah CORS)
const internalProxyFetcher = async (url: string) => {
  const res = await fetch(url, { method: 'GET' });
  
  if (!res.ok) {
    throw new Error('Gagal menarik data dari server internal');
  }
  
  return res.json();
};

// 2. Hook Khusus untuk Endpoint Indices (Digunakan di Topbar, Major Indices, Sektor, & Chart)
export function useIndices() {
  const { data, error, isLoading } = useSWR(
    // Menggunakan Proxy Route kita
    '/api/market?endpoint=stock/idx/indices', 
    internalProxyFetcher, 
    {
      // AUTO-POLLING: Tarik data baru setiap 15 detik untuk efek Real-Time
      refreshInterval: 15000, 
      
      // DEDUPING: Jika 4 komponen memanggil hook ini di detik yang sama, 
      // SWR hanya akan melakukan 1x Request (Sangat menghemat kuota limit)
      dedupingInterval: 2000, 
      
      // Sinkronisasi background saat user kembali membuka tab aplikasi
      revalidateOnFocus: true,
    }
  );

  return {
    indicesData: data?.data?.results || [],
    isLoading,
    isError: error
  };
}

// 3. Hook Khusus untuk Endpoint Trending (Digunakan di Topbar & Movers)
export function useTrending() {
  const { data, error, isLoading } = useSWR(
    // Menggunakan Proxy Route kita
    '/api/market?endpoint=stock/idx/trending', 
    internalProxyFetcher, 
    {
      refreshInterval: 15000, 
      dedupingInterval: 2000,
    }
  );

  return {
    trendingData: data?.data?.results || [],
    isLoading,
    isError: error
  };
}