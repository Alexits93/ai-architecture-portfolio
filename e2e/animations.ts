import type { Page } from '@playwright/test';

// Waits until every finite, time-based animation on the page has finished or been cancelled. Skipped: animations
// that loop forever (the name's gradient) and scroll-driven ones, which finish only when the page scrolls.
export const animationsSettled = (page: Page) =>
  page.evaluate(async () => {
    const finite = document.getAnimations().filter((animation) => {
      if (animation.timeline !== document.timeline) return false;
      const timing = animation.effect === null ? null : animation.effect.getComputedTiming();
      return timing !== null && timing.iterations !== Infinity;
    });
    await Promise.allSettled(finite.map((animation) => animation.finished));
  });
