const { CDPClient } = require('./collector_batch.js');

async function testFetchApi() {
  const client = new CDPClient();
  await client.ensureConnected();

  console.log('🧪 Menguji in-page Shopee API fetch...');
  const res = await client.eval(`
    (async () => {
      try {
        const url = 'https://shopee.co.id/api/v4/search/search_items?by=sales&keyword=spatula%20silikon&limit=5&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2';
        const r = await fetch(url, {
          headers: {
            'x-api-source': 'pc',
            'x-shopee-language': 'id'
          }
        });
        const data = await r.json();
        return {
          status: r.status,
          total_count: data.total_count,
          itemsCount: data.items ? data.items.length : 0,
          sample: data.items && data.items[0] ? data.items[0].item_basic?.name : null
        };
      } catch (err) {
        return { error: err.message };
      }
    })()
  `);

  console.log('API Result:', JSON.stringify(res, null, 2));
  client.close();
}

testFetchApi().catch(console.error);
