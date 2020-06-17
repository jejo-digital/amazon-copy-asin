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
        updateTabs(marketplace);
      });

    break;

    case 'save_asins_for_marketplace':
      asins[marketplace] = msg.payload.asins;
      saveASINs(function() {
        updateTabs(marketplace);
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

  chrome.contextMenus.create({
    title: 'Highlight product images',
    type: 'checkbox',
    checked: storage.options.isHighlightProductImages,
    contexts: ['browser_action'],
    onclick: function(info) {
      const options = {
        isHighlightProductImages: info.checked,
      };
      // save new options
      chrome.storage.sync.set({
        options,
      }, function() {
        // send new options to all content tabs
        for (const [tabId] of contentTabs) {
          chrome.tabs.sendMessage(tabId, {
            id: 'options',
            payload: {
              options,
            },
          });
        }
      });
    },
  });

  chrome.contextMenus.create({
    title: 'Clear ASIN copy data',
    contexts: ['browser_action'],
    onclick: function() {
      if (!confirm('Are you sure?')) {
        return;
      }
      asins = {};
      saveASINs(updateTabs);
    },
  });
});




function saveASINs(callback) {
  chrome.storage.sync.set({asins}, callback);
}




// update content tabs belonging only to marketplace parameter. if marketplace parameter is absent - update all tabs
function updateTabs(marketplace) {
  for (const [tabId, tabMarketplace] of contentTabs) {
    if (marketplace !== undefined && tabMarketplace !== marketplace) {
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




chrome.tabs.onRemoved.addListener(function(tabId) {
  contentTabs.delete(tabId);
});




function getMarketplaceFromOrigin(origin) {
  return origin.replace('https://www.amazon.', '');
}




chrome.browserAction.onClicked.addListener(function() {
  chrome.tabs.create({url: 'asins.html'});
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
