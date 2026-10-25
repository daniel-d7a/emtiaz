# ADR-0010: pino request logging with request IDs

Date: 2026-10-25

## Decision
Every API instance installs `pino-http` in `createApp()`. Each request gets an
`x-request-id`: an upstream value is reused when present, otherwise a UUID is
minted and echoed in the response. Logs are JSON and redact cookies,
`authorization`, and `set-cookie`. Application code logs through
`backend/src/lib/logger.ts`; CLI scripts (seed/migrate) keep plain console
output because they are read by humans.

## Rationale
- One log line per request with method, path, status, duration, and request id
  makes it possible to correlate a user report with a specific request without
  adding tracing infrastructure.
- pino is the standard low-overhead Node logger; `pino-http` is a thin wrapper.
- Redaction happens at the logger, so a forgotten `req.headers` log cannot
  leak session cookies.

## Consequences
- `LOG_LEVEL` controls verbosity (`silent` in tests, `info` by default).
- A reverse proxy that sets `x-request-id` keeps its id end-to-end; Caddy does
  not set one today, so the API generates it.
- Logs are JSON on stdout; a future collector can ship them unchanged.
