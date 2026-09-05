const { execSync } = require('child_process');

async function findIncognitonPort() {
  // 1. Cari port khusus Incogniton (biasanya port dinamis seperti 60115 atau scanning netstat)
  const candidatePorts = [60115];
  
  // 2. Cari dari netstat yang dimiliki oleh Incogniton chrome.exe
  try {
    const netstatOut = execSync('netstat -ano', { encoding: 'utf8' });
    const lines = netstatOut.split('\n');
    for (const line of lines) {
      if (line.includes('LISTENING') && line.includes('127.0.0.1:')) {
        const match = line.trim().match(/127\.0\.0\.1:(\d+)\s+.*LISTENING\s+(\d+)/);
        if (match) {
          const port = parseInt(match[1]);
          if (!candidatePorts.includes(port) && port > 1024 && port !== 5037 && port !== 5354) {
            candidatePorts.push(port);
          }
        }
      }
    }
  } catch (_) {}

  for (const port of candidatePorts) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) {
        const data = await res.json();
        if (data.Browser && (data.Browser.includes('Chrome') || data.Browser.includes('Incogniton'))) {
          return port;
        }
      }
    } catch (_) {}
  }
  return null;
}

async function testIncogniton() {
  console.log('🔍 Mencari port browser Incogniton...');
  const port = await findIncognitonPort();
  if (!port) {
    console.error('❌ Browser Incogniton belum terdeteksi. Pastikan profil di Incogniton sudah diklik "Start" / terbuka.');
    return;
  }

  console.log(`✅ Incogniton Browser berhasil ditemukan di Port: ${port}`);
  const tabsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
  const tabs = await tabsRes.json();
  console.log('📑 Daftar Tab di Incogniton:');
  tabs.forEach(t => console.log(`   - [${t.title}] (${t.url})`));
}

if (require.main === module) {
  testIncogniton().catch(console.error);
}

module.exports = { findIncognitonPort };
