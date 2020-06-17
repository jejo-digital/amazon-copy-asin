'use strict';

let asins;  

// tabs where content script started
const contentTabs = new Map();


chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  cg('runtime.onMessage()');
  l(msg, sender);

  const marketplace = sender.origin.startsWith('chrome-extension') ? msg.payload.marketplace : getMarketplaceFromOrigin(sender.origin);
  l(marketplace);

  switch(msg.id) {
    case 'get_asins_for_marketplace':

      // store tab id and its page marketplace
      contentTabs.set(sender.tab.id, marketplace);

      sendResponse(asins[marketplace]);
    break;

    case 'mark_asin_as_copied':
      const {asin} = msg.payload;

      if (asins[marketplace] === undefined) {
        // first ASIN in marketplace
        asins[marketplace] = [asin];
      }
      else {
        if (!asins[marketplace].includes(asin)) {
          asins[marketplace].push(asin);
        }
      }

      saveASINs(function() {
        updateMarketplaceTabs(marketplace);
      });

    break;

    case 'save_asins_for_marketplace':
      asins[marketplace] = msg.payload.asins;
      saveASINs(function() {
        updateMarketplaceTabs(marketplace);
      });
    break;

    default:
      l('message not processed');
    break;
  }
});




chrome.storage.sync.get({
  asins: {},
  options: DEFAULT_OPTIONS,
}, function(storage) {
  l('storage.get()', storage);

  asins = storage.asins;
});




function saveASINs(callback) {
  chrome.storage.sync.set({ asins }, callback);
}




function updateMarketplaceTabs(marketplace) {
  for (const [tabId, tabMarketplace] of contentTabs) {
    if (tabMarketplace !== marketplace) {
      continue;
    }
    chrome.tabs.sendMessage(tabId, {
      id: 'asins',
      payload: {
        asins: asins[tabMarketplace],
      },
    });
  }
}




function getMarketplaceFromOrigin(origin) {
  return origin.replace('https://www.amazon.', '');
}




chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.create({ url: 'asins.html' });
});




// dev
Object.defineProperty(window, 's', {
  get() {
    cg('current situation');
    l('asins', asins);
    l('contentTabs', contentTabs);

    chrome.storage.sync.get(function(items) {
      l('storage.get()', items);
      console.groupEnd();
    });
  },
});
