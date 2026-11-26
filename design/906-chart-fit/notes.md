# Chart fit variants

Open `prototype.html`. It needs no network access and works with `sandbox="allow-scripts"`.

Before uses unchanged Chart code from main `a02e4fa0`, release 0.205.0.

Recommendations:

- Months: keep every bar and print fewer month names. Keep the collision check from #882.
- Categories A: put each full name above its signed bar. This gives the scale more width than B.
- Bridge A: reduce the column floor and wrap names at spaces. This keeps the familiar vertical bridge.

Categories B puts names beside bars. Bridge B draws steps horizontally.

The plots fit 300 px and shrink when the card has less room. The plot height is 300 px.

Use hover, tap, arrow keys, and the Chart and Table switch. Escape closes a readout.

All data is fabricated. See `review.md` for kit rules, checks, sources, and limits.
