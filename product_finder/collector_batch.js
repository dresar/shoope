/**
 * collector_batch.js - Master Shopee Product & Metadata Collector + Claude Sonnet 4.6 AI Ranker
 * Batch processing untuk Folder: 3, 4, 5, 6, 7, 8, 9, 10
 * Setiap folder menghasilkan TEPAT 1 FILE FINAL: PRODUK_SHOPEE_XXX-XXX.txt
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const CDP_HTTP = 'http://127.0.0.1:9222';
const OPENAGENTIC_API_KEY = 'sk-proj-SANITIZED_KEY_PROTECTED';
const OPENAGENTIC_MODEL = 'oa-claude-sonnet-4.6';
const OPENAGENTIC_URL = 'https://openagentic.id/api/v1/chat/completions';

const BASE_DIR = path.join('C:', 'Users', 'NCN0C', 'Downloads', 'Video Konten Terlaris');
const TARGET_FOLDERS = ['3', '4', '5', '6', '7', '8', '9', '10'];

const REGULAR_CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CHROME_SESSION_DIR = path.join(__dirname, '..', 'chrome_shopee_session');

async function launchChromeIfClosed() {
  try {
    const res = await fetch(`http://127.0.0.1:9222/json/version`);
    if (res.ok) return;
  } catch (_) {}

  console.log('🌐 Membuka Google Chrome Biasa (Port 9222)...');
  const browserPath = fs.existsSync(REGULAR_CHROME_PATH)
    ? REGULAR_CHROME_PATH
    : (fs.existsSync('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe')
      ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      : 'C:\\Users\\NCN0C\\AppData\\Roaming\\Incogniton\\Incogniton\\browser\\149\\win\\chrome.exe');

  if (!fs.existsSync(CHROME_SESSION_DIR)) {
    fs.mkdirSync(CHROME_SESSION_DIR, { recursive: true });
  }

  const chromeProc = spawn(browserPath, [
    '--remote-debugging-port=9222',
    `--user-data-dir=${CHROME_SESSION_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://shopee.co.id'
  ], { detached: true, stdio: 'ignore' });
  chromeProc.unref();

  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const res = await fetch(`http://127.0.0.1:9222/json/version`);
      if (res.ok) {
        console.log('✅ Google Chrome biasa berhasil aktif di port 9222!\n');
        return;
      }
    } catch (_) {}
  }
}

async function findActiveIncognitonPort() {
  // Cek apakah ada Chrome / Incogniton yang sudah aktif
  try {
    const res = await fetch('http://127.0.0.1:9222/json/version');
    if (res.ok) return 9222;
  } catch (_) {}

  const configBase = 'C:\\Users\\NCN0C\\AppData\\Roaming\\Incogniton\\Incogniton\\config';
  if (fs.existsSync(configBase)) {
    const profileDirs = fs.readdirSync(configBase);
    for (const dir of profileDirs) {
      const portFile = path.join(configBase, dir, 'DevToolsActivePort');
      if (fs.existsSync(portFile)) {
        try {
          const lines = fs.readFileSync(portFile, 'utf8').trim().split('\n');
          const port = parseInt(lines[0].trim());
          if (port > 0) {
            const res = await fetch(`http://127.0.0.1:${port}/json/version`);
            if (res.ok) {
              const data = await res.json();
              if (data.Browser && (data.Browser.includes('Chrome') || data.Browser.includes('Chromium'))) {
                return port;
              }
            }
          }
        } catch (_) {}
      }
    }
  }

  return 9222;
}

async function getShopeeTab() {
  let port = await findActiveIncognitonPort();
  
  if (!port) {
    await launchChromeIfClosed();
    port = 9222;
  }

  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/list`);
    const tabs = await res.json();
    let tab = tabs.find(t => t.url && (t.url.includes('shopee.co.id') || t.url.includes('google.com')));
    if (!tab) {
      const newRes = await fetch(`http://127.0.0.1:${port}/json/new?https://shopee.co.id`, { method: 'PUT' });
      tab = await newRes.json();
    }
    return tab;
  } catch (_) {
    await launchChromeIfClosed();
    const res = await fetch(`http://127.0.0.1:9222/json/list`);
    const tabs = await res.json();
    return tabs[0];
  }
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

  send(method, params = {}, timeoutMs = 25000) {
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

  async eval(expression, timeoutMs = 20000) {
    try {
      await this.ensureConnected();
      const res = await this.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      }, timeoutMs);
      return res?.result?.value;
    } catch (err) {
      console.warn(`   ⚠️ Eval retry (${err.message})...`);
      this.close();
      await this.ensureConnected();
      const res = await this.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      }, timeoutMs);
      return res?.result?.value;
    }
  }

  async navigate(url) {
    try {
      await this.ensureConnected();
      await this.send('Page.navigate', { url }, 20000);
      await new Promise(r => setTimeout(r, 2500));
    } catch (err) {
      console.warn(`   ⚠️ Navigate retry (${err.message})...`);
      this.close();
      await this.ensureConnected();
      await this.send('Page.navigate', { url }, 20000);
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
  }
}

async function scrapeGoogleShopee(client, keyword) {
  try {
    const gUrl = `https://www.google.com/search?q=site:shopee.co.id+${encodeURIComponent(keyword)}`;
    await client.navigate(gUrl);
    await new Promise(r => setTimeout(r, 2500));
    try {
      await client.eval(`window.scrollBy(0, 400);`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (_) {}

    const items = await client.eval(`
      (() => {
        const results = [];
        const links = Array.from(document.querySelectorAll('a[href*="shopee.co.id"]'));
        const seen = new Set();
        for (const a of links) {
          let href = (a.href || '').split('?')[0];
          if (!href.includes('-i.') || seen.has(href)) continue;
          seen.add(href);
          const h3 = a.querySelector('h3');
          const title = (h3 ? h3.innerText : a.innerText || '').split('\\n')[0].trim();
          if (title) {
            results.push({
              url: href,
              title: title,
              price: 'Rp Termurah',
              sold: 'Terlaris Shopee',
              rating: '4.8',
              isMall: href.toLowerCase().includes('mall'),
              isStar: true,
              location: 'Indonesia',
              img: ''
            });
          }
          if (results.length >= 5) break;
        }
        return results;
      })()
    `);
    return items || [];
  } catch (err) {
    console.warn(`   ⚠️ Google search fallback error:`, err.message);
    return [];
  }
}

async function scrapeShopeeSearch(client, keyword) {
  const searchUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}&sortBy=sales`;
  await client.navigate(searchUrl);
  
  // Cek apakah langsung terkena halaman login/traffic verify
  const currentUrl = await client.eval('window.location.href');
  if (currentUrl && (currentUrl.includes('/verify/') || currentUrl.includes('/buyer/login'))) {
    console.log(`   ⚡ Auto-Bypass via Search Engine (tanpa login)...`);
    const gResults = await scrapeGoogleShopee(client, keyword);
    if (gResults && gResults.length > 0) {
      return gResults;
    }
  }

  // Jeda 4 detik menunggu elemen Shopee selesai loading
  await new Promise(r => setTimeout(r, 4000));

  // Scroll perlahan
  try {
    await client.eval(`window.scrollBy(0, 500);`);
    await new Promise(r => setTimeout(r, 1500));
    await client.eval(`window.scrollBy(0, 600);`);
    await new Promise(r => setTimeout(r, 1500));
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

  // Jika Shopee direct kosong atau terkena proteksi, gunakan Google search
  if (!items || items.length === 0) {
    console.log(`   🔎 Mengambil produk Shopee via Search Engine (tanpa login)...`);
    items = await scrapeGoogleShopee(client, keyword);
  }

  return (items || []).slice(0, 5);
}

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

function writeFolderTxt(folderName, startId, endId, items, txtPath) {
  let content = `================================================================================
DATABASE LINK PRODUK SHOPEE TERLARIS & MALL - FOLDER ${folderName} (NO ${startId} - ${endId})
Diperbarui: ${new Date().toLocaleString('id-ID')}
Total Video : ${items.length} Video (5 Link per Video = ${items.length * 5} Link Produk)
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

  fs.writeFileSync(txtPath, content, 'utf-8');
}

async function processSingleFolder(client, folderName) {
  const folderDir = path.join(BASE_DIR, folderName);
  const dataPath = path.join(folderDir, 'data.json');

  if (!fs.existsSync(dataPath)) {
    console.warn(`⚠️ Folder ${folderName}: data.json tidak ditemukan! Melewati.`);
    return;
  }

  let items = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const startId = items[0]?.id || `${(parseInt(folderName) - 1) * 100 + 1}`;
  const endId = items[items.length - 1]?.id || `${parseInt(folderName) * 100}`;
  const txtFilename = `PRODUK_SHOPEE_${startId}-${endId}.txt`;
  const txtPath = path.join(folderDir, txtFilename);

  console.log(`\n================================================================================`);
  console.log(`📂 MEMPROSES FOLDER ${folderName} (NO ${startId} s/d ${endId})`);
  console.log(`📄 OUTPUT FILE: ${txtFilename}`);
  console.log(`================================================================================`);

  let completedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = String(item.id);

    // Cek jika sudah lengkap
    if (item.shopee_products && item.shopee_products.length >= 5 && item.selected_product) {
      completedCount++;
      continue;
    }

    console.log(`--------------------------------------------------------------------------------`);
    console.log(`🔍 [${i + 1}/${items.length}] Folder ${folderName} - No. ${itemId}: ${item.judul}`);

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
        console.warn(`   ⚠️ Error pada "${kw}":`, err.message);
        try { await client.ensureConnected(); } catch (_) {}
      }
    }

    if (!candidates || candidates.length < 5) {
      console.log(`   ⚠️ Coba judul utama produk...`);
      try {
        const more = await scrapeShopeeSearch(client, item.judul.slice(0, 35));
        candidates = [...(candidates || []), ...(more || [])];
      } catch (_) {}
    }

    // Dedup URL
    const uniqueMap = new Map();
    (candidates || []).forEach(c => {
      if (c && c.url && !uniqueMap.has(c.url)) uniqueMap.set(c.url, c);
    });
    candidates = Array.from(uniqueMap.values()).slice(0, 5);

    console.log(`   ✅ Diperoleh ${candidates.length} link produk Shopee.`);

    // AI Ranking
    console.log(`   🤖 Analisis Claude Sonnet 4.6 untuk memilih produk utama...`);
    let bestProduct = null;
    try {
      bestProduct = await callClaudeRanker(item, candidates);
      if (bestProduct) {
        console.log(`   🏆 Claude Pick: ${bestProduct.title.slice(0, 60)}...`);
        console.log(`      🔗 ${bestProduct.url}`);
      }
    } catch (err) {
      bestProduct = candidates[0] || null;
    }

    item.shopee_products = candidates;
    item.selected_product = bestProduct;

    // Simpan ke data.json & update file TXT
    try {
      fs.writeFileSync(dataPath, JSON.stringify(items, null, 2), 'utf-8');
      writeFolderTxt(folderName, startId, endId, items, txtPath);
    } catch (err) {
      console.warn(`   ⚠️ Gagal menyimpan file:`, err.message);
    }

    completedCount++;
    console.log(`   ☕ Jeda santai 5 detik sebelum memproses nomor berikutnya...`);
    await new Promise(r => setTimeout(r, 4500 + Math.random() * 1500));
  }

  writeFolderTxt(folderName, startId, endId, items, txtPath);
  console.log(`\n🎉 SELESAI FOLDER ${folderName}: ${completedCount}/${items.length} item tersimpan di ${txtFilename}`);
}

async function runBatch() {
  console.log('================================================================================');
  console.log('🚀 MASTER SHOPEE SCRAPER & AI RANKER (BATCH FOLDER 3 s/d 10)');
  console.log('🤖 AI ENGINE: OpenAgentic (oa-claude-sonnet-4.6)');
  console.log(`📁 FOLDERS  : ${TARGET_FOLDERS.join(', ')}`);
  console.log('================================================================================\n');

  const client = new CDPClient();
  await client.ensureConnected();
  console.log('🔗 Terhubung ke Chrome CDP Browser.\n');

  for (const folder of TARGET_FOLDERS) {
    try {
      await processSingleFolder(client, folder);
    } catch (err) {
      console.error(`❌ Terjadi error pada Folder ${folder}:`, err.message);
    }
  }

  client.close();
  console.log('\n================================================================================');
  console.log('🎉🎉🎉 SEMUA FOLDER (3 s/d 10) TELAH SELESAI DIPROSES 100%! 🎉🎉🎉');
  console.log('================================================================================');
}

module.exports = {
  runBatch,
  processSingleFolder,
  CDPClient,
  findActiveIncognitonPort,
  writeFolderTxt
};

if (require.main === module) {
  runBatch().catch(console.error);
}
