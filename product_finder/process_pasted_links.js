const fs = require('fs');
const path = require('path');

const rawInput = `Link dari Link Khusus (Custom Link)Mohon salin link singkathttps://s.shopee.co.id/4fvlkSxpzG
https://s.shopee.co.id/4qFBwlxCeJ
https://s.shopee.co.id/4LIvLqz6fE
https://s.shopee.co.id/4VcLY9yTKH
https://s.shopee.co.id/40g4xF0NLCSalin Link
https://s.shopee.co.id/5As2LOCMei
https://s.shopee.co.id/50Yc95Czzh
https://s.shopee.co.id/4qFBwmDdKg
https://s.shopee.co.id/4fvlkTEGff
https://s.shopee.co.id/3B6xxiJyiOSalin Link
https://s.shopee.co.id/1Vyjyed2bC
https://s.shopee.co.id/1LfJmLdfwB
https://s.shopee.co.id/2VrHAUZEZQ
https://s.shopee.co.id/2LXqyBZruP
https://s.shopee.co.id/2BEQlsaVFOSalin Link
https://s.shopee.co.id/3g3EYdmOLO
https://s.shopee.co.id/3qMekwll0R
https://s.shopee.co.id/6q0GKSaKv2
https://s.shopee.co.id/6fgq89ayG1
https://s.shopee.co.id/7Ad6j4Z4F8Salin Link
https://s.shopee.co.id/30nXlQ70eE
https://s.shopee.co.id/3B6xxj6NJH
https://s.shopee.co.id/4fvlkU0fGa
https://s.shopee.co.id/4qFBwn01vd
https://s.shopee.co.id/50Yc95zOagSalin Link
https://s.shopee.co.id/9pdrtyyJrj
https://s.shopee.co.id/60R9KwCue0
https://s.shopee.co.id/6AkZXFCHJ3
https://s.shopee.co.id/6L3zjYBdy6
https://s.shopee.co.id/6VNPvrB0d9Salin Link
https://s.shopee.co.id/8plKi9K04P
https://s.shopee.co.id/904kuSJMjS
https://s.shopee.co.id/9AOB6lIjOV
https://s.shopee.co.id/80CDicNAlI
https://s.shopee.co.id/8AVduvMXQLSalin Link
https://s.shopee.co.id/3VjoMLrMia
https://s.shopee.co.id/3LQOA2s03Z
https://s.shopee.co.id/3qMekxq62g
https://s.shopee.co.id/3g3EYeqjNf
https://s.shopee.co.id/1VyjyfyymGSalin Link
https://s.shopee.co.id/3LQOA3AuAS
https://s.shopee.co.id/3VjoMMAGpV
https://s.shopee.co.id/3g3EYf9dUY
https://s.shopee.co.id/3qMeky909b
https://s.shopee.co.id/2gAhMpDRWOSalin Link
https://s.shopee.co.id/3g3EYfPF15
https://s.shopee.co.id/4AzV9aNL0C
https://s.shopee.co.id/40g4xHNyLB
https://s.shopee.co.id/4VcLYCM4KI
https://s.shopee.co.id/4LIvLtMhfHSalin Link
https://s.shopee.co.id/5foIwLVeSF
https://s.shopee.co.id/AAGiIcEWK8
https://s.shopee.co.id/9zxI6JF9f7
https://s.shopee.co.id/AUtYhEDFeE
https://s.shopee.co.id/AKa8UvDszDSalin Link
https://s.shopee.co.id/40g4xHsloz
https://s.shopee.co.id/4VcLYCqro6
https://s.shopee.co.id/4LIvLtrV95
https://s.shopee.co.id/3VjoMMufpw
https://s.shopee.co.id/3LQOA3vJAvSalin Link
https://s.shopee.co.id/9V11VOttpj
https://s.shopee.co.id/AKa8Uvqj8u
https://s.shopee.co.id/AUtYhEq5nx
https://s.shopee.co.id/9zxI6Jrzos
https://s.shopee.co.id/AAGiIcrMTvSalin Link
https://s.shopee.co.id/9KhbJ6HQUc
https://s.shopee.co.id/9V11VPGn9f
https://s.shopee.co.id/AKa8UwDcSq
https://s.shopee.co.id/AUtYhFCz7t
https://s.shopee.co.id/9zxI6KEt8oSalin Link
https://s.shopee.co.id/9fKRhicm5Z
https://s.shopee.co.id/9V11VPdPQY
https://s.shopee.co.id/9KhbJ6e2lX
https://s.shopee.co.id/AUtYhFZbOm
https://s.shopee.co.id/AKa8UwaEjlSalin Link
https://s.shopee.co.id/6fgq8D8c3f
https://s.shopee.co.id/7psnWM4Agu
https://s.shopee.co.id/7fZNK34o1t
https://s.shopee.co.id/7VFx7k5RMs
https://s.shopee.co.id/7KwWvR64hrSalin Link
https://s.shopee.co.id/1gIAB1nmdp
https://s.shopee.co.id/1VyjyioPyo
https://s.shopee.co.id/1LfJmPp3Jn
https://s.shopee.co.id/3qMel0fXFI
https://s.shopee.co.id/3g3EYhgAaHSalin Link
https://s.shopee.co.id/6VNPvus4Mu
https://s.shopee.co.id/6L3zjbshht
https://s.shopee.co.id/6AkZXItL2s
https://s.shopee.co.id/60R9KztyNr
https://s.shopee.co.id/9pdru2fNbcSalin Link
https://s.shopee.co.id/20v0ZeUvMW
https://s.shopee.co.id/2BEQlxUI1Z
https://s.shopee.co.id/2LXqyGTegc
https://s.shopee.co.id/2VrHAZT1Lf
https://s.shopee.co.id/1LfJmQXSiSSalin Link
https://s.shopee.co.id/904kuWPrV0
https://s.shopee.co.id/9AOB6pPEA3
https://s.shopee.co.id/6fgq8EYkEa
https://s.shopee.co.id/6q0GKXY6td
https://s.shopee.co.id/70JgWqXTYgSalin Link`;

