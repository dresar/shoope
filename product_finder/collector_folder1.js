/**
 * collector_folder1.js - Shopee Product & Metadata Collector + Claude Sonnet 4.6 AI Ranker
 * Mengumpulkan 5 link produk Shopee Terlaris & Mall untuk No. 001 s/d 100 (Total 500 Link)
 * Menyimpan metadata ke data.json dan PRODUK_SHOPEE_001-100.txt
 * Super Resilient Auto-Reconnect & Auto-Retry Engine
 */

const fs = require('fs');
const path = require('path');

const CDP_HTTP = 'http://127.0.0.1:9222';
const OPENAGENTIC_API_KEY = 'sk-proj-SANITIZED_KEY_PROTECTED';
const OPENAGENTIC_MODEL = 'oa-claude-sonnet-4.6';
const OPENAGENTIC_URL = 'https://openagentic.id/api/v1/chat/completions';

const FOLDER_1_DIR = path.join('C:', 'Users', 'NCN0C', 'Downloads', 'Video Konten Terlaris', '1');
const DATA_FILE = path.join(FOLDER_1_DIR, 'data.json');
const OUTPUT_TXT = path.join(FOLDER_1_DIR, 'PRODUK_SHOPEE_001-100.txt');

const { spawn } = require('child_process');

async function launchChromeIfClosed() {
  try {
    const res = await fetch(`${CDP_HTTP}/json/version`);
    if (res.ok) return;
  } catch (_) {}

  console.log('🌐 Chrome Port 9222 belum aktif, membuka Google Chrome secara otomatis...');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromeProc = spawn(chromePath, [
    '--remote-debugging-port=9222',
    '--profile-directory=Profile 6',
    'https://shopee.co.id'
  ], { detached: true, stdio: 'ignore' });
  chromeProc.unref();

  // Tunggu Chrome siap
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch(`${CDP_HTTP}/json/version`);
      if (res.ok) {
        console.log('✅ Chrome berhasil aktif di port 9222!\n');
        return;
      }
    } catch (_) {}
  }
}

async function getShopeeTab() {
  await launchChromeIfClosed();
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
  constructor() {
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
  }

  async ensureConnected() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.close();
    const tab = await getShopeeTab();
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(tab.webSocketDebuggerUrl);
      const timer = setTimeout(() => reject(new Error('CDP Connect Timeout')), 8000);
      this.ws.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      this.ws.onerror = (err) => {
        clearTimeout(timer);
        reject(err);
      };
      this.ws.onclose = () => {
        for (const [id, cb] of this.callbacks.entries()) {
          cb.reject(new Error('CDP WebSocket closed'));
        }
        this.callbacks.clear();
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id && this.callbacks.has(data.id)) {
            const cb = this.callbacks.get(data.id);
            this.callbacks.delete(data.id);
            if (data.error) cb.reject(data.error);
            else cb.resolve(data.result);
          }
        } catch (_) {}
      };
    });
  }

  send(method, params = {}, timeoutMs = 15000) {
    const id = this.msgId++;
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('CDP WebSocket not open'));
      }
      const timer = setTimeout(() => {
        this.callbacks.delete(id);
        reject(new Error(`CDP Timeout on ${method}`));
      }, timeoutMs);

      this.callbacks.set(id, {
        resolve: (val) => { clearTimeout(timer); resolve(val); },
        reject: (err) => { clearTimeout(timer); reject(err); }
      });

      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        this.callbacks.delete(id);
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  async eval(expression, timeoutMs = 10000) {
    await this.ensureConnected();
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    }, timeoutMs);
    return res?.result?.value;
  }

  async navigate(url) {
    await this.ensureConnected();
    await this.send('Page.navigate', { url }, 12000);
    await new Promise(r => setTimeout(r, 2500));
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }
}

