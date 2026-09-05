const { CDPClient, findActiveIncognitonPort } = require('./collector_batch.js');

async function testSearchIncogniton() {
  const port = await findActiveIncognitonPort();
  const client = new CDPClient();
  await client.ensureConnected();

  const kw = 'spatula silikon tahan panas';
  const url = `https://shopee.co.id/search?keyword=${encodeURIComponent(kw)}&sortBy=sales`;
  console.log(`🔎 Scraping kata kunci: "${kw}" di Incogniton...`);
  await client.navigate(url);
  await new Promise(r => setTimeout(r, 2000));
  await client.eval('window.scrollBy(0, 600)');
  await new Promise(r => setTimeout(r, 1800));

  const items = await client.eval(`
    (() => {
      const results = [];
      const links = Array.from(document.querySelectorAll('a[data-sqe="link"], a[href*="-i."]'));
      const seen = new Set();
      for (const a of links) {
        let href = (a.href || '').split('?')[0];
        if (!href.includes('-i.') || seen.has(href)) continue;
        seen.add(href);
        const fullText = (a.innerText || '').trim();
        const lines = fullText.split('\\n').map(s => s.trim()).filter(Boolean);
        results.push({
          url: href,
          title: lines[0] || '',
          price: lines.find(t => t.includes('Rp')) || '',
          sold: lines.find(t => t.toLowerCase().includes('terjual') || t.toLowerCase().includes('rb')) || '',
          rating: lines.find(t => /^\\d\\.\\d$/.test(t)) || ''
        });
        if (results.length >= 5) break;
      }
      return results;
    })()
  `);

  console.log(`\n🎉 Diperoleh ${items?.length || 0} produk Shopee dari Incogniton:`);
  items?.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.title} (${p.price} | ${p.sold} | ⭐ ${p.rating})`);
    console.log(`      🔗 ${p.url}`);
  });

  client.close();
}

testSearchIncogniton().catch(console.error);
