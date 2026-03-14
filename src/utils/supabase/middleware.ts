import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const currentPath = request.nextUrl.pathname;
  
  // Deteksi rute
  const isAuthPage = currentPath.startsWith('/login') || currentPath.startsWith('/verify-portfolio');
  const isPublicPage = currentPath === '/';
  const isAdminRoute = currentPath.startsWith('/admin'); // NEW: Deteksi rute admin

  // 1. Jika BELUM login dan mencoba akses dashboard/admin/rute rahasia
  if (!user && !isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Jika SUDAH login
  if (user) {
    // NEW: Ambil role dari tabel profiles untuk verifikasi hak akses admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isUserAdmin = profile?.role === 'admin';

    // PROTEKSI RUTE ADMIN: Jika user biasa mencoba masuk ke URL /admin/*
    if (isAdminRoute && !isUserAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard' // Tendang balik ke dashboard biasa
      return NextResponse.redirect(url)
    }

    // Jika user SUDAH login mencoba akses Landing Page atau Halaman Login
    if (currentPath === '/login' || isPublicPage) {
      const url = request.nextUrl.clone()
      // Jika dia admin, bisa diarahkan ke halaman admin (opsional), jika user ke dashboard
      url.pathname = isUserAdmin ? '/admin/users' : '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}