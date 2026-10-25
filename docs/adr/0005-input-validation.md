# ADR-0005: Hand-rolled zod pipe for request validation (no class-validator DTOs)

Date: 2026-10-25

## Decision
Every write endpoint validates its body with a zod schema through one small
`ZodBodyPipe` (`backend/src/lib/schemas.ts`). Controllers declare
`@Body(new ZodBodyPipe(SomeSchema)) dto: z.infer<typeof SomeSchema>`.

## Rationale
- The project already uses zod (indirectly) and plain TypeScript types; adding
  `class-validator` + `ValidationPipe` would mean duplicating every DTO as a
  class with decorators, plus `reflect-metadata` runtime cost, for the same
  guarantee.
- A pipe is a single, auditable place to turn zod issues into a readable 400
  (`field: message; field2: message2`) and strips unknown keys.
- Guards and services still do authorization/business checks; the pipe only
  answers "is this payload well-formed?".

## Consequences
- Schemas live next to each other, so request-shape changes are one-file edits.
- Non-body inputs (params) are validated opportunistically by services; uuid
  params are compared/queried, and invalid ids simply 404.
- New endpoints must remember to attach the pipe — there is no global
  body-validation fallback. The `storage`/`teacher` specs include 400 tests to
  catch regressions in the shared schemas.