async function scrapeShopeeSearch(client, keyword) {
  const searchUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}&sortBy=sales`;
  await client.navigate(searchUrl);
  
  // Scroll agar elemen di-render oleh lazy loader Shopee
  try {
    await client.eval(`window.scrollBy(0, 600);`);
    await new Promise(r => setTimeout(r, 1500));
    await client.eval(`window.scrollBy(0, 600);`);
    await new Promise(r => setTimeout(r, 1000));
  } catch (_) {}

  let items = await client.eval(`
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
        const title = lines[0] || '';
        
        const isMall = fullText.toLowerCase().includes('mall') || a.querySelector('[class*="mall"]') !== null;
        const isStar = fullText.toLowerCase().includes('star') || a.querySelector('[class*="star"]') !== null;
        const sold = lines.find(t => t.toLowerCase().includes('terjual') || t.toLowerCase().includes('rb') || t.toLowerCase().includes('k+')) || '';
        const price = lines.find(t => t.includes('Rp') || /^[\\d.,]+$/.test(t)) || '';
        const rating = lines.find(t => /^\\d\\.\\d$/.test(t)) || '';
        const location = lines[lines.length - 1] || '';
        const img = a.querySelector('img')?.src || '';

        results.push({
          url: href,
          title: title,
          price: price,
          sold: sold,
          rating: rating,
          isMall: isMall,
          isStar: isStar,
          location: location,
          img: img
        });

        if (results.length >= 8) break;
      }
      return results;
    })()
  `);

  if (!items || items.length === 0) {
    // Fallback tanpa sortBy
    const fallbackUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}`;
    await client.navigate(fallbackUrl);
    try {
      await client.eval(`window.scrollBy(0, 600);`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (_) {}
    
    items = await client.eval(`
      (() => {
        const results = [];
        const links = Array.from(document.querySelectorAll('a[data-sqe="link"], a[href*="-i."]'));
        const seen = new Set();
        for (const a of links) {
          let href = (a.href || '').split('?')[0];
          if (!href.includes('-i.') || seen.has(href)) continue;
          seen.add(href);
          const lines = (a.innerText || '').split('\\n').map(s => s.trim()).filter(Boolean);
          results.push({
            url: href,
            title: lines[0] || '',
            price: lines.find(t => t.includes('Rp')) || '',
            sold: lines.find(t => t.toLowerCase().includes('terjual')) || '',
            rating: lines.find(t => /^\\d\\.\\d$/.test(t)) || '',
            isMall: (a.innerText || '').toLowerCase().includes('mall'),
            isStar: (a.innerText || '').toLowerCase().includes('star'),
            location: lines[lines.length - 1] || '',
            img: a.querySelector('img')?.src || ''
          });
          if (results.length >= 8) break;
        }
        return results;
      })()
    `);
  }

  return (items || []).slice(0, 5);
}

// Call Claude via OpenAgentic
async function callClaudeRanker(videoItem, candidates) {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return { ...candidates[0], selectedIndex: 0, reason: 'Satu-satunya kandidat teratas' };

  const prompt = `Anda adalah pakar e-commerce affiliate Shopee.
Tugas Anda: Pilih 1 produk terbaik yang PALING RELEVAN dengan konten video berikut dan memiliki reputasi/penjualan terbaik (Shopee Mall / Star / Terlaris).

INFORMASI KONTEN VIDEO:
- ID: ${videoItem.id}
- Judul: ${videoItem.judul}
- Hook: ${videoItem.hook}
- Deskripsi: ${videoItem.deskripsi}
- Kata Kunci: ${(videoItem.kata_kunci_shopee || []).join(', ')}

DAFTAR KANDIDAT PRODUK SHOPEE:
${JSON.stringify(candidates.map((c, i) => ({
  index: i,
  title: c.title,
  price: c.price,
  sold: c.sold,
  rating: c.rating,
  isMall: c.isMall,
  isStar: c.isStar,
  location: c.location,
  url: c.url
})), null, 2)}

Format Jawaban (WAJIB JSON valid saja tanpa teks pembuka/penutup):
{
  "selectedIndex": 0,
  "productTitle": "judul produk terpilih",
  "productUrl": "url produk terpilih",
  "reason": "alasan singkat kenapa produk ini terbaik"
}`;

  try {
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
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const decision = JSON.parse(match[0]);
      const chosenCandidate = candidates[decision.selectedIndex] || candidates[0];
      return {
        ...chosenCandidate,
        selectedIndex: decision.selectedIndex,
        reason: decision.reason
      };
    }
  } catch (err) {
    console.warn(`   ⚠️ Claude ranker fallback:`, err.message);
  }

  return { ...candidates[0], selectedIndex: 0, reason: 'Pilihan default penjualan tertinggi' };
}

function writeFullTxt(items) {
  let content = `================================================================================
DATABASE 500 LINK PRODUK SHOPEE TERLARIS & MALL - FOLDER 1 (NO 001 - 100)
Diperbarui: ${new Date().toLocaleString('id-ID')}
Total Video : ${items.length} Video (5 Link per Video = 500 Link Produk)
================================================================================\n\n`;

  let totalLinks = 0;

  for (const item of items) {
    const divider = '--------------------------------------------------------------------------------\n';
    content += divider;
    content += `NO. ${item.id} | FILE: ${item.fileName || item.id + '.mp4'} | JUDUL: ${item.judul}\n`;
    content += `HOOK: ${item.hook || '-'}\n`;
    content += `KATA KUNCI SHOPEE: ${(item.kata_kunci_shopee || []).join(', ')}\n`;
    
    if (item.selected_product) {
      content += `\n🏆 PRODUK UTAMA REKOMENDASI AI CLAUDE:\n`;
      content += `   Nama   : ${item.selected_product.title}\n`;
      content += `   URL    : ${item.selected_product.url}\n`;
      content += `   Info   : ${item.selected_product.price || '-'} | ${item.selected_product.sold || '-'}\n`;
      content += `   Alasan : ${item.selected_product.reason || '-'}\n`;
    }

    if (item.shopee_products && item.shopee_products.length > 0) {
      content += `\n📦 5 KANDIDAT LINK PRODUK SHOPEE (TERLARIS & MALL):\n`;
      item.shopee_products.forEach((p, idx) => {
        totalLinks++;
        const badge = p.isMall ? '[MALL] ' : (p.isStar ? '[STAR] ' : '');
        content += `   ${idx + 1}. ${badge}${p.title}\n`;
        content += `      URL : ${p.url}\n`;
        if (p.price || p.sold) {
          content += `      Info: ${p.price || ''} ${p.sold ? '| ' + p.sold : ''} ${p.rating ? '| ⭐ ' + p.rating : ''}\n`;
        }
      });
    }
    content += '\n';
  }

  content += `\n================================================================================\n`;
  content += `TOTAL LINK TERSIMPAN: ${totalLinks} LINK\n`;
  content += `================================================================================\n`;

  fs.writeFileSync(OUTPUT_TXT, content, 'utf-8');
}

