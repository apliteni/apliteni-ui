// Apliteni seedling brand mark + wordmark.
// `p` prefixes gradient ids so multiple marks on one page never collide.

export const seedling = (p = 'lg', size = 21) => `<svg viewBox="0 0 38 36" width="${size}" height="${Math.round(size * 36 / 38)}" aria-hidden="true"><defs><linearGradient id="${p}1" x1="1" x2="0" y1="0.248" y2="0.752"><stop offset="0" stop-color="rgb(140,198,63)"/><stop offset="1" stop-color="rgb(0,146,69)"/></linearGradient><linearGradient id="${p}2" x1="1" x2="0" y1="0.497" y2="0.503"><stop offset="0" stop-color="rgb(140,198,63)"/><stop offset="1" stop-color="rgb(0,146,69)"/></linearGradient></defs><g transform="translate(1 1)"><path d="M 23.115 33.95 C 22.982 34.379 23.862 31.827 24.095 30.048 C 25.239 21.404 23.879 13.04 15.283 6.191 C 11.018 2.783 5.476 0.988 0 1.235 C 1.974 1.647 3.17 3.705 3.484 5.697 C 3.8 7.673 3.468 9.697 3.7 11.69 C 4.165 15.691 6.953 19.264 10.57 21.108 C 13.84 22.771 17.689 23.1 21.306 22.359 C 21.306 22.359 17.772 13.501 11.234 10.801 C 11.234 10.801 20.062 13.451 22.617 21.981 C 24.31 27.694 23.115 33.951 23.115 33.951 Z" fill="url(#${p}1)"/><path d="M 24.509 17.09 C 24.495 17.045 24.478 17.002 24.459 16.959 C 25.322 13.469 28.425 10.109 30.582 9.089 C 28.392 9.171 24.708 12.546 23.562 14.621 C 22.857 13.042 21.972 11.551 20.924 10.175 C 24.84 6.026 33.851 6.026 35.527 0 C 36.157 3.886 36.157 9.632 34.532 13.221 C 32.988 16.613 29.752 21.454 25.355 20.878 C 25.181 19.594 24.898 18.327 24.509 17.091 Z" fill="url(#${p}2)"/></g></svg>`;

// The Apliteni mark — a rounded "sub-theme prism" of the four ready-made accents
// (Nebula / Phoenix / Ocean / Emerald). This is the current mark used everywhere
// (the landing, the favicon, the brand() lockup below). The legacy seedling above
// is kept only for backward compatibility. `p` prefixes the clip id so multiple
// marks on one page never collide.
export const prism = (p = 'pr', size = 26) =>
  `<svg viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true"><defs><clipPath id="${p}"><rect x="1" y="1" width="30" height="30" rx="9"/></clipPath></defs><g clip-path="url(#${p})"><rect x="1" y="1" width="15" height="15" fill="#9b5dff"/><rect x="16" y="1" width="15" height="15" fill="#ff6a3d"/><rect x="1" y="16" width="15" height="15" fill="#3b9dff"/><rect x="16" y="16" width="15" height="15" fill="#16c98a"/></g></svg>`;

// Brand lockup: the prism mark + product word. `word` defaults to "Strategy"
// (the strategy portal). Uses the prism — the current Apliteni mark — not the
// legacy seedling (still exported above for anything that needs it).
export const brand = ({ p = 'lg', word = 'Strategy', size = 22, href = '/' } = {}) =>
  `<a class="brand" href="${href}" aria-label="Apliteni ${word}">${prism(p, size)}<span>${word}</span></a>`;
