---
id: forgot-password
title: "S-11: Forgot Password — emailed reset link"
status: implemented
created: 2026-08-22
updated: 2026-08-31
roadmap_id: S-11
prd_refs:
  - FR-002
  - Access Control
prerequisites:
  - auth-scaffold
---

## Notes

Source: `context/design/todo.md` — "dodaj opcję: zapomniałem hasła. wyślij
link na mail z linkiem do resetu."

First outbound-email requirement in the codebase (S-07's ISBN lookup is
inbound HTTP only). Reset token must be single-use and time-limited,
validated server-side.

**Provider decision (2026-08-31, during `/10x-plan`):** the instruction
above to use a Marketplace transactional-email integration was followed
first — Resend was installed via `vercel integration add`. It was then
removed after the developer specified reset emails must send *from*
`domowa.biblioteka.v1@gmail.com`, which Resend cannot do without owning
that domain. The developer explicitly confirmed overriding the
no-hand-rolled-SMTP guidance after that tradeoff was presented; the plan
uses Gmail SMTP (`nodemailer` + an App Password) instead. See
`context/changes/forgot-password/plan.md`'s Current State Analysis for
the full reasoning.
