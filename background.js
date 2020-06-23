'use strict';

let asins;  

// tabs where content script started & 'control panel' tabs
const contentTabs = new Map();


chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  cg('runtime.onMessage()');
  l(msg, sender);

  const marketplace = sender.origin.startsWith('chrome-extension') ? msg.payload.marketplace : getMarketplaceFromOrigin(sender.origin);
  l(marketplace);

  switch(msg.id) {
    case 'get_asins_for_marketplace':

      // store tab id and its marketplace
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

      saveAsins(function() {
        updateTabs(marketplace);
      });

    break;

    case 'set_asins_for_marketplace':
      asins[marketplace] = msg.payload.asins;
      saveAsins(function() {
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

  createCheckboxMenu('Highlight copied products', 'isHighlightCopiedProducts');
  createCheckboxMenu('Highlight not-copied products', 'isHighlightNotCopiedProducts');
  createCheckboxMenu('Highlight sponsored products', 'isHighlightSponsoredProducts');

  chrome.contextMenus.create({
    type: 'separator',
    contexts: ['browser_action'],
  });

  chrome.contextMenus.create({
    title: 'Clear ASIN copy data',
    contexts: ['browser_action'],
    onclick: function() {
      if (!confirm('Are you sure?')) {
        return;
      }
      asins = {};
      saveAsins(updateTabs);
    },
  });


  function createCheckboxMenu(title, optionsPropertyName) {
    chrome.contextMenus.create({
      title,
      type: 'checkbox',
      checked: storage.options[optionsPropertyName],
      contexts: ['browser_action'],
      onclick: function(info) {
        storage.options[optionsPropertyName] = info.checked;
        // save new options
        chrome.storage.sync.set({
          options: storage.options,
        }, function() {
          // send new options to all tabs
          for (const [tabId] of contentTabs) {
            chrome.tabs.sendMessage(tabId, {
              id: 'options',
              payload: {
                options: storage.options,
              },
            });
          }
        });
      },
    });
  }
});




function saveAsins(callback) {
  chrome.storage.sync.set({asins}, callback);
}




// send ASINs to tabs belonging only to marketplace parameter. if marketplace parameter is absent - send to all tabs
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
  chrome.tabs.create({url: 'asins.html'}, function(tab) {
    // new tab is always created in non-incognito window, so if extension icon is pressed from incognito window,
    // and all non-incognito windows are minimized, nothing will happen on screen. So we manually focus window with newly created tab in this case.
    chrome.windows.get(tab.windowId, function(window) {
      if (window.state !== chrome.windows.WindowState.MINIMIZED) {
        return;
      }
      chrome.windows.update(tab.windowId, {focused: true});
    });
  });
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
