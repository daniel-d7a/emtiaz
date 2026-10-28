# ADR-0020: Billing uses Thawani hosted checkout in OMR

Date: 2026-10-29

## Context

Emtiaz is Arabic-first and sells to teachers and families in Oman. The landing
pages already show planned monthly prices in Omani Rial, but no checkout exists.
The product needs a local payment provider that accepts OMR, supports the cards
and wallets used in Oman, keeps card data out of the app, and exposes webhooks
and refunds for subscription state.

The operator is pre-launch. Prices are aspirational and registration is free
until billing is switched on.

## Decision

- **Provider:** Thawani. Use its hosted checkout and server-to-server API.
  Thawani is an Omani gateway with OMR settlement, Visa/Mastercard, Apple Pay and
  Google Pay (subject to merchant-account enablement), webhooks, and refunds.
- **Currency:** OMR only. Prices are displayed VAT-inclusive.
- **Checkout:** The API creates a Thawani checkout session and returns the hosted
  payment URL. The browser or app never receives card data or provider secrets.
- **Plans and licensing:** Monthly subscriptions for a single teacher account or
  a family bundle. No annual plan at launch.
  - Student: 3 OMR/month for the first student.
  - Teacher: 15 OMR/month, up to 5 active groups.
  - Teacher Plus: 25 OMR/month, unlimited groups and students.
  - Sibling bundle: +1 OMR/month per extra student on a student plan, up to 4
    students.
- **Entitlements:**
  - Teacher and Teacher Plus gate the teacher account that owns courses and
    groups. Courses, lessons, quizzes, materials, and existing student access
    remain readable while a subscription is active.
  - A lapsed Teacher/Teacher Plus subscription becomes read-only at
    `current_period_end`: the teacher can still open and edit existing content,
    but cannot create groups or publish new courses. Existing groups stay
    readable for enrolled students; no student is removed because a teacher
    stopped paying.
  - A downgrade from Teacher Plus to Teacher keeps existing groups readable. The
    teacher cannot create a new group while over the 5-group limit.
  - Student and sibling plans are listed launch pricing. In the cohort MVP,
    students join groups through a teacher's code and are not blocked by a
    student subscription. A parent/student checkout flow is a later product
    change; until then the student/sibling prices are not enforced.
- **Refunds:** Refunds are issued through Thawani's refund API, at operator
  discretion, within 14 days of payment. A refund ends the subscription
  immediately and reverts the account to the free read-only state. Enrolled
  students keep read-only access to existing groups until the end of the month
  in which the refund was issued.
- **Failed or cancelled payments:** A failed payment leaves the previous
  entitlement until `current_period_end`, then lapses. A cancellation sets
  `cancel_at_period_end`; access continues until the paid period ends.
- **Webhooks:** `POST /api/billing/webhook` is public but every request is
  verified with Thawani's HMAC-SHA256 signature over
  `<raw body>-<thawani-timestamp>` using `THAWANI_WEBHOOK_SECRET`. Provider
  session/event ids are stored with a unique constraint so retries are
  idempotent. The handler never trusts client-supplied amounts or plan ids; it
  reconciles them against the stored checkout session.
- **Tax and invoices:** Oman VAT on electronically supplied services is 5%.
  Prices are gross (VAT-inclusive) and must not add VAT at checkout. Until the
  operator is VAT-registered, no VAT is separately charged and no tax invoice is
  claimed; the Thawani receipt is the payment record. Once registered, the
  platform must issue an Oman-compliant tax invoice showing the operator's VAT
  number, taxable amount, 5% VAT, and total, with the Thawani transaction
  reference. Invoices are issued in OMR within 15 days of supply.
- **Secrets:** `THAWANI_API_KEY`, `THAWANI_PUBLISHABLE_KEY`,
  `THAWANI_WEBHOOK_SECRET`, and `THAWANI_BASE_URL` live only in environment
  configuration. `BILLING_ENABLED` defaults to false so pre-launch deployments
  keep working without a merchant account.

## Consequences

- Checkout is a redirect to Thawani; the SPA and mobile app need a return URL and
  a way to poll or refetch subscription state.
- Thawani merchant approval and webhook configuration are external prerequisites.
  Until they exist, `BILLING_ENABLED=false` keeps the product free and tests can
  use a fake provider.
- Billing adds `subscriptions` and `billing_events` tables, a public webhook
  route, and audit entries for checkout, activation, cancellation, and refunds.
- Prices on the landing pages stay planned launch prices; changing them is a
  product decision, not a code change.
