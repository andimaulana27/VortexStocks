// src/types/database.ts

// 1. Definisikan Interface yang strict sesuai dengan format di SQL
export interface TechnicalSettings {
  ma_ema: boolean;
  macd: boolean;
  smart_money: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  technical_settings: TechnicalSettings;
}

// 2. Buat konstanta Default Settings sebagai fallback (jaring pengaman)
export const DEFAULT_TECHNICAL_SETTINGS: TechnicalSettings = {
  ma_ema: false,
  macd: true,
  smart_money: true,
};

// 3. Helper function untuk parsing data JSON dari Supabase secara aman
// PERBAIKAN: Mengganti 'any' menjadi 'unknown' agar lolos ESLint strict mode
export function parseTechnicalSettings(rawSettings: unknown): TechnicalSettings {
  // Jika null, undefined, atau bukan object, langsung kembalikan default
  if (!rawSettings || typeof rawSettings !== 'object') {
    return DEFAULT_TECHNICAL_SETTINGS;
  }

  // Lakukan type assertion (casting) ke Record untuk memeriksa key di dalam object
  const settings = rawSettings as Record<string, unknown>;

  // Validasi setiap properti dengan memastikan tipenya benar-benar boolean
  return {
    ma_ema: 
      typeof settings.ma_ema === 'boolean' 
        ? settings.ma_ema 
        : DEFAULT_TECHNICAL_SETTINGS.ma_ema,
        
    macd: 
      typeof settings.macd === 'boolean' 
        ? settings.macd 
        : DEFAULT_TECHNICAL_SETTINGS.macd,
        
    smart_money: 
      typeof settings.smart_money === 'boolean' 
        ? settings.smart_money 
        : DEFAULT_TECHNICAL_SETTINGS.smart_money,
  };
}