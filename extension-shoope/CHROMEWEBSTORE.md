# Shopee Affiliate Smart Auto Link & Image Extractor

Ekstensi Chrome otomatis untuk Affiliate Marketer Shopee: menyalin URL produk asli, mengunduh foto pertama produk dengan resolusi tinggi, otomatis mem-paste link ke portal Custom Link Shopee Affiliate, mengekstrak link pendek (`https://s.shopee.co.id/...`), menyalin ke clipboard, dan menyediakannya di Web Dashboard lokal yang siap ekspor (CSV/Excel/JSON).

---

## 🚀 Panduan Cara Install di Google Chrome (Load Unpacked)

1. Buka browser **Google Chrome** atau browser berbasis Chromium (Edge, Brave, Opera).
2. Ketik pada address bar: `chrome://extensions` lalu tekan **Enter**.
3. Aktifkan toggle **"Developer mode"** (Mode Pengembang) di pojok kanan atas.
4. Klik tombol **"Load unpacked"** (Muat yang belum dibongkar) di pojok kiri atas.
5. Pilih folder ekstensi ini: `c:\Users\NCN0C\Videos\shoope\extension-shoope`.
6. Ekstensi **Shopee Affiliate Smart Auto Link & Image Extractor** siap digunakan! Pasang pin (📌) pada ikon ekstensi di toolbar browser agar mudah diakses.

---

## 🌟 Cara Kerja & Fitur Utama

### 1. Ekstraksi Otomatis di Halaman Produk Shopee (`shopee.co.id`)
- Buka halaman produk apa pun di Shopee.
- Widget pintar mengapung (Floating Bar) akan muncul di pojok kanan bawah dengan thumbnail, judul, dan harga.
- Klik **"⚡ Generate Affiliate Link"**:
  1. Otomatis menyalin URL bersih produk.
  2. Otomatis mendownload foto pertama produk beresolusi tinggi ke folder download komputer Anda.
  3. Otomatis membuka/mengalihkan ke tab `https://affiliate.shopee.co.id/offer/custom_link`.

### 2. Otomatisasi Halaman Custom Link Shopee Affiliate
- Pada portal Custom Link, ekstensi otomatis:
  1. Memasukkan URL produk ke kotak `<textarea>`.
  2. Mengisi Sub-tag 1 & Sub-tag 2 jika Anda mengaturnya di dashboard.
  3. Mengklik tombol **"Buat Link"**.
  4. Mendeteksi modal pop-up **"Link dari Link Khusus"**.
  5. Menangkap link singkat (`https://s.shopee.co.id/xxxx`) dan menyalinnya ke Clipboard Anda.
  6. Menampilkan notifikasi sukses toast instan di layar dengan tombol "Salin Ulang" dan "Buka Dashboard".

### 3. Master Web Dashboard (`dashboard/dashboard.html`)
- Klik ikon ekstensi lalu pilih **"📊 Buka Web Dashboard"** kapan saja.
- **Katalog & Database**:
  - Tampilan Kartu Visual (Grid) & Spreadsheet (Tabel).
  - Preview foto produk, harga, tanggal, link asli, dan link affiliate.
  - Tombol 1-klik **📋 Salin Link Affiliate**.
  - Tombol **🖼️ Download Gambar**.
  - Tombol **📝 Salin Caption Medsos** (TikTok, Shopee Video, WhatsApp, Telegram, Instagram).
- **Ekspor Data**:
  - 📥 **Export ke Excel/CSV**: Siap untuk pencatatan laporan pembukuan.
  - 📦 **Export ke JSON**: Backup database lokal.
  - 📋 **Salin Semua Link**: Salin daftar link sekaligus.
- **Quick Generator Manual**: Paste link produk apa saja langsung di dashboard tanpa harus membuka produk satu per satu.
- **Kustomisasi Pengaturan**:
  - Toggle Auto-download gambar pertama (On/Off).
  - Toggle Auto-close tab affiliate setelah link berhasil digenerate (On/Off).
  - Toggle Auto-open dashboard (On/Off).
  - Preset template caption kustom dengan variabel `{title}`, `{price}`, `{affiliateUrl}`.

---

## 🔒 Izin & Keamanan Data (Manifest V3)

Semua data affiliate Anda tersimpan secara lokal di browser (`chrome.storage.local`). Tidak ada data atau link yang dikirim ke server pihak ketiga manapun:

| Permission | Alasan Penggunaan |
|---|---|
| `storage` | Menyimpan riwayat database produk affiliate, link, dan pengaturan lokal di browser |
| `downloads` | Mengunduh foto pertama produk secara otomatis ke folder komputer pengguna |
| `tabs` | Mendeteksi tab produk Shopee dan membuka halaman generator affiliate |
| `activeTab` | Membaca info produk yang sedang aktif dibuka |
| `clipboardWrite` | Otomatis menyalin link affiliate (`https://s.shopee.co.id/...`) ke clipboard |
| `notifications` | Menampilkan notifikasi saat link affiliate siap digunakan |
| `host_permissions` | Berinteraksi dengan `shopee.co.id` dan `affiliate.shopee.co.id` untuk otomatisasi form |

---

## 📁 Struktur File Proyek

```
extension-shoope/
├── manifest.json                  # Konfigurasi Manifest V3
├── service-worker.js              # Background service worker
├── icons/                         # Ikon ekstensi PNG 16x16, 48x48, 128x128
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── utils/
│   └── storage.js                 # Helper database chrome.storage.local
├── content-scripts/
│   ├── shopee-product.js          # Injeksi & ekstraksi di halaman shopee.co.id
│   ├── shopee-product.css         # Styling widget floating bar
│   ├── shopee-affiliate.js        # Otomatisasi form & modal custom_link
│   └── shopee-affiliate.css       # Styling toast notification
├── popup/
│   ├── popup.html                 # Mini menu popup di toolbar
│   ├── popup.css
│   └── popup.js
├── dashboard/
│   ├── dashboard.html             # Master web dashboard
│   ├── dashboard.css              # Desain responsif & modern
│   └── dashboard.js               # Logika filter, export CSV/JSON, caption
├── create-icons.js                # Generator ikon
└── CHROMEWEBSTORE.md              # Dokumentasi & panduan
```
