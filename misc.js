'use strict';

function getMarketplaceFromOrigin(origin) {
  return origin.replace(AMAZON_URL_PREFIX, '');
}
