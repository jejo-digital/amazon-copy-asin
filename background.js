'use strict';

let asins;  

// site tabs where content script started
const siteTabs = new Map();

// popups & tabs with popup page
const popupViews = new Map();


chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  cg('runtime.onMessage()');
  l(msg, sender);

  switch(msg.id) {
    // msg from content script
    case 'get_asins_for_marketplace': {
      const marketplace = getMarketplaceFromOrigin(sender.origin);

      // store tab id and its marketplace
      siteTabs.set(sender.tab.id, marketplace);

      sendResponse(asins[marketplace]);
    }
    break;

    case 'mark_asin_as_copied': {
      const marketplace = getMarketplaceFromOrigin(sender.origin);
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
        updateViews(marketplace);
      });
    }
    break;

    case 'options':
      const {options} = msg.payload;
      // send options to site tabs
      for (const [tabId] of siteTabs) {
        chrome.tabs.sendMessage(tabId, {
          id: 'options',
          payload: {
            options,
          },
        });
      }
    break;

    default:
      l('message not processed');
    break;
  }
});



// load all ASINs
chrome.storage.sync.get({
  asins: {},
}, function(storage) {
  l('storage.get()', storage);

  asins = storage.asins;
});




function saveAsins(callback) {
  chrome.storage.sync.set({asins}, callback);
}




// send ASINs to tabs showing data for marketplace parameter. if marketplace parameter is absent - send to all tabs
function updateViews(marketplace) {
  l('updateViews()', marketplace);

  // content script tabs
  for (const [tabId, tabMarketplace] of siteTabs) {
    if (marketplace === undefined || tabMarketplace === marketplace) {
      chrome.tabs.sendMessage(tabId, {
        id: 'asins_for_marketplace',
        payload: {
          asins: asins[tabMarketplace],
        },
      });
    }
  }

  // popups & tabs with popup page
  for (const [popupPort, popupMarketplace] of popupViews) {
    if (marketplace === undefined || popupMarketplace === marketplace) {
      popupPort.postMessage({
        id: 'asins_for_marketplace',
        payload: {
          asins: asins[popupMarketplace],
        },
      });
    }
  }
}




chrome.tabs.onRemoved.addListener(function(tabId) {
  siteTabs.delete(tabId);
});




chrome.contextMenus.create({
  title: 'Open popup in tab',
  contexts: ['browser_action'],
  onclick: function(info, tab) {
    // get marketplace from current tab URL and pass it to new tab in URL
    let newTabURL = 'popup.html';
    const activeTabOrigin = new URL(tab.url).origin;
    l(activeTabOrigin);
    if (activeTabOrigin.startsWith(AMAZON_URL_PREFIX)) {
      newTabURL += '?marketplace=' + getMarketplaceFromOrigin(activeTabOrigin);
    }
    l(newTabURL);

    chrome.tabs.create({url: newTabURL});
  },
});




// communicating with popups & popup tabs
chrome.runtime.onConnect.addListener(function(port) {
  l('runtime.onConnect()', port);

  port.onMessage.addListener(function(msg) {
    cg('port.onMessage()', msg);

    switch(msg.id) {
      case 'get_asins_for_marketplace': {
        const {marketplace} = msg.payload;
        // associate port with its marketplace
        popupViews.set(port, marketplace);

        port.postMessage({
          id: 'asins_for_marketplace',
          payload: {
            asins: asins[marketplace],
          },
        });
      }
      break;

      case 'set_asins_for_marketplace': {
        const {marketplace} = msg.payload;
        asins[marketplace] = msg.payload.asins;
        saveAsins(function() {
          updateViews(marketplace);
        });
      }
      break;

      case 'clear_all_asins':
        asins = {};
        saveAsins(updateViews);
      break;

      default:
        l('message not processed');
      break;
    }
  });

  port.onDisconnect.addListener(function(port) {
    l('port.onDisconnect()', port);

    popupViews.delete(port);
  });
});




// dev
Object.defineProperty(window, 's', {
  get() {
    cg('current situation');
    l('asins', asins);
    l('siteTabs', siteTabs);
    l('popupViews', popupViews);

    chrome.storage.sync.get(function(items) {
      l('storage.get()', items);
      console.groupEnd();
    });
  },
});
