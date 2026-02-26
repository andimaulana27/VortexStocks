"use client";

import { useEffect } from 'react';
import { useCompanyStore } from '@/store/useCompanyStore';

export default function GlobalInit() {
  const fetchCompanies = useCompanyStore(state => state.fetchCompanies);
  
  useEffect(() => {
    // Sedot 900+ data emiten secara diam-diam di background saat web dibuka
    fetchCompanies();
  }, [fetchCompanies]);

  return null; // Komponen ini tidak menampilkan visual apapun
}