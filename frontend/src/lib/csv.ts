/** Minimal CSV serialisation: RFC-4180 quoting, caller supplies headers in the first row. */
export function toCsv(rows: unknown[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = value == null ? '' : String(value);
          return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(','),
    )
    .join('\n');
}
