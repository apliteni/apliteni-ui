**Why?** Keep the product visible with familiar navigation.

**Frequency?** One reported request during 8–9 November 2026. Usage frequency is unknown.

**Simpler?** Inset today's NavTabs window. Choose A for the smallest change.

Branch: `asabirov/apliteni-ui-795-design`.

A uses NavTabs under the reader. It follows Account and settings `modal` and `nav`.

B uses SidebarNav and BackLink. It follows Going back's destination and parent-address rules. It breaks these Account and settings fields:

> On a phone the sections become tabs under the reader, where a column beside the pane would leave it narrower than its rows.

> Stand the entries beside the pane — above it on a phone — and mark the one on screen.

Proposed B `modal` Except: “On a phone, use tabs under the reader or a section list. Each section has a return link.”

Proposed B `nav` Do: “Stand entries beside the pane on desktop and mark the open section. On a phone, use tabs or a section list.”

C uses Tabs. It follows Component choice's panel rule and Account and settings `modal` and `nav`.

A and C need no guideline change. All conflict with Foundations' “a floating panel goes edge to edge” and Components' “the window fills the screen”.

Browser checks passed. React suite has timeouts.

Files:
- [design/795/r2/checks.json](checks.json)
- [design/795/r2/drill-focus.png](drill-focus.png)
- [design/795/r2/drill-hover.png](drill-hover.png)
- [design/795/r2/drill-list.png](drill-list.png)
- [design/795/r2/drill-long.png](drill-long.png)
- [design/795/r2/drill-pressed.png](drill-pressed.png)
- [design/795/r2/drill-profile.png](drill-profile.png)
- [design/795/r2/drill.html](drill.html)
- [design/795/r2/navtabs-focus.png](navtabs-focus.png)
- [design/795/r2/navtabs-hover.png](navtabs-hover.png)
- [design/795/r2/navtabs-long.png](navtabs-long.png)
- [design/795/r2/navtabs-pressed.png](navtabs-pressed.png)
- [design/795/r2/navtabs-profile.png](navtabs-profile.png)
- [design/795/r2/navtabs.html](navtabs.html)
- [design/795/r2/report.md](report.md)
- [design/795/r2/tabs-focus.png](tabs-focus.png)
- [design/795/r2/tabs-hover.png](tabs-hover.png)
- [design/795/r2/tabs-long.png](tabs-long.png)
- [design/795/r2/tabs-pressed.png](tabs-pressed.png)
- [design/795/r2/tabs-profile.png](tabs-profile.png)
- [design/795/r2/tabs.html](tabs.html)
