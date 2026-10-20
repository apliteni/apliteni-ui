import { act, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
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
  /* The empty page's input sits inside the kit's drop area and carries no label of its own:
   * the Upload button beside it is what names the action. */
  const emptyInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;
  it('adds multiple selected files, including repeated filenames, without replacing rows', async () => {
    const user = userEvent.setup();
    const { container } = render(<InvoiceFlow />);
    fireEvent.change(emptyInput(container), { target: { files: [new File(['a'], 'one.pdf', { type: 'application/pdf' }), new File(['b'], 'two.pdf', { type: 'application/pdf' })] } });
    expect(screen.getAllByText('Uploading')).toHaveLength(2);
    await user.upload(screen.getByLabelText('Select invoices'), new File(['c'], 'one.pdf', { type: 'application/pdf' }));
    expect(screen.getAllByText('Uploading')).toHaveLength(3);
    expect(screen.getAllByRole('link', { name: 'one.pdf' })).toHaveLength(2);
  });
  it('opens the picker from the button in the drop area, by pointer, Enter and Space', async () => {
    const user = userEvent.setup();
    const { container } = render(<InvoiceFlow />);
    const input = emptyInput(container);
    const opened = vi.spyOn(input, 'click').mockImplementation(() => {});
    /* The area holds a real button rather than claiming to be one. A region with role="button"
     * has presentational children, so conforming assistive technology drops the role of the
     * button standing in it, and a focusable box beside that button is the same action twice
     * in the tab order. why: react/src/FileDrop.tsx, guidelines/file-drop.md#offer-a-button-not-only-a-drag */
    const box = container.querySelector<HTMLElement>('.ui-drop--area')!;
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
  it('gives the empty page the kit drop area, and says only what the button does not', () => {
    /* The empty state is asked for an action, and the area for the kit's own picker button,
     * rather than a sentence describing the box.
     * why: guidelines/empty-states.md#explain-what-is-missing-and-show-the-next-step,
     * guidelines/file-drop.md#offer-a-button-not-only-a-drag
     * The sub-line is left with the one fact the button cannot carry: the types. The list
     * page offers the same button, so the keyboard reaches the picker on either screen. */
    const { container, unmount } = render(<InvoiceFlow />);
    const empty = container.querySelector('.ui-drop--area .ui-empty')!;
    expect(within(empty as HTMLElement).getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    expect(empty.querySelector('.ui-empty__sub')).toHaveTextContent('PDF, PNG or JPEG.');
    // No sentence hired to explain that the box is clickable or that a file can be dropped.
    expect(screen.queryByText(/click it|click this box|anywhere in this box/i)).not.toBeInTheDocument();
    // The empty page keeps its dashed area and carries no whole-page layer.
    expect(container.querySelector('.ui-drop--page')).toBeNull();
    unmount();
    render(<InvoiceFlow initialState="table" />);
    expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
  });
  it('rejects an unsupported drop on the area and recovers with a valid batch', () => {
    const { container } = render(<InvoiceFlow />);
    const zone = container.querySelector('.ui-drop--area')!;
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [new File(['bad'], 'notes.txt')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('No files were added');
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], files: [new File(['a'], 'one.pdf'), new File(['b'], 'two.png')] } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByText('Uploading')).toHaveLength(2);
  });
  /* A file dragged over the list dims the page under a card and a drop anywhere adds it. The events are
   * dispatched on the window, as the browser sends them for a file from outside the page.
   * Limit: jsdom lays nothing out, so that the layer covers the page and that no row reads
   * across the card are measured in a browser. The drag itself is simulated, not a real operating-system drag. */
  const windowDrag = (type: string, files: File[] = [], types = ['Files']) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { types, files } });
    Object.defineProperty(event, 'relatedTarget', { value: null });
    act(() => { window.dispatchEvent(event); });
    return event;
  };
  it('covers the list page while a file is dragged over it and adds what is dropped anywhere', () => {
    const { container } = render(<InvoiceFlow initialState="table" />);
    expect(container.querySelector('.ui-drop--page')).toBeNull();
    windowDrag('dragenter');
    const layer = container.querySelector('.ui-drop--page')!;
    expect(layer).toHaveTextContent('Drop files to upload');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    windowDrag('drop', [new File(['a'], 'one.pdf'), new File(['b'], 'two.jpg')]);
    expect(container.querySelector('.ui-drop--page')).toBeNull();
    expect(screen.getAllByText('Uploading').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('link', { name: 'one.pdf' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'two.jpg' })).toBeInTheDocument();
  });
  it('refuses an unsupported file dropped on the list page and adds nothing', () => {
    render(<InvoiceFlow initialState="table" />);
    windowDrag('dragenter');
    windowDrag('drop', [new File(['bad'], 'notes.txt')]);
    expect(screen.getByRole('alert')).toHaveTextContent('No files were added');
    expect(screen.queryByRole('link', { name: 'notes.txt' })).not.toBeInTheDocument();
  });
  it('holds the message on an opaque card, so no row of a long list reads across it', () => {
    /* D1 of the #459 designer review: at the page ground's 90% the rows behind the layer still
     * showed at 1.2:1 and crossed the glyph and the line. The card is the kit's own and takes
     * the surface in full, so the message sits on paint whatever the list behind it holds. */
    const { container } = render(<InvoiceFlow initialState="table" />);
    windowDrag('dragenter');
    const card = container.querySelector('.ui-drop--page > .ui-card')!;
    expect(card.querySelector('.ui-empty__icon svg')).not.toBeNull();
    expect(card.querySelector('.ui-empty__title')).toHaveTextContent('Drop files to upload');
    // One glyph and one line: no button, no second line.
    expect(card.querySelector('.ui-empty__sub, .ui-empty__actions')).toBeNull();
    const rule = /\.ui-card\s*\{([^}]*)\}/.exec(readFileSync(path.join(process.cwd(), '../src/styles/card.css'), 'utf8'))?.[1] ?? '';
    expect(rule).toMatch(/background:\s*var\(--surface\)\s*;/);
  });
  it('shows no layer for text or a link dragged over the page, and none on a record', async () => {
    const user = userEvent.setup();
    const { container } = render(<InvoiceFlow initialState="table" />);
    windowDrag('dragenter', [], ['text/plain']);
    expect(container.querySelector('.ui-drop--page')).toBeNull();
    // Adding files is a list action: a record open for review has no layer to drop on.
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    windowDrag('dragenter');
    expect(container.querySelector('.ui-drop--page')).toBeNull();
  });
  it('ends the layer when the pointer leaves the window, on Escape and when the drag ends', () => {
    const { container } = render(<InvoiceFlow initialState="table" />);
    const layer = () => container.querySelector('.ui-drop--page');
    windowDrag('dragenter');
    windowDrag('dragleave');
    expect(layer()).toBeNull();
    windowDrag('dragenter');
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(layer()).toBeNull();
    windowDrag('dragenter');
    windowDrag('dragend');
    expect(layer()).toBeNull();
  });
  it('adds a file dropped on the empty page\'s area once, with no layer to add it again', () => {
    const { container } = render(<InvoiceFlow />);
    fireEvent.drop(container.querySelector('.ui-drop--area')!, { dataTransfer: { types: ['Files'], files: [new File(['a'], 'one.pdf')] } });
    expect(screen.getAllByText('Uploading')).toHaveLength(1);
  });
  it('keeps the Upload button as the keyboard way to add files to the list', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    const input = screen.getByLabelText<HTMLInputElement>('Select invoices');
    const opened = vi.spyOn(input, 'click').mockImplementation(() => {});
    screen.getByRole('button', { name: 'Upload' }).focus();
    await user.keyboard('{Enter}');
    expect(opened).toHaveBeenCalledTimes(1);
    opened.mockRestore();
  });
  it('opens a record, preserves a draft across the list and saves it', async () => {
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    const supplier = screen.getByRole('textbox', { name: 'Supplier' });
    await user.clear(supplier); await user.type(supplier, 'Cedar Design Studio');
    await user.click(screen.getByRole('link', { name: 'Back to Invoices' }));
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Design Studio');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(within(screen.getByRole('article')).getByText('Cedar Studio')).toBeInTheDocument();
    await backToList(user);
    expect(rowStatus('cedar-1042.pdf')).toBe('Ready');
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    expect(screen.getByRole('textbox', { name: 'Supplier' })).toHaveValue('Cedar Design Studio');
  });
  it('discards unsaved edits and validates required fields and positive totals', async () => {
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
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
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
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(total).not.toHaveAttribute('aria-invalid', 'true');
    await backToList(user);
    expect(rowStatus('cedar-1042.pdf')).toBe('Ready');
    expect(screen.getByText(listed)).toBeInTheDocument();
  });
  it('raises no toast when the next save is rejected', async () => {
    /* A rejected save may not report a save that did not happen. The standing edits show in
     * the action the row offers: Discard. */
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    await user.type(screen.getByRole('textbox', { name: 'Supplier' }), ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: 'Supplier' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    // The rejected save raised no second toast: the one on screen is the earlier save's.
    expect(screen.getAllByText('Saved')).toHaveLength(1);
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
  it('keeps the toast through an edit and clears the other lines on the next edit', async () => {
    /* The toast says a save happened, which stays true after an edit, so it stays. The
     * line that describes the values on screen goes with the next edit. */
    const user = userEvent.setup();
    render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'cedar-1042.pdf' }));
    const supplier = screen.getByRole('textbox', { name: 'Supplier' });
    await user.type(supplier, ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    await user.type(supplier, ' II');
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByText('Edits discarded.')).toBeInTheDocument();
    await user.type(supplier, '!');
    expect(screen.queryByText('Edits discarded.')).not.toBeInTheDocument();
  });
  it('leaves the review screen without a per-field provenance tier or a status badge', () => {
    /* The review screen omits the per-field accent bar, "As parsed" line, bar explanation,
     * "Needs review" badge and every Undo. The list states the record status once. */
    const { container } = render(<InvoiceFlow initialState="review" />);
    expect(container.querySelector('.invoice-flow__field')).toBeNull();
    expect(container.querySelector('[data-parsed]')).toBeNull();
    expect(screen.queryByText('As parsed')).not.toBeInTheDocument();
    expect(screen.queryByText(/accent bar/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Needs review')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toHaveClass('ui-btn--secondary');
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    // The kit's hint slot is what carried "As parsed"; no field may reclaim it.
    expect(container.querySelectorAll('.ui-field__hint')).toHaveLength(0);
  });

  it('keeps the data column wider and draws no accent of its own', () => {
    expect(SHEET, 'the showcase ships a sheet beside the story').toContain('.invoice-flow');
    /* The sheet draws no line from the accent: the drop area's accent edge while a file is
     * over it is the kit's own, in src/styles/file-drop.css. */
    expect(accentLines(SHEET), 'the sheet draws nothing from the accent').toEqual([]);
    expect(accentOffences(SHEET, 'InvoiceFlow.css')).toEqual([]);
    // The saved pane leads and is the wider column; the source gets neither, nor the accent.
    expect(SHEET).not.toMatch(/\.invoice-flow__preview[^{]*\{[^}]*var\(--accent/);
    /* The saved values take the wider track. Held as the two numbers rather than as a
       string, so a sheet that swaps them — the inversion the r36 review measured at 1.41
       the document's way — fails here. */
    const tracks = /\.invoice-flow__columns\s*\{[^}]*grid-template-columns:\s*minmax\(0, (\d+)fr\) minmax\(0, (\d+)fr\)/.exec(SHEET);
    expect(tracks, 'the pane pair sets two fr tracks').not.toBeNull();
    expect(Number(tracks![1]), 'the saved pane takes the wider track').toBeGreaterThan(Number(tracks![2]));
  });
  it('keeps the record form in two columns down to the phone, as Artur approved', () => {
    /* D2 of the #459 designer review. A fluid track, repeat(auto-fit, minmax(15rem, 1fr)),
     * fits one 15rem column in the 468 px card at 834 px and 444 px at 600 px, so the form
     * went to one column at iPad width and Save moved 201 px down. The approved layout is two
     * equal columns above the phone breakpoint, held here as the declarations rather than as a
     * measurement because jsdom lays nothing out; the browser measurement is in the PR. */
    const fields = /\.invoice-flow__fields\s*\{([^}]*)\}/.exec(SHEET)?.[1] ?? '';
    expect(fields).toMatch(/grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
    expect(fields).not.toMatch(/auto-fit|auto-fill/);
    const phone = /@media \(max-width: 560px\)\s*\{([^@]*)\}/.exec(SHEET)?.[1] ?? '';
    expect(phone).toMatch(/\.invoice-flow__fields\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
    // No other rule narrows the form between the phone and the desktop.
    expect(SHEET.match(/\.invoice-flow__fields/g)).toHaveLength(2);
  });
  it('shows a document that can disagree with the parsed data', () => {
    // The whole point of the two columns: the preview is the document, not the form again.
    render(<InvoiceFlow initialState="review" />);
    const paper = screen.getByRole('article');
    expect(within(paper).getByText('Total due')).toBeInTheDocument();
    expect(within(paper).getByText('€1,704.00')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Total (EUR)' })).toHaveValue(1740);
    expect(within(paper).queryByText('€1,740.00')).not.toBeInTheDocument();
    /* The reference shows the facts checked against the form. Payment terms and "Bill to"
       are outside that comparison. */
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
  it.each([
    ['uploading', 'Adding invoice…', 'Adding invoice cedar-1042.pdf.'],
    ['parsing', 'Reading invoice…', 'Reading invoice cedar-1042.pdf.'],
  ] as const)('B2: the %s pane states no preset sentence and announces the pending state', (state, title, announced) => {
    const { container } = render(<InvoiceFlow initialState={state} />);
    const pane = screen.getByRole('region', { name: 'Invoice data' });
    expect(within(pane).getByText(title)).toBeInTheDocument();
    // EmptyState's first-run sentence says new items appear when they need attention, which is not what a file being read means.
    expect(pane.querySelector('.ui-empty__sub')).toBeNull();
    expect(screen.queryByText(/New items will appear here/)).not.toBeInTheDocument();
    const status = container.querySelector('[role="status"]')!;
    expect(status).toHaveTextContent(announced);
    // Read, not seen: the line is the kit's clipped text, so it takes no room in the page.
    expect(status).toHaveClass('ui-sr');
  });
  it('B2: the status line follows the parser from uploading to reading', async () => {
    const { container } = render(<InvoiceFlow initialState="uploading" simulate />);
    expect(container.querySelector('[role="status"]')).toHaveTextContent('Adding invoice cedar-1042.pdf.');
    await waitFor(() => expect(container.querySelector('[role="status"]')).toHaveTextContent('Reading invoice cedar-1042.pdf.'), { timeout: 2500 });
  });
  it('B3: the Document pane adds no weight of its own to the total or the descriptions', () => {
    render(<InvoiceFlow initialState="review" />);
    const paper = screen.getByRole('article');
    // The saved values and their labels carry the weight; the source document carries none.
    expect(paper.querySelector('.ui-table__num--strong')).toBeNull();
    expect(paper.querySelector('.ui-table__title')).toBeNull();
    expect(within(paper).getByText('\u20ac1,704.00')).toBeInTheDocument();
    expect(within(paper).getByText('Brand identity refresh')).toBeInTheDocument();
  });
  it('B4: Save puts its confirmation in the kit toast, outside the page flow, with no Undo', async () => {
    const user = userEvent.setup();
    const { container } = render(<InvoiceFlow initialState="table" />);
    await user.click(screen.getByRole('link', { name: 'birch-208.pdf' }));
    const siblings = () => Array.from(container.querySelector('.invoice-flow__columns')!.parentElement!.children).map(node => node.className + node.tagName);
    const layout = siblings();
    await user.type(screen.getByRole('textbox', { name: 'Supplier' }), ' Ltd');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const toast = document.querySelector<HTMLElement>('.ui-toast-stack .ui-toast')!;
    expect(toast).toHaveTextContent('Saved');
    expect(toast.closest('.ui-toast-stack')!.parentElement).toBe(document.body);
    expect(container.contains(toast)).toBe(false);
    // No line was added above the panes, so nothing under the pointer moved.
    expect(siblings()).toEqual(layout);
    expect(container.querySelector('[role="status"]')).toBeEmptyDOMElement();
    // A save is not destructive, so the toast offers only Dismiss and the form only Save and Discard.
    expect(toast.querySelector('.ui-toast__action')).toBeNull();
    expect(within(toast).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(['Dismiss']);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    const form = within(screen.getByRole('region', { name: 'Invoice data' }));
    expect(form.getAllByRole('button').map(button => button.textContent)).toEqual(['Save', 'Discard']);
    await backToList(user);
    expect(rowStatus('birch-208.pdf')).toBe('Ready');
  });
  it('mutes the title of the Document block through the kit class and leaves the data title alone', () => {
    render(<InvoiceFlow initialState="review" />);
    expect(screen.getByRole('heading', { name: 'Document' })).toHaveClass('ui-card__title', 'ui-card__title--muted');
    expect(screen.getByRole('heading', { name: 'Invoice data' })).not.toHaveClass('ui-card__title--muted');
  });

  /* The picker uses the kit's drop-row button. Buttons use one or two words.
   * The showcase places kit parts without restyling them. The kit-wide gate for
   * that rule is #601. */

  it('uses primary Upload only on the empty screen and keeps the list picker secondary', () => {
    // Class checks cannot measure browser paint or the system picker.
    for (const state of ['empty', 'table'] as const) {
      const { container, unmount } = render(<InvoiceFlow initialState={state} />);
      const picker = screen.getByRole('button', { name: 'Upload' });
      expect(picker).toHaveClass('ui-btn--sm');
      expect(picker).toHaveClass(state === 'empty' ? 'ui-btn--primary' : 'ui-btn--secondary');
      expect(picker).not.toHaveClass(state === 'empty' ? 'ui-btn--secondary' : 'ui-btn--primary');
      expect(picker.querySelector('svg')).not.toBeNull();
      expect(container.querySelector(state === 'empty' ? '.ui-empty__actions' : '.ui-drop__row')).toContainElement(picker);
      unmount();
    }
  });

  it('keeps button labels short and names the command-palette exception', () => {
    /* A button uses one or two words. Every screen this showcase renders is walked, and the
     * exceptions are listed by the word that earns them rather than by a count, so a new
     * three-word label fails whatever else changes.
     * Limit: a filename is a record's name, not a label, so the list's identity links are
     * not buttons here — they are links, which this walk does not reach. The
     * shell's short phone label is hidden from assistive technology. */
    const EARNED: Record<string, string> = {
      // The kit's own control, with its shortcut. Its skip link and its fold button are
      // a link and a two-word label, so neither needs naming here.
      'Search or run a command\u2026Ctrl K': 'the kit\u2019s own command-palette trigger, with its shortcut',
    };
    const seen = new Map<string, number>();
    for (const state of ['empty', 'table', 'review', 'editing', 'ready', 'uploading', 'parsing', 'error'] as const) {
      const { unmount } = render(<InvoiceFlow initialState={state} />);
      for (const button of screen.queryAllByRole('button')) {
        const copy = button.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove());
        const label = (copy.textContent ?? '').replace(/\s+/g, ' ').trim();
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
    // This source check cannot detect inline styles or measure browser paint.
    const rules = leafRules(SHEET) as { selector: string; decls: { prop: string; value: string }[] }[];
    expect(rules.length, 'the sheet parses into rules').toBeGreaterThan(5);

    // A ground, an edge, a rung or a type ramp is the kit's to set, wherever the rule points.
    const BANNED = /^(background|background-color|box-shadow|font-size|font-family|letter-spacing|line-height|text-shadow|border|outline)(-.+)?$/;
    const paints = rules.flatMap(({ selector, decls }) =>
      decls.filter(d => BANNED.test(d.prop)).map(d => `${selector} { ${d.prop} }`));
    expect(paints, 'the sheet paints no ground and sets no type ramp').toEqual([]);
    expect(SHEET, 'the kit owns the entrances; .m-slide-up is the one this screen uses')
      .not.toMatch(/@keyframes/);
    /* And the kit's reduced-motion net is global and `!important`, so a sheet that restates
     * it is restating a guarantee it already has. why: src/styles/reduced-motion.css */
    expect(SHEET).not.toMatch(/prefers-reduced-motion/);

    const overrides = rules.filter(({ selector }) => selector.includes('.ui-'));
    expect(overrides, 'the showcase does not override kit classes').toEqual([]);
    expect(SHEET).not.toMatch(/font-weight\s*:|(?<!-)color\s*:/);
  });
});
