'use strict';

// asins for all marketplaces
let asins;

let notes;
let myAsins;

// Amazon tabs where content script started
const amazonTabs = new Map();

// popups & tabs with popup page(just 'popups' for simplicity)
const popupViews = new Map();


chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  n(); l('runtime.onMessage()', msg, sender);

  switch(msg.id) {
    // msg from content script
    case 'get_marketplace_asins': {
      const marketplace = getMarketplaceFromOrigin(sender.origin);

      // store tab id and its marketplace
      amazonTabs.set(sender.tab.id, marketplace);

      sendResponse(asins[marketplace]);
    }
    break;

    case 'set_marketplace_asin_data': {
      const marketplace = amazonTabs.get(sender.tab.id);
      const {asin, data} = msg.payload;
      ensureDbStructure(marketplace, asin);
      Object.assign(asins[marketplace][asin], data);
      saveAsins(function() {
        updateViewsWithAsins(marketplace);
      });
    }
    break;

    case 'content_script_options':
      const {options} = msg.payload;
      // send options to Amazon tabs
      for (const [tabId] of amazonTabs) {
        chrome.tabs.sendMessage(tabId, {
          id: 'content_script_options',
          payload: {
            options,
          },
        });
      }
    break;

    case 'get_asins_that_have_notes': {
      sendResponse(getAsinsThatHaveNotes());
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

      chrome.storage.sync.set({notes}, updateAmazonTabsWithAsinsThatHaveNotes);
    }
    break;

    case 'get_my_asins':
      sendResponse(myAsins);
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
  myAsins: [],
}, function(storage) {
  l('storage.get()', storage);

  asins = storage.asins;
  notes = storage.notes;
  myAsins = storage.myAsins;
});




function saveAsins(callback) {
  chrome.storage.sync.set({asins}, callback);
}




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




chrome.tabs.onRemoved.addListener(function(tabId) {
  amazonTabs.delete(tabId);
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
    n(); l('port.onMessage()', msg);

    switch(msg.id) {
      case 'get_marketplace_asins': {
        const {marketplace} = msg.payload;
        // associate port with its marketplace
        popupViews.set(port, marketplace);

        port.postMessage({
          id: 'marketplace_asins',
          payload: {
            asins: asins[marketplace],
          },
        });
      }
      break;

      case 'set_marketplace_asins': {
        const {marketplace, asins: newAsins} = msg.payload;
        asins[marketplace] = newAsins;
        saveAsins(function() {
          updateViewsWithAsins(marketplace);
        });
      }
      break;

      case 'clear_all_asins':
        asins = {};
        saveAsins(updateViewsWithAsins);
      break;

      case 'get_my_asins':
        port.postMessage({
          id: 'my_asins',
          payload: {
            asins: myAsins,
          },
        });
      break;

      case 'set_my_asins':
        myAsins = msg.payload.asins;
        chrome.storage.sync.set({myAsins}, updateAmazonTabsWithMyAsins);
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




// send marketplace ASINs to tabs showing data for this marketplace. if marketplace parameter is absent - send to all tabs
function updateViewsWithAsins(marketplace) {
  l('updateViewsWithAsins()', marketplace);

  // tabs with Amazon page 
  for (const [tabId, tabMarketplace] of amazonTabs) {
    if (marketplace === undefined || tabMarketplace === marketplace) {
      chrome.tabs.sendMessage(tabId, {
        id: 'marketplace_asins',
        payload: {
          asins: asins[tabMarketplace],
        },
      });
    }
  }

  // popups
  for (const [popupPort, popupMarketplace] of popupViews) {
    if (marketplace === undefined || popupMarketplace === marketplace) {
      popupPort.postMessage({
        id: 'marketplace_asins',
        payload: {
          asins: asins[popupMarketplace],
        },
      });
    }
  }
}




// send ASINs that have notes to Amazon tabs
function updateAmazonTabsWithAsinsThatHaveNotes() {
  l('updateAmazonTabsWithAsinsThatHaveNotes()');

  for (const tabId of amazonTabs.keys()) {
    chrome.tabs.sendMessage(tabId, {
      id: 'asins_that_have_notes',
      payload: {
        asins: getAsinsThatHaveNotes(),
      },
    });
  }
}




// send 'my ASINs' to Amazon tabs
function updateAmazonTabsWithMyAsins() {
  l('updateAmazonTabsWithMyAsins()');

  for (const tabId of amazonTabs.keys()) {
    chrome.tabs.sendMessage(tabId, {
      id: 'my_asins',
      payload: {
        asins: myAsins,
      },
    });
  }
}




function getAsinsThatHaveNotes() {
  return Object.keys(notes);
}




// dev
Object.defineProperty(window, 's', {
  get() {
    console.group('current situation');
    l('asins', asins);
    l('notes', notes);
    l('myAsins', myAsins);
    l('amazonTabs', amazonTabs);
    l('popupViews', popupViews);

    chrome.storage.sync.get(function(items) {
      l('storage.get()', items);
      console.groupEnd();
    });
  },
});
