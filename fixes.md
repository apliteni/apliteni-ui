# Fixes for the noise review (#768)

Branch `builder-ui-noise-human-review`, commit c36e15e4. Each prototype opens a rule from its hash.

- F1 destructive-actions: The confirm modal footer wraps at 390. The page is 175 of 180 words.
- F2 hover-readouts: The rules are in STE, 333 of 333 words. The Do opens below the mark. The Don't clip is deliberate.
- F3 labels-and-titles: Both Don't halves show the same real words in muted ink, with an annotation. 300 of 300 words.
- F4 colour-and-theming: Open. The Don't swatch keeps no label. White on --accent is 2.95:1, and the React contrast gate rejects it. Only a person may add a ledger entry for it.
- F5 dense-tables: The Do has no hovered fill and keeps 38px rows. Main's text is restored outside the states rule. 580 of 600 words.
- F6 dashboards-and-reports: One working Chart and Table switch card. The report-depth table shows Reference, Fees (EUR) and Net (EUR). 599 of 600 words.
- F7 file-drop: Upload sits above the files. Main's text is restored in on-drag, in-the-row and limits-once. 517 words, equal to its recorded figure.
- F8 drawer: The phone Except "On a phone, put each label above its value." is added. 323 words.
- F9 labels-and-titles: The description sits below the label. INV-4812 has the full width, 162px at 390.
- F10 state-set: "or" is restored. 177 words.
- F11 empty-states: Main's text is restored, and the 54-word instruction is split. 90 words.
- F12 stat-bands: Main's text is restored, with every neutral case and the Finance exception. 224 words.
- F13 button-labels: Open. The three unchanged rules are restored and the Except is shorter. The page is 299 of 240 words. No cut keeps every fact: the closed list, Download PDF, the approvals, #729 and #742.
- F14 component-choice: Main's shorter Why and Except are restored. 503 words.
- F15 layout-and-density: Main's text is restored, with one sentence for each clause. 317 words.
- F16 going-back: Main's text is restored and the clauses joined by ";" are split. 363 words, equal to its recorded figure.
- F17 the-page: The unchanged rules are restored. Each merged fact appears once. 599 of 600 words.
- F18 pagination: "When available, use the server's total row count." 239 of 240 words.
- F19 microcopy: 59 of 60 words.
- F20 spacing: Restored exactly from main. 215 of 240 words.
- F21 dense-tables: A real kit table in a scroll box. In the Don't, the Net column is cut and the scroll bar shows. The centred column is 50% of the frame, at least 170px.

Each prototype was served with the CSP header and measured at 390 and 1280, in light and dark. No page had an error, and every rule opened from its hash. The remaining flags are deliberate Don't clips, the kit's loading-button label slot, chart paths, and 1px screen-reader boxes.
