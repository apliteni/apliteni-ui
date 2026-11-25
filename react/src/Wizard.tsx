import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button } from './primitives/Button';
import { Icon } from './primitives/Icon';
import './Wizard.css';

export type WizardStepState = 'done' | 'current' | 'blocked' | 'todo';

export type WizardStep = {
  id: string;
  label: string;
  state: WizardStepState;
  /** What the open step shows under its row: a sentence and the step's own action. */
  content?: ReactNode;
};

/** The last step. Its state comes from the steps before it, so a caller cannot set it. */
export type WizardFinal = {
  id?: string;
  label: string;
  /** The words of the final action, such as Close month. */
  action: string;
  onAction: () => void;
  /** Why the action is off. It shows while an earlier step is not done. */
  reason: string;
  content?: ReactNode;
  /** The action has run. The final step is done and its action goes away. */
  done?: boolean;
};

export type WizardProps = {
  /** The list's name for a screen reader, such as Month checks. */
  label: string;
  steps: readonly WizardStep[];
  final: WizardFinal;
  /** The open step. Without it, the wizard keeps its own and opens the step to work on. */
  open?: string;
  onOpenChange?: (id: string) => void;
  className?: string;
};

const words: Record<WizardStepState, string> = { done: 'Done', current: 'Current', blocked: 'Blocked', todo: 'To do' };

/** The step to work on: the first one that is current or blocked, else the final step. */
const working = (steps: readonly { id: string; state: WizardStepState }[]) =>
  (steps.find(step => step.state === 'current' || step.state === 'blocked') ?? steps[steps.length - 1]).id;

function Mark({ state }: { state: WizardStepState }) {
  return <span aria-hidden="true" className={`ui-wizard__mark ui-wizard__mark--${state}`}>
    {state === 'done' && <Icon name="check" />}
    {state === 'blocked' && <Icon name="circleAlert" />}
  </span>;
}

/** Ordered steps with one open step and a final action that waits for the steps before it. */
export function Wizard({ label, steps, final, open, onOpenChange, className }: WizardProps) {
  const uid = useId();
  const ready = steps.every(step => step.state === 'done');
  const finalId = final.id ?? 'final';
  const all = [...steps, { id: finalId, label: final.label, state: (final.done ? 'done' : ready ? 'current' : 'todo') as WizardStepState, content: final.content }];
  const target = working(all);
  const [own, setOwn] = useState(target);
  const shown = open ?? own;
  const list = useRef<HTMLOListElement>(null);
  const button = (id: string) => list.current?.querySelector<HTMLButtonElement>(`[data-step="${CSS.escape(id)}"]`) ?? null;

  // Read while rendering, before the commit can take the focused control away.
  const held = typeof document !== 'undefined' && Boolean(list.current?.contains(document.activeElement));

  // When the step to work on moves, the open step follows it. Focus goes with it when the
  // reader was working in the wizard or on the page body. When an action takes away the
  // control that had the focus and the step stays, the focus goes to the open step.
  const last = useRef(target);
  useEffect(() => {
    const active = document.activeElement;
    const lost = active === document.body || active === null;
    if (last.current !== target) {
      last.current = target;
      if (open === undefined) setOwn(target);
      onOpenChange?.(target);
      if (lost || list.current?.contains(active)) button(target)?.focus();
    } else if (held && lost) button(shown)?.focus();
  });

  const choose = (id: string) => {
    if (open === undefined) setOwn(id);
    onOpenChange?.(id);
  };
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = { ArrowDown: (index + 1) % all.length, ArrowUp: (index + all.length - 1) % all.length, Home: 0, End: all.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    button(all[next].id)?.focus();
  };
  // One step is the position a screen reader announces: the step to work on.
  const position = all.find(step => step.state === 'current' || step.state === 'blocked')?.id;

  return <ol ref={list} role="list" aria-label={label} className={['ui-wizard', className].filter(Boolean).join(' ')}>
    {all.map((step, index) => {
      const isFinal = index === all.length - 1;
      const panel = `${uid}-panel-${index}`;
      const head = `${uid}-step-${index}`;
      return <li key={step.id} className={`ui-wizard__item ui-wizard__item--${step.state}`}>
        <button type="button" id={head} data-step={step.id}
          className={`ui-nav__item ui-wizard__step${shown === step.id ? ' is-active' : ''}`}
          aria-label={`${index + 1}. ${step.label}, ${words[step.state]}, step ${index + 1} of ${all.length}`}
          aria-expanded={shown === step.id} aria-controls={panel}
          aria-current={position === step.id ? 'step' : undefined}
          onClick={() => choose(step.id)} onKeyDown={event => move(event, index)}>
          <Mark state={step.state} />
          <span className="ui-wizard__text">
            {/* The space keeps the two lines two words in the visible text that axe and voice control read. */}
            <span className="ui-wizard__name">{index + 1}. {step.label}</span>{' '}
            <span className="ui-wizard__state">{words[step.state]}</span>
          </span>
        </button>
        <div id={panel} role="region" aria-labelledby={head} className="ui-wizard__panel" hidden={shown !== step.id}>
          {step.content}
        </div>
        {isFinal && !final.done && <div className="ui-wizard__final">
          {!ready && <p id={`${uid}-reason`} className="ui-wizard__reason">{final.reason}</p>}
          <Button variant={ready ? 'primary' : 'outline'} disabled={!ready}
            aria-describedby={ready ? undefined : `${uid}-reason`} onClick={final.onAction}>{final.action}</Button>
        </div>}
      </li>;
    })}
  </ol>;
}
