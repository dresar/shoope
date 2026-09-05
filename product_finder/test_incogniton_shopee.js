const { CDPClient, findActiveIncognitonPort } = require('./collector_batch.js');

async function testShopeeLoad() {
  console.log('🔍 Menghubungkan ke Incogniton (Shopee Scraper Pro)...');
  const port = await findActiveIncognitonPort();
  console.log(`✅ Terhubung ke Port: ${port}`);

  const client = new CDPClient(port);
  await client.ensureConnected();

  console.log('🌐 Membuka https://shopee.co.id di jendela Incogniton...');
  await client.navigate('https://shopee.co.id');
  await new Promise(r => setTimeout(r, 3000));

  const page = await client.eval(`
    (() => {
      return {
        title: document.title,
        url: window.location.href,
        isTrafficError: window.location.href.includes('/verify/traffic/error'),
        sampleText: document.body.innerText.slice(0, 100).replace(/\\n+/g, ' ')
      };
    })()
  `);

  console.log('\n📊 HASIL MEMBUKA SHOPEE:');
  console.log(`   URL Aktif     : ${page?.url}`);
  console.log(`   Judul Tab     : ${page?.title}`);
  console.log(`   Status Blokir : ${page?.isTrafficError ? '❌ TERBLOKIR' : '✅ 100% AMAN (TIDAK ADA BLOKIR)'}`);

  client.close();
}

testShopeeLoad().catch(console.error);
