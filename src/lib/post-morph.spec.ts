import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

// Runs the file as a classic script in a fresh window, as the inline <head> copy runs
// (https://github.com/jsdom/jsdom#running-vm-scripts). jsdom has no matchMedia, Navigation API or page swap
// events, so the window gets stubs and the events are plain Events carrying the fields the script reads.
const path = fileURLToPath(new URL('./post-morph.js', import.meta.url));
const script = new Script(readFileSync(path, 'utf-8'), { filename: path });

const LIST = `
  <a data-post-card href="/blog/a/"><img data-morph="image"><h2 data-morph="title">A</h2></a>
  <a data-post-card href="/blog/b/"><img data-morph="image"></a>`;
const POST = `<header id="post-hero"><h1 data-morph="title">B</h1><img data-morph="image"></header>${LIST}`;

interface Options {
  body: string;
  url?: string;
  reduce?: boolean;
  from?: string | null;
  activation?: boolean;
}

const run = ({ body, url = 'https://www.pa-tech.dev/blog/', reduce = false, from = null, activation = true }: Options) => {
  const dom = new JSDOM(body, { url, runScripts: 'outside-only' });
  const { window } = dom;
  Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: reduce }) });
  Object.defineProperty(window, 'navigation', {
    value: { activation: activation ? { from: from === null ? null : { url: from } } : null },
  });
  script.runInContext(dom.getInternalVMContext());
  return window;
};

// A view transition whose promise the test settles.
const transition = () => {
  let settle = (): void => {};
  const done = new Promise<undefined>((resolve) => (settle = () => resolve(undefined)));
  return { transition: { finished: done, ready: done }, settle };
};

const fire = (window: JSDOM['window'], type: string, fields: Record<string, object | null>) => {
  const event = new window.Event(type);
  for (const [key, value] of Object.entries(fields)) Object.defineProperty(event, key, { value });
  window.dispatchEvent(event);
};

const names = (window: JSDOM['window']) =>
  [...window.document.querySelectorAll<HTMLElement>('[data-morph]')].map((el) => el.style.viewTransitionName);

const swapTo = (target: string | null) => ({ entry: { url: target } });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('post morph script on pageswap', () => {
  it('names the card of the post being opened and clears it after the transition', async () => {
    const window = run({ body: LIST });
    const { transition: viewTransition, settle } = transition();
    fire(window, 'pageswap', { viewTransition, activation: swapTo('https://www.pa-tech.dev/blog/a/') });
    expect(names(window)).toEqual(['post-image', 'post-title', '']);
    settle();
    await flush();
    expect(names(window)).toEqual(['', '', '']);
  });

  it('names a card that has no title by its image only', () => {
    const window = run({ body: LIST });
    fire(window, 'pageswap', { viewTransition: transition().transition, activation: swapTo('https://www.pa-tech.dev/blog/b/') });
    expect(names(window)).toEqual(['', '', 'post-image']);
  });

  it("names the post's own header when no card matches the target", () => {
    const window = run({ body: POST, url: 'https://www.pa-tech.dev/blog/b/' });
    fire(window, 'pageswap', { viewTransition: transition().transition, activation: swapTo('https://www.pa-tech.dev/blog/') });
    expect(names(window)).toEqual(['post-title', 'post-image', '', '', '']);
  });

  it('names nothing on pageswap without a view transition, an activation or a target URL', () => {
    const window = run({ body: POST });
    fire(window, 'pageswap', { viewTransition: null, activation: swapTo('https://www.pa-tech.dev/blog/a/') });
    fire(window, 'pageswap', { viewTransition: transition().transition, activation: null });
    expect(names(window)).toEqual(['', '', '', '', '']);
    const list = run({ body: LIST });
    fire(list, 'pageswap', { viewTransition: transition().transition, activation: swapTo(null) });
    expect(names(list)).toEqual(['', '', '']);
  });

});

describe('post morph script on pagereveal', () => {
  it("names the post's header on reveal and clears it once the snapshots are taken", async () => {
    const window = run({ body: POST, url: 'https://www.pa-tech.dev/blog/b/', from: 'https://www.pa-tech.dev/blog/' });
    const { transition: viewTransition, settle } = transition();
    fire(window, 'pagereveal', { viewTransition });
    expect(names(window)).toEqual(['post-title', 'post-image', '', '', '']);
    settle();
    await flush();
    expect(names(window)).toEqual(['', '', '', '', '']);
  });

  it('names the card of the post we came back from on a list page', () => {
    const window = run({ body: LIST, from: 'https://www.pa-tech.dev/blog/a/' });
    fire(window, 'pagereveal', { viewTransition: transition().transition });
    expect(names(window)).toEqual(['post-image', 'post-title', '']);
  });

  it('names nothing on reveal without a view transition, a matching card or an activation', () => {
    const window = run({ body: LIST, from: 'https://www.pa-tech.dev/blog/a/' });
    fire(window, 'pagereveal', { viewTransition: null });
    expect(names(window)).toEqual(['', '', '']);
    const unknown = run({ body: LIST, from: 'https://www.pa-tech.dev/cv/' });
    fire(unknown, 'pagereveal', { viewTransition: transition().transition });
    expect(names(unknown)).toEqual(['', '', '']);
    const direct = run({ body: LIST, activation: false });
    fire(direct, 'pagereveal', { viewTransition: transition().transition });
    expect(names(direct)).toEqual(['', '', '']);
    const fresh = run({ body: LIST });
    fire(fresh, 'pagereveal', { viewTransition: transition().transition });
    expect(names(fresh)).toEqual(['', '', '']);
  });

});

describe('post morph script', () => {
  it('names nothing under reduced motion', () => {
    const window = run({ body: LIST, reduce: true });
    fire(window, 'pageswap', { viewTransition: transition().transition, activation: swapTo('https://www.pa-tech.dev/blog/a/') });
    expect(names(window)).toEqual(['', '', '']);
  });

  it('clears the names when the transition is skipped', async () => {
    const window = run({ body: LIST });
    const skipped = Promise.reject(new Error('skipped'));
    fire(window, 'pageswap', {
      viewTransition: { finished: skipped, ready: skipped },
      activation: swapTo('https://www.pa-tech.dev/blog/a/'),
    });
    await flush();
    expect(names(window)).toEqual(['', '', '']);
  });

  it('declares no globals', () => {
    const window = run({ body: LIST });
    expect(['PARTS', 'reduceMotion', 'pathOf', 'cardFor', 'hero', 'nameParts'].filter((name) => name in window)).toEqual([]);
  });
});
