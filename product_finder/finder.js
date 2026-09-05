/**
 * finder.js - Shopee Top Sales & Mall Product Finder (5 Links per Video No. 101-200)
 * Pure Node.js via Chrome CDP Port 9222
 */

const fs = require('fs');
const path = require('path');

const CDP_HTTP = 'http://127.0.0.1:9222';
const FOLDER_2_DIR = path.join('C:', 'Users', 'NCN0C', 'Downloads', 'Video Konten Terlaris', '2');
const DATA_FILE = path.join(FOLDER_2_DIR, 'data.json');
const OUTPUT_TXT = path.join(FOLDER_2_DIR, 'PRODUK_SHOPEE_101-200.txt');
const OUTPUT_JSON = path.join(FOLDER_2_DIR, 'produk_shopee_101_200.json');

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

function cleanShopeeUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return `${u.origin}${u.pathname}`;
  } catch {
    return rawUrl.split('?')[0];
  }
}

async function extractTopProducts(client, keyword) {
  // 1. Coba pencarian dengan sorting TERLARIS (sortBy=sales)
  const searchUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}&sortBy=sales`;
  await client.navigate(searchUrl);

  // Scroll sedikit agar item me-render
  await client.eval(`window.scrollBy(0, 500);`);
  await new Promise(r => setTimeout(r, 2500));

  let products = await client.eval(`
    (() => {
      const items = [];
      const links = Array.from(document.querySelectorAll('a[data-sqe="link"], a[href*="-i."]'));
      const seenUrls = new Set();

      for (const a of links) {
        let href = a.href || '';
        if (!href.includes('-i.')) continue;
        
        // Clean URL
        const cleanHref = href.split('?')[0];
        if (seenUrls.has(cleanHref)) continue;
        seenUrls.add(cleanHref);

        const fullText = (a.innerText || '').trim();
        const textLines = fullText.split('\\n').map(s => s.trim()).filter(Boolean);
        const title = textLines[0] || '';
        
        // Cek Mall / Star
        const isMall = fullText.toLowerCase().includes('mall') || a.querySelector('[class*="mall"], [class*="shopee-mall"]') !== null;
        const isStar = fullText.toLowerCase().includes('star') || a.querySelector('[class*="star"]') !== null;

        // Ambil info harga / terjual
        const soldText = textLines.find(t => t.toLowerCase().includes('terjual') || t.toLowerCase().includes('rb')) || '';
        const priceText = textLines.find(t => t.includes('Rp') || /^[\\d.,]+$/.test(t)) || '';

        const img = a.querySelector('img')?.src || '';

        items.push({
          url: cleanHref,
          title: title,
          isMall: isMall,
          isStar: isStar,
          sold: soldText,
          price: priceText,
          img: img
        });

        if (items.length >= 8) break;
      }
      return items;
    })()
  `);

  if (!products || products.length === 0) {
    // Fallback search reguler tanpa sortBy jika zero results
    const fallbackUrl = `https://shopee.co.id/search?keyword=${encodeURIComponent(keyword)}`;
    await client.navigate(fallbackUrl);
    await client.eval(`window.scrollBy(0, 500);`);
    await new Promise(r => setTimeout(r, 2000));
    
    products = await client.eval(`
      (() => {
        const items = [];
        const links = Array.from(document.querySelectorAll('a[data-sqe="link"], a[href*="-i."]'));
        const seenUrls = new Set();
        for (const a of links) {
          let href = a.href || '';
          if (!href.includes('-i.')) continue;
          const cleanHref = href.split('?')[0];
          if (seenUrls.has(cleanHref)) continue;
          seenUrls.add(cleanHref);

          const fullText = (a.innerText || '').trim();
          const textLines = fullText.split('\\n').map(s => s.trim()).filter(Boolean);
          items.push({
            url: cleanHref,
            title: textLines[0] || '',
            isMall: fullText.toLowerCase().includes('mall'),
            isStar: fullText.toLowerCase().includes('star'),
            sold: textLines.find(t => t.toLowerCase().includes('terjual')) || '',
            price: textLines.find(t => t.includes('Rp')) || '',
            img: a.querySelector('img')?.src || ''
          });
          if (items.length >= 8) break;
        }
        return items;
      })()
    `);
  }

  return (products || []).slice(0, 5);
}

