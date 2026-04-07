// src/app/api/news/route.ts
import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['description', 'summary'],
      ['enclosure', 'image'],
      ['media:content', 'mediaContent'], // Standar image Yahoo/CNBC Internasional
    ],
  },
});

// Daftar RSS Feed Berita Keuangan Terbaik
const FEEDS = {
  global: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664', // CNBC Finance & Market Global
  indonesia: 'https://www.cnbcindonesia.com/market/rss', // CNBC Indonesia Market
  crypto: 'https://cointelegraph.com/rss' // Cointelegraph Crypto News
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'global';
  const feedUrl = FEEDS[category as keyof typeof FEEDS] || FEEDS.global;

  try {
    const feed = await parser.parseURL(feedUrl);
    
    // Ambil 20 berita terbaru
    const newsData = feed.items.slice(0, 20).map((item) => {
      let imageUrl = null;
      
      // Deteksi gambar dari berbagai format RSS Internasional
      if (item.image?.url) {
        imageUrl = item.image.url;
      } else if (item.mediaContent?.$?.url) {
        imageUrl = item.mediaContent.$.url;
      } else {
        // Jika tidak ada di metadata, cari tag <img> di dalam isi artikel HTML
        const htmlContent = item.contentEncoded || item.content || item.summary || '';
        const match = htmlContent.match(/<img[^>]+src="([^">]+)"/);
        if (match) imageUrl = match[1];
      }

      return {
        id: item.guid || item.link,
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        summary: item.summary,
        // Menyimpan format HTML asli (tebal, miring, paragraf)
        fullHtmlContent: item.contentEncoded || item.content || item.summary,
        source: feed.title || (category === 'global' ? 'CNBC International' : category),
        imageUrl,
      };
    });

    return NextResponse.json({ status: 'success', data: newsData });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ status: 'error', message: errorMsg }, { status: 500 });
  }
}