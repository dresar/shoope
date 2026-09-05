const { CDPClient, getShopeeTab } = require('./collector_batch.js');

async function check() {
  console.log('🔍 Memeriksa status browser Chrome & login Shopee...');
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await res.json();
  console.log('📑 Tab yang terbuka:');
  tabs.forEach(t => console.log(`   - [${t.title}] (${t.url})`));

  let shopeeTab = tabs.find(t => t.url && t.url.includes('shopee.co.id'));
  if (!shopeeTab) {
    console.log('🌐 Membuka tab Shopee...');
    const newTabRes = await fetch('http://127.0.0.1:9222/json/new?https://shopee.co.id', { method: 'PUT' });
    shopeeTab = await newTabRes.json();
  }

  const client = new CDPClient();
  await client.ensureConnected();
  await client.navigate('https://shopee.co.id');
  await new Promise(r => setTimeout(r, 2000));
  
  const pageInfo = await client.eval(`
    (() => {
      const text = document.body.innerText.toLowerCase();
      const isLogin = text.includes('pesanan saya') ||
                      text.includes('akun saya') ||
                      text.includes('ugry23') ||
                      document.querySelector('.navbar__username') !== null ||
                      document.querySelector('[class*="user-name"]') !== null;
      return {
        title: document.title,
        url: window.location.href,
        isLoggedIn: isLogin,
        bodySample: document.body.innerText.slice(0, 150).replace(/\\n+/g, ' ')
      };
    })()
  `);

  console.log('\n📊 HASIL PEMERIKSAAN SHOPEE:');
  console.log(`   URL Halaman : ${pageInfo?.url}`);
  console.log(`   Status Login: ${pageInfo?.isLoggedIn ? '✅ SUDAH LOGIN' : '⚠️ BELUM LOGIN'}`);
  
  client.close();
}

check().catch(console.error);
