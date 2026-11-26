# Trigger value proposal

Recommend one variant: value only. Field keeps the visible form name. FilterBar shows the name only without a value.

The prototype covers filled and empty forms, filled and empty filters, Entity switcher, currency choice, and version captions.

Main is 26028b76. Today uses its components. Proposed removes the prefix from the trigger and its hidden width copies.

A Field trigger keeps its label and value as its accessible name. FilterBar keeps “Unit: Engine team” or “Unit: any”. Other triggers need an explicit name plus value. Today, `ariaLabel` alone names the panel for a normal trigger.

PR #897 changes placement, focus, and FilterBar width measurement. Keep these changes. Its Dropdown trigger markup stays unchanged, but FilterBar changes `triggerContent`.

This is a prototype. Kit code, release notes, and the guideline remain for the builder. No PR is open.
