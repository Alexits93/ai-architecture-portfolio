import { describe, it, expect } from 'vitest';
import { displayDate, isoDate } from './dates';

// Content dates parse as UTC midnight; a local-time format would show the day before west of UTC.
describe('dates', () => {
  const date = new Date('2026-09-14T00:00:00.000Z');

  it('keeps the UTC calendar day', () => {
    expect(isoDate(date)).toBe('2026-09-14');
    expect(displayDate(date, 'long')).toBe('14 September 2026');
    expect(displayDate(date, 'short')).toBe('14 Sept 2026');
  });
});
