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
  
  // Deteksi rute auth yang baru
  const isAuthPage = currentPath.startsWith('/login') || currentPath.startsWith('/verify-portfolio');
  const isPublicPage = currentPath === '/';

  // 1. Jika BELUM login dan mencoba akses dashboard/rute rahasia
  if (!user && !isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login' // Arahkan ke rute /login yang baru
    return NextResponse.redirect(url)
  }

  // 2. Jika SUDAH login dan mencoba akses Landing Page atau Halaman Login
  if (user && (currentPath === '/login' || isPublicPage)) {
    // Arahkan ke dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}