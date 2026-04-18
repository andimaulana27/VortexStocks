// src/hooks/useMarketData.ts
import useSWR from 'swr';

const internalProxyFetcher = async (url: string) => {
  const res = await fetch(url, { method: 'GET' });
  
  if (!res.ok) {
    throw new Error('Gagal menarik data dari server internal');
  }
  
  return res.json();
};

// Cek apakah market sedang buka (bukan weekend)
const checkIsMarketOpen = () => {
  const day = new Date().getDay();
  return day !== 0 && day !== 6; // 0 = Minggu, 6 = Sabtu
};

export function useIndices() {
  const isMarketOpen = checkIsMarketOpen();
  
  const { data, error, isLoading } = useSWR(
    '/api/market?endpoint=stock/idx/indices', 
    internalProxyFetcher, 
    {
      // SMART POLLING: Matikan refresh (0) jika market tutup (weekend)
      refreshInterval: isMarketOpen ? 15000 : 0, 
      dedupingInterval: 2000, 
      revalidateOnFocus: true,
    }
  );

  return {
    indicesData: data?.data?.results || [],
    isLoading,
    isError: error
  };
}

export function useTrending() {
  const isMarketOpen = checkIsMarketOpen();

  const { data, error, isLoading } = useSWR(
    '/api/market?endpoint=stock/idx/trending', 
    internalProxyFetcher, 
    {
      // SMART POLLING
      refreshInterval: isMarketOpen ? 15000 : 0, 
      dedupingInterval: 2000,
    }
  );

  return {
    trendingData: data?.data?.results || [],
    isLoading,
    isError: error
  };
}