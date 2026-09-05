/**
 * Shopee Affiliate - Modern Floating Card Widget
 * Clean, beautiful, easy-to-use floating card design
 */

(function () {
  'use strict';

  if (window.__shopeeAffExtLoaded) return;
  window.__shopeeAffExtLoaded = true;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function getCleanUrl() {
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical?.href?.includes('shopee.co.id')) return canonical.href;
    try {
      const u = new URL(location.href);
      return u.origin + u.pathname;
    } catch {
      return location.href.split('?')[0];
    }
  }

  function getTitle() {
    const og = document.querySelector('meta[property="og:title"]');
    if (og?.content) return og.content.replace(/\s*\|\s*Shopee Indonesia$/i, '').trim();
    const h1 = document.querySelector('h1');
    if (h1?.textContent) return h1.textContent.trim();
    return document.title.replace(/\s*\|\s*Shopee Indonesia$/i, '').trim() || 'Produk Shopee';
  }

  function getPrice() {
    const els = Array.from(document.querySelectorAll('*'));
    const priceEl = els.find(el =>
      el.children.length === 0 &&
      el.textContent.trim().startsWith('Rp') &&
      el.textContent.trim().length < 20
    );
    return priceEl?.textContent.trim() || '-';
  }

  function getImage() {
    const og = document.querySelector('meta[property="og:image"]');
    if (og?.content?.startsWith('http')) return og.content.replace(/_tn(\.jpg)?$/, '.jpg');

    for (const selector of ['div[class*="gallery"] img', 'picture img', 'img[class*="product"]']) {
      const img = document.querySelector(selector);
      if (img?.src?.startsWith('http') && !img.src.startsWith('data:')) {
        return img.src.replace(/_tn(\.jpg)?$/, '.jpg');
      }
    }
    return '';
  }

  function getProductData() {
    return {
      title: getTitle(),
      price: getPrice(),
      imageUrl: getImage(),
      cleanUrl: getCleanUrl(),
      originalUrl: location.href
    };
  }

  // ─── Widget HTML ─────────────────────────────────────────────────────────────

  const WIDGET_ID = 'saff-widget';

  function buildWidget() {
    if (document.getElementById(WIDGET_ID)) return;

    const root = document.createElement('div');
    root.id = WIDGET_ID;
    root.innerHTML = `
      <div class="saff-fab" id="saff-fab" title="Shopee Affiliate Helper">
        <span class="saff-fab-icon">⚡</span>
        <span class="saff-fab-label">Buat Link Affiliate</span>
      </div>

      <div class="saff-card" id="saff-card">
        <div class="saff-card-header">
          <div class="saff-brand">
            <span class="saff-brand-dot"></span>
            <span class="saff-brand-name">Shopee Affiliate</span>
            <span class="saff-version">v1.3.0</span>
          </div>
          <div class="saff-header-btns">
            <button class="saff-icon-btn" id="saff-btn-dash" title="Buka Dashboard">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </button>
            <button class="saff-icon-btn" id="saff-btn-close" title="Tutup">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <!-- Product Section -->
        <div class="saff-product" id="saff-product">
          <img class="saff-product-img" id="saff-img" src="" alt="" />
          <div class="saff-product-meta">
            <p class="saff-product-name" id="saff-name">Memuat produk...</p>
            <p class="saff-product-price" id="saff-price"></p>
          </div>
        </div>

        <!-- Folder Selection Section -->
        <div class="saff-folder-section">
          <div class="saff-folder-label">
            <span>📁 Simpan ke Folder:</span>
            <button class="saff-btn-new-folder" id="saff-btn-new-folder" title="Buat Folder Baru">+ Folder Baru</button>
          </div>
          <div class="saff-folder-picker-row">
            <select class="saff-folder-select" id="saff-folder-select">
              <option value="Umum">Umum</option>
            </select>
          </div>
          <!-- Inline New Folder Input (hidden by default) -->
          <div class="saff-new-folder-box" id="saff-new-folder-box" style="display:none;">
            <input type="text" class="saff-new-folder-input" id="saff-new-folder-input" placeholder="Nama folder baru..." />
            <button class="saff-btn-save-folder" id="saff-btn-save-folder">Simpan</button>
            <button class="saff-btn-cancel-folder" id="saff-btn-cancel-folder">✕</button>
          </div>
        </div>

        <!-- CTA -->
        <div class="saff-cta-wrap" id="saff-cta-wrap">
          <button class="saff-btn-generate" id="saff-btn-generate">
            <span class="saff-btn-icon-span">⚡</span>
            <span id="saff-gen-label">Generate Affiliate Link</span>
          </button>
        </div>

        <!-- Loading State -->
        <div class="saff-loading" id="saff-loading" style="display:none">
          <div class="saff-spinner"></div>
          <span>Meng-generate link...</span>
        </div>

        <!-- Result -->
        <div class="saff-result" id="saff-result" style="display:none">
          <div class="saff-result-label">✅ Link Affiliate Siap & Tersalin</div>
          <div class="saff-result-link-row">
            <span class="saff-result-url" id="saff-result-url"></span>
            <button class="saff-copy-btn" id="saff-copy-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span id="saff-copy-label">Salin</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Initialize
    setTimeout(refreshProductData, 500);
    setTimeout(refreshProductData, 2200);
    loadFolderOptions();
    checkExistingLink();
    bindEvents();
  }

  // ─── Data Refresh ────────────────────────────────────────────────────────────

  function refreshProductData() {
    const data = getProductData();
    const nameEl = document.getElementById('saff-name');
    const priceEl = document.getElementById('saff-price');
    const imgEl = document.getElementById('saff-img');

    if (nameEl && data.title) nameEl.textContent = data.title;
    if (priceEl && data.price) priceEl.textContent = data.price;
    if (imgEl && data.imageUrl) {
      imgEl.src = data.imageUrl;
      imgEl.style.display = 'block';
    }
  }

  async function checkExistingLink() {
    const data = getProductData();
    if (!data.cleanUrl) return;
    const products = await StorageHelper.getProducts();
    const match = products.find(p => p.cleanUrl === data.cleanUrl && p.affiliateUrl);
    if (match) showResult(match.affiliateUrl);
  }

  async function loadRecentLinks() {
    const products = await StorageHelper.getProducts();
    const ready = products.filter(p => p.affiliateUrl);
    const countEl = document.getElementById('saff-recent-count');
    const listEl = document.getElementById('saff-recent-list');

    if (countEl) countEl.textContent = ready.length;
    if (!listEl) return;

    if (ready.length === 0) {
      listEl.innerHTML = '<p class="saff-empty-text">Belum ada link tersimpan.</p>';
      return;
    }

    listEl.innerHTML = '';
    ready.slice(0, 4).forEach(p => {
      const item = document.createElement('div');
      item.className = 'saff-recent-item';
      item.innerHTML = `
        <img class="saff-recent-thumb" src="${p.imageUrl || ''}" alt="" />
        <div class="saff-recent-meta">
          <span class="saff-recent-title">${p.title || '-'}</span>
          <span class="saff-recent-url">${p.affiliateUrl}</span>
        </div>
        <button class="saff-recent-copy" data-url="${p.affiliateUrl}">Salin</button>
      `;
      listEl.appendChild(item);
    });

    listEl.querySelectorAll('.saff-recent-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(btn.dataset.url);
        btn.textContent = '✓';
        setTimeout(() => btn.textContent = 'Salin', 1500);
      });
    });
  }

  // ─── UI State ────────────────────────────────────────────────────────────────

  function showResult(url) {
    const resultEl = document.getElementById('saff-result');
    const urlEl    = document.getElementById('saff-result-url');
    const ctaWrap  = document.getElementById('saff-cta-wrap');
    const loadingEl = document.getElementById('saff-loading');
    const genLabel = document.getElementById('saff-gen-label');

    if (urlEl) urlEl.textContent = url;
    if (resultEl) resultEl.style.display = 'block';
    if (loadingEl) loadingEl.style.display = 'none';
    // KEEP the CTA button visible — just change label to "Generate Ulang"
    if (ctaWrap) ctaWrap.style.display = 'block';
    if (genLabel) genLabel.textContent = '🔄 Generate Ulang';
  }

  function setLoading(on) {
    const loadEl = document.getElementById('saff-loading');
    const ctaWrap = document.getElementById('saff-cta-wrap');
    if (on) {
      if (loadEl) loadEl.style.display = 'flex';
      if (ctaWrap) ctaWrap.style.display = 'none';
    } else {
      if (loadEl) loadEl.style.display = 'none';
      if (ctaWrap) ctaWrap.style.display = 'block';
    }
  }

  // ─── Folder Helpers ─────────────────────────────────────────────────────────

  async function loadFolderOptions() {
    try {
      const select = document.getElementById('saff-folder-select');
      if (!select) return;

      const folders = await StorageHelper.getFolders();
      const activeFolder = await StorageHelper.getActiveFolder();

      select.innerHTML = '';
      folders.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        if (f === activeFolder) opt.selected = true;
        select.appendChild(opt);
      });
    } catch (e) {
      console.warn('[ShopeeProduct] Failed to load folders:', e);
    }
  }

  // ─── Event Binding ───────────────────────────────────────────────────────────

  function bindEvents() {
    const fab = document.getElementById('saff-fab');
    const card = document.getElementById('saff-card');
    const closeBtn = document.getElementById('saff-btn-close');
    const dashBtn = document.getElementById('saff-btn-dash');
    const generateBtn = document.getElementById('saff-btn-generate');
    const copyBtn = document.getElementById('saff-copy-btn');
    
    // Folder elements
    const folderSelect = document.getElementById('saff-folder-select');
    const btnNewFolder = document.getElementById('saff-btn-new-folder');
    const newFolderBox = document.getElementById('saff-new-folder-box');
    const newFolderInput = document.getElementById('saff-new-folder-input');
    const btnSaveFolder = document.getElementById('saff-btn-save-folder');
    const btnCancelFolder = document.getElementById('saff-btn-cancel-folder');

    // Folder changes
    if (folderSelect) {
      folderSelect.addEventListener('change', async (e) => {
        await StorageHelper.setActiveFolder(e.target.value);
      });
    }

    // Toggle new folder box
    if (btnNewFolder && newFolderBox) {
      btnNewFolder.addEventListener('click', () => {
        newFolderBox.style.display = 'flex';
        if (newFolderInput) {
          newFolderInput.value = '';
          newFolderInput.focus();
        }
      });
    }

    if (btnCancelFolder && newFolderBox) {
      btnCancelFolder.addEventListener('click', () => {
        newFolderBox.style.display = 'none';
      });
    }

    if (btnSaveFolder && newFolderInput) {
      btnSaveFolder.addEventListener('click', async () => {
        const val = newFolderInput.value.trim();
        if (val) {
          await StorageHelper.createFolder(val);
          await StorageHelper.setActiveFolder(val);
          await loadFolderOptions();
          newFolderBox.style.display = 'none';
        }
      });
      newFolderInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          btnSaveFolder.click();
        } else if (e.key === 'Escape') {
          newFolderBox.style.display = 'none';
        }
      });
    }

    // FAB toggle card
    fab.addEventListener('click', () => {
      card.classList.add('visible');
      fab.classList.add('hidden');
      loadFolderOptions();
    });

    // Close card
    closeBtn.addEventListener('click', () => {
      card.classList.remove('visible');
      fab.classList.remove('hidden');
    });

    // Dashboard
    dashBtn.addEventListener('click', async () => {
      try {
        await chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
      } catch (e) {
        if (!e.message?.includes('Extension context invalidated')) console.error(e);
      }
    });

    // Generate — triggers affiliate flow with chosen folder
    generateBtn.addEventListener('click', async () => {
      const data = getProductData();
      const folderSelect = document.getElementById('saff-folder-select');
      const selectedFolder = folderSelect ? folderSelect.value : 'Umum';
      data.folder = selectedFolder;

      // Reset label & hide previous result
      const genLabel = document.getElementById('saff-gen-label');
      const resultEl = document.getElementById('saff-result');
      if (genLabel) genLabel.textContent = 'Generate Affiliate Link';
      if (resultEl) resultEl.style.display = 'none';
      setLoading(true);
      try {
        await chrome.runtime.sendMessage({ type: 'START_AFFILIATE_FLOW', payload: data });
      } catch (e) {
        if (!e.message?.includes('Extension context invalidated')) console.error(e);
        setLoading(false);
      }
    });

    // Copy affiliate link
    copyBtn.addEventListener('click', async () => {
      const url = document.getElementById('saff-result-url')?.textContent;
      if (!url) return;
      await navigator.clipboard.writeText(url);
      const label = document.getElementById('saff-copy-label');
      if (label) { label.textContent = 'Tersalin!'; setTimeout(() => { label.textContent = 'Salin'; }, 1500); }
    });
  }

  // ─── Message Listener ────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.type === 'GET_PRODUCT_INFO') {
      sendResponse({ success: true, data: getProductData() });
    }

    if (req.type === 'SHOW_WIDGET') {
      // Open the floating card when extension icon clicked
      const card = document.getElementById('saff-card');
      const fab  = document.getElementById('saff-fab');
      if (card && fab) {
        card.classList.add('visible');
        fab.classList.add('hidden');
        // Refresh data in case page has changed
        refreshProductData();
        loadFolderOptions();
        checkExistingLink();
      }
      sendResponse({ success: true });
    }

    return true;
  });

  // Watch for storage change → update result card & folders live
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes[StorageHelper.KEYS.PRODUCTS]) {
        checkExistingLink();
      }
      if (changes[StorageHelper.KEYS.FOLDERS] || changes[StorageHelper.KEYS.ACTIVE_FOLDER]) {
        loadFolderOptions();
      }
    }
  });

  // SPA navigation support
  let _lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== _lastUrl) {
      _lastUrl = location.href;
      // Reset result card on page change
      const resultEl = document.getElementById('saff-result');
      const ctaWrap = document.getElementById('saff-cta-wrap');
      if (resultEl) resultEl.style.display = 'none';
      if (ctaWrap) ctaWrap.style.display = 'block';
      setTimeout(refreshProductData, 800);
      setTimeout(checkExistingLink, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  // ─── Init ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildWidget);
  } else {
    buildWidget();
  }

})();
