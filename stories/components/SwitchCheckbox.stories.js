import { switchToggle, checkbox, card } from '../../src/components/index.js';
import { pad, stack } from '../_gallery.js';

// On the card, for the reason the Inputs page gives: a disabled box paints
// --disabled-surface, which IS the card, so in light it stood off the page by
// 1.11:1 under an edge of 1.12:1 and there was nothing left to find it by.
// stories/field-ground.test.js holds the numbers, in both themes.
export default {
  title: 'Components/Switch & Checkbox',
  parameters: { layout: 'fullscreen' },
};

export const Switches = {
  render: () => pad(stack(
    card({ title: 'States', body: `<div style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
      ${switchToggle({ checked: false, label: 'Off' })} ${switchToggle({ checked: true, label: 'On' })}
      ${switchToggle({ checked: false, disabled: true, label: 'Off, disabled' })} ${switchToggle({ checked: true, disabled: true, label: 'On, disabled' })}
    </div>` }),
    `<div style="max-width:460px" class="ui-card">
      <div class="ui-card__row"><div><div class="lab">Email notifications</div><div class="hint">Weekly strategy digest.</div></div>${switchToggle({ checked: true, label: 'Email notifications' })}</div>
      <div class="ui-card__row"><div><div class="lab">Reduce motion</div><div class="hint">Turn off deck animations.</div></div>${switchToggle({ checked: false, label: 'Reduce motion' })}</div>
    </div>`,
  )),
};

export const Checkboxes = {
  render: () => pad(stack(
    card({ title: 'Checkbox', body: `<div style="display:flex;flex-direction:column;gap:14px">
      ${checkbox({ label: 'Read the strategy deck', checked: true })}
      ${checkbox({ label: 'Connect an agent over MCP' })}
      ${checkbox({ label: 'Grant read-only scope', checked: true })}
    </div>` }),
    card({ title: 'Radio group', body: `<div style="display:flex;flex-direction:column;gap:14px">
      ${checkbox({ label: 'Read only', type: 'radio', name: 'scope', checked: true })}
      ${checkbox({ label: 'Read & comment', type: 'radio', name: 'scope' })}
      ${checkbox({ label: 'Full access', type: 'radio', name: 'scope' })}
    </div>` }),
    card({ title: 'Unavailable', body: `<div style="display:flex;flex-direction:column;gap:14px">
      ${checkbox({ label: 'Read only, unavailable', disabled: true })}
      ${checkbox({ label: 'Read only, selected and unavailable', checked: true, disabled: true })}
      ${checkbox({ label: 'Read access, unavailable', type: 'radio', name: 'off-scope', disabled: true })}
      ${checkbox({ label: 'Full access, selected and unavailable', type: 'radio', name: 'off-scope', checked: true, disabled: true })}
    </div>` }),
  )),
};
