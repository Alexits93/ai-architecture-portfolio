import { describe, it, expect } from 'vitest';
import { formatPeriod, sortByStartDesc, splitEmphasis } from './experience';

describe('sortByStartDesc', () => {
  it('puts the newest start first without mutating the input', () => {
    const entries = [{ data: { start: 2017 } }, { data: { start: 2024 } }, { data: { start: 2019 } }];
    expect(sortByStartDesc(entries).map((e) => e.data.start)).toEqual([2024, 2019, 2017]);
    expect(entries.map((e) => e.data.start)).toEqual([2017, 2024, 2019]);
  });
});

describe('formatPeriod', () => {
  it('shows both years, or Present for an open end', () => {
    expect(formatPeriod({ start: 2020, end: 2023 })).toBe('2020 - 2023');
    expect(formatPeriod({ start: 2024, end: null })).toBe('2024 - Present');
  });
});

describe('splitEmphasis', () => {
  it('returns the text as one plain part without terms', () => {
    expect(splitEmphasis('Plain text.', [])).toEqual([{ text: 'Plain text.', strong: false }]);
  });

  it('marks every term, the longest match first', () => {
    expect(splitEmphasis('Used State Machines (xstate) and State Machine.', ['State Machine', 'State Machines (xstate)'])).toEqual([
      { text: 'Used ', strong: false },
      { text: 'State Machines (xstate)', strong: true },
      { text: ' and ', strong: false },
      { text: 'State Machine', strong: true },
      { text: '.', strong: false },
    ]);
  });

  it('matches whole words only', () => {
    expect(splitEmphasis('JavaScript and Java', ['Java'])).toEqual([
      { text: 'JavaScript and ', strong: false },
      { text: 'Java', strong: true },
    ]);
  });
});
