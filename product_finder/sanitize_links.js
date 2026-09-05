const fs = require('fs');
const path = require('path');

const f1Path = 'C:\\Users\\NCN0C\\Downloads\\Video Konten Terlaris\\1\\data.json';
const f1Data = JSON.parse(fs.readFileSync(f1Path, 'utf8'));

function cleanUrl(u) {
  if (!u) return '';
  let str = u.trim();
  str = str.replace(/Salin.*$/i, '');
  str = str.replace(/Mohon.*$/i, '');
  str = str.replace(/Link.*$/i, '');
  return str.trim();
}

f1Data.forEach(item => {
  if (item.affiliate_shortlinks) {
    item.affiliate_shortlinks = item.affiliate_shortlinks.map(cleanUrl).filter(Boolean);
  }
  if (item.shopee_products) {
    item.shopee_products.forEach(p => {
      if (p.affiliateUrl) p.affiliateUrl = cleanUrl(p.affiliateUrl);
    });
  }
  if (item.selected_product && item.selected_product.affiliateUrl) {
    item.selected_product.affiliateUrl = cleanUrl(item.selected_product.affiliateUrl);
  }
});

fs.writeFileSync(f1Path, JSON.stringify(f1Data, null, 2), 'utf8');

const completedVideos = f1Data.filter(x => x.affiliate_shortlinks && x.affiliate_shortlinks.length === 5);

let masterTxt = `================================================================================
DATABASE LINK AFFILIATE SHOPEE - FOLDER 1 (VIDEO KONTEN TERLARIS 1)
Diperbarui: ${new Date().toLocaleString('id-ID')}
Total Video Selesai : ${completedVideos.length} / 100 Video (${completedVideos.length * 5} Link Affiliate)
================================================================================\n\n`;

completedVideos.forEach(item => {
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

console.log(`✅ Sanitize Selesai! ${completedVideos.length} Video (No. 001 - ${completedVideos[completedVideos.length - 1].id}) bersih 100% dari kata 'Salin'`);
console.log(`Contoh link No. 001:`, completedVideos[0].affiliate_shortlinks);
console.log(`Contoh link No. 021:`, completedVideos[20].affiliate_shortlinks);
console.log(`Contoh link No. 073:`, completedVideos[72].affiliate_shortlinks);
