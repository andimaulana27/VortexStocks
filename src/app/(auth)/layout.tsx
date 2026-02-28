import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Hanya memastikan area ini memanjang penuh dan bisa di-scroll
  // Tanpa merusak flexbox atau ornamen dari komponen page di dalamnya
  return (
    <main className="flex-1 w-full h-screen bg-[#0a0a0a] overflow-x-hidden overflow-y-auto custom-scrollbar flex flex-col">
      {children}
    </main>
  );
}