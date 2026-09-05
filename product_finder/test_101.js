/**
 * test_101.js - Test End-to-End Flow for Product No. 101
 * 1. Scrape top sales candidate products from Shopee
 * 2. Analyze with OpenAgentic oa-claude-sonnet-4.6 to pick the #1 best match
 * 3. Navigate to Shopee Affiliate Custom Link (https://affiliate.shopee.co.id/offer/custom_link)
 * 4. Generate & capture the official Affiliate Shortlink (s.shopee.co.id/...)
 */

const fs = require('fs');
const path = require('path');

const CDP_HTTP = 'http://127.0.0.1:9222';
const OPENAGENTIC_API_KEY = 'sk-proj-SANITIZED_KEY_PROTECTED';
const OPENAGENTIC_MODEL = 'oa-claude-sonnet-4.6';
const OPENAGENTIC_URL = 'https://openagentic.id/api/v1/chat/completions';

const DATA_FILE = path.join('C:', 'Users', 'NCN0C', 'Downloads', 'Video Konten Terlaris', '2', 'data.json');

async function getShopeeTab() {
  const res = await fetch(`${CDP_HTTP}/json/list`);
  const tabs = await res.json();
  let tab = tabs.find(t => t.url && t.url.includes('shopee.co.id'));
  if (!tab) {
    const newRes = await fetch(`${CDP_HTTP}/json/new?https://shopee.co.id`, { method: 'PUT' });
    tab = await newRes.json();
  }
  return tab;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id && this.callbacks.has(data.id)) {
          const cb = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) cb.reject(data.error);
          else cb.resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res?.result?.value;
  }

  async navigate(url) {
    await this.send('Page.navigate', { url });
    await new Promise(r => setTimeout(r, 3500));
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

// Call Claude via OpenAgentic
async function callClaudeAnalyzer(videoItem, candidates) {
  console.log(`🤖 Mengirim ${candidates.length} kandidat ke AI Claude (${OPENAGENTIC_MODEL})...`);
  
  const prompt = `Anda adalah pakar e-commerce affiliate Shopee. 
Tugas Anda: Pilih 1 produk terbaik yang PALING RELEVAN dengan konten video berikut dan memiliki reputasi/penjualan terbaik (Shopee Mall / Star / Terlaris).

INFORMASI KONTEN VIDEO:
- Judul: ${videoItem.judul}
- Hook: ${videoItem.hook}
- Deskripsi: ${videoItem.deskripsi}
- Kata Kunci: ${(videoItem.kata_kunci_shopee || []).join(', ')}

DAFTAR KANDIDAT PRODUK SHOPEE:
${JSON.stringify(candidates, null, 2)}

Format Jawaban (WAJIB JSON valid saja tanpa teks pembuka/penutup):
{
  "selectedIndex": 0,
  "productTitle": "judul produk yang dipilih",
  "productUrl": "url produk yang dipilih",
  "reason": "alasan singkat kenapa produk ini paling tepat"
}`;

  const res = await fetch(OPENAGENTIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAGENTIC_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAGENTIC_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    })
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '{}';
  const cleanJsonMatch = text.match(/\{[\s\S]*\}/);
  if (cleanJsonMatch) {
    return JSON.parse(cleanJsonMatch[0]);
  }
  return candidates[0]; // fallback
}

async function generateAffiliateLink(client, productUrl, subId = '101') {
  console.log(`\n🌐 [Affiliate Portal] Menuju https://affiliate.shopee.co.id/offer/custom_link...`);
  await client.navigate('https://affiliate.shopee.co.id/offer/custom_link');
  await new Promise(r => setTimeout(r, 4000));

  console.log(`📝 [Affiliate Portal] Mengisi URL produk & Sub-ID...`);
  const fillResult = await client.eval(`
    (() => {
      // Set Native Value Helper
      function setVal(el, val) {
        const valSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
        const proto = Object.getPrototypeOf(el);
        const protoValSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (protoValSetter && valSetter !== protoValSetter) {
          protoValSetter.call(el, val);
        } else if (valSetter) {
          valSetter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const textarea = document.querySelector('textarea, div[class*="customLink"] textarea, div[class*="custom_link"] textarea');
      if (!textarea) return { success: false, error: 'Textarea tidak ditemukan. Pastikan sudah login Shopee Affiliate.' };

      textarea.focus();
      setVal(textarea, ${JSON.stringify(productUrl)});

      // Isi Sub-ID jika ada input subtag
      const tag1 = document.querySelector('input[placeholder*="SepatuOlahraga"], input[placeholder*="Tag 1"], input[placeholder*="Sub-ID"]');
      if (tag1) setVal(tag1, ${JSON.stringify(subId)});

      return { success: true };
    })()
  `);

  if (!fillResult?.success) {
    console.error(`❌ Gagal mengisi form:`, fillResult?.error);
    return null;
  }

  await new Promise(r => setTimeout(r, 600));

  console.log(`🔘 [Affiliate Portal] Mengklik tombol 'Buat Link' / 'Dapatkan Tautan'...`);
  const clickResult = await client.eval(`
    (() => {
      function findBtn(text) {
        return Array.from(document.querySelectorAll('button')).find(b => 
          (b.innerText || '').trim().toLowerCase().includes(text.toLowerCase())
        );
      }

      const btn = findBtn('Buat Link') || findBtn('Create Link') || findBtn('Dapatkan Tautan') || 
                  document.querySelector('button.ant-btn-primary, button[class*="primary"], button[type="submit"]');
      
      if (btn) {
        btn.click();
        return { clicked: true, text: btn.innerText.trim() };
      }
      return { clicked: false };
    })()
  `);

  console.log(`   Status tombol:`, clickResult);
  console.log(`⏳ [Affiliate Portal] Menunggu Shortlink Affiliate muncul...`);

  // Polling Shortlink modal
  let shortUrl = null;
  for (let i = 0; i < 25; i++) {
    await new Promise(r => setTimeout(r, 500));
    shortUrl = await client.eval(`
      (() => {
        const inputs = Array.from(document.querySelectorAll('div[role="dialog"] input, div[role="dialog"] textarea, div[class*="modal"] input, div[class*="modal"] textarea, input, textarea'));
        for (const inp of inputs) {
          const val = (inp.value || inp.innerText || '').trim();
          if (val.includes('s.shopee.co.id/') || val.includes('shope.ee/')) {
            const m = val.match(/https:\\/\\/(?:s\\.shopee\\.co\\.id|shope\\.ee)\\/[a-zA-Z0-9_-]+/);
            if (m) return m[0];
          }
        }
        const bodyMatch = document.body.innerText.match(/https:\\/\\/(?:s\\.shopee\\.co\\.id|shope\\.ee)\\/[a-zA-Z0-9_-]+/);
        if (bodyMatch) return bodyMatch[0];
        return null;
      })()
    `);

    if (shortUrl) break;
  }

  return shortUrl;
}

