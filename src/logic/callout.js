// Default glyph per callout tone. A callout REPORTS a state, so its status
// glyphs are the circled ones — the same family toast() uses (TOAST_ICON in
// src/components/index.js) and the same split iconMeanings writes down. The
// bare `check` and `alert` this used to ship read as actions, which is why
// every showcase overrode them per instance. #453
//
// Neutral keeps `info` rather than the toast's `bolt`: a neutral callout is a
// standing note on the page, not something that just happened.
export const calloutIcons = { info: 'info', success: 'circleCheck', warn: 'circleAlert', danger: 'circleX', neutral: 'info' };
