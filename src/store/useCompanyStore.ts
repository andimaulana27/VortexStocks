import { create } from 'zustand';

interface Company {
  symbol: string;
  name: string;
  logo: string;
}

interface CompanyStore {
  companies: Record<string, Company>; // Menggunakan Record (Object) agar pencarian O(1)
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null; // Menyimpan pesan error spesifik untuk mempermudah debugging
  activeSymbol: string; // State untuk menyimpan saham yang sedang aktif di-klik
  fetchCompanies: () => Promise<void>;
  getCompany: (symbol: string) => Company | undefined;
  setActiveSymbol: (symbol: string) => void; // Fungsi untuk mengubah saham aktif
}

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  companies: {},
  isLoading: false,
  isError: false,
  errorMessage: null,
  activeSymbol: "BBCA", // Default saham yang aktif saat pertama kali buka layout
  
  fetchCompanies: async () => {
    // OPTIMASI: Jangan fetch lagi kalau data sudah ada di memori
    if (Object.keys(get().companies).length > 0) return;

    set({ isLoading: true, isError: false, errorMessage: null });
    
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
      
      if (!apiKey) {
        console.warn("⚠️ [VorteStocks] API Key GoAPI tidak ditemukan di environment variables!");
      }

      const res = await fetch('https://api.goapi.io/stock/idx/companies', {
        headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }
      });

      // Deteksi error HTTP (misal: 401 Unauthorized, 429 Too Many Requests, 500 Server Error)
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} - ${res.statusText}`);
      }

      const json = await res.json();

      // Validasi struktur respons dari API
      if (json.status === 'success' && Array.isArray(json.data?.results)) {
        // Ubah Array menjadi Object/Dictionary (Key: Symbol, Value: Data)
        const companyMap: Record<string, Company> = {};
        json.data.results.forEach((c: Company) => {
          companyMap[c.symbol.toUpperCase()] = c;
        });
        set({ companies: companyMap, isLoading: false, isError: false, errorMessage: null });
      } else {
        // Jika statusnya bukan success (misal limit habis dari GoAPI)
        const errorMsg = json.message || "Format data dari GoAPI tidak sesuai spesifikasi.";
        console.error("❌ [VorteStocks] GoAPI Response Error:", json);
        set({ isError: true, errorMessage: errorMsg, isLoading: false });
      }
      
    } catch (error: unknown) { 
      // PERBAIKAN: Mengganti 'any' menjadi 'unknown'
      console.error("❌ [VorteStocks] Gagal menarik data perusahaan:", error);
      
      // PERBAIKAN: Mengekstrak pesan error dengan aman menggunakan instanceof
      const errorMsg = error instanceof Error 
        ? error.message 
        : "Terjadi kesalahan saat menghubungi server API.";

      set({ 
        isError: true, 
        errorMessage: errorMsg, 
        isLoading: false 
      });
    }
  },
  
  getCompany: (symbol: string) => {
    return get().companies[symbol.toUpperCase()];
  },
  
  setActiveSymbol: (symbol: string) => {
    set({ activeSymbol: symbol.toUpperCase() });
  }
}));