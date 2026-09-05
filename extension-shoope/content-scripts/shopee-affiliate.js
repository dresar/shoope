/**
 * Shopee Affiliate In-Page Floating Automator (Direct on-page UI & 5-in-1 Loop)
 * Version: 1.4.0 (Multi-Folder 1-10 Support, Folder 3 Active Default, 100-Link Slicing, Strict URL Cleaner)
 */

(function () {
  'use strict';

  if (window.__shopeeAffiliateInPageInjected) return;
  window.__shopeeAffiliateInPageInjected = true;

  console.log('[ShopeeAffiliateExt v1.4.0] Smart In-Page 5-in-1 Floating Automator loaded.');

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  let isLoopRunning = false;
  let currentBatches = [];
  let currentBatchIndex = 0;
  let results = [];
  let allBundledItems = [];
  let currentFolderKey = 'Folder 3';

  // Helper: React & Vue compatible input value setter
  function setNativeValue(element, value) {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')
      ? Object.getOwnPropertyDescriptor(element, 'value').set
      : null;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')
      ? Object.getOwnPropertyDescriptor(prototype, 'value').set
      : null;

    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (valueSetter) {
      valueSetter.call(element, value);
    } else {
      element.value = value;
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function findElementByText(selector, textPattern) {
    const elements = Array.from(document.querySelectorAll(selector));
    return elements.find(el => {
      const text = (el.textContent || el.innerText || '').trim().toLowerCase();
      if (typeof textPattern === 'string') {
        return text === textPattern.toLowerCase() || text.includes(textPattern.toLowerCase());
      }
      return textPattern.test(text);
    });
  }

  function showToast(msg, type = 'info') {
    let container = document.getElementById('shopee-aff-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'shopee-aff-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'shopee-aff-toast';
    toast.innerHTML = `<span>${type === 'success' ? '✨' : '⚡'}</span> <span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  function getBundledData(folderNum) {
    if (window.__ALL_SHOPEE_FOLDERS_DATA && window.__ALL_SHOPEE_FOLDERS_DATA[folderNum]) {
      return window.__ALL_SHOPEE_FOLDERS_DATA[folderNum];
    }
    if (folderNum === '3') return window.__BUNDLED_SHOPEE_LINKS_201_300 || [];
    if (folderNum === '1') return window.__BUNDLED_SHOPEE_LINKS_001_100 || [];
    if (folderNum === '2') return window.__BUNDLED_SHOPEE_LINKS_101_200 || [];
    return window.__BUNDLED_SHOPEE_LINKS || [];
  }

  function getFolderRanges(folderNum) {
    const f = parseInt(folderNum, 10) || 1;
    const startNum = (f - 1) * 100 + 1;
    const endNum = f * 100;

    const p1Start = String(startNum).padStart(3, '0');
    const p1End = String(startNum + 19).padStart(3, '0');

    const p2Start = String(startNum + 20).padStart(3, '0');
    const p2End = String(startNum + 39).padStart(3, '0');

    const p3Start = String(startNum + 40).padStart(3, '0');
    const p3End = String(startNum + 59).padStart(3, '0');

    const p4Start = String(startNum + 60).padStart(3, '0');
    const p4End = String(startNum + 79).padStart(3, '0');

    const p5Start = String(startNum + 80).padStart(3, '0');
    const p5End = String(endNum).padStart(3, '0');

    return {
      folderNum: f,
      start: p1Start,
      end: p5End,
      p1: `⚡ Bagian 1 (No. ${p1Start} - ${p1End} = 100 Link / 20 Putaran)`,
      p2: `⚡ Bagian 2 (No. ${p2Start} - ${p2End} = 100 Link / 20 Putaran)`,
      p3: `⚡ Bagian 3 (No. ${p3Start} - ${p3End} = 100 Link / 20 Putaran)`,
      p4: `⚡ Bagian 4 (No. ${p4Start} - ${p4End} = 100 Link / 20 Putaran)`,
      p5: `⚡ Bagian 5 (No. ${p5Start} - ${p5End} = 100 Link / 20 Putaran)`,
      all: `🚀 Semua 500 Link (No. ${p1Start} - ${p5End} = 100 Putaran)`
    };
  }

  // ─── Inject Floating UI ───────────────────────────────────────────────────

  async function injectFloatingWidget() {
    if (document.getElementById('shopee-aff-floating-widget')) return;

    // Set active default to Folder 3
    currentFolderKey = 'Folder 3';
    allBundledItems = getBundledData('3');

    try {
      await StorageHelper.createFolder('Folder 3');
    } catch (e) {}

    // Load existing state if available
    const savedState = await StorageHelper.getBatchState();
    if (savedState && Array.isArray(savedState.results)) {
      results = savedState.results;
      currentBatchIndex = savedState.currentIndex || 0;
      if (Array.isArray(savedState.batches)) {
        currentBatches = savedState.batches;
      }
    }

    // Merge already saved products from main storage
    const savedProducts = await StorageHelper.getProducts();
    for (const p of savedProducts) {
      if (p.affiliateUrl && p.cleanUrl && !results.some(r => r.originalUrl === p.cleanUrl && r.affiliateUrl)) {
        results.push({
          originalUrl: p.cleanUrl,
          affiliateUrl: p.affiliateUrl,
          status: 'success'
        });
      }
    }

    const r = getFolderRanges('3');

    const widget = document.createElement('div');
    widget.id = 'shopee-aff-floating-widget';
    widget.innerHTML = `
      <div class="aff-widget-header" id="aff-drag-handle">
        <div class="aff-widget-title">
          <span>🚀</span>
          <span>Shopee 5-in-1 Mass Link Generator <small style="font-size:10px; color:#38bdf8;">v1.4.0</small></span>
        </div>
        <div class="aff-widget-controls">
          <button class="aff-btn-icon" id="aff-btn-min" title="Kecilkan / Buka">➖</button>
          <button class="aff-btn-icon" id="aff-btn-close" title="Tutup">✕</button>
        </div>
      </div>

      <div class="aff-widget-body" id="aff-widget-body">
        <!-- Smart Resume / Missing Detector Bar -->
        <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <div>
            <span style="color: #94a3b8;">Status Tersimpan:</span>
            <strong id="aff-saved-indicator" style="color: #10b981;">0 Selesai</strong> |
            <strong id="aff-missing-indicator" style="color: #f59e0b;">500 Belum</strong>
          </div>
          <button id="aff-btn-load-missing-only" style="background: #0284c7; color: #fff; border: none; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 10px; cursor: pointer;">
            🔍 Muat Sisa yang Belum
          </button>
        </div>

        <!-- Folder Selector (1 s/d 10) -->
        <div class="aff-form-group">
          <div class="aff-form-label">
            <span>Pilih Folder Video:</span>
          </div>
          <select id="aff-folder-select" style="background:#1e293b; color:#fbbf24; border:1px solid #334155; border-radius:8px; padding:7px 10px; font-weight:800; font-size:12px; outline:none; cursor:pointer; width:100%;">
            <option value="3" selected>🔥 Folder 3 (Video Konten No. 201 - 300) [AKTIF]</option>
            <option value="1">📂 Folder 1 (Video Konten No. 001 - 100)</option>
            <option value="2">📂 Folder 2 (Video Konten No. 101 - 200)</option>
            <option value="4">📂 Folder 4 (Video Konten No. 301 - 400)</option>
            <option value="5">📂 Folder 5 (Video Konten No. 401 - 500)</option>
            <option value="6">📂 Folder 6 (Video Konten No. 501 - 600)</option>
            <option value="7">📂 Folder 7 (Video Konten No. 601 - 700)</option>
            <option value="8">📂 Folder 8 (Video Konten No. 701 - 800)</option>
            <option value="9">📂 Folder 9 (Video Konten No. 801 - 900)</option>
            <option value="10">📂 Folder 10 (Video Konten No. 901 - 1000)</option>
          </select>
        </div>

        <!-- Range Selector for 100 Links -->
        <div class="aff-form-group">
          <div class="aff-form-label">
            <span>Pilih Paket Link (100 Link / 500 Link):</span>
          </div>
          <select id="aff-range-select" style="background:#1e293b; color:#38bdf8; border:1px solid #334155; border-radius:8px; padding:7px 10px; font-weight:700; font-size:12px; outline:none; cursor:pointer; width:100%;">
            <option value="missing" selected>🎯 Otomatis: Hanya yang Belum Digenerate</option>
            <option value="part1">${r.p1}</option>
            <option value="part2">${r.p2}</option>
            <option value="part3">${r.p3}</option>
            <option value="part4">${r.p4}</option>
            <option value="part5">${r.p5}</option>
            <option value="all">${r.all}</option>
          </select>
        </div>

        <div class="aff-btn-row">
          <button class="aff-btn aff-btn-primary" id="aff-btn-load-range" style="flex: 1; background: linear-gradient(135deg, #ea580c, #f97316);">
            <span>📂 Muat Paket Terpilih</span>
          </button>
          <button class="aff-btn aff-btn-secondary" id="aff-btn-clear" title="Kosongkan">
            <span>🧹 Clear</span>
          </button>
        </div>

        <div class="aff-form-group">
          <div class="aff-form-label">
            <span>Daftar URL Shopee yang akan diproses:</span>
            <span id="aff-detected-count" style="color: #38bdf8; font-weight: 800;">0 Link (0 Putaran)</span>
          </div>
          <textarea class="aff-textarea" id="aff-urls-input" placeholder="Daftar link akan muncul di sini..."></textarea>
        </div>

        <!-- Progress Area -->
        <div class="aff-progress-card" id="aff-progress-card" style="display: ${results.length > 0 ? 'flex' : 'none'};">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700;">
            <span id="aff-prog-status" style="color: #38bdf8;">${results.length > 0 ? 'Tersimpan ' + results.length + ' link' : 'Siap Mulai'}</span>
            <span id="aff-prog-pct" style="color: #fff;">${currentBatches.length > 0 ? Math.round((currentBatchIndex / currentBatches.length) * 100) : 0}%</span>
          </div>
          <div class="aff-progress-bar-bg">
            <div class="aff-progress-bar-fill" id="aff-prog-bar" style="width: ${currentBatches.length > 0 ? Math.round((currentBatchIndex / currentBatches.length) * 100) : 0}%;"></div>
          </div>
          <div class="aff-stats-row">
            <span>Putaran: <strong id="aff-curr-batch" style="color:#fff;">${currentBatchIndex}</strong> / <strong id="aff-total-batch">${currentBatches.length || 0}</strong></span>
            <span>✅ Sukses: <strong id="aff-success-count" style="color:#10b981;">${results.filter(r=>r.status==='success').length}</strong></span>
            <span>❌ Gagal: <strong id="aff-fail-count" style="color:#f43f5e;">${results.filter(r=>r.status==='failed').length}</strong></span>
          </div>
        </div>

        <!-- Action Controls -->
        <div class="aff-btn-row">
          <button class="aff-btn aff-btn-green" id="aff-btn-start" style="flex: 1;">
            <span>▶️ Mulai Auto Paste 5 Link</span>
          </button>
          <button class="aff-btn aff-btn-secondary" id="aff-btn-pause" style="display: none;">
            <span>⏸️ Pause</span>
          </button>
          <button class="aff-btn aff-btn-secondary" id="aff-btn-reset" style="display: ${results.length > 0 ? 'flex' : 'none'};" title="Reset Progres">
            <span>⏹️ Reset</span>
          </button>
        </div>

        <!-- Live Export Actions -->
        <div class="aff-btn-row" id="aff-finish-actions" style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; flex-wrap: wrap;">
          <button class="aff-btn aff-btn-secondary" id="aff-btn-download-txt" style="flex: 1; min-width: 110px;" title="Download file TXT link affiliate">
            <span>📥 Download TXT</span>
          </button>
          <button class="aff-btn aff-btn-secondary" id="aff-btn-copy-all" style="flex: 1; min-width: 110px; background: #0284c7; color:#fff;" title="Salin semua shortlink murni">
            <span>📋 Salin Link</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Event Bindings & DOM References
    const btnMin = document.getElementById('aff-btn-min');
    const bodyEl = document.getElementById('aff-widget-body');
    const btnClose = document.getElementById('aff-btn-close');
    const folderSelect = document.getElementById('aff-folder-select');
    const rangeSelect = document.getElementById('aff-range-select');
    const btnLoadRange = document.getElementById('aff-btn-load-range');
    const btnLoadMissingOnly = document.getElementById('aff-btn-load-missing-only');
    const inputUrls = document.getElementById('aff-urls-input');
    const btnClear = document.getElementById('aff-btn-clear');
    const btnStart = document.getElementById('aff-btn-start');
    const btnPause = document.getElementById('aff-btn-pause');
    const btnReset = document.getElementById('aff-btn-reset');
    const btnDownloadTxt = document.getElementById('aff-btn-download-txt');
    const btnCopyAll = document.getElementById('aff-btn-copy-all');
    const detectedCount = document.getElementById('aff-detected-count');

    function updateRangeOptions(folderNum) {
      const ranges = getFolderRanges(folderNum);
      rangeSelect.innerHTML = `
        <option value="missing" selected>🎯 Otomatis: Hanya yang Belum Digenerate</option>
        <option value="part1">${ranges.p1}</option>
        <option value="part2">${ranges.p2}</option>
        <option value="part3">${ranges.p3}</option>
        <option value="part4">${ranges.p4}</option>
        <option value="part5">${ranges.p5}</option>
        <option value="all">${ranges.all}</option>
      `;
    }

    folderSelect.addEventListener('change', () => {
      const fNum = folderSelect.value;
      currentFolderKey = `Folder ${fNum}`;
      allBundledItems = getBundledData(fNum);
      updateRangeOptions(fNum);
      loadRangeLinks('missing');
    });

    // Initial check and load missing links for Folder 3
    updateSavedIndicator();
    loadRangeLinks('missing');

    btnMin.addEventListener('click', () => {
      widget.classList.toggle('minimized');
      bodyEl.style.display = widget.classList.contains('minimized') ? 'none' : 'flex';
      btnMin.textContent = widget.classList.contains('minimized') ? '➕' : '➖';
    });

    btnClose.addEventListener('click', () => {
      widget.remove();
    });

    rangeSelect.addEventListener('change', () => {
      loadRangeLinks(rangeSelect.value);
    });

    btnLoadRange.addEventListener('click', () => {
      loadRangeLinks(rangeSelect.value);
    });

    if (btnLoadMissingOnly) {
      btnLoadMissingOnly.addEventListener('click', () => {
        rangeSelect.value = 'missing';
        loadRangeLinks('missing');
      });
    }

    function updateSavedIndicator() {
      const savedUrls = new Set(results.filter(r => r.affiliateUrl && r.status === 'success').map(r => r.originalUrl));
      const total = allBundledItems.length || 500;
      const completed = savedUrls.size;
      const missing = Math.max(0, total - completed);

      const savedEl = document.getElementById('aff-saved-indicator');
      const missingEl = document.getElementById('aff-missing-indicator');
      if (savedEl) savedEl.textContent = `${completed} Selesai`;
      if (missingEl) missingEl.textContent = `${missing} Belum`;
    }

    function loadRangeLinks(rangeKey) {
      if (!allBundledItems || allBundledItems.length === 0) {
        allBundledItems = getBundledData(folderSelect.value);
      }
      if (!allBundledItems || allBundledItems.length === 0) {
        showToast('Memuat data link...', 'info');
        return;
      }

      const savedUrls = new Set(results.filter(r => r.affiliateUrl && r.status === 'success').map(r => r.originalUrl));

      let filtered = [];
      if (rangeKey === 'missing') {
        filtered = allBundledItems.filter(item => !savedUrls.has(item.url));
      } else if (rangeKey === 'part1') { // 0..99
        filtered = allBundledItems.slice(0, 100);
      } else if (rangeKey === 'part2') { // 100..199
        filtered = allBundledItems.slice(100, 200);
      } else if (rangeKey === 'part3') { // 200..299
        filtered = allBundledItems.slice(200, 300);
      } else if (rangeKey === 'part4') { // 300..399
        filtered = allBundledItems.slice(300, 400);
      } else if (rangeKey === 'part5') { // 400..499
        filtered = allBundledItems.slice(400, 500);
      } else {
        filtered = allBundledItems;
      }

      const urls = filtered.map(i => i.url).filter(Boolean);
      inputUrls.value = urls.join('\n');
      detectedCount.textContent = `${urls.length} Link (${Math.ceil(urls.length / 5)} Putaran)`;
      updateSavedIndicator();
      showToast(`✅ Berhasil memuat ${urls.length} link Shopee ${currentFolderKey}!`, 'success');
    }

    inputUrls.addEventListener('input', () => {
      const urls = getParsedUrls();
      detectedCount.textContent = `${urls.length} Link (${Math.ceil(urls.length / 5)} Putaran)`;
    });

    btnClear.addEventListener('click', () => {
      inputUrls.value = '';
      detectedCount.textContent = '0 Link';
    });

    btnStart.addEventListener('click', () => {
      startAutoPasteLoop();
    });

    btnPause.addEventListener('click', () => {
      isLoopRunning = false;
      btnPause.style.display = 'none';
      btnStart.style.display = 'flex';
      document.getElementById('aff-prog-status').textContent = '⏸️ Di-pause.';
      showToast('Otomasi di-pause.');
    });

    btnReset.addEventListener('click', async () => {
      if (!confirm('Reset semua progres dan hapus link yang sudah tersimpan?')) return;
      isLoopRunning = false;
      currentBatchIndex = 0;
      currentBatches = [];
      results = [];
      await StorageHelper.clearBatchState();
      updateProgressUI();
      updateSavedIndicator();
      document.getElementById('aff-progress-card').style.display = 'none';
      btnReset.style.display = 'none';
      btnStart.style.display = 'flex';
      btnPause.style.display = 'none';
      showToast('Progres berhasil direset.', 'info');
    });

    btnCopyAll.addEventListener('click', () => {
      const valid = results
        .map(r => (r.affiliateUrl || '').trim())
        .filter(u => u && (u.includes('s.shopee.co.id') || u.includes('shope.ee')));

      if (valid.length === 0) return showToast('Belum ada link affiliate yang siap disalin.', 'error');
      navigator.clipboard.writeText(valid.join('\n'))
        .then(() => showToast(`✅ ${valid.length} Link Murni berhasil disalin!`))
        .catch(() => showToast('Gagal menyalin link.', 'error'));
    });

    btnDownloadTxt.addEventListener('click', () => {
      const valid = results
        .map(r => (r.affiliateUrl || '').trim())
        .filter(u => u && (u.includes('s.shopee.co.id') || u.includes('shope.ee')));

      if (valid.length === 0) return showToast('Belum ada link untuk didownload.', 'error');

      const blob = new Blob([valid.join('\n')], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Shopee_Affiliate_Links_${currentFolderKey.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast(`📥 File TXT ${valid.length} link berhasil didownload!`, 'success');
    });

    makeDraggable(widget, document.getElementById('aff-drag-handle'));
  }

  function getParsedUrls() {
    const textarea = document.getElementById('aff-urls-input');
    if (!textarea) return [];
    return textarea.value
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && u.startsWith('http'));
  }

  function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + 'px';
      element.style.left = (element.offsetLeft - pos1) + 'px';
      element.style.bottom = 'auto';
      element.style.right = 'auto';
    }

    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // ─── Core 5-in-1 Auto Paste Loop ──────────────────────────────────────────

  async function startAutoPasteLoop() {
    const urls = getParsedUrls();
    if (urls.length === 0) {
      return showToast('Masukkan atau pilih paket URL Shopee terlebih dahulu!', 'error');
    }

    const chunkSize = 5;
    currentBatches = [];
    for (let i = 0; i < urls.length; i += chunkSize) {
      currentBatches.push(urls.slice(i, i + chunkSize));
    }

    currentBatchIndex = 0;
    isLoopRunning = true;

    // UI Updates
    document.getElementById('aff-progress-card').style.display = 'flex';
    document.getElementById('aff-btn-start').style.display = 'none';
    document.getElementById('aff-btn-pause').style.display = 'flex';
    document.getElementById('aff-btn-reset').style.display = 'flex';

    updateProgressUI();
    showToast(`🚀 Memulai otomasi ${urls.length} link (${currentBatches.length} Putaran)...`, 'info');

    while (currentBatchIndex < currentBatches.length && isLoopRunning) {
      const batch = currentBatches[currentBatchIndex];
      const batchNum = currentBatchIndex + 1;

      document.getElementById('aff-prog-status').textContent = `🔄 Memproses Putaran ${batchNum} dari ${currentBatches.length} (${batch.length} link)...`;
      document.getElementById('aff-curr-batch').textContent = batchNum;

      // 1. Locate Custom Link Input Textarea
      let textarea = document.querySelector('textarea[placeholder*="shopee.co.id"], textarea[placeholder*="Link Asli"], textarea[class*="custom-link"], .ant-input[rows], textarea');
      if (!textarea) {
        showToast('Tidak menemukan kotak input Custom Link Shopee di halaman!', 'error');
        isLoopRunning = false;
        break;
      }

      // 2. Set value 5 URLs joined by newlines
      const batchText = batch.join('\n');
      textarea.focus();
      setNativeValue(textarea, batchText);
      await sleep(600);

      // 3. Locate & Click 'Dapatkan Tautan' / 'Get Link' Button
      let getLinkBtn = findElementByText('button', 'Dapatkan Tautan') ||
                       findElementByText('button', 'Get Link') ||
                       findElementByText('button', 'Dapatkan Link') ||
                       document.querySelector('.ant-btn-primary');

      if (!getLinkBtn) {
        showToast('Tombol "Dapatkan Tautan" tidak ditemukan!', 'error');
        isLoopRunning = false;
        break;
      }

      getLinkBtn.click();

      // 4. Wait for generation modal / results with Strict Regex extraction
      document.getElementById('aff-prog-status').textContent = `⏳ Menunggu hasil link putaran #${batchNum}...`;
      
      let extractedLinks = [];
      for (let attempt = 0; attempt < 25; attempt++) {
        await sleep(600);

        const modalContainer = document.querySelector('div[role="dialog"], .ant-modal, body');
        const modalHtml = modalContainer ? modalContainer.innerHTML : document.body.innerHTML;
        const matchedUrls = modalHtml.match(/https?:\/\/(?:s\.shopee\.co\.id|shope\.ee)\/[a-zA-Z0-9_-]+/g);

        if (matchedUrls && matchedUrls.length > 0) {
          const uniqueList = [];
          for (const u of matchedUrls) {
            const clean = u.replace(/Salin.*$/i, '').trim();
            if (!uniqueList.includes(clean)) uniqueList.push(clean);
          }
          extractedLinks = uniqueList;
        }

        if (extractedLinks.length >= batch.length) break;
      }

      console.log(`[ShopeeAffiliateExt] Batch #${batchNum} captured:`, extractedLinks);

      // Record and persist results per-batch with full metadata
      batch.forEach((origUrl, i) => {
        const affUrl = extractedLinks[i] || '';
        const meta = allBundledItems.find(item => item.url === origUrl) || {};

        const existingIdx = results.findIndex(r => r.originalUrl === origUrl);
        const itemResult = {
          originalUrl: origUrl,
          affiliateUrl: affUrl,
          metaTitle: meta.title || '',
          metaPrice: meta.price || '',
          metaImage: meta.imageUrl || '',
          spillNumber: meta.spillNumber || '',
          storeIndex: meta.storeIndex || (i + 1),
          status: affUrl ? 'success' : 'failed'
        };

        if (existingIdx !== -1) {
          results[existingIdx] = itemResult;
        } else {
          results.push(itemResult);
        }

        if (affUrl) {
          StorageHelper.saveProduct({
            id: meta.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            cleanUrl: origUrl,
            originalUrl: origUrl,
            affiliateUrl: affUrl,
            title: meta.title || `Produk Shopee No. ${meta.spillNumber || ''} (Toko ${meta.storeIndex || (i+1)})`,
            price: meta.price || 'Shopee',
            imageUrl: meta.imageUrl || '',
            folder: currentFolderKey,
            status: 'completed'
          }).catch(() => {});
        }
      });

      currentBatchIndex++;

      // Save state to chrome.storage
      await StorageHelper.saveBatchState({
        batches: currentBatches,
        currentIndex: currentBatchIndex,
        results: results,
        successCount: results.filter(r => r.status === 'success').length,
        failCount: results.filter(r => r.status === 'failed').length,
        isRunning: isLoopRunning,
        updatedAt: Date.now()
      });

      updateProgressUI();

      // Close modal
      try {
        const closeBtn = document.querySelector('div[role="dialog"] button[aria-label="Close"], div[role="dialog"] .ant-modal-close, div[class*="modal"] button:contains("✕"), div[class*="modal"] svg');
        if (closeBtn) closeBtn.click();
      } catch (e) {}

      // Clear textarea
      if (textarea) setNativeValue(textarea, '');

      // Delay between batches (2.5s safe delay)
      if (currentBatchIndex < currentBatches.length && isLoopRunning) {
        document.getElementById('aff-prog-status').textContent = `⏳ Jeda 2.5 detik sebelum putaran berikutnya...`;
        await sleep(2500);
      }
    }

    if (currentBatchIndex >= currentBatches.length) {
      isLoopRunning = false;
      document.getElementById('aff-prog-status').textContent = '🎉 Semua link dalam paket berhasil digenerate!';
      document.getElementById('aff-prog-status').style.color = '#10b981';
      document.getElementById('aff-btn-start').style.display = 'flex';
      document.getElementById('aff-btn-pause').style.display = 'none';
      showToast('🎉 SELESAI! Seluruh link paket berhasil dibuat!', 'success');
    }
  }

  function updateProgressUI() {
    const total = currentBatches.length || 20;
    const curr = currentBatchIndex;
    const pct = total > 0 ? Math.min(100, Math.round((curr / total) * 100)) : 0;

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    const bar = document.getElementById('aff-prog-bar');
    const pctEl = document.getElementById('aff-prog-pct');
    const currBatchEl = document.getElementById('aff-curr-batch');
    const totalBatchEl = document.getElementById('aff-total-batch');
    const succEl = document.getElementById('aff-success-count');
    const failEl = document.getElementById('aff-fail-count');
    const savedEl = document.getElementById('aff-saved-indicator');
    const missingEl = document.getElementById('aff-missing-indicator');

    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (currBatchEl) currBatchEl.textContent = curr;
    if (totalBatchEl) totalBatchEl.textContent = total;
    if (succEl) succEl.textContent = successCount;
    if (failEl) failEl.textContent = failCount;

    const totalAll = allBundledItems.length || 500;
    if (savedEl) savedEl.textContent = `${successCount} Selesai`;
    if (missingEl) missingEl.textContent = `${Math.max(0, totalAll - successCount)} Belum`;
  }

  // ─── Initialize on Page ───────────────────────────────────────────────────

  function init() {
    injectFloatingWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
  } else {
    setTimeout(init, 500);
  }
})();
