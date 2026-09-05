const fs = require('fs');

// Metode 1: DuckDuckGo HTML Scraper
async function searchDDG(keyword) {
  try {
    const q = encodeURIComponent(`site:shopee.co.id ${keyword}`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    const html = await res.text();
    const results = [];
    const linkRegex = /<a[^>]+class="result__snippet"[^>]*>|<a[^>]+class="result__url"[^>]+href="([^"]+)"/g;
    const allA = [...html.matchAll(/<a[^>]+href="([^"]*uddg=[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
    
    for (const match of allA) {
      const rawUrl = match[1];
      const uMatch = rawUrl.match(/uddg=([^&]+)/);
      if (uMatch) {
        const decoded = decodeURIComponent(uMatch[1]);
        if (decoded.includes('shopee.co.id') && decoded.includes('-i.')) {
          const cleanUrl = decoded.split('?')[0];
          const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();
          if (!results.find(r => r.url === cleanUrl)) {
            results.push({
              title: rawTitle || keyword,
              url: cleanUrl,
              isMall: cleanUrl.toLowerCase().includes('mall'),
              isStar: true,
              price: 'Rp Termurah',
              sold: 'Terlaris',
              rating: '4.8'
            });
          }
        }
      }
      if (results.length >= 5) break;
    }
    return results;
  } catch (err) {
    console.error('DDG Error:', err.message);
    return [];
  }
}

// Metode 2: Google Search via Browser CDP tanpa login
// Buka Google di Chrome biasa: https://www.google.com/search?q=site:shopee.co.id+keyword
async function test() {
  console.log('Testing DDG Shopee search...');
  const res = await searchDDG('tisu basah ajaib');
  console.log('Results from DDG:', res);
}

test();
