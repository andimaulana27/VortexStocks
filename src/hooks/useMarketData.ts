import useSWR from 'swr';

// 1. Konfigurasi Fetcher Global untuk GoAPI
const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';

const goApiFetcher = async (url: string) => {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'X-API-KEY': apiKey
    }
  });
  
  if (!res.ok) {
    throw new Error('Gagal menarik data dari GoAPI');
  }
  
  return res.json();
};

// 2. Hook Khusus untuk Endpoint Indices (Digunakan di Topbar, Major Indices, Sektor, & Chart)
export function useIndices() {
  const { data, error, isLoading } = useSWR(
    'https://api.goapi.io/stock/idx/indices', 
    goApiFetcher, 
    {
      // AUTO-POLLING: Tarik data baru setiap 15 detik untuk efek Real-Time
      refreshInterval: 15000, 
      
      // DEDUPING: Jika 4 komponen memanggil hook ini di detik yang sama, 
      // SWR hanya akan melakukan 1x Request ke API (Sangat menghemat kuota limit)
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
    'https://api.goapi.io/stock/idx/trending', 
    goApiFetcher, 
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