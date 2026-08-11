# 0002. A number a comment argues for is pinned by a measured test

- **Date:** 2026-08-10
- **Status:** accepted
- **Code:** `.github/workflows/tag-on-bump.yml`, `scripts/tag-on-bump.test.js`, `scripts/registry-status.mjs`
- **Issues:** #170

## What we ran into

`tag-on-bump.yml` explains its literals in prose: a wait is "two minutes", a threshold is "three in
a row", and the job-level comment adds the deadlines up and sets `timeout-minutes` from the sum.

A number a comment claims and no test holds is a number that drifts. Both of these left the suite
green:

```
timeout-minutes:    30  →  5
registry_deadline: 150  →  900
```

A wait asserted only from underneath is as content at six times its length as at the length it says
it is.

## What we decided

Every number the workflow's prose argues for is pinned, and pinned by **measurement** rather than by
reading the YAML: the harness runs the real `run:` bodies on a virtual clock, so a deadline is held
by the seconds a step actually spends and a retry count by how many times the stub is actually
called. Each pin was proved by putting the mutation into the workflow on disk, diffing to confirm
the edit had landed, watching the test fail, and reverting.

| What | Where | Held by | Proved with |
|---|---|---|---|
| job ceiling | `timeout-minutes: 30` | `every wait is well inside the job's own ceiling` | 30 → 5, 30 → 45, and 28/39 failing while 29/38 pass |
| registry attempts | `for attempt in 1 2 3` | `a registry that stays unreachable still stops the job` | `1 2 3` → `1 2 3 4`, → `1 2` |
| backoff | `attempt * 5` | same | `* 5` → `* 7` |
| npm's own timeout | `registry-status.mjs` | `the timeout registry-status.mjs gives npm is read out of it` | `60_000` → `120_000` |
| appear deadline | 120s, `sleep 5` | `a dispatch whose run never appears gives up at two minutes` | 120 → 900, → 150, `sleep 5` → `sleep 10` |
| appear blip threshold | `-ge 3` | two tests, one from each side | `-ge 3` → `-ge 2`, → `-ge 4` |
| follow deadline | 600s, `sleep 15` | `following a run that never finishes takes ten minutes` | 600 → 900, → 300, `sleep 15` → `sleep 30` |
| green-on-waiting | 605s / 41 reads | `a publish still waiting at the follow deadline says so and goes green` | putting a 120s `waiting_deadline` back |
| the confirming read | 1 round trip | three tests, one per branch | removing it; narrowing it to `completed` |
| conclusion re-read | `sleep 5` | `the conclusion is re-read after five seconds, not fifteen` | `sleep 5` → `sleep 15` |
| registry window | 150s, `sleep 30` | `the registry gets two and a half minutes of asking` | 150 → 900, → 60, `sleep 30` → `sleep 60` |
| round trips | 73 gh calls | `every wait is well inside the job's own ceiling` | measured on one worst-case run |
| exit codes | `2)` labels | the plan tests | each `2)` → `9)` |
| Release-absent match | `release not found\|HTTP 404` | `a 404 is a Release that is not there, in both steps that ask` | 404 → 410 |

**The ceiling is a relation, not a number.** `timeout-minutes` is the one value no `run:` body can
exercise, so it is not asserted at a figure. The three waits are measured at their worst (120s,
600s, 165s), the two costs the comment names that no clock can see are added — the call in flight
when a deadline expires, and the plan step's retries — and the total is related to the ceiling read
out of the YAML: it must fit in two thirds of it and be at least half of it, so the cap stays a
backstop for a hung call rather than a quarter-hour of idle runner. The sum is 1140s, so the ceiling
must sit between 28.5 and 38 minutes.

**A number that lives elsewhere is read, not copied.** The npm timeout in `registry-status.mjs` was
the last figure in that sum nothing held. The ceiling test now reads it back out of that file and
throws if the shape changes, rather than carrying 60 and 195 as literals.

**Round trips are counted on one run, not by adding maxima.** 24 + 41, added off two separate runs,
described a job that cannot exist — a run that never appears exits the step before the follow loop
is reached. The worst single job is 73 calls, and only the conclusion loop is lengthened by a blip.

## Why not the alternatives

**Assert each number against the YAML.** It reads the same string the workflow writes, so a comment
and a test can be wrong together, which is the failure being fixed.

**Bound the waits from underneath only** (`waited <= 700`). That is what was there. It passes at six
times the intended length, which is how `150 → 900` survived.

## What this does not cover

Three values are unclaimed by any comment and pinned by nothing, deliberately: `--limit 50` on the
run lookup, `node-version: 24`, and the two pinned action SHAs with their `# v7.0.1` / `# v7.0.0`
labels. Inventing a claim for them is the workflow's business, not the test file's.
