const fs = require('fs');
const path = require('path');

const input = fs.readFileSync(path.join(__dirname, 'batch2_raw.txt'), 'utf8');

// Regex for Shopee shortlinks
const matches = [...input.matchAll(/https?:\/\/(?:s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_-]+/g)].map(m => m[0]);

console.log('Total raw link matches in input:', matches.length);

// Extract distinct unique links in order
const uniqueLinks = [];
const seen = new Set();
for (const u of matches) {
  if (!seen.has(u)) {
    seen.add(u);
    uniqueLinks.push(u);
  }
}

console.log('Total unique affiliate shortlinks:', uniqueLinks.length);
console.log('Sample links:', uniqueLinks.slice(0, 10));

// Load Folder 1 data.json
const f1Path = 'C:\\Users\\NCN0C\\Downloads\\Video Konten Terlaris\\1\\data.json';
const f1Data = JSON.parse(fs.readFileSync(f1Path, 'utf8'));

// Check how many videos already have affiliate_shortlinks
const alreadyMapped = f1Data.filter(x => x.affiliate_shortlinks && x.affiliate_shortlinks.length === 5);
console.log(`Videos already mapped before this: ${alreadyMapped.length} (No. 001 - ${alreadyMapped[alreadyMapped.length - 1]?.id || '000'})`);

// Start mapping from the first unmapped video (e.g. index 20 -> No. 021)
let mappedCount = 0;
let linkCursor = 0;

for (let i = 0; i < f1Data.length; i++) {
  const item = f1Data[i];
  if (item.affiliate_shortlinks && item.affiliate_shortlinks.length === 5) {
    continue; // already mapped
  }

  const chunk = uniqueLinks.slice(linkCursor, linkCursor + 5);
  if (chunk.length === 5) {
    item.affiliate_shortlinks = chunk;
    if (item.shopee_products) {
      item.shopee_products.forEach((p, idx) => {
        if (chunk[idx]) p.affiliateUrl = chunk[idx];
      });
    }
    if (item.selected_product && chunk[0]) {
      item.selected_product.affiliateUrl = chunk[0];
    }
    linkCursor += 5;
    mappedCount++;
    console.log(`✅ Mapped Video No. ${item.id} (${item.judul.slice(0, 40)}...): 5 links`);
  } else {
    break;
  }
}

// Save updated data.json
fs.writeFileSync(f1Path, JSON.stringify(f1Data, null, 2), 'utf8');

const totalNowMapped = f1Data.filter(x => x.affiliate_shortlinks && x.affiliate_shortlinks.length === 5);
console.log(`\n🎉 TOTAL VIDEO FOLDER 1 YANG SUDAH MEMILIKI 5 LINK AFFILIATE: ${totalNowMapped.length} / 100 Video (${totalNowMapped.length * 5} Link)`);

// Generate complete updated TXT for all mapped videos in Folder 1
let masterTxt = `================================================================================
DATABASE LINK AFFILIATE SHOPEE - FOLDER 1 (VIDEO KONTEN TERLARIS 1)
Diperbarui: ${new Date().toLocaleString('id-ID')}
Total Video Selesai : ${totalNowMapped.length} / 100 Video (${totalNowMapped.length * 5} Link Affiliate)
================================================================================\n\n`;

totalNowMapped.forEach(item => {
  masterTxt += `--------------------------------------------------------------------------------\n`;
  masterTxt += `NO. ${item.id} | JUDUL: ${item.judul}\n`;
  masterTxt += `HOOK: ${item.hook || '-'}\n`;
  masterTxt += `🏆 PRODUK UTAMA REKOMENDASI: ${item.selected_product?.title || '-'}\n`;
  masterTxt += `   🔗 Link Utama: ${item.selected_product?.affiliateUrl || item.affiliate_shortlinks[0]}\n`;
  masterTxt += `📦 5 LINK AFFILIATE LENGKAP:\n`;
  item.affiliate_shortlinks.forEach((l, idx) => {
    masterTxt += `   ${idx + 1}. ${l}\n`;
  });
  masterTxt += `\n`;
});

const masterTxtPath = 'C:\\Users\\NCN0C\\Downloads\\Video Konten Terlaris\\1\\AFFILIATE_LINKS_MASTER_FOLDER1.txt';
fs.writeFileSync(masterTxtPath, masterTxt, 'utf8');
console.log(`📄 File Master TXT tersimpan di: ${masterTxtPath}`);
