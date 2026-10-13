import { test, expect } from '@playwright/test';

// #244: the owner-approved principles on the built home page, from src/content/principles/principles.md.
// Vitest has no collection data, so the real text is checked here.
test.use({ reducedMotion: 'reduce' });

test('lists the principles under their heading', async ({ page }) => {
  await page.goto('/');
  const principles = page.getByRole('region', { name: 'Principles' });
  await expect(principles.getByRole('heading', { level: 2, name: 'Principles' })).toBeVisible();
  await expect(principles.getByRole('listitem')).toHaveText([
    'If CI cannot fail on it, it is not a rule.',
    'A test that cannot fail is worse than none.',
    'Done means I ran it, not that I wrote it.',
    'Make invalid states unrepresentable.',
    'Plausible is not correct.',
    'The model proposes. I decide.',
    'Ask the model to argue against the design first.',
    'Context is a budget. Give the contract, not the repo.',
    'One concern per pull request.',
    'Write the decision down so nobody relitigates it.',
    'Shared words first. A team that names things alike moves fast.',
    'Break work into pieces you can review in one sitting.',
  ]);
});
