import { describe, it, expect } from 'vitest';
import { ROUTES } from './routes';

describe('ROUTES registry', () => {
  it('every route is absolute and ends with a trailing slash', () => {
    for (const path of Object.values(ROUTES)) {
      expect(path).toMatch(/^\/(?:[a-z0-9-]+\/)*$/);
    }
  });
});
