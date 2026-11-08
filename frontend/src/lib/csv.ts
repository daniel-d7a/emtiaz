/** Minimal CSV serialisation: RFC-4180 quoting, caller supplies headers in the first row. */
export function toCsv(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = value == null ? '' : String(value);
          // stop spreadsheet formula execution from user-supplied names/phones
          const trimmed = text.trimStart();
          const safe = /^[=+\-@\t\r|]/.test(trimmed) ? `'${text}` : text;
          return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(','),
    )
    .join('\n');
}
