'use strict';

let asins;
let notes;

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

    case 'set_asin_data': {
      const marketplace = siteTabs.get(sender.tab.id);
      const {asin, data} = msg.payload;
      ensureDbStructure(marketplace, asin);
      Object.assign(asins[marketplace][asin], data);
      saveAsins(function() {
        updateViews(marketplace);
      });
    }
    break;

    case 'content_script_options':
      const {options} = msg.payload;
      // send options to site tabs
      for (const [tabId] of siteTabs) {
        chrome.tabs.sendMessage(tabId, {
          id: 'content_script_options',
          payload: {
            options,
          },
        });
      }
    break;

    case 'get_asin_notes': {
      const {asin} = msg.payload;
      sendResponse(notes[asin]);
    }
    break;

    case 'set_asin_notes': {
      const {asin, notes: newNotes} = msg.payload;
      if (newNotes.length === 0) {
        delete notes[asin];
      }
      else {
        notes[asin] = newNotes;
      }

      chrome.storage.sync.set({notes});
    }
    break;

    default:
      l('message not processed');
    break;
  }
});




// load ASINs and notes
chrome.storage.sync.get({
  asins: {},
  notes: {},
}, function(storage) {
  l('storage.get()', storage);

  asins = storage.asins;
  notes = storage.notes;
});




function saveAsins(callback) {
  chrome.storage.sync.set({asins}, callback);
}




// todo inline
function ensureDbStructure(marketplace, asin) {

  if (asins[marketplace] === undefined) {
    // first data for marketplace
    asins[marketplace] = {};
  }

  if (asins[marketplace][asin] === undefined) {
    // first data for ASIN
    asins[marketplace][asin] = {
    };
  }
}




// send ASIN data to tabs with site page opened for 'marketplace' parameter. if marketplace parameter is absent - send to all tabs
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
    l('notes', notes);
    l('siteTabs', siteTabs);
    l('popupViews', popupViews);

    chrome.storage.sync.get(function(items) {
      l('storage.get()', items);
      console.groupEnd();
    });
  },
});