async function runCollector() {
  console.log('================================================================================');
  console.log('🚀 PENGUMPULAN 500 LINK PRODUK SHOPEE TERLARIS & MALL (NO 001 - 100)');
  console.log('🤖 AI ENGINE: OpenAgentic (oa-claude-sonnet-4.6)');
  console.log('📁 TARGET   : C:\\Users\\NCN0C\\Downloads\\Video Konten Terlaris\\1');
  console.log('================================================================================\n');

  if (!fs.existsSync(DATA_FILE)) {
    console.error('File data.json tidak ditemukan!');
    return;
  }

  let items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  console.log(`📂 Total video dalam dataset: ${items.length} item.\n`);

  const client = new CDPClient();
  await client.ensureConnected();
  console.log(`🔗 Terhubung ke Chrome CDP Browser.\n`);

  let completedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = String(item.id).padStart(3, '0');

    // Cek jika sudah memiliki data produk lengkap
    if (item.shopee_products && item.shopee_products.length >= 5 && item.selected_product) {
      console.log(`⏩ [${i + 1}/${items.length}] No. ${itemId} sudah memiliki ${item.shopee_products.length} link, lanjut.`);
      completedCount++;
      continue;
    }

    console.log(`--------------------------------------------------------------------------------`);
    console.log(`🔍 [${i + 1}/${items.length}] Memproses No. ${itemId}: ${item.judul}`);

    const keywords = item.kata_kunci_shopee && item.kata_kunci_shopee.length > 0 
      ? item.kata_kunci_shopee 
      : [item.judul];

    let candidates = [];
    for (const kw of keywords) {
      console.log(`   🔎 Scraping kata kunci: "${kw}" (Sort: Terlaris / Mall)...`);
      try {
        candidates = await scrapeShopeeSearch(client, kw);
        if (candidates && candidates.length >= 5) break;
      } catch (err) {
        console.warn(`   ⚠️ Scraping error pada "${kw}":`, err.message);
        try {
          await client.ensureConnected();
        } catch (_) {}
      }
    }

    if (!candidates || candidates.length < 5) {
      console.log(`   ⚠️ Coba judul utama produk...`);
      try {
        const moreCandidates = await scrapeShopeeSearch(client, item.judul.slice(0, 35));
        candidates = [...(candidates || []), ...(moreCandidates || [])];
      } catch (_) {}
    }

    // Dedup by URL
    const uniqueMap = new Map();
    (candidates || []).forEach(c => {
      if (c && c.url && !uniqueMap.has(c.url)) uniqueMap.set(c.url, c);
    });
    candidates = Array.from(uniqueMap.values()).slice(0, 5);

    console.log(`   ✅ Diperoleh ${candidates.length} link produk Shopee.`);

    // Panggil Claude Sonnet 4.6 untuk analisis & memilih produk #1
    console.log(`   🤖 Analisis Claude Sonnet 4.6 untuk memilih produk utama...`);
    let bestProduct = null;
    try {
      bestProduct = await callClaudeRanker(item, candidates);
      if (bestProduct) {
        console.log(`   🏆 Claude Pick: ${bestProduct.title.slice(0, 60)}...`);
        console.log(`      🔗 ${bestProduct.url}`);
      }
    } catch (err) {
      console.warn(`   ⚠️ Error callClaudeRanker:`, err.message);
      bestProduct = candidates[0] || null;
    }

    // Simpan ke data item
    item.shopee_products = candidates;
    item.selected_product = bestProduct;

    // Simpan data.json & file TXT secara inkremental
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
      writeFullTxt(items);
    } catch (err) {
      console.warn(`   ⚠️ Gagal write file:`, err.message);
    }

    completedCount++;
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
  }

  client.close();
  console.log(`\n================================================================================`);
  console.log(`🎉 SEMUA LINK & METADATA SELESAI DIKUMPULKAN! (${completedCount}/${items.length})`);
  console.log(`📁 File TXT : ${OUTPUT_TXT}`);
  console.log(`📁 File JSON: ${DATA_FILE}`);
  console.log(`================================================================================`);
}

runCollector().catch(console.error);