function appendToTxt(item, top5) {
  const divider = '================================================================================\n';
  const subDivider = '--------------------------------------------------------------------------------\n';
  
  let block = '';
  block += subDivider;
  block += `NO. ${item.id} | FILE: ${item.fileName || item.id + '.mp4'} | Judul: ${item.judul}\n`;
  block += `HOOK: ${item.hook || '-'}\n`;
  block += `Kata Kunci Shopee: ${(item.kata_kunci_shopee || []).join(', ')}\n`;
  block += `\nDAFTAR 5 PRODUK SHOPEE TERLARIS / MALL REKOMENDASI:\n`;

  top5.forEach((p, idx) => {
    const badge = p.isMall ? '[MALL] ' : (p.isStar ? '[STAR] ' : '');
    block += `  ${idx + 1}. ${badge}${p.title || 'Produk Shopee'}\n`;
    block += `     URL: ${p.url}\n`;
    if (p.price || p.sold) {
      block += `     Info: ${p.price ? 'Harga: ' + p.price : ''} ${p.sold ? '| Terjual: ' + p.sold : ''}\n`;
    }
  });
  block += '\n';

  fs.appendFileSync(OUTPUT_TXT, block, 'utf-8');
}

async function runBatch() {
  console.log('🚀 MEMULAI PROSES PENCARIAN 5 PRODUK SHOPEE TERLARIS & MALL (NO 101 - 200)');
  console.log(`📂 Membaca data: ${DATA_FILE}`);

  if (!fs.existsSync(DATA_FILE)) {
    console.error('File data.json tidak ditemukan!');
    return;
  }

  const items = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  console.log(`Total item dalam dataset: ${items.length} produk.`);

  // Inisialisasi Header file TXT jika belum ada
  if (!fs.existsSync(OUTPUT_TXT)) {
    const header = `================================================================================
REKAP 5 LINK PRODUK SHOPEE TERLARIS & MALL (NO 101 - 200)
Diperbarui: ${new Date().toLocaleString('id-ID')}
================================================================================\n\n`;
    fs.writeFileSync(OUTPUT_TXT, header, 'utf-8');
  }

  // Baca progress database jika sudah ada
  let resultDb = {};
  if (fs.existsSync(OUTPUT_JSON)) {
    try {
      resultDb = JSON.parse(fs.readFileSync(OUTPUT_JSON, 'utf-8'));
    } catch {}
  }

  const tab = await getShopeeTab();
  console.log(`🔗 Terhubung ke Chrome: ${tab.title}`);
  const client = new CDPClient(tab.webSocketDebuggerUrl);
  await client.connect();

  let successCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = String(item.id);

    // Cek jika sudah pernah dicari
    if (resultDb[itemId] && resultDb[itemId].products && resultDb[itemId].products.length >= 3) {
      console.log(`⏩ [${i+1}/${items.length}] No. ${itemId} sudah selesai sebelumnya, skip.`);
      continue;
    }

    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`🔍 [${i+1}/${items.length}] Memproses No. ${itemId}: ${item.judul}`);
    
    // Pilih kata kunci pencarian terbaik
    const keywords = item.kata_kunci_shopee && item.kata_kunci_shopee.length > 0 
      ? item.kata_kunci_shopee 
      : [item.judul];
    
    let top5 = [];
    for (const kw of keywords) {
      console.log(`   🔎 Mencari dengan kata kunci: "${kw}" (Sort: Terlaris / Mall)...`);
      top5 = await extractTopProducts(client, kw);
      if (top5 && top5.length >= 3) {
        break; // Sudah dapat minimal 3-5 produk yang bagus
      }
    }

    if (top5.length === 0) {
      console.log(`   ⚠️ Tidak menemukan produk dengan kata kunci spesifik, mencoba judul...`);
      top5 = await extractTopProducts(client, item.judul.slice(0, 40));
    }

    console.log(`   ✅ Ditemukan ${top5.length} link produk untuk No. ${itemId}:`);
    top5.forEach((p, idx) => {
      console.log(`      ${idx+1}. ${p.isMall ? '[MALL] ' : ''}${p.title.slice(0, 50)}... -> ${p.url}`);
    });

    // Simpan ke database JSON
    resultDb[itemId] = {
      id: item.id,
      judul: item.judul,
      keywordUsed: keywords[0],
      products: top5
    };
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(resultDb, null, 2), 'utf-8');

    // Simpan ke file TXT siap salin
    appendToTxt(item, top5);

    successCount++;

    // Jeda random natural 1-2 detik antar pencarian
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
  }

  client.close();
  console.log(`\n================================================================================`);
  console.log(`🎉 SELESAI SEMUA! Total berhasil diproses: ${successCount} produk.`);
  console.log(`📁 File TXT: ${OUTPUT_TXT}`);
  console.log(`📁 File JSON: ${OUTPUT_JSON}`);
  console.log(`================================================================================`);
}

runBatch().catch(console.error);
