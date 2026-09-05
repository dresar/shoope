const fs = require('fs');
const path = require('path');

const latestRaw = `https://s.shopee.co.id/9V11VosTIK
https://s.shopee.co.id/9KhbJVt6dJ
https://s.shopee.co.id/9pdruQrCcQ
https://s.shopee.co.id/9fKRi7rpxP
https://s.shopee.co.id/3qMelPR6be
https://s.shopee.co.id/3g3EZ6Rjwd
https://s.shopee.co.id/1Vyjz7ZzLE
https://s.shopee.co.id/1LfJmoacgD
https://s.shopee.co.id/1gIABQrZUV
https://s.shopee.co.id/qj3BtukBM
https://s.shopee.co.id/gPczavNWL
https://s.shopee.co.id/1BLtaVtTVS
https://s.shopee.co.id/4VcLYdyWOk
https://s.shopee.co.id/4LIvMKz9jj
https://s.shopee.co.id/qj3BuCTq4
https://s.shopee.co.id/1LfJmpVxNK
https://s.shopee.co.id/1Vyjz8VK2N
https://s.shopee.co.id/2LXqyfS9LY
https://s.shopee.co.id/2VrHAyRW0b
https://s.shopee.co.id/AKa8VNJLj2
https://s.shopee.co.id/AUtYhgIiO5
https://s.shopee.co.id/9zxI6lKcP0
https://s.shopee.co.id/8Kp47hQxmi
https://s.shopee.co.id/6VNPwKu4vh
https://s.shopee.co.id/60R9LPvywc
https://s.shopee.co.id/6AkZXivLbf
https://s.shopee.co.id/5foIwnxFca
https://s.shopee.co.id/4qFBxHMQDu
https://s.shopee.co.id/4fvlkyN3Yt
https://s.shopee.co.id/3B6xyDSlbc
https://s.shopee.co.id/30nXluTOwb
https://s.shopee.co.id/1Vyjz9uyNK
https://s.shopee.co.id/1LfJmqvbiJ
https://s.shopee.co.id/1BLtaXwF3I
https://s.shopee.co.id/112TOEwsOH
https://s.shopee.co.id/20v0a5F8Y7
https://s.shopee.co.id/1qbaNmFlt6
https://s.shopee.co.id/1gIABTGPE5
https://s.shopee.co.id/1VyjzAH2Z4
https://s.shopee.co.id/2qU7ZcY6Hh
https://s.shopee.co.id/30nXlvXSwk
https://s.shopee.co.id/3B6xyEWpbn
https://s.shopee.co.id/3VjoMqVYvt
https://s.shopee.co.id/9V11VsVL1l
https://s.shopee.co.id/9fKRiBUhgo
https://s.shopee.co.id/9pdruUU4Lr
https://s.shopee.co.id/9zxI6nTR0u
https://s.shopee.co.id/4AzVA5BQyX
https://s.shopee.co.id/4LIvMOAnda
https://s.shopee.co.id/4VcLYhAAId
https://s.shopee.co.id/80CDj8IZ3k
https://s.shopee.co.id/8AVdvRHvin
https://s.shopee.co.id/8Kp47kHINq
https://s.shopee.co.id/8V8UK3Gf2t
https://s.shopee.co.id/2VrHB219RH
https://s.shopee.co.id/19wCRAfVo
https://s.shopee.co.id/BTMOkA2Ar
https://s.shopee.co.id/Lmmb39Opu
https://s.shopee.co.id/60R9LT8Awb
https://s.shopee.co.id/6VNPwO6Gvi
https://s.shopee.co.id/6L3zk56uGh
https://s.shopee.co.id/5VUskYA4xY
https://s.shopee.co.id/1qbaNokF66
https://s.shopee.co.id/1gIABVksR5
https://s.shopee.co.id/qj3Byo37w
https://s.shopee.co.id/gPczfogSv
https://s.shopee.co.id/AKa8VRa1Hs
https://s.shopee.co.id/AUtYhkZNwv
https://s.shopee.co.id/9zxI6pbHxq
https://s.shopee.co.id/AAGiJ8aect
https://s.shopee.co.id/Lmmb4YE1x
https://s.shopee.co.id/BTMOlYrMw
https://s.shopee.co.id/19wCSZUhv
https://s.shopee.co.id/112TOIVgg9
https://s.shopee.co.id/Lmmb4u18q
https://s.shopee.co.id/W6CnNtNnt
https://s.shopee.co.id/19wCSvHoo
https://s.shopee.co.id/BTMOlueTr`;

const matches = [...latestRaw.matchAll(/https?:\/\/(?:s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_-]+/g)].map(m => m[0]);
console.log('Matches in latest input:', matches.length);

const unique = [];
const seen = new Set();
for (const u of matches) {
  let clean = u.replace(/Salin.*$/i, '').trim();
  if (!seen.has(clean)) {
    seen.add(clean);
    unique.push(clean);
  }
}
console.log('Unique clean links in latest input:', unique.length);

// Load Folder 1 data.json
const f1Path = 'C:\\Users\\NCN0C\\Downloads\\Video Konten Terlaris\\1\\data.json';
const f1Data = JSON.parse(fs.readFileSync(f1Path, 'utf8'));

let cursor = 0;
let newMapped = 0;

for (let i = 0; i < f1Data.length; i++) {
  const item = f1Data[i];
  if (item.affiliate_shortlinks && item.affiliate_shortlinks.length === 5) {
    continue;
  }
  const chunk = unique.slice(cursor, cursor + 5);
  if (chunk.length > 0) {
    // Fill up to 5 links
    while (chunk.length < 5 && item.shopee_products && item.shopee_products[chunk.length]) {
      chunk.push(item.shopee_products[chunk.length].url);
    }
    item.affiliate_shortlinks = chunk;
    if (item.shopee_products) {
      item.shopee_products.forEach((p, idx) => {
        if (chunk[idx]) p.affiliateUrl = chunk[idx];
      });
    }
    if (item.selected_product && chunk[0]) {
      item.selected_product.affiliateUrl = chunk[0];
    }
    cursor += 5;
    newMapped++;
    console.log(`✅ Mapped Video No. ${item.id} (${item.judul.slice(0, 35)}...): ${chunk.length} links`);
  }
}

fs.writeFileSync(f1Path, JSON.stringify(f1Data, null, 2), 'utf8');

const totalCompleted = f1Data.filter(x => x.affiliate_shortlinks && x.affiliate_shortlinks.length > 0);
console.log(`\n🎉 PROGRES FOLDER 1 SAAT INI: ${totalCompleted.length} / 100 Video`);