// Extract clean urls
const allMatches = [...rawInput.matchAll(/https?:\/\/(?:s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_-]+/g)].map(m => m[0]);

// De-duplicate in order of occurrence per batch of 5
// Each video has 5 unique products
const cleanShortlinks = [];
const seenGlobal = new Set();

for (const u of allMatches) {
  if (!seenGlobal.has(u)) {
    seenGlobal.add(u);
    cleanShortlinks.push(u);
  }
}

console.log(`Total Clean Unique Affiliate Shortlinks: ${cleanShortlinks.length}`);

// Load Folder 1 data.json
const f1Path = 'C:\\Users\\NCN0C\\Downloads\\Video Konten Terlaris\\1\\data.json';
const f1Data = JSON.parse(fs.readFileSync(f1Path, 'utf8'));

// Map 5 shortlinks per video for Video 001 s/d 020
let mappedCount = 0;
const videoMappingResult = [];

for (let i = 0; i < 20 && i < f1Data.length; i++) {
  const item = f1Data[i];
  const videoNum = item.id; // e.g. "001"
  const startIdx = i * 5;
  const chunk = cleanShortlinks.slice(startIdx, startIdx + 5);

  if (chunk.length === 5) {
    mappedCount++;
    item.affiliate_shortlinks = chunk;
    if (item.shopee_products) {
      item.shopee_products.forEach((p, idx) => {
        if (chunk[idx]) {
          p.affiliateUrl = chunk[idx];
        }
      });
    }
    if (item.selected_product && chunk[0]) {
      item.selected_product.affiliateUrl = chunk[0];
    }

    videoMappingResult.push({
      id: videoNum,
      judul: item.judul,
      selected_product: item.selected_product?.title,
      affiliate_links: chunk
    });
  }
}

// Save updated Folder 1 data.json
fs.writeFileSync(f1Path, JSON.stringify(f1Data, null, 2), 'utf8');

// Generate cleaned TXT report for user
let txtOutput = `================================================================================
HASIL PEMETAAN 100 LINK AFFILIATE - FOLDER 1 (VIDEO NO. 001 S/D 020)
Diperbarui: ${new Date().toLocaleString('id-ID')}
Total Video Selesai: ${mappedCount} Video (5 Link per Video = ${mappedCount * 5} Link)
================================================================================\n\n`;

videoMappingResult.forEach(v => {
  txtOutput += `--------------------------------------------------------------------------------\n`;
  txtOutput += `NO. ${v.id} | JUDUL: ${v.judul}\n`;
  txtOutput += `🏆 PRODUK UTAMA: ${v.selected_product || '-'}\n`;
  txtOutput += `🔗 5 LINK AFFILIATE SHOPEE:\n`;
  v.affiliate_links.forEach((l, idx) => {
    txtOutput += `   ${idx + 1}. ${l}\n`;
  });
  txtOutput += `\n`;
});

const reportPath = 'C:\\Users\\NCN0C\\Downloads\\Video Konten Terlaris\\1\\AFFILIATE_LINKS_001-020.txt';
fs.writeFileSync(reportPath, txtOutput, 'utf8');

console.log(`\n🎉 SUKSES! ${mappedCount} Video (001 s/d 020) berhasil dipetakan ke data.json dan ${reportPath}`);
