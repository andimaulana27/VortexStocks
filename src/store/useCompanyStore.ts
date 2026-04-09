// src/store/useCompanyStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Company {
  symbol: string;
  name: string;
  logo: string;
}

interface CompanyStore {
  companies: Record<string, Company>; // Menggunakan Record (Object) agar pencarian O(1)
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  activeSymbol: string;
  fetchCompanies: () => Promise<void>;
  getCompany: (symbol: string) => Company | undefined;
  setActiveSymbol: (symbol: string) => void;
}

// Gunakan kurung kurawal ganda ()() untuk kompatibilitas TypeScript dengan middleware
export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set, get) => ({
      companies: {},
      isLoading: false,
      isError: false,
      errorMessage: null,
      activeSymbol: "BBCA", // Default saham
      
      fetchCompanies: async () => {
        if (Object.keys(get().companies).length > 0) return;

        set({ isLoading: true, isError: false, errorMessage: null });
        
        try {
          // PERBAIKAN: Memanggil endpoint proxy internal, menghindari error CORS
          const res = await fetch('/api/market?endpoint=stock/idx/companies');

          if (!res.ok) {
            throw new Error(`HTTP Error: ${res.status} - ${res.statusText}`);
          }

          const json = await res.json();

          if (json.status === 'success' && Array.isArray(json.data?.results)) {
            const companyMap: Record<string, Company> = {};
            json.data.results.forEach((c: Company) => {
              companyMap[c.symbol.toUpperCase()] = c;
            });
            set({ companies: companyMap, isLoading: false, isError: false, errorMessage: null });
          } else {
            const errorMsg = json.message || "Format data dari API tidak sesuai spesifikasi.";
            set({ isError: true, errorMessage: errorMsg, isLoading: false });
          }
          
        } catch (error: unknown) { 
          const errorMsg = error instanceof Error 
            ? error.message 
            : "Terjadi kesalahan saat menghubungi server proxy internal.";

          set({ isError: true, errorMessage: errorMsg, isLoading: false });
        }
      },
      
      getCompany: (symbol: string) => {
        return get().companies[symbol.toUpperCase()];
      },
      
      setActiveSymbol: (symbol: string) => {
        set({ activeSymbol: symbol.toUpperCase() });
      }
    }),
    {
      name: 'vortestocks-company-storage', // Nama key yang akan muncul di LocalStorage browser
      // PARTIALIZE: HANYA simpan activeSymbol ke LocalStorage, abaikan companies data yang besar
      partialize: (state) => ({ activeSymbol: state.activeSymbol }),
    }
  )
);