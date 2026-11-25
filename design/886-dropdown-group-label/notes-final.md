# Direction 3, final: the dropdown overlap

**Cause.** The Amberstone viewer shows a prototype in a frame with `sandbox="allow-scripts"`. The
prototype drew each theme in a nested frame. Its script read the nested document to set the frame
height and keep room below each open panel. The sandbox blocks that read. Each nested frame
stayed 150px high, the kit limited each panel to 118px or 134px, and each panel covered the next
title, trigger and panel.

**Kit or prototype.** The prototype only. The kit opens one panel at a time. In 17 `React/Dropdown`
stories at 10 sizes, also in the sandbox, no panel overlapped a panel or left the view. The build
adds only the indent rule.

**Fix.** `direction-3-indent-final.html` is one document without nested frames or a measuring
script. Each panel stays in the flow below its trigger. Direction 3, the
trigger size and the focus ring did not change.

**Sizes.** In the viewer, the overlap occurred at 390x844, 844x390, 820x1180, 1280x800 and
1920x1080. The final file shows no overlap at 20 sizes from 240x400 to 2560x1440, light and dark.
At 240px wide the page scrolls sideways, because of the kit panel's 240px minimum width. `screens/`
holds the pictures.
