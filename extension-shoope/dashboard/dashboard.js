/**
 * Shopee Affiliate Master Dashboard Logic v1.3.0
 * Fitur: Pengelompokan Folder, Penomoran Urut Kronologis (No. 1 = Awal Generate), Export Links per Section, Batch ZIP
 */

(function () {
  'use strict';

  // State
  let products = [];
  let folders = ['Umum', 'Folder 1'];
  let activeFolder = 'all'; // 'all' or folder name
  let currentSort = 'chronological'; // 'chronological' (1..N) or 'newest'
  let selectedIds = new Set();
  let currentView = 'grid'; // 'grid' or 'table'
  let currentSettings = null;
  let copiedTodayCount = 0;

  // Pagination State (Default 20 produk per halaman)
  let currentPage = 1;
  let itemsPerPage = 20;

  // DOM Elements Map
  const els = {
    navItems: document.querySelectorAll('.nav-item'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    sidebarCount: document.getElementById('sidebar-count'),
    pageTitle: document.getElementById('page-title'),
    
    // Stats
    statTotal: document.getElementById('stat-total'),
    statReady: document.getElementById('stat-ready'),
    statFolders: document.getElementById('stat-folders'),
    statImages: document.getElementById('stat-images'),

    // Folder Bar
    folderPillsList: document.getElementById('folder-pills-list'),
    btnAddFolder: document.getElementById('btn-add-folder'),
    btnManageFolders: document.getElementById('btn-manage-folders'),
    activeFolderBanner: document.getElementById('active-folder-banner'),
    activeFolderBannerText: document.getElementById('active-folder-banner-text'),
    btnClearFolderFilter: document.getElementById('btn-clear-folder-filter'),

    // Products View
    productsGrid: document.getElementById('products-grid'),
    tableContainer: document.getElementById('table-container'),
    productsTableBody: document.getElementById('products-table-body'),
    emptyState: document.getElementById('empty-state'),

    // Pagination Elements
    paginationContainer: document.getElementById('pagination-container'),
    pageStart: document.getElementById('page-start'),
    pageEnd: document.getElementById('page-end'),
    pageTotal: document.getElementById('page-total'),
    pageNumbers: document.getElementById('page-numbers'),
    btnPageFirst: document.getElementById('btn-page-first'),
    btnPagePrev: document.getElementById('btn-page-prev'),
    btnPageNext: document.getElementById('btn-page-next'),
    btnPageLast: document.getElementById('btn-page-last'),
    selectPerPage: document.getElementById('select-per-page'),
    
    // Search & Filter & Sort
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    filterStatus: document.getElementById('filter-status'),
    sortOrder: document.getElementById('sort-order'),
    btnViewGrid: document.getElementById('btn-view-grid'),
    btnViewTable: document.getElementById('btn-view-table'),

    // Selection & Bulk Actions
    selectAllCheckbox: document.getElementById('select-all-checkbox'),
    tableSelectAll: document.getElementById('table-select-all'),
    selectionInfo: document.getElementById('selection-info'),
    selectionActions: document.getElementById('selection-actions'),
    bulkFolderSelect: document.getElementById('bulk-folder-select'),
    btnBulkMoveFolder: document.getElementById('btn-bulk-move-folder'),
    btnDeleteSelected: document.getElementById('btn-delete-selected'),
    selectedCount: document.getElementById('selected-count'),

    // Top Actions
    btnExportLinks: document.getElementById('btn-export-links'),
    btnDownloadAllZip: document.getElementById('btn-download-all-zip'),
    btnExportDbJson: document.getElementById('btn-export-db-json'),
    btnCopyAllLinks: document.getElementById('btn-copy-all-links'),

    // Manual Generator
    manualUrlInput: document.getElementById('manual-url-input'),
    manualTag1: document.getElementById('manual-tag-1'),
    manualTag2: document.getElementById('manual-tag-2'),
    btnManualGenerate: document.getElementById('btn-manual-generate'),

    // Batch 5-in-1 Generator
    dashboardRangeSelect: document.getElementById('dashboard-range-select'),
    btnLoadBundledLinks: document.getElementById('btn-load-bundled-links'),
    btnClearBatchInput: document.getElementById('btn-clear-batch-input'),
    batchUrlsInput: document.getElementById('batch-urls-input'),
    batchStatsIndicator: document.getElementById('batch-stats-indicator'),
    batchDelayInput: document.getElementById('batch-delay-input'),
    btnStartBatch: document.getElementById('btn-start-batch'),
    btnPauseBatch: document.getElementById('btn-pause-batch'),
    btnResetBatch: document.getElementById('btn-reset-batch'),
    batchProgressBox: document.getElementById('batch-progress-box'),
    batchProgressTitle: document.getElementById('batch-progress-title'),
    batchProgressPct: document.getElementById('batch-progress-pct'),
    batchProgressBar: document.getElementById('batch-progress-bar'),
    batchCurrIdx: document.getElementById('batch-curr-idx'),
    batchTotalIdx: document.getElementById('batch-total-idx'),
    batchSuccessCount: document.getElementById('batch-success-count'),
    batchFailCount: document.getElementById('batch-fail-count'),
    batchResultsCount: document.getElementById('batch-results-count'),
    btnCopyBatchResults: document.getElementById('btn-copy-batch-results'),
    btnExportBatchJson: document.getElementById('btn-export-batch-json'),
    btnSyncToBiolink: document.getElementById('btn-sync-to-biolink'),
    batchResultsTbody: document.getElementById('batch-results-tbody'),

    // Settings
    settingAutoDownloadImg: document.getElementById('setting-auto-download-img'),
    settingAutoCloseTab: document.getElementById('setting-auto-close-tab'),
    settingAutoOpenDash: document.getElementById('setting-auto-open-dash'),
    settingDefaultTag1: document.getElementById('setting-default-tag1'),
    settingDefaultTag2: document.getElementById('setting-default-tag2'),
    btnSettingsExportJson: document.getElementById('btn-settings-export-json'),
    inputImportJsonFile: document.getElementById('input-import-json-file'),
    btnClearAllData: document.getElementById('btn-clear-all-data'),

    // Modals
    modalCreateFolder: document.getElementById('modal-create-folder'),
    inputNewFolderName: document.getElementById('input-new-folder-name'),
    btnConfirmCreateFolder: document.getElementById('btn-confirm-create-folder'),
    btnCancelCreateFolder: document.getElementById('btn-cancel-create-folder'),
    btnCloseCreateFolderModal: document.getElementById('btn-close-create-folder-modal'),

    modalManageFolders: document.getElementById('modal-manage-folders'),
    manageFoldersList: document.getElementById('manage-folders-list'),
    btnDoneManageFolders: document.getElementById('btn-done-manage-folders'),
    btnCloseManageModal: document.getElementById('btn-close-manage-modal'),

    // Toast
    toastContainer: document.getElementById('toast-container')
  };

  // Toast Helper
  function showToast(message, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 250);
    }, 3000);
  }

  // ─── Data Loading ──────────────────────────────────────────────────────────

  async function loadData() {
    products = await StorageHelper.getProducts();
    folders = await StorageHelper.getFolders();
    currentSettings = await StorageHelper.getSettings();

    // Init settings UI
    if (els.settingAutoDownloadImg) els.settingAutoDownloadImg.checked = !!currentSettings.autoDownloadImage;
    if (els.settingAutoCloseTab) els.settingAutoCloseTab.checked = !!currentSettings.autoCloseAffiliateTab;
    if (els.settingAutoOpenDash) els.settingAutoOpenDash.checked = !!currentSettings.autoSwitchToDashboard;
    if (els.settingDefaultTag1) els.settingDefaultTag1.value = currentSettings.defaultSubtag1 || '';
    if (els.settingDefaultTag2) els.settingDefaultTag2.value = currentSettings.defaultSubtag2 || '';

    updateStats();
    renderFolderPills();
    updateBulkFolderSelect();
    renderProducts();
  }

  // Update Stats Counters
  function updateStats() {
    const total = products.length;
    const ready = products.filter(p => p.affiliateUrl).length;
    const images = products.filter(p => p.imageUrl).length;

    if (els.statTotal) els.statTotal.textContent = total;
    if (els.statReady) els.statReady.textContent = ready;
    if (els.statFolders) els.statFolders.textContent = folders.length;
    if (els.statImages) els.statImages.textContent = images;
    if (els.sidebarCount) els.sidebarCount.textContent = total;
  }

  // ─── Folder Pills & Management ─────────────────────────────────────────────

  function renderFolderPills() {
    if (!els.folderPillsList) return;
    els.folderPillsList.innerHTML = '';

    // "Semua" Pill
    const allPill = document.createElement('div');
    allPill.className = `folder-pill ${activeFolder === 'all' ? 'active' : ''}`;
    allPill.innerHTML = `<span>Semua Produk</span> <span class="pill-count">${products.length}</span>`;
    allPill.addEventListener('click', () => setFolderFilter('all'));
    els.folderPillsList.appendChild(allPill);

    // Individual Folder Pills
    folders.forEach(f => {
      const count = products.filter(p => (p.folder || 'Umum') === f).length;
      const pill = document.createElement('div');
      pill.className = `folder-pill ${activeFolder === f ? 'active' : ''}`;
      pill.innerHTML = `<span>📁 ${escapeHtml(f)}</span> <span class="pill-count">${count}</span>`;
      pill.addEventListener('click', () => setFolderFilter(f));
      els.folderPillsList.appendChild(pill);
    });

    // Update banner if single folder active
    if (activeFolder === 'all') {
      if (els.activeFolderBanner) els.activeFolderBanner.style.display = 'none';
    } else {
      if (els.activeFolderBanner) {
        els.activeFolderBanner.style.display = 'flex';
        els.activeFolderBannerText.innerHTML = `Menampilkan Produk di Folder: <strong>${escapeHtml(activeFolder)}</strong> (${products.filter(p => (p.folder || 'Umum') === activeFolder).length} Produk)`;
      }
    }
  }

  function setFolderFilter(folderName) {
    activeFolder = folderName;
    currentPage = 1;
    renderFolderPills();
    renderProducts();
  }

  function updateBulkFolderSelect() {
    if (!els.bulkFolderSelect) return;
    els.bulkFolderSelect.innerHTML = '';
    folders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      els.bulkFolderSelect.appendChild(opt);
    });
  }

  // Modal: Create Folder
  function openCreateFolderModal() {
    if (els.modalCreateFolder) {
      els.modalCreateFolder.style.display = 'flex';
      els.inputNewFolderName.value = '';
      els.inputNewFolderName.focus();
    }
  }

  function closeCreateFolderModal() {
    if (els.modalCreateFolder) els.modalCreateFolder.style.display = 'none';
  }

  async function handleConfirmCreateFolder() {
    const val = (els.inputNewFolderName.value || '').trim();
    if (!val) {
      showToast('Nama folder tidak boleh kosong.', 'danger');
      return;
    }
    await StorageHelper.createFolder(val);
    folders = await StorageHelper.getFolders();
    setFolderFilter(val);
    closeCreateFolderModal();
    showToast(`Folder "${val}" berhasil dibuat!`, 'success');
  }

  // Modal: Manage Folders
  function openManageFoldersModal() {
    if (els.modalManageFolders) {
      els.modalManageFolders.style.display = 'flex';
      renderManageFoldersList();
    }
  }

  function closeManageFoldersModal() {
    if (els.modalManageFolders) els.modalManageFolders.style.display = 'none';
  }

  function renderManageFoldersList() {
    if (!els.manageFoldersList) return;
    els.manageFoldersList.innerHTML = '';

    // Add inline "Tambah Folder Baru" box at top of manage list
    const addBox = document.createElement('div');
    addBox.className = 'manage-folder-add-box';
    addBox.style.cssText = 'display:flex; gap:8px; margin-bottom:14px; padding-bottom:12px; border-bottom:1px dashed var(--border-color);';
    addBox.innerHTML = `
      <input type="text" id="input-quick-add-folder" class="modal-input" placeholder="Buat folder baru..." style="flex:1; padding:7px 10px; font-size:13px;" />
      <button class="btn btn-primary" id="btn-quick-add-folder" style="padding:7px 14px; font-size:12px; white-space:nowrap;">➕ Tambah</button>
    `;
    els.manageFoldersList.appendChild(addBox);

    const inputQuick = addBox.querySelector('#input-quick-add-folder');
    const btnQuick = addBox.querySelector('#btn-quick-add-folder');
    const submitAdd = async () => {
      const val = (inputQuick.value || '').trim();
      if (val) {
        await StorageHelper.createFolder(val);
        folders = await StorageHelper.getFolders();
        renderFolderPills();
        updateBulkFolderSelect();
        renderManageFoldersList();
        renderProducts();
        showToast(`Folder "${val}" berhasil dibuat!`, 'success');
      }
    };
    btnQuick.addEventListener('click', submitAdd);
    inputQuick.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAdd();
    });

    // Render list of folders
    folders.forEach(f => {
      const count = products.filter(p => (p.folder || 'Umum') === f).length;
      const isDefault = f === 'Umum';

      const item = document.createElement('div');
      item.className = 'manage-folder-item';
      item.dataset.folder = f;

      item.innerHTML = `
        <div class="manage-folder-view-mode" style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div class="manage-folder-name">
            <span>📁</span>
            <strong class="folder-display-name">${escapeHtml(f)}</strong>
            <span style="font-size:11px; color:var(--text-muted);">(${count} produk)</span>
            ${isDefault ? '<span style="font-size:10px; background:#E2E8F0; padding:1px 5px; border-radius:4px;">Default</span>' : ''}
          </div>
          <div class="manage-folder-actions">
            ${!isDefault ? `
              <button class="btn-icon-mini btn-start-rename" data-folder="${escapeHtml(f)}" title="Ganti Nama">✏️ Edit</button>
              <button class="btn-icon-mini danger btn-delete-folder" data-folder="${escapeHtml(f)}" title="Hapus Folder">🗑️ Hapus</button>
            ` : ''}
          </div>
        </div>

        <div class="manage-folder-edit-mode" style="display:none; align-items:center; gap:6px; width:100%;">
          <input type="text" class="modal-input rename-input" value="${escapeHtml(f)}" style="flex:1; padding:6px 10px; font-size:13px;" />
          <button class="btn btn-primary btn-save-rename" style="padding:6px 10px; font-size:11px;">💾 Simpan</button>
          <button class="btn btn-secondary btn-cancel-rename" style="padding:6px 10px; font-size:11px;">✕ Batal</button>
        </div>
      `;
      els.manageFoldersList.appendChild(item);

      // Wire Edit mode
      const viewMode = item.querySelector('.manage-folder-view-mode');
      const editMode = item.querySelector('.manage-folder-edit-mode');
      const btnStartRename = item.querySelector('.btn-start-rename');
      const btnCancelRename = item.querySelector('.btn-cancel-rename');
      const btnSaveRename = item.querySelector('.btn-save-rename');
      const renameInput = item.querySelector('.rename-input');

      if (btnStartRename) {
        btnStartRename.addEventListener('click', () => {
          viewMode.style.display = 'none';
          editMode.style.display = 'flex';
          renameInput.focus();
          renameInput.select();
        });
      }

      if (btnCancelRename) {
        btnCancelRename.addEventListener('click', () => {
          editMode.style.display = 'none';
          viewMode.style.display = 'flex';
        });
      }

      const saveRenameAction = async () => {
        const newName = (renameInput.value || '').trim();
        if (newName && newName !== f) {
          await StorageHelper.renameFolder(f, newName);
          await loadData();
          renderManageFoldersList();
          showToast(`Folder "${f}" berhasil diubah menjadi "${newName}".`, 'success');
        } else {
          editMode.style.display = 'none';
          viewMode.style.display = 'flex';
        }
      };

      if (btnSaveRename) {
        btnSaveRename.addEventListener('click', saveRenameAction);
      }
      if (renameInput) {
        renameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveRenameAction();
          if (e.key === 'Escape') {
            editMode.style.display = 'none';
            viewMode.style.display = 'flex';
          }
        });
      }

      // Delete Handler
      const btnDelete = item.querySelector('.btn-delete-folder');
      if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
          await StorageHelper.deleteFolder(f);
          if (activeFolder === f) activeFolder = 'all';
          await loadData();
          renderManageFoldersList();
          showToast(`Folder "${f}" dihapus. Produk dipindahkan ke folder Umum.`);
        });
      }
    });
  }

  // ─── Chronological Indexing & Sorting ──────────────────────────────────────

  /**
   * Mendapatkan nomor urut kronologis permanen (No. 1 = produk paling pertama di-generate)
   */
  function getChronologicalIndexMap() {
    // Urutkan semua produk berdasarkan createdAt Ascending (terlama ke terbaru)
    const sorted = [...products].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    const indexMap = {};
    sorted.forEach((p, idx) => {
      indexMap[p.id] = idx + 1; // 1-based index
    });
    return indexMap;
  }

  // Filter & Sort products based on search, status, active folder, and sort dropdown
  function getFilteredProducts() {
    const query = (els.searchInput.value || '').trim().toLowerCase();
    const status = els.filterStatus.value;
    const sortVal = els.sortOrder ? els.sortOrder.value : currentSort;

    // 1. Filter
    let filtered = products.filter(p => {
      const pFolder = p.folder || 'Umum';

      const matchesFolder = (activeFolder === 'all') || (pFolder === activeFolder);

      const matchesQuery =
        !query ||
        (p.title && p.title.toLowerCase().includes(query)) ||
        (p.price && p.price.toLowerCase().includes(query)) ||
        (p.affiliateUrl && p.affiliateUrl.toLowerCase().includes(query)) ||
        (pFolder.toLowerCase().includes(query));

      const matchesStatus =
        status === 'all' ||
        (status === 'completed' && !!p.affiliateUrl) ||
        (status === 'pending' && !p.affiliateUrl);

      return matchesFolder && matchesQuery && matchesStatus;
    });

    // 2. Sort
    if (sortVal === 'chronological') {
      // Urutan pertama kali dibuat ➔ akhir (Oldest to Newest)
      filtered.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });
    } else {
      // Terbaru dibuat ➔ terlama (Newest to Oldest)
      filtered.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
    }

    return filtered;
  }

  // ─── Render Products (With 20 Items per Page Pagination) ──────────────────

  function renderProducts() {
    const filtered = getFilteredProducts();
    const indexMap = getChronologicalIndexMap();

    if (filtered.length === 0) {
      els.productsGrid.style.display = 'none';
      els.tableContainer.style.display = 'none';
      if (els.paginationContainer) els.paginationContainer.style.display = 'none';
      els.emptyState.style.display = 'block';
      updateSelectionUI();
      return;
    }

    els.emptyState.style.display = 'none';

    // Calculate pagination slices (Default: 20 per page)
    const totalItems = filtered.length;
    const perPageNum = itemsPerPage === 'all' ? totalItems : parseInt(itemsPerPage, 10);
    const totalPages = Math.max(1, Math.ceil(totalItems / perPageNum));

    // Boundary checks
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIdx = (currentPage - 1) * perPageNum;
    const endIdx = itemsPerPage === 'all' ? totalItems : Math.min(startIdx + perPageNum, totalItems);
    const pageItems = filtered.slice(startIdx, endIdx);

    if (currentView === 'grid') {
      els.productsGrid.style.display = 'grid';
      els.tableContainer.style.display = 'none';
      renderGrid(pageItems, indexMap);
    } else {
      els.productsGrid.style.display = 'none';
      els.tableContainer.style.display = 'block';
      renderTable(pageItems, indexMap);
    }

    renderPagination(totalItems, totalPages, startIdx + 1, endIdx);
    updateSelectionUI();
  }

  // Render Pagination Controls
  function renderPagination(totalItems, totalPages, startNum, endNum) {
    if (!els.paginationContainer) return;

    els.paginationContainer.style.display = 'flex';

    if (els.pageStart) els.pageStart.textContent = totalItems === 0 ? 0 : startNum;
    if (els.pageEnd) els.pageEnd.textContent = endNum;
    if (els.pageTotal) els.pageTotal.textContent = totalItems;

    // Enable / Disable navigation buttons
    if (els.btnPageFirst) els.btnPageFirst.disabled = (currentPage === 1);
    if (els.btnPagePrev) els.btnPagePrev.disabled = (currentPage === 1);
    if (els.btnPageNext) els.btnPageNext.disabled = (currentPage === totalPages);
    if (els.btnPageLast) els.btnPageLast.disabled = (currentPage === totalPages);

    // Render page numbers
    if (els.pageNumbers) {
      els.pageNumbers.innerHTML = '';
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
          createPageButton(i);
        }
      } else {
        createPageButton(1);
        if (currentPage > 3) {
          createEllipsis();
        }
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) {
          createPageButton(i);
        }
        if (currentPage < totalPages - 2) {
          createEllipsis();
        }
        createPageButton(totalPages);
      }
    }
  }

  function createPageButton(pageNum) {
    const btn = document.createElement('button');
    btn.className = `btn-page-num ${pageNum === currentPage ? 'active' : ''}`;
    btn.textContent = pageNum;
    btn.addEventListener('click', () => {
      if (currentPage !== pageNum) {
        currentPage = pageNum;
        renderProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    els.pageNumbers.appendChild(btn);
  }

  function createEllipsis() {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '…';
    els.pageNumbers.appendChild(span);
  }

  // Grid View Renderer
  function renderGrid(items, indexMap) {
    els.productsGrid.innerHTML = '';
    items.forEach(p => {
      const isSelected = selectedIds.has(p.id);
      const isReady = !!p.affiliateUrl;
      const card = document.createElement('div');
      card.className = 'prod-card';
      card.dataset.id = p.id;

      const pFolder = p.folder || 'Umum';
      const chronoNum = indexMap[p.id] || 1;
      const formattedNo = '#' + String(chronoNum).padStart(2, '0');

      card.innerHTML = `
        <div class="prod-card-top">
          <input type="checkbox" class="prod-card-checkbox prod-select-check" data-id="${p.id}" ${isSelected ? 'checked' : ''}>
          <span class="prod-card-badge ${isReady ? '' : 'pending'}">${isReady ? 'Ready' : 'Pending'}</span>
          <span class="prod-card-index-badge" title="Urutan Generasi ke-${chronoNum}">${formattedNo}</span>
          <img class="prod-card-img" src="${p.imageUrl || '../icons/icon-128.png'}" alt="${escapeHtml(p.title)}" loading="lazy" />
        </div>
        <div class="prod-card-body">
          <div class="prod-card-folder-wrap">
            <select class="prod-folder-quick-select" data-id="${p.id}" title="Pindahkan ke folder lain">
              ${folders.map(f => `<option value="${escapeHtml(f)}" ${f === pFolder ? 'selected' : ''}>📁 ${escapeHtml(f)}</option>`).join('')}
            </select>
          </div>
          <div class="prod-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
          <div class="prod-price">${p.price || '-'}</div>
          ${p.affiliateUrl ? `<div class="prod-link-box affiliate" title="${p.affiliateUrl}">🔗 ${p.affiliateUrl}</div>` : `<div class="prod-link-box" title="${p.cleanUrl || p.originalUrl}">🌐 ${p.cleanUrl || p.originalUrl}</div>`}
        </div>
        <div class="prod-card-footer">
          <div class="prod-actions-row">
            ${isReady ? `
              <button class="btn-card-action btn-copy-aff" data-url="${p.affiliateUrl}" title="Salin Link Affiliate">
                <span>📋 Salin Link</span>
              </button>
            ` : `
              <button class="btn-card-action" style="background:#F1F5F9; color:#64748B;" data-retry-id="${p.id}" title="Generate Link">
                <span>⚡ Buat Link</span>
              </button>
            `}

            ${p.imageUrl ? `
              <button class="btn-card-action btn-icon-only btn-dl-img" data-img="${p.imageUrl}" data-title="${escapeHtml(p.title)}" data-url="${p.cleanUrl || p.originalUrl}" title="Download Gambar">
                <span>🖼️</span>
              </button>
            ` : ''}
            <button class="btn-card-action btn-icon-only btn-delete-one" data-id="${p.id}" title="Hapus Produk">
              <span>🗑️</span>
            </button>
          </div>
        </div>
      `;

      els.productsGrid.appendChild(card);
    });

    attachGridEvents();
  }

  // Table View Renderer
  function renderTable(items, indexMap) {
    els.productsTableBody.innerHTML = '';
    items.forEach(p => {
      const isSelected = selectedIds.has(p.id);
      const isReady = !!p.affiliateUrl;
      const tr = document.createElement('tr');
      tr.dataset.id = p.id;

      const pFolder = p.folder || 'Umum';
      const chronoNum = indexMap[p.id] || 1;
      const formattedNo = '#' + String(chronoNum).padStart(2, '0');
      const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-';

      tr.innerHTML = `
        <td><input type="checkbox" class="prod-select-check" data-id="${p.id}" ${isSelected ? 'checked' : ''}></td>
        <td>
          <img class="table-thumb" src="${p.imageUrl || '../icons/icon-128.png'}" alt="img" />
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span class="table-index-num">${formattedNo}</span>
            <select class="prod-folder-quick-select mini-table" data-id="${p.id}" title="Pindah Folder">
              ${folders.map(f => `<option value="${escapeHtml(f)}" ${f === pFolder ? 'selected' : ''}>📁 ${escapeHtml(f)}</option>`).join('')}
            </select>
          </div>
          <div class="table-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
          <a class="table-original-link" href="${p.cleanUrl || p.originalUrl}" target="_blank" rel="noopener">Buka di Shopee ↗</a>
        </td>
        <td><strong style="color:var(--primary);">${p.price || '-'}</strong></td>
        <td>
          ${isReady ? `<span class="table-aff-link" title="${p.affiliateUrl}">${p.affiliateUrl}</span>` : '<span style="color:#94A3B8;">Pending</span>'}
        </td>
        <td><span style="font-size:12px; color:var(--text-muted);">${dateStr}</span></td>
        <td>
          <div class="table-actions">
            ${isReady ? `<button class="btn btn-secondary btn-copy-aff" style="padding:5px 8px; font-size:11px;" data-url="${p.affiliateUrl}">📋 Salin</button>` : ''}
            ${p.imageUrl ? `<button class="btn btn-secondary btn-dl-img" style="padding:5px 8px; font-size:11px;" data-img="${p.imageUrl}" data-title="${escapeHtml(p.title)}" data-url="${p.cleanUrl || p.originalUrl}" title="Download Gambar">🖼️</button>` : ''}
            <button class="btn btn-secondary btn-delete-one" style="padding:5px 8px; font-size:11px; color:var(--danger);" data-id="${p.id}" title="Hapus">✕</button>
          </div>
        </td>
      `;

      els.productsTableBody.appendChild(tr);
    });

    attachGridEvents();
  }

  // Attach Item Action Events
  function attachGridEvents() {
    // Checkbox selections
    document.querySelectorAll('.prod-select-check').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateSelectionUI();
      });
    });

    // Folder quick select change
    document.querySelectorAll('.prod-folder-quick-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const id = sel.dataset.id;
        const newFolder = e.target.value;
        await StorageHelper.setProductFolder(id, newFolder);
        showToast(`Produk dipindahkan ke folder "${newFolder}".`, 'success');
        await loadData();
      });
    });

    // Copy Affiliate Link
    document.querySelectorAll('.btn-copy-aff').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.dataset.url;
        if (!url) return;
        await navigator.clipboard.writeText(url);
        copiedTodayCount++;
        updateStats();

        const originalText = btn.innerHTML;
        btn.classList.add('copied');
        btn.innerHTML = '<span>✅ Tersalin!</span>';
        showToast('Link Affiliate berhasil disalin ke clipboard!', 'success');

        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalText;
        }, 1500);
      });
    });

    // Download Single Image — robust fetch blob
    document.querySelectorAll('.btn-dl-img').forEach(btn => {
      btn.addEventListener('click', async () => {
        const imageUrl = btn.dataset.img;
        const title = btn.dataset.title;
        if (!imageUrl) return;

        showToast('Mengunduh gambar...', 'normal');
        try {
          const blob = await fetchImageBlob(imageUrl);
          const sanitizedTitle = (title || 'produk').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').substring(0, 100);
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = sanitizedTitle + '.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
          showToast('✅ Gambar berhasil diunduh!', 'success');
        } catch (e) {
          console.warn('Single image download fallback to new tab:', e);
          window.open(imageUrl, '_blank');
          showToast('Buka gambar di tab baru — klik kanan → Simpan Gambar', 'normal');
        }
      });
    });

    // Delete Single — Instant without confirmation popup
    document.querySelectorAll('.btn-delete-one').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await StorageHelper.deleteProduct(id);
        selectedIds.delete(id);
        showToast('Produk dihapus.');
        await loadData();
      });
    });

    // Retry / Manual Generate for pending
    document.querySelectorAll('[data-retry-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.retryId;
        const prod = products.find(p => p.id === id);
        if (prod) {
          await chrome.runtime.sendMessage({
            type: 'START_AFFILIATE_FLOW',
            payload: prod
          });
        }
      });
    });
  }

  // ─── Bulk Actions ──────────────────────────────────────────────────────────

  function updateSelectionUI() {
    const count = selectedIds.size;
    if (els.selectedCount) els.selectedCount.textContent = count;
    if (els.selectionInfo) els.selectionInfo.textContent = `${count} item dipilih`;

    if (count > 0) {
      if (els.selectionActions) els.selectionActions.style.display = 'flex';
      if (els.btnDeleteSelected) els.btnDeleteSelected.style.display = 'inline-flex';
    } else {
      if (els.selectionActions) els.selectionActions.style.display = 'none';
      if (els.btnDeleteSelected) els.btnDeleteSelected.style.display = 'none';
    }

    const filtered = getFilteredProducts();
    const isAll = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));
    if (els.selectAllCheckbox) els.selectAllCheckbox.checked = isAll;
    if (els.tableSelectAll) els.tableSelectAll.checked = isAll;
  }

  function handleSelectAll(checked) {
    const filtered = getFilteredProducts();
    if (checked) {
      filtered.forEach(p => selectedIds.add(p.id));
    } else {
      filtered.forEach(p => selectedIds.delete(p.id));
    }
    renderProducts();
  }

  // Bulk Move Folder
  async function handleBulkMoveFolder() {
    if (selectedIds.size === 0) return;
    const targetFolder = els.bulkFolderSelect.value || 'Umum';
    const count = selectedIds.size;

    await StorageHelper.setProductsFolder(Array.from(selectedIds), targetFolder);
    selectedIds.clear();
    showToast(`✅ ${count} produk berhasil dipindahkan ke folder "${targetFolder}".`, 'success');
    await loadData();
  }

  // Delete Selected Products — Instant without confirm popup
  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    await StorageHelper.deleteProducts(Array.from(selectedIds));
    selectedIds.clear();
    showToast(`${count} produk berhasil dihapus.`);
    await loadData();
  }

  // ─── Image Fetching & ZIP Export Features ──────────────────────────────────

  /**
   * Helper robust fetch image blob (Direct Fetch -> Canvas Fallback)
   */
  async function fetchImageBlob(url) {
    if (!url) throw new Error('No URL provided');
    
    // 1. Try direct fetch
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        if (blob && blob.size > 0) return blob;
      }
    } catch (e) {
      console.warn('[ImageFetcher] Direct fetch failed, trying canvas fallback for:', url, e);
    }

    // 2. Canvas fallback (bypasses direct blob restrictions)
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 800;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) resolve(blob);
            else reject(new Error('Canvas toBlob generated empty data'));
          }, 'image/jpeg', 0.95);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(new Error('Image failed to load: ' + err));
      img.src = url;
    });
  }

  // Download All Images as ZIP using Local JSZip (per folder or all)
  async function downloadAllImagesAsZip() {
    const filtered = getFilteredProducts();
    const withImages = filtered.filter(p => p.imageUrl && p.imageUrl.trim().length > 5);

    if (withImages.length === 0) {
      showToast('Tidak ada gambar produk untuk diunduh pada filter saat ini.', 'danger');
      return;
    }

    if (typeof window.JSZip === 'undefined') {
      showToast('Library ZIP sedang dimuat...', 'normal');
      // Wait slightly in case script tag is parsing
      await new Promise(r => setTimeout(r, 200));
      if (typeof window.JSZip === 'undefined') {
        showToast('Gagal memuat library JSZip. Coba refresh halaman dashboard.', 'danger');
        return;
      }
    }

    const folderLabel = activeFolder === 'all' ? 'Semua' : activeFolder;
    showToast(`Mempersiapkan ${withImages.length} gambar (${folderLabel}) dalam ZIP...`, 'normal');

    const zip = new window.JSZip();
    let success = 0;

    // Urutkan kronologis (terlama ke terbaru) untuk penamaan file yang rapi
    const sortedImages = [...withImages].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    for (let i = 0; i < sortedImages.length; i++) {
      const p = sortedImages[i];
      const noStr = String(i + 1).padStart(2, '0');
      
      try {
        const blob = await fetchImageBlob(p.imageUrl);
        const cleanTitle = (p.title || 'produk')
          .replace(/[\\/:*?"<>|]/g, '-')
          .replace(/\s+/g, '-')
          .substring(0, 60);
        const filename = `${noStr}_${cleanTitle}.jpg`;

        // Simpan dalam sub-folder zip jika 'all' dan ada nama folder
        if (activeFolder === 'all' && p.folder && p.folder !== 'Umum') {
          const folderZip = zip.folder(p.folder.replace(/[\\/:*?"<>|]/g, '-'));
          folderZip.file(filename, blob);
        } else {
          zip.file(filename, blob);
        }
        success++;
      } catch (e) {
        console.warn('[ZIP] Gagal memuat gambar produk:', p.title, p.imageUrl, e);
      }
    }

    if (success === 0) {
      showToast('Gagal mengunduh gambar. Pastikan URL gambar aktif dan koneksi internet stabil.', 'danger');
      return;
    }

    try {
      showToast(`Mengompresi ${success} gambar ke file ZIP...`, 'normal');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedFolder = folderLabel.replace(/[\\/:*?"<>|]/g, '_');
      a.download = `Shopee_Gambar_${sanitizedFolder}_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast(`✅ ${success} gambar berhasil diunduh sebagai ZIP!`, 'success');
    } catch (zipErr) {
      console.error('[ZIP] Error generating zip archive:', zipErr);
      showToast('Gagal membuat file ZIP: ' + zipErr.message, 'danger');
    }
  }

  // Export Affiliate Links with Title + Price grouped by Folder Sections & Chronological 1..N
  function exportLinksOnly() {
    const allFiltered = getFilteredProducts();
    const ready = allFiltered.filter(p => p.affiliateUrl);

    if (ready.length === 0) {
      showToast('Belum ada link affiliate yang siap diekspor pada filter saat ini.', 'danger');
      return;
    }

    // Selalu urutkan dari yang pertama kali dibuat (No. 01) hingga terakhir
    ready.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    let content = '';
    const dateStr = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

    if (activeFolder !== 'all') {
      // Export single active folder
      const header = `Shopee Affiliate Links — Folder: ${activeFolder.toUpperCase()} (${ready.length} Produk) — ${dateStr}\n${'═'.repeat(65)}\n\n`;
      const lines = ready.map((p, i) => {
        const no = String(i + 1).padStart(2, '0');
        const title = (p.title || 'Produk').trim();
        const price = p.price ? ` | ${p.price}` : '';
        const url = p.affiliateUrl;
        return `${no}. ${title}${price}\n    🔗 ${url}`;
      });
      content = header + lines.join('\n\n');
    } else {
      // Export all folders grouped with clear sections
      const header = `Shopee Affiliate Master Links — ${ready.length} Produk (${folders.length} Folder) — ${dateStr}\n${'═'.repeat(65)}\n\n`;
      
      // Group by folder
      const groups = {};
      folders.forEach(f => { groups[f] = []; });
      ready.forEach(p => {
        const f = p.folder || 'Umum';
        if (!groups[f]) groups[f] = [];
        groups[f].push(p);
      });

      let runningNumber = 1;
      const sectionBlocks = [];

      folders.forEach(f => {
        const prods = groups[f] || [];
        if (prods.length === 0) return;

        const sectionHeader = `📁 FOLDER: ${f.toUpperCase()} (${prods.length} Produk)\n${'─'.repeat(45)}`;
        const itemLines = prods.map(p => {
          const no = String(runningNumber++).padStart(2, '0');
          const title = (p.title || 'Produk').trim();
          const price = p.price ? ` | ${p.price}` : '';
          const url = p.affiliateUrl;
          return `${no}. ${title}${price}\n    🔗 ${url}`;
        });

        sectionBlocks.push(sectionHeader + '\n' + itemLines.join('\n\n'));
      });

      content = header + sectionBlocks.join('\n\n' + '─'.repeat(65) + '\n\n');
    }

    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileSuffix = activeFolder === 'all' ? 'AllFolders' : activeFolder.replace(/[\\/:*?"<>|]/g, '_');
    a.download = `Shopee_AffiliateLinks_${fileSuffix}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    showToast(`✅ ${ready.length} link + judul berhasil diekspor berurutan!`, 'success');
  }

  // Copy All Affiliate Links
  async function copyAllLinks() {
    const filtered = getFilteredProducts();
    const ready = filtered.filter(p => p.affiliateUrl);

    if (ready.length === 0) {
      showToast('Belum ada link affiliate yang siap disalin.', 'danger');
      return;
    }

    // Urutkan kronologis
    ready.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });

    const readyLinks = ready.map((p, i) => {
      const no = String(i + 1).padStart(2, '0');
      return `${no}. ${p.title} - ${p.affiliateUrl}`;
    });

    const content = readyLinks.join('\n');
    await navigator.clipboard.writeText(content);
    showToast(`Berhasil menyalin ${readyLinks.length} link affiliate ke clipboard!`, 'success');
  }

  // Manual Quick Generator
  async function handleManualGenerate() {
    const rawUrl = (els.manualUrlInput.value || '').trim();
    if (!rawUrl || !rawUrl.includes('shopee.co.id')) {
      alert('Mohon masukkan URL produk Shopee yang valid.');
      return;
    }

    const tag1 = els.manualTag1 ? els.manualTag1.value.trim() : '';
    const tag2 = els.manualTag2 ? els.manualTag2.value.trim() : '';

    if (tag1 || tag2) {
      await StorageHelper.saveSettings({
        defaultSubtag1: tag1,
        defaultSubtag2: tag2
      });
    }

    await chrome.runtime.sendMessage({
      type: 'START_AFFILIATE_FLOW',
      payload: {
        title: 'Manual Input Product',
        price: '-',
        imageUrl: '',
        folder: activeFolder === 'all' ? 'Umum' : activeFolder,
        cleanUrl: rawUrl.split('?')[0],
        originalUrl: rawUrl
      }
    });

    els.manualUrlInput.value = '';
    showToast('Membuka halaman Shopee Custom Link...', 'success');
  }

  // Save Settings
  async function handleSaveSettings() {
    await StorageHelper.saveSettings({
      autoDownloadImage: els.settingAutoDownloadImg.checked,
      autoCloseAffiliateTab: els.settingAutoCloseTab.checked,
      autoSwitchToDashboard: els.settingAutoOpenDash.checked,
      defaultSubtag1: els.settingDefaultTag1.value.trim(),
      defaultSubtag2: els.settingDefaultTag2.value.trim()
    });
    showToast('Pengaturan tersimpan!', 'success');
  }

  // Clear Database — Instant without confirm popup
  async function handleClearAllData() {
    await StorageHelper.clearAllProducts();
    selectedIds.clear();
    showToast('Semua data berhasil dibersihkan.');
    await loadData();
  }

  // Escape HTML helper
  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function(m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  // Tab Navigation
  function switchTab(tabId) {
    els.navItems.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    els.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === `tab-${tabId}`);
    });

    const titles = {
      products: 'Katalog & Database Affiliate',
      'quick-generator': 'Quick Link Generator',
      settings: 'Pengaturan Ekstensi'
    };
    els.pageTitle.textContent = titles[tabId] || 'Shopee Affiliate Hub';
  }

  // Export Full database.json
  async function exportDatabaseJson() {
    const fullDb = {
      version: '1.3.0',
      exportedAt: new Date().toISOString(),
      folders: folders,
      activeFolder: activeFolder,
      totalProducts: products.length,
      products: products,
      settings: currentSettings || {}
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullDb, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `database.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`✅ File database.json (${products.length} produk) berhasil diunduh!`, 'success');
  }

  // Import database.json
  async function handleImportJsonFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let importedCount = 0;

      // Handle products array
      if (Array.isArray(data.products)) {
        for (const p of data.products) {
          await StorageHelper.saveProduct(p);
          importedCount++;
        }
      } else if (Array.isArray(data)) {
        for (const p of data) {
          await StorageHelper.saveProduct(p);
          importedCount++;
        }
      }

      // Handle folders
      if (Array.isArray(data.folders)) {
        for (const f of data.folders) {
          await StorageHelper.createFolder(f);
        }
      }

      // Handle settings
      if (data.settings && typeof data.settings === 'object') {
        await StorageHelper.saveSettings(data.settings);
      }

      event.target.value = '';
      await loadData();
      showToast(`✅ Berhasil mengimpor ${importedCount} produk dari database.json!`, 'success');
    } catch (e) {
      console.error('Import database.json error:', e);
      showToast('Gagal membaca file JSON. Format file tidak valid.', 'danger');
    }
  }

  // ─── Event Initialization ──────────────────────────────────────────────────

  function initEvents() {
    // Navigation
    els.navItems.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // View switch
    if (els.btnViewGrid) {
      els.btnViewGrid.addEventListener('click', () => {
        currentView = 'grid';
        els.btnViewGrid.classList.add('active');
        els.btnViewTable.classList.remove('active');
        renderProducts();
      });
    }

    if (els.btnViewTable) {
      els.btnViewTable.addEventListener('click', () => {
        currentView = 'table';
        els.btnViewTable.classList.add('active');
        els.btnViewGrid.classList.remove('active');
        renderProducts();
      });
    }

    // Search & Filter & Sort (Reset page to 1)
    if (els.searchInput) {
      els.searchInput.addEventListener('input', () => {
        currentPage = 1;
        els.clearSearch.style.display = els.searchInput.value ? 'block' : 'none';
        renderProducts();
      });
    }

    if (els.clearSearch) {
      els.clearSearch.addEventListener('click', () => {
        currentPage = 1;
        els.searchInput.value = '';
        els.clearSearch.style.display = 'none';
        renderProducts();
      });
    }

    if (els.filterStatus) {
      els.filterStatus.addEventListener('change', () => {
        currentPage = 1;
        renderProducts();
      });
    }

    if (els.sortOrder) {
      els.sortOrder.addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        renderProducts();
      });
    }

    // Clear Folder Filter Banner button
    if (els.btnClearFolderFilter) {
      els.btnClearFolderFilter.addEventListener('click', () => {
        currentPage = 1;
        setFolderFilter('all');
      });
    }

    // Pagination Event Listeners
    if (els.btnPageFirst) {
      els.btnPageFirst.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage = 1;
          renderProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    if (els.btnPagePrev) {
      els.btnPagePrev.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    if (els.btnPageNext) {
      els.btnPageNext.addEventListener('click', () => {
        const filtered = getFilteredProducts();
        const perPageNum = itemsPerPage === 'all' ? filtered.length : parseInt(itemsPerPage, 10);
        const totalPages = Math.max(1, Math.ceil(filtered.length / perPageNum));
        if (currentPage < totalPages) {
          currentPage++;
          renderProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    if (els.btnPageLast) {
      els.btnPageLast.addEventListener('click', () => {
        const filtered = getFilteredProducts();
        const perPageNum = itemsPerPage === 'all' ? filtered.length : parseInt(itemsPerPage, 10);
        const totalPages = Math.max(1, Math.ceil(filtered.length / perPageNum));
        if (currentPage < totalPages) {
          currentPage = totalPages;
          renderProducts();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    if (els.selectPerPage) {
      els.selectPerPage.addEventListener('change', (e) => {
        itemsPerPage = e.target.value;
        currentPage = 1;
        renderProducts();
      });
    }

    // Folder Actions
    if (els.btnAddFolder) els.btnAddFolder.addEventListener('click', openCreateFolderModal);
    if (els.btnManageFolders) els.btnManageFolders.addEventListener('click', openManageFoldersModal);

    // Modal Create Folder
    if (els.btnConfirmCreateFolder) els.btnConfirmCreateFolder.addEventListener('click', handleConfirmCreateFolder);
    if (els.btnCancelCreateFolder) els.btnCancelCreateFolder.addEventListener('click', closeCreateFolderModal);
    if (els.btnCloseCreateFolderModal) els.btnCloseCreateFolderModal.addEventListener('click', closeCreateFolderModal);
    if (els.inputNewFolderName) {
      els.inputNewFolderName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleConfirmCreateFolder();
        if (e.key === 'Escape') closeCreateFolderModal();
      });
    }

    // Modal Manage Folders
    if (els.btnDoneManageFolders) els.btnDoneManageFolders.addEventListener('click', closeManageFoldersModal);
    if (els.btnCloseManageModal) els.btnCloseManageModal.addEventListener('click', closeManageFoldersModal);

    // Selection
    if (els.selectAllCheckbox) els.selectAllCheckbox.addEventListener('change', (e) => handleSelectAll(e.target.checked));
    if (els.tableSelectAll) els.tableSelectAll.addEventListener('change', (e) => handleSelectAll(e.target.checked));
    if (els.btnDeleteSelected) els.btnDeleteSelected.addEventListener('click', handleDeleteSelected);
    if (els.btnBulkMoveFolder) els.btnBulkMoveFolder.addEventListener('click', handleBulkMoveFolder);

    // Top actions
    if (els.btnExportLinks) els.btnExportLinks.addEventListener('click', exportLinksOnly);
    if (els.btnDownloadAllZip) els.btnDownloadAllZip.addEventListener('click', downloadAllImagesAsZip);
    if (els.btnExportDbJson) els.btnExportDbJson.addEventListener('click', exportDatabaseJson);
    if (els.btnCopyAllLinks) els.btnCopyAllLinks.addEventListener('click', copyAllLinks);

    // Settings Database Backup/Restore
    if (els.btnSettingsExportJson) els.btnSettingsExportJson.addEventListener('click', exportDatabaseJson);
    if (els.inputImportJsonFile) els.inputImportJsonFile.addEventListener('change', handleImportJsonFile);

    // Manual Generator
    if (els.btnManualGenerate) els.btnManualGenerate.addEventListener('click', handleManualGenerate);

    // Settings
    if (els.settingAutoDownloadImg) els.settingAutoDownloadImg.addEventListener('change', handleSaveSettings);
    if (els.settingAutoCloseTab) els.settingAutoCloseTab.addEventListener('change', handleSaveSettings);
    if (els.settingAutoOpenDash) els.settingAutoOpenDash.addEventListener('change', handleSaveSettings);
    if (els.settingDefaultTag1) els.settingDefaultTag1.addEventListener('change', handleSaveSettings);
    if (els.settingDefaultTag2) els.settingDefaultTag2.addEventListener('change', handleSaveSettings);
    if (els.btnClearAllData) els.btnClearAllData.addEventListener('click', handleClearAllData);

    if (els.dashboardRangeSelect) els.dashboardRangeSelect.addEventListener('change', handleLoadBundledLinks);
    if (els.btnLoadBundledLinks) els.btnLoadBundledLinks.addEventListener('click', handleLoadBundledLinks);
    if (els.btnClearBatchInput) els.btnClearBatchInput.addEventListener('click', handleClearBatchInput);
    if (els.batchUrlsInput) els.batchUrlsInput.addEventListener('input', handleBatchUrlsInputChange);
    if (els.btnStartBatch) els.btnStartBatch.addEventListener('click', handleStartBatch);
    if (els.btnPauseBatch) els.btnPauseBatch.addEventListener('click', handlePauseBatch);
    if (els.btnResetBatch) els.btnResetBatch.addEventListener('click', handleResetBatch);
    if (els.btnCopyBatchResults) els.btnCopyBatchResults.addEventListener('click', handleCopyBatchResults);
    if (els.btnExportBatchJson) els.btnExportBatchJson.addEventListener('click', handleExportBatchJson);
    if (els.btnSyncToBiolink) els.btnSyncToBiolink.addEventListener('click', handleSyncToBiolink);

    // Listen for storage changes from background / content scripts
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes[StorageHelper.KEYS.PRODUCTS] || changes[StorageHelper.KEYS.FOLDERS]) {
          loadData();
        }
        if (changes[StorageHelper.KEYS.BATCH_STATE]) {
          renderBatchState(changes[StorageHelper.KEYS.BATCH_STATE].newValue);
        }
      }
    });

    // Listen for runtime batch progress messages
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'BATCH_PROGRESS_UPDATE') {
        loadBatchState();
      }
    });
  }

  // ─── Batch 5-in-1 Generator Implementation ─────────────────────────────────

  async function loadBatchState() {
    const state = await StorageHelper.getBatchState();
    renderBatchState(state);
  }

  function renderBatchState(state) {
    if (!state) return;

    const totalBatches = Array.isArray(state.batches) ? state.batches.length : 0;
    const currIdx = state.currentIndex || 0;
    const successCount = state.successCount || 0;
    const failCount = state.failCount || 0;
    const results = Array.isArray(state.results) ? state.results : [];

    // Update progress box
    if (state.isRunning || results.length > 0) {
      if (els.batchProgressBox) els.batchProgressBox.style.display = 'block';
      if (els.btnPauseBatch) els.btnPauseBatch.style.display = state.isRunning ? 'inline-block' : 'none';
      if (els.btnStartBatch) els.btnStartBatch.style.display = state.isRunning ? 'none' : 'inline-block';

      const pct = totalBatches > 0 ? Math.min(100, Math.round((currIdx / totalBatches) * 100)) : 0;
      if (els.batchProgressPct) els.batchProgressPct.textContent = pct + '%';
      if (els.batchProgressBar) els.batchProgressBar.style.width = pct + '%';
      if (els.batchCurrIdx) els.batchCurrIdx.textContent = currIdx;
      if (els.batchTotalIdx) els.batchTotalIdx.textContent = totalBatches;
      if (els.batchSuccessCount) els.batchSuccessCount.textContent = successCount;
      if (els.batchFailCount) els.batchFailCount.textContent = failCount;

      if (els.batchProgressTitle) {
        if (state.isCompleted) {
          els.batchProgressTitle.textContent = '🎉 Konversi Selesai Sepenuhnya!';
          els.batchProgressTitle.style.color = '#10b981';
        } else if (state.isRunning) {
          els.batchProgressTitle.textContent = `⚡ Sedang Memproses Batch #${currIdx + 1} / ${totalBatches}...`;
          els.batchProgressTitle.style.color = '#38bdf8';
        } else {
          els.batchProgressTitle.textContent = '⏸️ Di-pause oleh user.';
          els.batchProgressTitle.style.color = '#f59e0b';
        }
      }
    }

    if (els.batchResultsCount) els.batchResultsCount.textContent = results.length;
    renderBatchResultsTable(results);
  }

  function renderBatchResultsTable(results) {
    if (!els.batchResultsTbody) return;

    if (!results || results.length === 0) {
      els.batchResultsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 25px;">Belum ada link yang diproses. Klik "Muat Otomatis 495 Link" lalu "Mulai Auto Generate".</td></tr>';
      return;
    }

    let rowsHtml = '';
    results.forEach((r, idx) => {
      const isSuccess = r.status === 'success' && r.affiliateUrl;
      const statusBadge = isSuccess
        ? '<span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">SUKSES</span>'
        : '<span style="background: rgba(244, 63, 94, 0.2); color: #f43f5e; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">GAGAL</span>';

      // Estimate spill number & store index
      const spillNum = 101 + Math.floor(idx / 5);
      const storeIdx = (idx % 5) + 1;

      rowsHtml += `
        <tr>
          <td>${idx + 1}</td>
          <td><strong style="color: #ea580c;">#${spillNum}</strong></td>
          <td>Toko ${storeIdx}</td>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <a href="${escapeHtml(r.originalUrl)}" target="_blank" style="color: var(--text-muted); font-size: 0.75rem; text-decoration: none;">${escapeHtml(r.originalUrl)}</a>
          </td>
          <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${r.affiliateUrl ? `<a href="${escapeHtml(r.affiliateUrl)}" target="_blank" style="color: #38bdf8; font-weight: 700; text-decoration: none;">${escapeHtml(r.affiliateUrl)}</a>` : '<span style="color: var(--text-dim);">-</span>'}
          </td>
          <td>${statusBadge}</td>
        </tr>
      `;
    });

    els.batchResultsTbody.innerHTML = rowsHtml;
  }

  async function handleLoadBundledLinks() {
    try {
      showToast('Memuat daftar 495 link Shopee...', 'normal');
      const url = chrome.runtime.getURL('dashboard/bundled_links_101-200.json');
      const res = await fetch(url);
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          const rangeVal = els.dashboardRangeSelect ? els.dashboardRangeSelect.value : 'all';
          let filtered = list;

          if (rangeVal === 'part1') filtered = list.slice(0, 100);
          else if (rangeVal === 'part2') filtered = list.slice(100, 200);
          else if (rangeVal === 'part3') filtered = list.slice(200, 300);
          else if (rangeVal === 'part4') filtered = list.slice(300, 400);
          else if (rangeVal === 'part5') filtered = list.slice(400, 500);

          const urls = filtered.map(item => item.url).filter(Boolean);
          els.batchUrlsInput.value = urls.join('\n');
          handleBatchUrlsInputChange();
          showToast(`✅ Berhasil memuat ${urls.length} link Shopee (${Math.ceil(urls.length / 5)} Putaran)!`, 'success');
          return;
        }
      }
    } catch (e) {
      console.warn('Could not fetch bundled_links_101-200.json:', e);
    }

    // Fallback: load raw TXT
    try {
      const url2 = chrome.runtime.getURL('Shopee_AffiliateLinks_Umum_2026-08-16.txt');
      const res2 = await fetch(url2);
      if (res2.ok) {
        const text = await res2.text();
        const urls = text.match(/https:\/\/shopee\.co\.id\/[^\s\n]+/g) || [];
        if (urls.length > 0) {
          els.batchUrlsInput.value = urls.join('\n');
          handleBatchUrlsInputChange();
          showToast(`✅ Berhasil memuat ${urls.length} link Shopee!`, 'success');
          return;
        }
      }
    } catch (e) {}

    showToast('Silakan paste link secara manual di kotak input.', 'normal');
  }

  function handleClearBatchInput() {
    if (els.batchUrlsInput) {
      els.batchUrlsInput.value = '';
      handleBatchUrlsInputChange();
      showToast('Kotak input dibersihkan.', 'normal');
    }
  }

  function handleBatchUrlsInputChange() {
    if (!els.batchUrlsInput) return;
    const text = els.batchUrlsInput.value || '';
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));
    const totalUrls = rawLines.length;
    const totalBatches = Math.ceil(totalUrls / 5);

    if (els.batchStatsIndicator) {
      els.batchStatsIndicator.textContent = `${totalUrls} Link terdeteksi (${totalBatches} Batch 5-in-1)`;
    }
  }

  async function handleStartBatch() {
    if (!els.batchUrlsInput) return;
    const text = els.batchUrlsInput.value || '';
    const urls = text.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'));

    if (urls.length === 0) {
      showToast('❌ Masukkan minimal 1 link produk Shopee untuk memulai!', 'error');
      return;
    }

    // Slice into batches of 5
    const batches = [];
    for (let i = 0; i < urls.length; i += 5) {
      batches.push(urls.slice(i, i + 5));
    }

    const delaySec = parseInt(els.batchDelayInput.value, 10) || 3;

    // Save batch state
    const newState = {
      batches: batches,
      currentIndex: 0,
      totalUrls: urls.length,
      delaySeconds: delaySec,
      isRunning: true,
      isCompleted: false,
      results: [],
      successCount: 0,
      failCount: 0,
      startedAt: Date.now()
    };

    await StorageHelper.saveBatchState(newState);
    renderBatchState(newState);

    showToast(`🚀 Memulai Auto Generate ${batches.length} Batch (${urls.length} Link)...`, 'success');

    // Open or focus custom link portal tab
    const portalUrl = 'https://affiliate.shopee.co.id/offer/custom_link';
    const tabs = await chrome.tabs.query({ url: '*://affiliate.shopee.co.id/offer/custom_link*' });
    if (tabs.length > 0) {
      await chrome.tabs.update(tabs[0].id, { active: true });
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_BATCH_LOOP' }).catch(() => {});
    } else {
      await chrome.tabs.create({ url: portalUrl, active: true });
    }
  }

  async function handlePauseBatch() {
    const state = await StorageHelper.getBatchState();
    if (state) {
      state.isRunning = false;
      await StorageHelper.saveBatchState(state);
      renderBatchState(state);
      showToast('⏸️ Batch Auto Generator di-pause.', 'normal');
    }
  }

  async function handleResetBatch() {
    if (!confirm('Apakah Anda yakin ingin mereset proses batch dan menghapus hasil saat ini?')) return;
    await StorageHelper.clearBatchState();
    if (els.batchProgressBox) els.batchProgressBox.style.display = 'none';
    if (els.btnStartBatch) els.btnStartBatch.style.display = 'inline-block';
    if (els.btnPauseBatch) els.btnPauseBatch.style.display = 'none';
    renderBatchResultsTable([]);
    showToast('Batch state berhasil direset.', 'normal');
  }

  async function handleCopyBatchResults() {
    const state = await StorageHelper.getBatchState();
    const results = state && Array.isArray(state.results) ? state.results : [];
    const validLinks = results.map(r => r.affiliateUrl).filter(Boolean);

    if (validLinks.length === 0) {
      showToast('Belum ada shortlink affiliate yang selesai.', 'error');
      return;
    }

    navigator.clipboard.writeText(validLinks.join('\n'))
      .then(() => showToast(`✅ ${validLinks.length} Link Affiliate berhasil disalin ke clipboard!`, 'success'))
      .catch(() => showToast('Gagal menyalin link.', 'error'));
  }

  async function handleExportBatchJson() {
    const state = await StorageHelper.getBatchState();
    const results = state && Array.isArray(state.results) ? state.results : [];
    if (results.length === 0) {
      showToast('Belum ada hasil untuk diekspor.', 'error');
      return;
    }

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopee_affiliate_batch_101-200_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('📦 File JSON berhasil didownload!', 'success');
  }

  /**
   * Sync directly to Bio-Link Server (http://localhost:3000)
   */
  async function handleSyncToBiolink() {
    const state = await StorageHelper.getBatchState();
    const results = state && Array.isArray(state.results) ? state.results : [];
    if (results.length === 0) {
      showToast('❌ Belum ada link affiliate yang siap disinkronkan.', 'error');
      return;
    }

    showToast('🔄 Menghubungkan ke Bio-Link Server (http://localhost:3000)...', 'normal');

    try {
      // Create product objects for Bio-Link
      const productsToSync = [];
      for (let i = 0; i < results.length; i += 5) {
        const chunk = results.slice(i, i + 5);
        const spillNum = 101 + Math.floor(i / 5);
        const spillStr = String(spillNum).padStart(3, '0');

        const links = chunk.map((c, idx) => ({
          title: `Produk Spill #${spillStr} (Pilihan Toko ${idx + 1})`,
          url: c.affiliateUrl || c.originalUrl,
          price: 'Shopee Terlaris',
          sold: 'Terlaris',
          rating: '4.8',
          isMall: idx === 0,
          isStar: true,
          isPrimary: idx === 0
        }));

        productsToSync.push({
          id: `prod_spill_${spillStr}`,
          spillNumber: spillStr,
          title: links[0]?.title || `Produk Spill #${spillStr}`,
          imageUrl: `/frames2/${spillStr}/frame_1.jpg`,
          affiliateUrl: links[0]?.url || 'https://shopee.co.id',
          category: 'Barang Unik',
          links: links,
          clicks: Math.floor(Math.random() * 200) + 150
        });
      }

      const res = await fetch('http://localhost:3000/api/products/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsToSync })
      });

      if (res.ok) {
        showToast(`🎉 BERHASIL! ${productsToSync.length} Produk No. 101-200 tersinkronkan ke Bio-Link Shop!`, 'success');
      } else {
        throw new Error('Server returned HTTP ' + res.status);
      }
    } catch (err) {
      console.warn('Sync failed:', err);
      // Fallback: download JSON
      showToast('⚠️ Bio-Link server tidak dapat dihubungi langsung. Mengunduh JSON...', 'normal');
      handleExportBatchJson();
    }
  }

  // Init
  initEvents();
  loadData();

})();
