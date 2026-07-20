import { pad } from '../_gallery.js';

export default {
  title: 'Foundations/Elevation',
  parameters: { layout: 'fullscreen' },
};

const SHADOWS = [
  ['sm', '--shadow-sm', 'raised segment button'],
  ['md', '--shadow-md', 'hovered card'],
  ['lg', '--shadow-lg', 'menu, toast, auth card'],
];

export const Shadows = {
  render: () => pad(`
    <h1 style="font:700 30px/1.1 Poppins;color:var(--strong);letter-spacing:-.02em;margin-bottom:6px">Elevation</h1>
    <p style="color:var(--dim);margin-bottom:40px">Three shadow steps. Depth is soft and diffuse — never a hard drop.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:34px;max-width:820px">
      ${SHADOWS.map(([name, v, use]) => `<div style="display:flex;flex-direction:column;gap:14px">
        <div style="height:110px;background:var(--surface);border-radius:16px;box-shadow:var(${v})"></div>
        <div><div style="font:600 13px/1 Poppins;color:var(--strong)">${name}</div><div style="font:400 12px/1.4 Poppins;color:var(--muted);margin-top:3px">${use}</div></div>
      </div>`).join('')}
    </div>
    <div style="margin-top:50px">
      <h3 style="font:600 13px/1 Poppins;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:20px">Ambient glow</h3>
      <div style="position:relative;height:200px;background:var(--bg);border-radius:18px;overflow:hidden;box-shadow:inset 0 0 0 1px var(--border)">
        <span class="ui-glow ui-glow--purple" style="top:-60px;left:20%"></span>
        <span class="ui-glow ui-glow--cyan" style="bottom:-80px;right:10%;width:300px;height:300px"></span>
        <div style="position:relative;z-index:1;display:grid;place-items:center;height:100%;color:var(--dim);font:500 14px Poppins">The deck's signature background depth</div>
      </div>
    </div>
  `),
};
