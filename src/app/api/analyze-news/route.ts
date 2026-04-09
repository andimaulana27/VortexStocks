// src/app/api/analyze-news/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const title = body?.title || 'Berita Tanpa Judul';
    const content = body?.content || '';
    
    if (content.trim().length === 0) {
      return NextResponse.json({ 
        status: 'success', 
        data: { points: ["Konten berita tidak tersedia dari sumber penyedia (RSS kosong)."], impact: "Tidak dapat menganalisis sentimen karena isi berita tidak tersedia." }
      });
    }

    const cleanContent = content.replace(/<[^>]*>?/gm, '').substring(0, 5000); 

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ status: 'error', message: 'GEMINI_API_KEY belum dipasang' }, { status: 500 });
    }

    // Prompt diubah agar otomatis menterjemahkan teks ke Bahasa Indonesia apapun sumber aslinya
    const prompt = `
    Anda adalah seorang Analis Pasar Modal Senior. Analisis berita keuangan berikut.
    Judul: ${title}
    Isi Berita: ${cleanContent}
    
    ATURAN WAJIB: 
    1. Anda harus merespons DALAM BAHASA INDONESIA, tidak peduli apa bahasa asli beritanya.
    2. Berikan output HANYA dalam format JSON valid persis seperti ini:
    {
      "points": [
        "Fakta krusial 1",
        "Fakta krusial 2",
        "Fakta krusial 3"
      ],
      "impact": "Penjelasan 2-3 kalimat bagaimana berita ini mempengaruhi pasar saham/crypto (Sentimen: Positif/Negatif/Netral)."
    }
    `;

    // Sistem Auto-Fallback Anti-Limit
    const modelsToTry = [
      "gemini-2.5-flash",              
      "gemini-3.1-flash-lite-preview", 
      "gemini-3-flash-preview",        
      "gemini-2.0-flash-001",          
      "gemini-2.0-flash-lite-001"
    ];

    let aiText = "";
    let isSuccess = false;
    let lastError = "";

    for (const modelName of modelsToTry) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { 
                        response_mime_type: "application/json",
                        temperature: 0.2 // Diturunkan agar analisa pasar lebih faktual & tidak halusinasi
                    }
                })
            });

            const data = await response.json();
            
            if (response.ok && data.candidates && data.candidates.length > 0) {
                aiText = data.candidates[0].content.parts[0].text;
                isSuccess = true;
                console.log(`✅ Analisis Berita Sukses menggunakan: ${modelName}`);
                break; // Keluar dari loop jika sukses
            } else {
                throw new Error(data.error?.message || "Respons kosong");
            }
        } catch (e: unknown) { // <-- PERBAIKAN 1: any diubah menjadi unknown
            // Mengambil pesan error secara aman dengan TypeScript
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.warn(`⚠️ Model ${modelName} gagal:`, errorMessage);
            lastError = errorMessage;
        }
    }

    if (!isSuccess) {
        throw new Error(`Semua server Gemini sedang sibuk. Error terakhir: ${lastError}`);
    }
    
    // Pembersihan markdown JSON
    aiText = aiText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const result = JSON.parse(aiText);

    return NextResponse.json({ status: 'success', data: result });
  } catch (error: unknown) { // <-- PERBAIKAN 2: any diubah menjadi unknown
    // Mengambil pesan error secara aman dengan TypeScript
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("🔥 AI Analysis Error:", errorMessage);
    return NextResponse.json({ status: 'error', message: errorMessage }, { status: 500 });
  }
}