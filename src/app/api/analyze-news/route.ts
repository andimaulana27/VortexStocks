// src/app/api/analyze-news/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. PENCEGAHAN BUG: Pastikan variabel tidak undefined
    const title = body?.title || 'Berita Tanpa Judul';
    const content = body?.content || '';
    
    // Jika tidak ada isi berita sama sekali, kembalikan respons default alih-alih error 500
    if (content.trim().length === 0) {
      return NextResponse.json({ 
        status: 'success', 
        data: {
          points: ["Konten berita tidak tersedia dari sumber penyedia (RSS kosong)."],
          impact: "Tidak dapat menganalisis sentimen karena isi berita tidak tersedia."
        }
      });
    }

    // Bersihkan tag HTML dari konten agar AI membaca teks murninya saja
    const cleanContent = content.replace(/<[^>]*>?/gm, '').substring(0, 4000);

    // Ambil API Key dari .env.local
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'GEMINI_API_KEY belum dipasang di .env.local' 
      }, { status: 500 });
    }

    const prompt = `
    Anda adalah seorang analis pasar modal profesional. Tolong analisis berita keuangan berikut.
    Judul: ${title}
    Isi Berita: ${cleanContent}
    
    Berikan format output JSON persis seperti ini (tanpa awalan markdown atau akhiran apapun):
    {
      "points": [
        "Poin ringkasan pertama (fokus pada data/fakta penting)",
        "Poin ringkasan kedua",
        "Poin ringkasan ketiga"
      ],
      "impact": "Penjelasan singkat (2-3 kalimat) bagaimana berita ini mempengaruhi pasar saham secara umum atau emiten terkait (apakah sentimen positif, negatif, atau netral)."
    }
    `;

    // 2. PENCEGAHAN BUG: Kita gunakan gemini-1.5-flash karena ini 100% didukung semua API Key Gratis
    const modelName = 'gemini-2.5-flash'; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          response_mime_type: "application/json",
          temperature: 0.3 
        }
      })
    });

    const data = await response.json();
    
    // Tangkap pesan error ASLI dari Google
    if (!response.ok || data.error) {
        console.error("Detail Error API Gemini:", data.error);
        throw new Error(data.error?.message || `HTTP Error ${response.status}: Gagal menghubungi Google Gemini`);
    }

    // Tangkap jika respons diblokir oleh sistem filter kata-kata kasar/berbahaya Google
    if (!data.candidates || data.candidates.length === 0) {
        throw new Error("Respons AI kosong atau diblokir oleh sistem keamanan konten Google.");
    }

    let aiText = data.candidates[0].content.parts[0].text;
    
    // 3. PENCEGAHAN BUG: Bersihkan Markdown Backticks (```json) yang bisa membuat JSON.parse() crash
    aiText = aiText.replace(/```json/gi, '').replace(/```/gi, '').trim();

    // Parse string menjadi JSON
    const result = JSON.parse(aiText);

    return NextResponse.json({ status: 'success', data: result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan tidak terduga";
    
    // Log merah menyala di terminal agar gampang dicari jika masih error!
    console.error("🔥 AI Analysis Error:", errorMessage);
    
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}