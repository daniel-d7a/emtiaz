import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('quotes commas, quotes, and newlines and renders null as empty', () => {
    expect(toCsv([['name', 'score'], ['A, "B"', null], ['C\nD', 7]])).toBe(
      'name,score\n"A, ""B""",\n"C\nD",7',
    );
  });
});
