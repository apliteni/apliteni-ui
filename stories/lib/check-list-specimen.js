// The markup React's CheckList renders for a list with hints, written out as HTML so
// the vanilla gates can lay it out in front of the kit's sheet. react/src/Checkbox.test.tsx
// renders the real component and fails if it stops matching this string, so the two
// cannot drift apart. Ids are the fixed ones the test normalises React's to.
export const CHECK_LIST_SPECIMEN = `<fieldset class="ui-check-list"><legend class="ui-field__label">Notify me about</legend>`
  + `<div class="ui-check-item"><label class="ui-check"><input aria-describedby="h" type="checkbox" checked><span>Invoices</span></label><div id="h" class="ui-check__hint">A message when an invoice is paid.</div></div>`
  + `<div class="ui-check-item"><label class="ui-check"><input aria-describedby="h" type="checkbox"><span>Weekly summary</span></label><div id="h" class="ui-check__hint">Totals for the week.</div></div>`
  + `<label class="ui-check"><input type="checkbox"><span>Product news</span></label>`
  + `<div class="ui-check-item"><label class="ui-check"><input aria-describedby="h" type="checkbox" checked disabled><span>Security alerts</span></label><div id="h" class="ui-check__hint">Always on.</div></div>`
  + `</fieldset>`;
