import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('quotes commas, quotes, and newlines and renders null as empty', () => {
    expect(toCsv([['name', 'score'], ['A, "B"', null], ['C\nD', 7]])).toBe(
      'name,score\n"A, ""B""",\n"C\nD",7',
    );
  });

  it('neutralises spreadsheet formulas', () => {
    expect(toCsv([['=1+1', '+96890000000', '-2', '@cmd']])).toBe(
      "'=1+1,'+96890000000,'-2,'@cmd",
    );
  });

  it('neutralises formulas with leading whitespace and pipe commands', () => {
    expect(toCsv([['   =SUM(A1)', '  -1+2', '|cmd']])).toBe(
      "'   =SUM(A1),'  -1+2,'|cmd",
    );
  });
});
