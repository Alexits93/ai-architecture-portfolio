/** The `datetime` value of a `<time>` element: the calendar date in UTC. */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** The date as the site shows it, in UTC so a build in another time zone shows the same day. */
export const displayDate = (date: Date, month: 'long' | 'short'): string =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' });
