const { CDPClient } = require('./collector_batch.js');

async function inspect() {
  const client = new CDPClient();
  await client.ensureConnected();
  const info = await client.eval(`
    (() => {
      return {
        url: window.location.href,
        title: document.title,
        bodySnippet: document.body ? document.body.innerText.slice(0, 400).replace(/\\n+/g, ' ') : 'NO_BODY',
        allLinks: Array.from(document.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('shopee')).slice(0, 10)
      };
    })()
  `);
  console.log('Incogniton Current State:', JSON.stringify(info, null, 2));
  client.close();
}

inspect().catch(console.error);
