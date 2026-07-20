import { switchToggle, checkbox } from '../../src/components/index.js';
import { pad, specimen, stack } from '../_gallery.js';

export default {
  title: 'Components/Switch & Checkbox',
  parameters: { layout: 'fullscreen' },
};

export const Switches = {
  render: () => pad(stack(
    specimen('States', `<div style="display:flex;gap:26px;align-items:center">
      ${switchToggle({ checked: false })} ${switchToggle({ checked: true })}
      ${switchToggle({ checked: false, disabled: true })} ${switchToggle({ checked: true, disabled: true })}
    </div>`),
    specimen('In a row', `<div style="max-width:460px" class="ui-card">
      <div class="ui-card__row"><div><div class="lab">Email notifications</div><div class="hint">Weekly strategy digest.</div></div>${switchToggle({ checked: true })}</div>
      <div class="ui-card__row"><div><div class="lab">Reduce motion</div><div class="hint">Turn off deck animations.</div></div>${switchToggle({ checked: false })}</div>
    </div>`),
  )),
};

export const Checkboxes = {
  render: () => pad(stack(
    specimen('Checkbox', `<div style="display:flex;flex-direction:column;gap:14px">
      ${checkbox({ label: 'Read the strategy deck', checked: true })}
      ${checkbox({ label: 'Connect an agent over MCP' })}
      ${checkbox({ label: 'Grant read-only scope', checked: true })}
    </div>`),
    specimen('Radio group', `<div style="display:flex;flex-direction:column;gap:14px">
      ${checkbox({ label: 'Read only', type: 'radio', name: 'scope', checked: true })}
      ${checkbox({ label: 'Read & comment', type: 'radio', name: 'scope' })}
      ${checkbox({ label: 'Full access', type: 'radio', name: 'scope' })}
    </div>`),
  )),
};
