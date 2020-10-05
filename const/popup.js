'use strict';

const TOP_ASINS_AMOUNT = 10;

const SCRAPE_REQUESTS_INTERVAL = 300; // msec

const Msg = {
  ALL_BSRS_ALREADY_OBTAINED: 'All BSRs already obtained.',
  CANCELLED_BY_USER: 'Cancelled by user.',
  ASIN_LIST_IS_EMPTY: 'ASIN list is empty.',
};

const NO_CATEGORY = '';

const NEVER_SCRAPED_SYMBOL = '';
const ABSENT_SYMBOL = '\u2717';
