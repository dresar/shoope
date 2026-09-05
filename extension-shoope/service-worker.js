/**
 * Shopee Affiliate Smart Extractor - Service Worker (Manifest V3)
 */

importScripts('utils/storage.js');

// Constants
const AFFILIATE_CUSTOM_LINK_URL = 'https://affiliate.shopee.co.id/offer/custom_link';
const DASHBOARD_URL = chrome.runtime.getURL('dashboard/dashboard.html');

// When user clicks the extension icon → show floating card on current Shopee tab
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && tab.url.includes('shopee.co.id') && !tab.url.includes('affiliate.shopee.co.id')) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_WIDGET' });
    } catch (e) {
      // Content script might not be injected yet (e.g., extension just installed)
      console.log('[ServiceWorker] Could not send SHOW_WIDGET, content script not ready:', e.message);
    }
  }
});

function getFilenameFromProduct(title, originalUrl) {
  let name = '';
  // Try extracting from URL slug first
  const targetUrl = originalUrl || (title && title.startsWith('http') ? title : '');
  if (targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      let pathname = decodeURIComponent(parsed.pathname); // e.g. /HAYYLIFE-Alat-...-i.446771176.19200304667
      pathname = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
      pathname = pathname.replace(/-i\.\d+\.\d+.*$/i, '');
      pathname = pathname.replace(/-i\.\d+.*$/i, '');
      pathname = pathname.replace(/^product\/\d+\/\d+/i, '');
      if (pathname && pathname.length > 2) {
        name = pathname;
      }
    } catch (e) {}
  }

  // Fallback to title
  if (!name && title) {
    name = title;
  }

  if (!name) name = 'Shopee_Product';

  // Sanitize for Windows / Mac file systems
  name = name
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();

  if (name.length > 180) {
    name = name.substring(0, 180).replace(/-+$/, '');
  }

  return name || 'Shopee_Product';
}



// Handle runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'START_AFFILIATE_FLOW': {
          const productData = message.payload;
          const settings = await StorageHelper.getSettings();

          // 1. Create or save pending product in storage
          await StorageHelper.saveProduct({
            ...productData,
            status: 'processing'
          });

          // 2. Set active generation task
          await StorageHelper.setActiveTask({
            ...productData,
            sourceTabId: sender.tab ? sender.tab.id : null,
            startedAt: Date.now()
          });

          // 3. (Image download removed)

          // 4. Open or focus custom link page
          // Look for an existing affiliate tab first
          const tabs = await chrome.tabs.query({ url: '*://affiliate.shopee.co.id/offer/custom_link*' });
          let targetTab;
          if (tabs.length > 0) {
            targetTab = tabs[0];
            await chrome.tabs.update(targetTab.id, { active: true, url: AFFILIATE_CUSTOM_LINK_URL });
            if (targetTab.windowId) {
              await chrome.windows.update(targetTab.windowId, { focused: true });
            }
          } else {
            targetTab = await chrome.tabs.create({
              url: AFFILIATE_CUSTOM_LINK_URL,
              active: true
            });
          }

          sendResponse({ success: true, targetTabId: targetTab.id });
          break;
        }

        case 'AFFILIATE_LINK_GENERATED': {
          const { affiliateUrl, cleanUrl, originalUrl } = message.payload;
          const settings = await StorageHelper.getSettings();
          const activeTask = await StorageHelper.getActiveTask();

          // Update product in storage (preserving folder)
          await StorageHelper.saveProduct({
            cleanUrl,
            originalUrl,
            affiliateUrl,
            folder: activeTask?.folder || undefined,
            status: 'completed'
          });

          // Clear active task
          await StorageHelper.clearActiveTask();

          // Notification
          try {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon-128.png',
              title: 'Shopee Affiliate Link Ready! ✨',
              message: `Link berhasil disalin ke clipboard:\n${affiliateUrl}`
            });
          } catch (e) {
            console.log('Notification skipped or unsupported:', e);
          }

          // Always auto-close affiliate tab & return to product tab
          if (sender.tab) {
            setTimeout(async () => {
              try {
                await chrome.tabs.remove(sender.tab.id);
                // Switch back to original product tab
                if (activeTask && activeTask.sourceTabId) {
                  await chrome.tabs.update(activeTask.sourceTabId, { active: true });
                }
              } catch (e) { console.warn('[ServiceWorker] Could not close affiliate tab:', e); }
            }, 1200);
          }

          sendResponse({ success: true });
          break;
        }


        case 'OPEN_DASHBOARD': {
          const tabs = await chrome.tabs.query({ url: DASHBOARD_URL });
          if (tabs.length > 0) {
            await chrome.tabs.update(tabs[0].id, { active: true });
            if (tabs[0].windowId) {
              await chrome.windows.update(tabs[0].windowId, { focused: true });
            }
          } else {
            await chrome.tabs.create({ url: DASHBOARD_URL, active: true });
          }
          sendResponse({ success: true });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('[ServiceWorker] Error handling message:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // Keep message channel open for async response
});
