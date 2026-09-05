const { CDPClient } = require('./collector_batch.js');

async function testConnection() {
  console.log('🔍 Menguji koneksi dan akses pencarian Shopee...');
  const client = new CDPClient();
  await client.ensureConnected();

  const testKeyword = 'spatula silikon tahan panas';
  const url = `https://shopee.co.id/search?keyword=${encodeURIComponent(testKeyword)}&sortBy=sales`;
  console.log(`🌐 Navigasi ke: ${url}`);
  await client.navigate(url);
  await new Promise(r => setTimeout(r, 2000));
  await client.eval('window.scrollBy(0, 600)');
  await new Promise(r => setTimeout(r, 2000));

  const result = await client.eval(`
    (() => {
      const links = Array.from(document.querySelectorAll('a[data-sqe="link"], a[href*="-i."]'));
      return {
        url: window.location.href,
        title: document.title,
        isTrafficError: window.location.href.includes('/verify/traffic/error'),
        foundCount: links.length,
        sampleTitle: links[0]?.innerText?.split('\\n')[0] || ''
      };
    })()
  `);

  console.log('\n📊 HASIL TES:');
  console.log(`   URL Aktif      : ${result?.url}`);
  console.log(`   Judul Halaman  : ${result?.title}`);
  console.log(`   Status Blokir  : ${result?.isTrafficError ? '❌ MASIH TERBLOKIR' : '✅ BEBAS BLOKIR (LANCAR)'}`);
  console.log(`   Jumlah Produk  : ${result?.foundCount} produk ditemukan`);
  if (result?.sampleTitle) {
    console.log(`   Sample Produk  : ${result?.sampleTitle}`);
  }

  client.close();
  return !result?.isTrafficError && result?.foundCount > 0;
}

testConnection().catch(console.error);
