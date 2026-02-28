import LandingPage from "@/components/landing/LandingPage";

export default function Home() {
  // Tidak perlu lagi ada pengecekan isLoading atau isAuthenticated.
  // Jika user sampai di halaman ini, Middleware sudah menjamin mereka belum login.
  return (
    <main className="flex-1 w-full h-screen bg-[#0a0a0a] overflow-x-hidden overflow-y-auto custom-scrollbar">
      <LandingPage />
    </main>
  );
}