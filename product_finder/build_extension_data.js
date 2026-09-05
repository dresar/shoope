const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\NCN0C\\Downloads\\Video Konten Terlaris';
const extDir = path.join(__dirname, '..', 'extension-shoope');

const folderConfigs = [
  { folderNum: '1', range: '001-100', start: 1, end: 100 },
  { folderNum: '2', range: '101-200', start: 101, end: 200 },
  { folderNum: '3', range: '201-300', start: 201, end: 300 },
  { folderNum: '4', range: '301-400', start: 301, end: 400 },
  { folderNum: '5', range: '401-500', start: 401, end: 500 },
  { folderNum: '6', range: '501-600', start: 501, end: 600 },
  { folderNum: '7', range: '601-700', start: 601, end: 700 },
  { folderNum: '8', range: '701-800', start: 701, end: 800 },
  { folderNum: '9', range: '801-900', start: 801, end: 900 },
  { folderNum: '10', range: '901-1000', start: 901, end: 1000 }
];

let linksDataJsContent = `// Auto-generated Shopee Links Data for Chrome Extension (Folders 1 - 10)\n`;
const allBundles = {};

folderConfigs.forEach(cfg => {
  const jsonPath = path.join(baseDir, cfg.folderNum, 'data.json');
  if (!fs.existsSync(jsonPath)) return;

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const bundled = [];

  data.forEach(item => {
    const spillNumber = item.id;
    const prods = item.shopee_products || [];
    prods.slice(0, 5).forEach((p, idx) => {
      bundled.push({
        id: `prod_${spillNumber}_${idx + 1}`,
        spillNumber: spillNumber,
        storeIndex: idx + 1,
        title: p.title || item.judul,
        price: p.price || 'Rp',
        imageUrl: p.img || (item.framePaths ? item.framePaths[0] : ''),
        url: p.url,
        isMall: !!p.isMall,
        isStar: !!p.isStar,
        folder: `Folder ${cfg.folderNum}`
      });
    });
  });

  allBundles[cfg.folderNum] = bundled;
  console.log(`✅ Folder ${cfg.folderNum} generated: ${bundled.length} items (from ${data.length} videos)`);

  // Write JSON to dashboard
  const bundleFileName = `bundled_links_${cfg.range}.json`;
  fs.writeFileSync(path.join(extDir, 'dashboard', bundleFileName), JSON.stringify(bundled, null, 2), 'utf8');

  // Add to links_data.js
  const varKey = `__BUNDLED_SHOPEE_LINKS_${cfg.range.replace('-', '_')}`;
  linksDataJsContent += `window.${varKey} = ${JSON.stringify(bundled, null, 2)};\n`;
});

// Helper map on window
linksDataJsContent += `\nwindow.__ALL_SHOPEE_FOLDERS_DATA = {\n`;
folderConfigs.forEach(cfg => {
  if (allBundles[cfg.folderNum]) {
    const varKey = `__BUNDLED_SHOPEE_LINKS_${cfg.range.replace('-', '_')}`;
    linksDataJsContent += `  "${cfg.folderNum}": window.${varKey},\n`;
  }
});
linksDataJsContent += `};\n\n`;

// Default active to Folder 3 as requested by user
linksDataJsContent += `// Default active folder: Folder 3\n`;
linksDataJsContent += `window.__BUNDLED_SHOPEE_LINKS = window.__BUNDLED_SHOPEE_LINKS_201_300 || window.__BUNDLED_SHOPEE_LINKS_001_100;\n`;

fs.writeFileSync(path.join(extDir, 'utils', 'links_data.js'), linksDataJsContent, 'utf8');
console.log('\n🎉 Successfully updated utils/links_data.js with all folders and set Folder 3 active!');
