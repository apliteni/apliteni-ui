# Architecture decisions

A decision record is the argument behind a piece of code, kept where it can be read, dated and
argued with. One file per decision, numbered in the order they were made.

## Why not a comment

A comment explains what the code cannot say for itself, and it is read by whoever is already in
that file. An argument is different: it has a date, it can be wrong, and it is superseded rather
than edited. Past twenty-five lines or so, a comment block has stopped being a comment and become
a design document that nobody can review, nobody signed, and nothing ages.

This repository had 1268 such lines across 15 files before these records existed. They were worth
keeping — most of them describe genuinely surprising behaviour in jsdom, cssstyle and npm — but
they were in the one place where they could not be checked against the code they described.

## Writing one

Copy `0000-template.md`, take the next number, and name the file for the decision rather than the
file it came from — `0003-measure-the-cascade-not-the-source.md`, not `0003-icon-cascade.md`.

Then leave a pointer where the argument used to be:

```js
// why: docs/adr/0003-measure-the-cascade-not-the-source.md
```

One line. If the code needs more than that to be read, the extra belongs in the code — a clearer
name, a smaller function — not in a longer comment.

## Changing one

A record is not edited when the decision changes. Write a new one, say what it supersedes, and add
a line to the old one pointing forward. The history is the point: a record that is quietly rewritten
is a comment again.

Correcting a record that was wrong about a fact, or stale against code that moved, is ordinary
editing and needs no ceremony.

## Checking

```
node bin/slop-detector.js scripts src stories site --level 1
```

`comment-essay` and `comment-chaptered` are what this directory exists to keep at zero. The
detector lives in `apliteni/claude-apliteni-plugin` under `skills/ai-slop-detector` and is not
published, so nothing here fails a build on it. Whoever writes the comment is the enforcement.
