/**
 * Storage Helper for Shopee Affiliate Smart Extractor
 */
const StorageHelper = {
  // Key constants
  KEYS: {
    PRODUCTS: 'shopee_affiliate_products',
    ACTIVE_TASK: 'shopee_active_task',
    SETTINGS: 'shopee_affiliate_settings',
    FOLDERS: 'shopee_affiliate_folders',
    ACTIVE_FOLDER: 'shopee_affiliate_active_folder',
    BATCH_STATE: 'shopee_batch_generator_state'
  },

  DEFAULT_FOLDERS: ['Umum', 'Folder 1'],

  DEFAULT_SETTINGS: {
    autoDownloadImage: true,
    autoCloseAffiliateTab: false,
    autoSwitchToDashboard: false,
    defaultSubtag1: '',
    defaultSubtag2: '',
    captionTemplate: '🔥 {title}\n💰 Harga: {price}\n🛒 Beli Disini: {affiliateUrl}'
  },

  /**
   * Get all saved folders
   * @returns {Promise<Array<string>>}
   */
  async getFolders() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.FOLDERS);
      let list = Array.isArray(data[this.KEYS.FOLDERS]) ? data[this.KEYS.FOLDERS] : null;
      
      if (list === null || list.length === 0) {
        list = [...this.DEFAULT_FOLDERS];
        await chrome.storage.local.set({ [this.KEYS.FOLDERS]: list });
      }
      
      // Ensure 'Umum' is always at top and list has no duplicates or blanks
      list = list.map(f => (typeof f === 'string' ? f.trim() : '')).filter(Boolean);
      if (!list.includes('Umum')) list.unshift('Umum');
      return Array.from(new Set(list));
    } catch (e) {
      console.error('[StorageHelper] Error getting folders:', e);
      return [...this.DEFAULT_FOLDERS];
    }
  },

  /**
   * Create a new folder
   */
  async createFolder(name) {
    if (!name || typeof name !== 'string') return false;
    const cleanName = name.trim();
    if (!cleanName) return false;
    
    try {
      const folders = await this.getFolders();
      if (!folders.includes(cleanName)) {
        folders.push(cleanName);
        await chrome.storage.local.set({ [this.KEYS.FOLDERS]: folders });
      }
      return true;
    } catch (e) {
      console.error('[StorageHelper] Error creating folder:', e);
      return false;
    }
  },

  /**
   * Delete a folder (all products in this folder will move to 'Umum')
   */
  async deleteFolder(name) {
    if (!name || name === 'Umum') return false;
    try {
      let folders = await this.getFolders();
      folders = folders.filter(f => f.trim() !== name.trim());
      await chrome.storage.local.set({ [this.KEYS.FOLDERS]: folders });

      // Move products in this folder to 'Umum'
      const data = await chrome.storage.local.get(this.KEYS.PRODUCTS);
      let products = Array.isArray(data[this.KEYS.PRODUCTS]) ? data[this.KEYS.PRODUCTS] : [];
      let changed = false;
      products.forEach(p => {
        if (p.folder === name || p.folder === name.trim()) {
          p.folder = 'Umum';
          p.updatedAt = new Date().toISOString();
          changed = true;
        }
      });
      if (changed) {
        await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: products });
      }

      // If active folder was deleted, reset to 'Umum'
      const active = await this.getActiveFolder();
      if (active === name || active === name.trim()) {
        await this.setActiveFolder('Umum');
      }

      return true;
    } catch (e) {
      console.error('[StorageHelper] Error deleting folder:', e);
      return false;
    }
  },

  /**
   * Rename a folder (and update all products belonging to this folder)
   */
  async renameFolder(oldName, newName) {
    if (!oldName || !newName || oldName.trim() === newName.trim()) return false;
    const cleanOld = oldName.trim();
    const cleanNew = newName.trim();
    if (!cleanNew) return false;

    try {
      let folders = await this.getFolders();
      const idx = folders.indexOf(cleanOld);
      if (idx >= 0) {
        folders[idx] = cleanNew;
      } else {
        folders.push(cleanNew);
      }
      folders = Array.from(new Set(folders.filter(Boolean)));
      await chrome.storage.local.set({ [this.KEYS.FOLDERS]: folders });

      // Update products in this folder
      const data = await chrome.storage.local.get(this.KEYS.PRODUCTS);
      let products = Array.isArray(data[this.KEYS.PRODUCTS]) ? data[this.KEYS.PRODUCTS] : [];
      let changed = false;
      products.forEach(p => {
        if (p.folder === cleanOld) {
          p.folder = cleanNew;
          p.updatedAt = new Date().toISOString();
          changed = true;
        }
      });
      if (changed) {
        await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: products });
      }

      // Update active folder if matched
      const active = await this.getActiveFolder();
      if (active === cleanOld) {
        await this.setActiveFolder(cleanNew);
      }

      return true;
    } catch (e) {
      console.error('[StorageHelper] Error renaming folder:', e);
      return false;
    }
  },

  /**
   * Get/Set active working folder
   */
  async getActiveFolder() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.ACTIVE_FOLDER);
      return data[this.KEYS.ACTIVE_FOLDER] || 'Umum';
    } catch (e) {
      return 'Umum';
    }
  },

  async setActiveFolder(folderName) {
    try {
      await chrome.storage.local.set({ [this.KEYS.ACTIVE_FOLDER]: folderName || 'Umum' });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Move single product to folder
   */
  async setProductFolder(productId, folderName) {
    try {
      const products = await this.getProducts();
      const p = products.find(item => item.id === productId);
      if (p) {
        p.folder = folderName || 'Umum';
        p.updatedAt = new Date().toISOString();
        await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: products });
        return true;
      }
      return false;
    } catch (e) {
      console.error('[StorageHelper] Error setting product folder:', e);
      return false;
    }
  },

  /**
   * Move multiple products to folder
   */
  async setProductsFolder(productIds, folderName) {
    try {
      const idSet = new Set(productIds);
      const products = await this.getProducts();
      let changed = false;
      products.forEach(p => {
        if (idSet.has(p.id)) {
          p.folder = folderName || 'Umum';
          p.updatedAt = new Date().toISOString();
          changed = true;
        }
      });
      if (changed) {
        await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: products });
      }
      return true;
    } catch (e) {
      console.error('[StorageHelper] Error setting products folder:', e);
      return false;
    }
  },

  /**
   * Get all saved affiliate products (auto-seeds from database.json if completely empty)
   * @returns {Promise<Array>}
   */
  async getProducts() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.PRODUCTS);
      let list = Array.isArray(data[this.KEYS.PRODUCTS]) ? data[this.KEYS.PRODUCTS] : null;

      // If storage is not initialized, try loading seed from database.json
      if (list === null) {
        list = await this.seedFromDatabaseJson();
      }

      return list || [];
    } catch (e) {
      console.error('[StorageHelper] Error getting products:', e);
      return [];
    }
  },

  /**
   * Auto-seed products and folders from bundled database.json file
   */
  async seedFromDatabaseJson() {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
        const url = chrome.runtime.getURL('database.json');
        const res = await fetch(url);
        if (res.ok) {
          const db = await res.json();
          if (Array.isArray(db.products) && db.products.length > 0) {
            await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: db.products });
            if (Array.isArray(db.folders)) {
              await chrome.storage.local.set({ [this.KEYS.FOLDERS]: db.folders });
            }
            if (db.settings) {
              await this.saveSettings(db.settings);
            }
            console.log('[StorageHelper] Successfully seeded database from database.json:', db.products.length, 'items');
            return db.products;
          }
        }
      }
    } catch (e) {
      console.warn('[StorageHelper] Could not auto-seed database.json:', e);
    }
    return [];
  },

  /**
   * Export full database as a clean JSON Object
   */
  async exportToJsonObject() {
    const products = await this.getProducts();
    const folders = await this.getFolders();
    const activeFolder = await this.getActiveFolder();
    const settings = await this.getSettings();

    return {
      version: '1.3.0',
      exportedAt: new Date().toISOString(),
      folders: folders,
      activeFolder: activeFolder,
      totalProducts: products.length,
      products: products,
      settings: settings
    };
  },

  /**
   * Import full database from JSON Object
   */
  async importFromJson(data) {
    try {
      let importedCount = 0;
      if (Array.isArray(data.products)) {
        for (const p of data.products) {
          await this.saveProduct(p);
          importedCount++;
        }
      } else if (Array.isArray(data)) {
        for (const p of data) {
          await this.saveProduct(p);
          importedCount++;
        }
      }

      if (Array.isArray(data.folders)) {
        for (const f of data.folders) {
          await this.createFolder(f);
        }
      }

      if (data.settings && typeof data.settings === 'object') {
        await this.saveSettings(data.settings);
      }

      return { success: true, count: importedCount };
    } catch (e) {
      console.error('[StorageHelper] Error importing JSON:', e);
      return { success: false, error: e.message };
    }
  },

  /**
   * Save or update a product item
   * @param {Object} product
   * @returns {Promise<boolean>}
   */
  async saveProduct(product) {
    try {
      const products = await this.getProducts();
      const activeFolder = await this.getActiveFolder();
      const targetFolder = product.folder || activeFolder || 'Umum';

      // Check if product already exists (by originalUrl, cleanUrl, or affiliateUrl)
      const existingIdx = products.findIndex(
        p => (product.id && p.id === product.id) ||
             (product.cleanUrl && p.cleanUrl === product.cleanUrl) ||
             (product.originalUrl && p.originalUrl === product.originalUrl)
      );

      if (existingIdx >= 0) {
        // Merge updates, keep existing folder unless explicitly changed
        products[existingIdx] = {
          ...products[existingIdx],
          ...product,
          folder: product.folder || products[existingIdx].folder || targetFolder,
          updatedAt: new Date().toISOString()
        };
      } else {
        // Add new to beginning
        products.unshift({
          id: product.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          title: product.title || 'Shopee Product',
          price: product.price || '-',
          imageUrl: product.imageUrl || '',
          originalUrl: product.originalUrl || '',
          cleanUrl: product.cleanUrl || product.originalUrl || '',
          affiliateUrl: product.affiliateUrl || '',
          folder: targetFolder,
          status: product.affiliateUrl ? 'completed' : 'pending',
          tags: product.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...product
        });
      }

      await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: products });
      return true;
    } catch (e) {
      console.error('[StorageHelper] Error saving product:', e);
      return false;
    }
  },

  /**
   * Delete product by ID
   */
  async deleteProduct(id) {
    try {
      const products = await this.getProducts();
      const filtered = products.filter(p => p.id !== id);
      await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: filtered });
      return true;
    } catch (e) {
      console.error('[StorageHelper] Error deleting product:', e);
      return false;
    }
  },

  /**
   * Delete multiple products by IDs
   */
  async deleteProducts(ids) {
    try {
      const idSet = new Set(ids);
      const products = await this.getProducts();
      const filtered = products.filter(p => !idSet.has(p.id));
      await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: filtered });
      return true;
    } catch (e) {
      console.error('[StorageHelper] Error deleting products:', e);
      return false;
    }
  },

  /**
   * Clear all products
   */
  async clearAllProducts() {
    try {
      await chrome.storage.local.set({ [this.KEYS.PRODUCTS]: [] });
      return true;
    } catch (e) {
      console.error('[StorageHelper] Error clearing products:', e);
      return false;
    }
  },

  /**
   * Active generation task helper
   */
  async getActiveTask() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.ACTIVE_TASK);
      return data[this.KEYS.ACTIVE_TASK] || null;
    } catch (e) {
      return null;
    }
  },

  async setActiveTask(task) {
    try {
      await chrome.storage.local.set({ [this.KEYS.ACTIVE_TASK]: task });
      return true;
    } catch (e) {
      return false;
    }
  },

  async clearActiveTask() {
    try {
      await chrome.storage.local.remove(this.KEYS.ACTIVE_TASK);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Settings helpers
   */
  async getSettings() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.SETTINGS);
      return { ...this.DEFAULT_SETTINGS, ...(data[this.KEYS.SETTINGS] || {}) };
    } catch (e) {
      return this.DEFAULT_SETTINGS;
    }
  },

  async saveSettings(settings) {
    try {
      const current = await this.getSettings();
      const updated = { ...current, ...settings };
      await chrome.storage.local.set({ [this.KEYS.SETTINGS]: updated });
      return updated;
    } catch (e) {
      console.error('[StorageHelper] Error saving settings:', e);
      return null;
    }
  },

  /**
   * Batch 5-in-1 Mass Generator State
   */
  async getBatchState() {
    try {
      const data = await chrome.storage.local.get(this.KEYS.BATCH_STATE);
      return data[this.KEYS.BATCH_STATE] || null;
    } catch (e) {
      return null;
    }
  },

  async saveBatchState(state) {
    try {
      await chrome.storage.local.set({ [this.KEYS.BATCH_STATE]: state });
      return true;
    } catch (e) {
      console.error('[StorageHelper] Error saving batch state:', e);
      return false;
    }
  },

  async clearBatchState() {
    try {
      await chrome.storage.local.remove(this.KEYS.BATCH_STATE);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// Make available in global scope if in browser
if (typeof window !== 'undefined') {
  window.StorageHelper = StorageHelper;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageHelper;
}
