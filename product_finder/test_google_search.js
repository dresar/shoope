const { CDPClient, findActiveIncognitonPort } = require('./collector_batch.js');

async function testGoogleShopeeSearch() {
  const port = await findActiveIncognitonPort();
  console.log(`🔗 Connecting to port ${port}...`);
  const client = new CDPClient();
  await client.ensureConnected();

  const kw = 'tisu basah ajaib';
  const googleUrl = `https://www.google.com/search?q=site:shopee.co.id+${encodeURIComponent(kw)}`;
  console.log(`🌐 Navigating to Google: ${googleUrl}`);
  await client.navigate(googleUrl);
  await new Promise(r => setTimeout(r, 2000));

  const items = await client.eval(`
    (() => {
      const results = [];
      const links = Array.from(document.querySelectorAll('a[href*="shopee.co.id/"]'));
      const seen = new Set();
      for (const a of links) {
        let href = a.href || '';
        if (!href.includes('-i.') || seen.has(href)) continue;
        seen.add(href);
        const titleEl = a.querySelector('h3') || a;
        const title = (titleEl.innerText || '').trim();
        if (title) {
          results.push({
            url: href.split('?')[0],
            title: title,
            price: 'Rp Termurah',
            sold: 'Terlaris Shopee',
            rating: '4.8',
            isMall: href.toLowerCase().includes('mall'),
            isStar: true
          });
        }
        if (results.length >= 5) break;
      }
      return results;
    })()
  `);

  console.log('Google Search Shopee Results:', items);
  client.close();
}

testGoogleShopeeSearch().catch(console.error);
