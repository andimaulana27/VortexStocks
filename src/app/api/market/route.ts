// src/app/api/market/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json({ status: 'error', message: "Parameter 'endpoint' wajib diisi" }, { status: 400 });
  }

  // Rekonstruksi URL target ke GoAPI
  const targetUrl = new URL(`https://api.goapi.io/${endpoint}`);
  
  // Teruskan semua parameter query (misal: symbols=BBCA) kecuali 'endpoint' itu sendiri
  url.searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      targetUrl.searchParams.append(key, value);
    }
  });

  // Ambil API Key dari environment variables
  const apiKey = process.env.GOAPI_KEY || process.env.NEXT_PUBLIC_GOAPI_KEY;

  if (!apiKey) {
    return NextResponse.json({ status: 'error', message: "API Key GoAPI belum disetting di .env.local" }, { status: 500 });
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'X-API-KEY': apiKey
      },
      // Matikan cache bawaan fetch Next.js agar SWR di frontend bisa mengatur cache-nya sendiri
      cache: 'no-store' 
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan jaringan saat menghubungi GoAPI";
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}