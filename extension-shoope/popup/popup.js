(function () {
  'use strict';

  const btnCustomLink = document.getElementById('btn-open-customlink');
  const btnBioLink = document.getElementById('btn-open-biolink');

  if (btnCustomLink) {
    btnCustomLink.addEventListener('click', async () => {
      const url = 'https://affiliate.shopee.co.id/offer/custom_link';
      const tabs = await chrome.tabs.query({ url: '*://affiliate.shopee.co.id/offer/custom_link*' });
      if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        await chrome.tabs.create({ url: url, active: true });
      }
      window.close();
    });
  }

  if (btnBioLink) {
    btnBioLink.addEventListener('click', async () => {
      const url = 'http://localhost:3000';
      const tabs = await chrome.tabs.query({ url: 'http://localhost:3000/*' });
      if (tabs.length > 0) {
        await chrome.tabs.update(tabs[0].id, { active: true });
      } else {
        await chrome.tabs.create({ url: url, active: true });
      }
      window.close();
    });
  }
})();
