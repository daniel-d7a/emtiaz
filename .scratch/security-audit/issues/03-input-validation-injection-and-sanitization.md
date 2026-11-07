# 03: Input Validation, SQL Parameterization & Injection Defense

**Type:** audit
**Status:** open
**Blocked by:** None

## Objective

Audit all input validation, database query construction, file export sanitization, and XSS defenses across the backend and frontend.

## Verification Checklist

1. **Zod Validation & Payload Limits**:
   - Audit `backend/src/lib/schemas.ts`: Verify every controller endpoint validates body payloads with `ZodBodyPipe` and query parameters with `ZodQueryPipe`.
   - Verify string length bounds (`safeText`, `min`, `max`), integer limits, array item caps (e.g. bulk students, attendance records).
2. **SQL Injection Defense (Drizzle ORM)**:
   - Verify that all database operations use Drizzle's query builder or parameterized `sql` template tags.
   - Audit codebase for any string concatenation in SQL queries (`sql.raw(...)` or unsanitized string interpolations).
3. **CSV Formula Injection**:
   - Audit `frontend/src/lib/csv.ts`: Verify that exported values starting with `=`, `+`, `-`, `@`, or tab are prepended with an apostrophe `'` to prevent remote formula execution in Excel/Sheets.
4. **XSS & Content Security**:
   - Verify that rich text, video embeds, and user-provided URLs in Lesson, Homework, and Quiz views are sanitized and cannot execute malicious inline scripts (`javascript:` URIs, unescaped `dangerouslySetInnerHTML`).
