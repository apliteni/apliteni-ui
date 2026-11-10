# Design for issue 799: a sign-in page and a sign-in modal

This folder is a design. It is not a build. It holds a flow sketch and three layouts for
[issue 799](https://github.com/apliteni/apliteni-ui/issues/799). Each layout has a sign-in page, a
provider error and a session-ended modal over an app screen. All names, figures and addresses are
sample data.

## Three answers

**Why is this necessary?** Three of five local Apliteni product checkouts build their own sign-in
screen: the finance app, the handbook and the strategy app. The three screens look different. None
of them lets a person sign in again on the screen where the session ended. The finance app sends
the person to its company page after sign-in, so the person loses the screen. The handbook paints
its sign-in with its own inline styles.

**How often does the problem occur?** The finance app ends a session after 12 hours, or after 480
minutes without use. So a person signs in again about once each working day, which is about 21
times a month. This is an upper bound from the configuration, not a measured count. The strategy
app keeps a session for 7 days and the handbook for 30 days. The checkouts are from 2026-10-25 and
2026-10-26.

**Is there a simpler option?** Yes. Send the person to the sign-in page with a return address, as
the handbook and the strategy app already do. It needs no modal. But the person loses unsent input
and the screen state, such as a filter or an open row. The kit work can also stay small: the
layouts below use only existing parts, so the kit can ship stories and no new component.

## Files

| File | What it is |
| --- | --- |
| `flow-sketch.html` | Deliverable A. One file. Open it and use the step links, or add `#ended`, `#error` and so on to the address. |
| `layout-a.html`, `layout-b.html`, `layout-c.html` | Deliverable B. One file each, built from the kit's own CSS and React parts, version 0.164.0. |
| `layouts/` | The source of the three layouts and the build script. |
| `captures/` | Deliverable C. 48 PNG files. |

Each layout file takes two address values: `?view=page|error|modal|modal-error|closed` and
`&theme=light|dark`. The `closed` view is the app screen after the person closes the modal.

## The flow

The sketch has seven states. It is one ink, so nobody can take it for the built screen.

1. **In use.** The person works on Payouts with a filter on.
2. **Session ends.** The "Sign in again" modal opens over the same screen.
3. **Provider.** The person picks a provider. The button is busy until the provider answers.
4. **Error.** The provider fails. A danger callout says that nothing changed, and gives a retry.
5. **Retry.** The retry button is busy.
6. **Back.** The modal closes. The page, the filter and the rows are the same.
7. **Closed.** If the person closes the modal, the screen stays. A callout says that the person is
   signed out, with a "Sign in" button that opens the modal again.

## Kit conflict

> **Leave pages closed.** Show the page uncovered until the reader chooses to open something.
> Don't: Open one automatically when the page loads.

This rule is on the page "The page". The session-ended modal opens without a choice from the
reader. It does not open when the page loads, and it asks a question, as "Interrupt with a
question" on the page "Component choice" allows. The owner chooses one of three ways:

- **Follow the kit.** Show the signed-out callout first, as in state 7, and open the modal only
  from its "Sign in" button.
- **Record an exception.** Open the modal when the session ends, as the issue asks. Record the
  rule and the owner's answer in the pull request.
- **Change the kit.** Add an exception to the rule for a session that ends during use.

## Layout A: equal providers

The three providers are equal secondary buttons in one column. The error is a callout above them.
The modal holds the same column.

- No provider is filled, because none is the main action. Rule "Emphasize one action", page "The page".
- The provider error is a danger callout with role alert, in markup and paint. Rule "Marked errors", page "The full state set".
- The callout says what happened and what to do next in two sentences. Rule "Explain consequences in callouts", page "Text length".
- "Try Google again" carries the refresh glyph, which shows its verb. Rule "Let the glyph repeat the verb", page "Button labels".
- The session-ended modal asks one question and is sized to its content. Rule "Interrupt with a question", page "Component choice".
- After Close, a warning callout stays on the screen, because the signed-out state is still true. Rule "Show lasting conditions", page "Component choice".

## Layout B: last provider first

The provider that the person used last is the one filled button. The other providers sit below an
"or" divider. The modal names the person and asks one question: continue, or sign out.

- "Continue with Google" is the one filled button. Microsoft and GitHub are secondary. Rule "Emphasize one action", page "The page".
- In the modal footer, "Continue with Google" has more weight than "Sign out". Rule "Make the committing action stand out", page "Component choice".
- The modal names the reader with the avatar, the name and the address, and keeps Sign out beside them, as the account menu does. Rule "Limit the account menu to identity and the way in", page "Account and settings".
- The error callout sits above the button that it governs, with a "Try again" action. Rule "Marked errors", page "The full state set".
- The title "Welcome back" and every label use sentence case. Rule "Use sentence case", page "Labels and titles".
- Limit: the modal has no other provider. A person whose Google sign-in fails can only retry or sign out.

## Layout C: error as its own step

The page says where the person goes after sign-in. When a provider fails, the choice gives way to
one retry step. In the modal, the error step is an alert dialog with the error as its title.

- The error step has one filled button, "Try Google again", and a secondary "Choose another provider". Rule "Emphasize one action", page "The page".
- "Choose another provider" carries the back arrow, because it goes back to the choice. Rule "Let the glyph repeat the verb", page "Button labels".
- The error title becomes the one h1 of the page. Rule "Follow heading levels", page "The page".
- The modal error step uses role alertdialog, so a screen reader reads it at once. Rule "Marked errors", page "The full state set".
- The way back says "Choose another provider", not only "Back". Rule "Name the destination", page "Going back".

## Choices that the three layouts share

- The sign-in form sits on the auth shell's card, not on the page ground. Components page, "React auth shell" and the fields section.
- The Google and Microsoft marks are the vendors' artwork. GitHub uses the kit glyph with its Lucide path unchanged. Rule "Preserve glyph paths", page "Iconography".
- On a phone, each provider button measures 47 px high, over the 44 px floor. The callout and modal footer buttons measure 30 and 36 px, and reach 44 px through the kit's own tap layer, not by a larger control. Rule "Tap target on a phone", page "Accessibility minimums". This design did not measure that tap layer.
- A busy provider button shows three dots and stays disabled. Rule "Busy controls", page "The full state set". The sketch shows this state. The captures do not.
- The only local CSS is `layouts/glue.css`. It holds two flex rules that place kit parts. It paints nothing.

## Captures

The names follow `layout-<a|b|c>-<view>-<desktop|phone>-<light|dark>.png`. The views are `page`,
`error`, `modal` and `modal-error`. Desktop is 1280x800 and phone is 390x844. Each capture waited
for `document.fonts.ready`. A page or error capture is cropped to the card and a margin, because
the ground around it is empty. A modal capture keeps the full screen.

## Rebuild

Install `@apliteni/apliteni-ui@0.164.0`, `react@19`, `react-dom@19` and `esbuild` into one folder.
Then run this from `design-799/layouts`:

```sh
KIT_MODULES=<that folder>/node_modules node build.mjs
```

## What this design did not check

- No accessibility scan, such as axe, ran on the layouts.
- The AI slop detector ran on the layout sources, the sketch and this file. Its only finding is 22 multi-word button labels. Each one keeps its provider name or its destination, because the button needs that fact.
- The captures show no hover, focus or pressed state, except the focus ring that the modal puts on its first button.
- The provider window itself is not drawn. The sketch stands in for it with buttons marked "Simulate".
