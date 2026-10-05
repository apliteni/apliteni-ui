import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { InvoiceFlow } from './InvoiceFlow';
// stories/lib is plain JS outside this workspace's tsconfig, shared the way DocumentReview's
// gate shares it: one calculation, a coverage check per workspace. why: AGENTS.md
// @ts-expect-error -- untyped JS module, deliberately shared across the two gates.
import { accentLines, accentOffences } from '../../../stories/lib/accent-paint.js';
// @ts-expect-error -- untyped JS module; the kit's own sheet parser, shared the same way.
import { leafRules } from '../../../stories/lib/motion-css.js';

/* The showcase's sheet, read as text: vitest does not apply imported CSS in jsdom, so a
 * rule living there is held as the declaration it is. */
// Resolved from the workspace root, the way DocumentReview's gate resolves its own: this
// suite runs as `npm test -w react`, which puts the cwd there.
const SHEET = readFileSync(path.join(process.cwd(), 'src/showcases/InvoiceFlow.css'), 'utf8');
/* The kit's own sheet and tokens, read the same way: the weight check below compares the
 * showcase's value rule with the kit's label rule, and a number beats a string match. */
const ROOT = path.join(process.cwd(), '..');
const KIT_INPUT = readFileSync(path.join(ROOT, 'src/styles/input.css'), 'utf8');
const WEIGHTS = Object.fromEntries([...readFileSync(path.join(ROOT, 'src/tokens/tokens.css'), 'utf8')
  .matchAll(/--weight-([a-z]+):\s*(\d+)/g)].map(([, name, value]) => [`--weight-${name}`, Number(value)]));
/** The weight token a rule assigns, as the number the kit defines for it. */
const weightOf = (css: string, rule: RegExp, what: string) => {
  const found = rule.exec(css);
  expect(found, `${what} sets its font-weight from a --weight token`).not.toBeNull();
  const token = found![1];
  expect(WEIGHTS[token], `the kit defines ${token}`).toEqual(expect.any(Number));
  return WEIGHTS[token];
};

// Interaction tests cover in-memory state, not PDF rendering or real extraction.

/* The form's own summary, named by its text rather than by role. Each invalid field
 * carries its own `role="alert"` too (#388), so a rejected save leaves several alerts
 * on the page and the role alone no longer picks one out. */
const summaryAlert = () => {
  const summary = screen.getByText(/Check the highlighted fields/);
  expect(summary).toHaveAttribute('role', 'alert');
  return summary;
};

/* The detail screen carries no status badge (#459 r33), so a status assertion goes to the
 * list's Status column — the one place the record's state is written. */
const backToList = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('link', { name: 'Back to Invoices' }));
const rowStatus = (filename: string) => {
  const row = screen.getByRole('link', { name: filename }).closest('tr')!;
  return within(row).getByText(/^(Uploading|Parsing|Needs review|Ready)$/).textContent;
};

