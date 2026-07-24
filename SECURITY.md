# Security Policy

## Supported versions

`@apliteni/apliteni-ui` follows semver and only the latest published minor is
supported with security fixes. Check the current version on
[npm](https://www.npmjs.com/package/@apliteni/apliteni-ui) or
[ui.apli.tech/changelog](https://ui.apli.tech/changelog).

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately using
[GitHub's private vulnerability reporting](https://github.com/apliteni/apliteni-ui/security/advisories/new)
(**Security → Report a vulnerability**), or email **security@apliteni.com**.

Please include:

- the affected version(s),
- a description of the issue and its impact,
- steps to reproduce or a proof of concept, and
- any suggested remediation.

We aim to acknowledge reports within a few business days and will keep you
updated as we investigate. Please give us a reasonable window to release a fix
before any public disclosure.

## Scope

This is a framework-agnostic HTML + CSS UI kit with **no runtime dependencies**
and no server, database, or authentication code. The `ui.apli.tech` site is a
static build (no server code — served by static hosting). The most relevant
classes of issue are supply-chain (build/publish integrity) and any XSS vector
in the component string factories.
