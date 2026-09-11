// A static twelve-point trend line for specimens. The kit draws no chart — a
// stat's trend is a slot — so the stories that show one draw it here.
//
// It scales from zero, as the finance portal's own sparkline does, so a band
// drawn here and the portal's band differ in layout and not in the chart.
// `width`/`height` attributes are set so base.css's bare-svg rule, which sizes
// an unsized <svg> to 1.1em, leaves it alone. `span || 1` keeps a flat series
// from dividing by zero and drawing nothing.
export const sparkline = (values, label) => {
  const w = 200;
  const h = 32;
  const min = Math.min(...values, 0);
  const span = Math.max(...values, 0) - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * (w - 2) + 1;
    const y = h - 2 - ((v - min) / span) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${label}">`
    + `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6" `
    + 'stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
};