describe('invoice flow prototype', () => {
  it('adds multiple selected files, including repeated filenames, without replacing rows', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow />);
    const input = screen.getByLabelText('Select invoices');
    await user.upload(input, [new File(['a'], 'one.pdf', { type: 'application/pdf' }), new File(['b'], 'two.pdf', { type: 'application/pdf' })]);
    expect(screen.getAllByText('Uploading')).toHaveLength(2);
    await user.upload(input, new File(['c'], 'one.pdf', { type: 'application/pdf' }));
    expect(screen.getAllByText('Uploading')).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: 'one.pdf' })).toHaveLength(2);
  });
  it('opens the picker from the button in the box, by pointer, Enter and Space', async () => {
    const user = userEvent.setup();
    const { container } = render(<InvoiceFlow />);
    const input = screen.getByLabelText<HTMLInputElement>('Select invoices');
    const opened = vi.spyOn(input, 'click').mockImplementation(() => {});
    /* The box holds a real button rather than claiming to be one. A region with role="button"
     * has presentational children, so conforming assistive technology drops the role of the
     * button standing in it, and a focusable box beside that button is the same action twice
     * in the tab order. why: react/src/FileDrop.tsx, guidelines/file-drop.md#offer-a-button-not-only-a-drag */
    const box = container.querySelector<HTMLElement>('.invoice-flow__drop')!;
    expect(box).not.toHaveAttribute('role');
    expect(box).not.toHaveAttribute('tabindex');
    const button = screen.getByRole('button', { name: 'Upload' });
    await user.click(button);
    // Once, not once per handler the click passes on its way out of the box.
    expect(opened).toHaveBeenCalledTimes(1);
    button.focus();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(opened).toHaveBeenCalledTimes(2);
    await user.keyboard(' ');
    expect(opened).toHaveBeenCalledTimes(3);
    // The box's own click survives as a pointer shortcut, the way the drag is.
    await user.click(box);
    expect(opened).toHaveBeenCalledTimes(4);
    opened.mockRestore();
  });
  it('gives the empty box the action, and says only what the button does not', () => {
    /* The empty state is asked for an action, and the file drop for the kit's own picker —
     * a small secondary button carrying the upload glyph, which is what `.ui-drop__row` puts
     * there — rather than a sentence describing the box.
     * why: guidelines/empty-states.md#explain-what-is-missing-and-show-the-next-step,
     * guidelines/file-drop.md#offer-a-button-not-only-a-drag
     * The sub-line is left with the one fact the button cannot carry: the types. Both states
     * of the box offer the same button, so the keyboard reaches the picker on either screen. */
    const { container, unmount } = render(<InvoiceFlow />);
    const empty = container.querySelector('.ui-empty')!;
    expect(within(empty as HTMLElement).getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(empty.querySelector('.ui-empty__sub')).toHaveTextContent('PDF, PNG or JPEG.');
    // No sentence hired to explain that the box is clickable or that a file can be dropped.
    expect(screen.queryByText(/click it|click this box|anywhere in this box/i)).not.toBeInTheDocument();
    unmount();
    render(<InvoiceFlow initialState="table" />);
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
  });
  it('rejects an unsupported drop and recovers with a valid batch', () => {
    const { container } = render(<InvoiceFlow />);
    const zone = container.querySelector('.invoice-flow__drop')!;
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['bad'], 'notes.txt')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('No files were added');
    fireEvent.drop(zone, { dataTransfer: { files: [new File(['a'], 'one.pdf'), new File(['b'], 'two.png')] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByText('Uploading')).toHaveLength(2);
  });
  it('opens a record, preserves a draft across the list and saves and undoes it', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    const supplier = screen.getByRole('textbox', { name: 'Supplier' });
    await user.clear(supplier); await user.type(supplier, 'Cedar Design Studio');
    await user.click(screen.getByRole('link', { name: 'Back to Invoices' }));
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Design Studio');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getByText('Cedar Studio')).toBeInTheDocument();
    await backToList(user);
    expect(rowStatus('cedar-1042.pdf')).toBe('Ready');
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Studio');
    await backToList(user);
    expect(rowStatus('cedar-1042.pdf')).toBe('Needs review');
  });
  it('undoes a save on a Ready invoice back to Ready, not to Needs review', async () => {
    // The record birch-208.pdf was Ready before the save, so undoing that save owes the
    // reader the status it had as well as the values.
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    expect(rowStatus('birch-208.pdf')).toBe('Ready');
    await user.click(screen.getByRole('link', { name: 'birch-208.pdf' }));
    const supplier = screen.getByRole('textbox', { name: 'Supplier' });
    await user.clear(supplier); await user.type(supplier, 'Birch Joinery');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Birch Workshop');
    await backToList(user);
    expect(rowStatus('birch-208.pdf')).toBe('Ready');
  });
  it('keeps the undo snapshot when a second save changes nothing', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'birch-208.pdf' }));
    await user.type(screen.getByRole('textbox', { name: 'Supplier' }), ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Birch Workshop');
    await backToList(user);
    expect(rowStatus('birch-208.pdf')).toBe('Ready');
  });
  it('undoes unsaved edits and validates required fields and positive totals', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="editing" />);
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Studio');
    await user.clear(screen.getByRole('textbox', { name: 'Supplier' }));
    await user.clear(screen.getByRole('spinbutton', { name: 'Total (EUR)' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Total (EUR)' })).toHaveAttribute('aria-invalid', 'true');
    expect(summaryAlert()).toHaveTextContent('Check the highlighted fields');
  });
  /* 0.001 is finite and above zero, which was the whole of the old test, and the list
   * writes the amount to the cent — so the record became Ready at EUR 0.00. The field
   * already declared min 0.01 and step 0.01; the save path now holds the same limits,
   * counted in cents, so 131072.021 is refused for the same reason 0.001 is.
   * Limit: these are written amounts, not every string Chromium will hold — an amount in
   * exponent notation is refused, and no case here covers that. */
  it.each(['0.001', '0', '131072.021'])('refuses the total %s and writes nothing to the record', async amount => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    const total = screen.getByRole('spinbutton', { name: 'Total (EUR)' });
    await user.clear(total); await user.type(total, amount);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByText('Saved for this session.')).not.toBeInTheDocument();
    expect(total).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter an amount of 0.01 or more, written to the cent.')).toBeInTheDocument();
    expect(summaryAlert()).toHaveTextContent('Check the highlighted fields');
    // The floor the save path enforces is the one the field advertises, from one constant.
    expect(total).toHaveAttribute('min', '0.01');
    expect(total).toHaveAttribute('step', '0.01');
    await backToList(user);
    // Nothing was written: the row keeps the parsed amount and the status it came with.
    expect(rowStatus('cedar-1042.pdf')).toBe('Needs review');
    expect(screen.queryByText('\u20ac0.00')).not.toBeInTheDocument();
  });
  /* 0.07 * 100 is 7.000000000000001, so a strict equality on cents rejects it; the fixed
   * tolerance that let 0.07 through then rejected 131072.02, whose product misses a whole
   * cent by 1.9e-9. Counting digits makes the amount's size irrelevant, which is what the
   * last two rows measure — the field sets no max, and a nine-figure total's cents are an
   * exact integer five orders of magnitude clear of Number.MAX_SAFE_INTEGER. Each listed
   * amount is written out, so the test cannot agree with a wrong one through the formatter. */
  it.each([
    ['0.01', '\u20ac0.01'],
    ['0.07', '\u20ac0.07'],
    ['131072.02', '\u20ac131,072.02'],
    ['99999999.99', '\u20ac99,999,999.99'],
  ])('saves the cent amount %s and lists it as %s', async (amount, listed) => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    const total = screen.getByRole('spinbutton', { name: 'Total (EUR)' });
    await user.clear(total); await user.type(total, amount);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    expect(total).not.toHaveAttribute('aria-invalid', 'true');
    await backToList(user);
    expect(rowStatus('cedar-1042.pdf')).toBe('Ready');
    expect(screen.getByText(listed)).toBeInTheDocument();
  });
  it('withdraws the saved line when the next save is rejected', async () => {
    /* A save line is the one thing a reviewer trusts; it may not report a save that failed.
     * With the status badge gone, the standing edits show in the action the row offers:
     * Discard, not Undo. */
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    await user.type(screen.getByRole('textbox', { name: 'Supplier' }), ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await user.clear(screen.getByRole('textbox', { name: 'Supplier' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.queryByText('Saved for this session.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
    expect(summaryAlert()).toHaveTextContent('Check the highlighted fields');
  });
  it('stands the rejected-save summary off the buttons by the step the fields use', async () => {
    /* The summary carried no class and so no margin, which left it flush on Save.
     * The step is compared with the one the fields set below themselves rather than matched
     * on its own: a sheet that moves the form's step and leaves the summary behind fails.
     * Limit: vitest applies no imported CSS in jsdom, so the rule is read from the sheet as
     * text and the rendered gap is measured in a browser, by hand, not here. */
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="review" />);
    await user.clear(screen.getByRole('textbox', { name: 'Supplier' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(summaryAlert()).toHaveClass('invoice-flow__summary');
    const stepOf = (rule: RegExp, what: string) => {
      const found = rule.exec(SHEET);
      expect(found, `${what} sets its bottom margin from a --space token`).not.toBeNull();
      return found![1];
    };
    const fields = stepOf(/\.invoice-flow__fields\s*\{[^}]*margin:\s*0 0 var\((--space-\d+)\)/, 'the field grid');
    const summary = stepOf(/\.invoice-flow__summary\s*\{[^}]*margin:\s*0 0 var\((--space-\d+)\)/, 'the summary');
    expect(summary, `the summary (${summary}) takes the form's own step (${fields})`).toBe(fields);
  });
  it('clears the saved line on the next edit, not on the next save', async () => {
    /* The line says the values on screen are the saved ones. An edit makes that false at
     * once, and waiting for the next save left "Saved for this session." standing above a
     * changed form beside Discard. Each of the three transient lines goes the same way. */
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    const supplier = screen.getByRole('textbox', { name: 'Supplier' });
    await user.type(supplier, ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved for this session.')).toBeInTheDocument();
    await user.type(supplier, ' II');
    expect(screen.queryByText('Saved for this session.')).not.toBeInTheDocument();
    // The record is untouched by the edit, so Undo still has the save to undo.
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByText('Edits discarded.')).toBeInTheDocument();
    await user.type(supplier, '!');
    expect(screen.queryByText('Edits discarded.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByText('Last save undone.')).toBeInTheDocument();
    await user.type(supplier, '?');
    expect(screen.queryByText('Last save undone.')).not.toBeInTheDocument();
  });
  it('leaves the review screen without a per-field provenance tier or a status badge', () => {
    /* Artur refused all five in round r32: the accent bar over every field, the "As parsed"
     * sub-line under every value, the sentence explaining the bar, the "Needs review" badge
     * and Undo drawn as a text link. The fields carry labels, values and errors only, and
     * the record's status is written once, in the list. */
    const { container } = render(<InvoiceFlow initialState="review" />);
    expect(container.querySelector('.invoice-flow__field')).toBeNull();
    expect(container.querySelector('[data-parsed]')).toBeNull();
    expect(screen.queryByText('As parsed')).not.toBeInTheDocument();
    expect(screen.queryByText(/accent bar/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveClass('ui-btn--secondary');
    // The kit's hint slot is what carried "As parsed"; no field may reclaim it.
    expect(container.querySelectorAll('.ui-field__hint')).toHaveLength(0);
  });

  /* The other half of that removal, held in the sheet rather than the markup. The bars were
   * accent LINES, which is the one thing the kit's shared accent judgement forbids, and no
   * gate reached this file to say so. This is that gate, and it also holds the accent that
   * replaced them: ink on the saved pane's own name, which is where
   * guidelines/density-and-accents.md#follow-the-consequence puts the accent of a pair that
   * shows a source beside the values a save writes. */
  it('paints the accent as ink on the saved pane\u2019s name, never as a line', () => {
    expect(SHEET, 'the showcase ships a sheet beside the story').toContain('.invoice-flow');
    /* One accent line is allowed, and only one: the drop box while a file is over it. The
     * kit draws its own drop target the same way — `.ui-drop__target` in
     * src/styles/file-drop.css and `.ui-file.is-dragging` in Field.css both take a dashed
     * or solid accent edge — so echoing it is the kit's pattern, not an offence. Naming it
     * here is what stops a second line hiding behind the exception. */
    expect(accentLines(SHEET), 'the drag state is the only line drawn from the accent')
      .toEqual([{ property: 'border-color', value: 'var(--accent)' }]);
    expect(SHEET).toMatch(/\.invoice-flow__drop\.is-dragging\s*\{\s*border-color:\s*var\(--accent\)/);
    const withoutDragState = SHEET.replace(/\.invoice-flow__drop\.is-dragging\s*\{[^}]*\}/g, '');
    expect(accentOffences(withoutDragState, 'InvoiceFlow.css')).toEqual([]);
    // The saved pane leads and is the wider column; the source gets neither, nor the accent.
    expect(SHEET).toMatch(/\.invoice-flow__data\s*>\s*\.ui-card__title\s*\{[^}]*color:\s*var\(--accent\)/);
    expect(SHEET).not.toMatch(/\.invoice-flow__preview[^{]*\{[^}]*var\(--accent/);
    /* The saved values take the wider track. Held as the two numbers rather than as a
       string, so a sheet that swaps them — the inversion the r36 review measured at 1.41
       the document's way — fails here. */
    const tracks = /\.invoice-flow__columns\s*\{[^}]*grid-template-columns:\s*minmax\(0, (\d+)fr\) minmax\(0, (\d+)fr\)/.exec(SHEET);
    expect(tracks, 'the pane pair sets two fr tracks').not.toBeNull();
    expect(Number(tracks![1]), 'the saved pane takes the wider track').toBeGreaterThan(Number(tracks![2]));
  });
  it('sets each saved value heavier than its label, and leaves the source at neither', () => {
    /* The fourth of the four marks follow-the-consequence asks for; the pane order, the
     * wider column and the accent are held above. A bare .ui-input inherits normal while the
     * kit's field label is medium, so without a rule here the data read lighter than the
     * words naming it. Compared as numbers from the kit's tokens: a string match would pass
     * a sheet that set the value one step lighter. */
    const label = weightOf(KIT_INPUT, /\.ui-field__label\s*\{[^}]*font-weight:\s*var\((--weight-[a-z]+)\)/, 'the kit field label');
    const value = weightOf(SHEET, /\.invoice-flow__fields\s+\.ui-input\s*\{[^}]*font-weight:\s*var\((--weight-[a-z]+)\)/, 'the saved value');
    expect(value, `a saved value (${value}) outweighs its label (${label})`).toBeGreaterThan(label);
    // The source document is the quieter pane: it takes none of the four marks, weight included.
    expect(SHEET).not.toMatch(/\.invoice-flow__(?:preview|paper)[^{]*\{[^}]*font-weight:\s*var\(--weight-(?:semibold|bold)\)/);
  });
  it('shows a document that can disagree with the parsed data', () => {
    // The whole point of the two columns: the preview is the document, not the form again.
    render(<InvoiceFlow initialState="review" />);
    const paper = screen.getByRole('article');
    expect(within(paper).getByText('Total due')).toBeInTheDocument();
    expect(within(paper).getByText('€1,704.00')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Total (EUR)' })).toHaveValue(1740);
    expect(within(paper).queryByText('€1,740.00')).not.toBeInTheDocument();
    /* r36: the reference carries what is checked against the form and nothing else. The
       payment-terms sentence is a fine-print line beside a block of figures, which Artur
       rejects on sight, and "Bill to" names the reader's own company — neither is compared,
       and together they were 1/3 of the pane's height. */
    expect(within(paper).queryByText(/Payment due within/)).not.toBeInTheDocument();
    expect(within(paper).queryByText('Bill to')).not.toBeInTheDocument();
    // Still a document: the four facts a reviewer does compare are all on it.
    for (const fact of ['Cedar Studio', 'INV-1042', '18 September 2026', '€1,704.00']) {
      expect(within(paper).getByText(fact), `the document still states ${fact}`).toBeInTheDocument();
    }
  });
  it('keeps drafts separate between invoices', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="editing" />);
    await user.click(screen.getByRole('link', { name: 'Back to Invoices' }));
    await user.click(screen.getByRole('link', { name: 'birch-208.pdf' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Birch Workshop');
  });
  it('announces simulated parsing, then makes the data editable', async () => {
    render(<InvoiceFlow initialState="uploading" simulate />);
    expect(screen.getByRole('region', { name: 'Invoice data' })).toHaveAttribute('aria-busy', 'true');
    await waitFor(() => expect(screen.getByText('Reading invoice…')).toBeInTheDocument(), { timeout: 2500 });
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Supplier' })).toBeInTheDocument(), { timeout: 2500 });
  });
  it('shows the document while the data is still being read', () => {
    // The loading state is only honest if the right column has something the left has not.
    render(<InvoiceFlow initialState="parsing" />);
    expect(screen.getByText('Reading invoice…')).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getByText('Cedar Studio')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Supplier' })).not.toBeInTheDocument();
  });

  /* ------------------------------------------------------------------ r36 --
   * Three rules Artur set at r36: the picker is the kit's drop-row button, a button
   * says one or two words, and a showcase's sheet may place kit parts but never
   * restyle or re-implement them. The kit-wide gate for the third is #601; this is
   * the half that holds this prototype. */

  it('gives the picker the kit’s drop-row shape — small, secondary, upload glyph', () => {
    /* Artur, r36: "The picker is the kit's small secondary button (with the upload glyph,
     * as the kit's drop row), not a filled primary." The kit's own FileDrop writes
     * `<Button size="sm" icon="upload">`, and `secondary` is Button's own default, so a
     * `variant="primary"` put back on this control fails here.
     * Limit: the classes are asserted, not the paint — jsdom applies no stylesheet. */
    const { container, unmount } = render(<InvoiceFlow initialState="table" />);
    for (const where of ['the list screen', 'the empty screen']) {
      const picker = screen.getByRole('button', { name: 'Upload' });
      expect(picker, `${where}: the picker is small`).toHaveClass('ui-btn--sm');
      expect(picker, `${where}: the picker is secondary`).toHaveClass('ui-btn--secondary');
      expect(picker, `${where}: the picker is not filled`).not.toHaveClass('ui-btn--primary');
      expect(picker.querySelector('svg'), `${where}: the picker carries a glyph`).not.toBeNull();
      if (where === 'the list screen') {
        // The row at rest is the kit's, so the types beside the button are .ui-drop__note.
        expect(container.querySelector('.ui-drop__row')).toContainElement(picker);
        expect(container.querySelector('.ui-drop__note')).toHaveTextContent('PDF, PNG or JPEG.');
        unmount();
        render(<InvoiceFlow initialState="empty" />);
      }
    }
  });

  it('spends one word on every button, and names the two that keep a second', () => {
    /* Artur, r36: "3 word buttons - ai slop" — a button says one or two words, and a
     * second word has to be earned. Every screen this showcase renders is walked, and the
     * exceptions are listed by the word that earns them rather than by a count, so a new
     * three-word label fails whatever else changes.
     * Limit: a filename is a record's name, not a label, so the list's identity links are
     * not buttons here — they are links, which this walk does not reach. */
    const EARNED: Record<string, string> = {
      // "Finish" alone does not say what ends, and the pane it sits in is mid-parse.
      'Finish parsing': 'the verb needs its object: the demo finishes the parse, not the invoice',
      // The kit's own control, with its shortcut. Its skip link and its fold button are
      // a link and a two-word label, so neither needs naming here.
      'Search or run a command\u2026Ctrl K': 'the kit\u2019s own command-palette trigger, with its shortcut',
    };
    const seen = new Map<string, number>();
    for (const state of ['empty', 'table', 'review', 'editing', 'ready', 'uploading', 'parsing', 'error'] as const) {
      const { unmount } = render(<InvoiceFlow initialState={state} />);
      for (const button of screen.queryAllByRole('button')) {
        const label = (button.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (label) seen.set(label, (seen.get(label) ?? 0) + 1);
      }
      unmount();
    }
    expect(seen.size, 'the walk reached the showcase’s buttons').toBeGreaterThan(4);
    const long = [...seen.keys()].filter(label => label.split(' ').length > 2 && !(label in EARNED));
    expect(long, 'every button says one or two words').toEqual([]);
    // Each listed exception is really on screen, so the list cannot outlive the button.
    for (const label of Object.keys(EARNED)) expect(seen.has(label), `${label} is still rendered`).toBe(true);
  });

  it('keeps the sheet to layout glue: nothing in it repaints or re-ranks a kit part', () => {
    /* Artur, r36: "If in showcases you overwrites or makes a lot of css - you failed to use
     * the kit. Showcases are to demonstrate the power of the kit, not to make shadow kit."
     * So: no rule in this sheet may paint a ground, cast a rung, or set a type ramp, and a
     * rule that names a kit class may declare only the two marks
     * guidelines/density-and-accents.md#follow-the-consequence asks for and the kit has no
     * class to carry. The kit-wide version of this check is #601.
     * Limit: it reads the sheet, so a declaration written inline in the component, or a kit
     * class used for a job it was not drawn for, is outside it. */
    const rules = leafRules(SHEET) as { selector: string; decls: { prop: string; value: string }[] }[];
    expect(rules.length, 'the sheet parses into rules').toBeGreaterThan(5);

    // A ground, a rung or a type ramp is the kit's to set, wherever the rule points.
    const BANNED = /^(background|background-color|box-shadow|font-size|font-family|letter-spacing|line-height|text-shadow)$/;
    const paints = rules.flatMap(({ selector, decls }) =>
      decls.filter(d => BANNED.test(d.prop)).map(d => `${selector} { ${d.prop} }`));
    expect(paints, 'the sheet paints no ground and sets no type ramp').toEqual([]);
    expect(SHEET, 'the kit owns the entrances; .m-slide-up is the one this screen uses')
      .not.toMatch(/@keyframes/);
    /* And the kit's reduced-motion net is global and `!important`, so a sheet that restates
     * it is restating a guarantee it already has. why: src/styles/reduced-motion.css */
    expect(SHEET).not.toMatch(/prefers-reduced-motion/);

    // What a rule aimed at a kit class is allowed to say, and why each one is allowed.
    const MARKS: Record<string, string> = {
      '.invoice-flow__data > .ui-card__title|color': 'follow-the-consequence puts the pair’s accent on the saved pane’s name',
      '.invoice-flow__fields .ui-input|font-weight': 'follow-the-consequence makes a saved value outweigh its label',
    };
    const offences = rules.flatMap(({ selector, decls }) => selector.includes('.ui-')
      ? decls.filter(d => !(`${selector}|${d.prop}` in MARKS)).map(d => `${selector} { ${d.prop} }`)
      : []);
    expect(offences, 'a rule naming a kit class declares only a mark the guideline asks for').toEqual([]);
    // The marks are listed by selector, so each must still be in the sheet.
    for (const key of Object.keys(MARKS)) {
      const [selector, prop] = key.split('|');
      expect(rules.some(r => r.selector === selector && r.decls.some(d => d.prop === prop)),
        `${selector} still sets ${prop}`).toBe(true);
    }
  });
});
