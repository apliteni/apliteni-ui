// A filter-sized option list for the search stories and the guideline that
// cites them: long enough to scroll, and named so that a word in the middle of
// a label ("dollar", "krone") finds several rows.
export const CURRENCIES = [
  ['Australian dollar', 'AUD'], ['Brazilian real', 'BRL'], ['British pound', 'GBP'],
  ['Canadian dollar', 'CAD'], ['Chinese yuan', 'CNY'], ['Czech koruna', 'CZK'],
  ['Danish krone', 'DKK'], ['Euro', 'EUR'], ['Hong Kong dollar', 'HKD'],
  ['Hungarian forint', 'HUF'], ['Icelandic króna', 'ISK'], ['Indian rupee', 'INR'],
  ['Israeli shekel', 'ILS'], ['Japanese yen', 'JPY'], ['Mexican peso', 'MXN'],
  ['New Zealand dollar', 'NZD'], ['Norwegian krone', 'NOK'], ['Philippine peso', 'PHP'],
  ['Polish złoty', 'PLN'], ['Romanian leu', 'RON'], ['Singapore dollar', 'SGD'],
  ['South African rand', 'ZAR'], ['South Korean won', 'KRW'], ['Swedish krona', 'SEK'],
  ['Swiss franc', 'CHF'], ['Thai baht', 'THB'], ['Turkish lira', 'TRY'],
  ['UAE dirham', 'AED'], ['US dollar', 'USD'],
];

/** The list as dropdown() items, the code carried in the label so it is searchable. */
export const currencyItems = (selected) => CURRENCIES.map(([name, code]) => ({
  label: `${name} (${code})`, value: code, selected: code === selected,
}));
