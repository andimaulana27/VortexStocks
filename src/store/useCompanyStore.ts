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
  activeSymbol: string; // NEW: State untuk menyimpan saham yang sedang aktif di-klik
  fetchCompanies: () => Promise<void>;
  getCompany: (symbol: string) => Company | undefined;
  setActiveSymbol: (symbol: string) => void; // NEW: Fungsi untuk mengubah saham aktif
}

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  companies: {},
  isLoading: false,
  isError: false,
  activeSymbol: "BBCA", // Default saham yang aktif saat pertama kali buka layout
  fetchCompanies: async () => {
    // OPTIMASI: Jangan fetch lagi kalau data sudah ada di memori
    if (Object.keys(get().companies).length > 0) return;

    set({ isLoading: true, isError: false });
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOAPI_KEY || '';
      const res = await fetch('https://api.goapi.io/stock/idx/companies', {
        headers: { 'accept': 'application/json', 'X-API-KEY': apiKey }
      });
      const json = await res.json();

      if (json.status === 'success' && Array.isArray(json.data?.results)) {
        // Ubah Array menjadi Object/Dictionary (Key: Symbol, Value: Data)
        const companyMap: Record<string, Company> = {};
        json.data.results.forEach((c: Company) => {
          companyMap[c.symbol.toUpperCase()] = c;
        });
        set({ companies: companyMap, isLoading: false });
      } else {
        set({ isError: true, isLoading: false });
      }
    } catch {
      set({ isError: true, isLoading: false });
    }
  },
  getCompany: (symbol: string) => {
    return get().companies[symbol.toUpperCase()];
  },
  setActiveSymbol: (symbol: string) => {
    set({ activeSymbol: symbol.toUpperCase() });
  }
}));