async function runTest101() {
  console.log('================================================================================');
  console.log('🚀 UJI COBA OTOMASI END-TO-END PRODUK NO. 101');
  console.log('🤖 AI ENGINE: OpenAgentic (oa-claude-sonnet-4.6)');
  console.log('================================================================================\n');

  const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const item = rawData.find(d => String(d.id) === '101');
  if (!item) {
    console.error('Data No. 101 tidak ditemukan!');
    return;
  }

  console.log(`📦 [1] Data Video No. 101:`);
  console.log(`   Judul: ${item.judul}`);
  console.log(`   Hook: ${item.hook}`);
  console.log(`   Kata Kunci: ${(item.kata_kunci_shopee || []).join(', ')}`);

  const tab = await getShopeeTab();
  console.log(`\n🔗 [2] Terhubung ke Chrome: ${tab.title}`);
  const client = new CDPClient(tab.webSocketDebuggerUrl);
  await client.connect();

  const kw = item.kata_kunci_shopee?.[0] || item.judul;
  const searchUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(kw)}&sortBy=sales`;
  console.log(`\n🔍 [3] Melakukan Scraping Shopee (Sort: Terlaris / Mall): ${searchUrl}`);
  await client.navigate(searchUrl);
  await client.eval(`window.scrollBy(0, 500);`);
  await new Promise(r => setTimeout(r, 2500));

  const candidates = await client.eval(`
    (() => {
      const items = [];
      const links = Array.from(document.querySelectorAll('a[data-sqe="link"], a[href*="-i."]'));
      const seen = new Set();
      for (const a of links) {
        const href = (a.href || '').split('?')[0];
        if (!href.includes('-i.') || seen.has(href)) continue;
        seen.add(href);

        const textLines = (a.innerText || '').split('\\n').map(s => s.trim()).filter(Boolean);
        const fullText = (a.innerText || '').toLowerCase();
        items.push({
          url: href,
          title: textLines[0] || '',
          price: textLines.find(t => t.includes('Rp') || /^[\\d.,]+$/.test(t)) || '',
          sold: textLines.find(t => t.toLowerCase().includes('terjual') || t.toLowerCase().includes('rb')) || '',
          isMall: fullText.includes('mall'),
          isStar: fullText.includes('star'),
          location: textLines[textLines.length - 1] || ''
        });
        if (items.length >= 8) break;
      }
      return items;
    })()
  `);

  console.log(`   ✅ Berhasil mengambil ${candidates.length} kandidat produk dari Shopee.`);
  candidates.slice(0, 5).forEach((c, idx) => {
    console.log(`      [${idx+1}] ${c.isMall ? '[MALL] ' : (c.isStar ? '[STAR] ' : '')}${c.title} | ${c.price} | ${c.sold}`);
  });

  console.log(`\n🧠 [4] Analisis Produk dengan AI Claude (oa-claude-sonnet-4.6)...`);
  const aiDecision = await callClaudeAnalyzer(item, candidates);
  console.log(`   🏆 PILIHAN AI CLAUDE:`);
  console.log(`      Judul: ${aiDecision.productTitle || aiDecision.title}`);
  console.log(`      URL: ${aiDecision.productUrl || aiDecision.url}`);
  console.log(`      Alasan: ${aiDecision.reason || '-'}`);

  const targetUrl = aiDecision.productUrl || aiDecision.url || candidates[0].url;

  console.log(`\n🔗 [5] Otomatisasi Generate Link Affiliate Shopee...`);
  const affiliateShortlink = await generateAffiliateLink(client, targetUrl, '101');

  console.log(`\n================================================================================`);
  if (affiliateShortlink) {
    console.log(`🎉 HASIL SUKSES SHORTLINK AFFILIATE DITEMUKAN!`);
    console.log(`🔗 Link Affiliate: ${affiliateShortlink}`);
    console.log(`🎯 URL Asli Produk: ${targetUrl}`);
  } else {
    console.log(`⚠️ Link shortlink tidak otomatis terdeteksi (mungkin perlu verifikasi login di tab affiliate).`);
    console.log(`🎯 URL Produk yang Dipilih: ${targetUrl}`);
  }
  console.log(`================================================================================`);

  client.close();
}

runTest101().catch(console.error);
