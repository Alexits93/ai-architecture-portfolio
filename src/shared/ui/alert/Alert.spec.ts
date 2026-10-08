import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { JSDOM } from 'jsdom';
import { describe, it, expect, beforeEach } from 'vitest';
import { Alert } from './index';

describe('Alert Component - Rendering', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should render the base HTML structure with role="alert"', async () => {
    const html = await container.renderToString(Alert, {
      props: { text: 'Test alert' }
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const alertEl = doc.querySelector('div.notification[role="alert"]');
    expect(alertEl).not.toBeNull();
    // Default type is success
    expect(alertEl?.classList.contains('success')).toBe(true);
    
    const textEl = doc.querySelector('.notification-body p');
    expect(textEl?.textContent?.trim()).toBe('Test alert');
  });

  it('should render correct classes and icons based on type prop', async () => {
    const html = await container.renderToString(Alert, {
      props: { text: 'Warning message', type: 'warning' }
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const alertEl = doc.querySelector('div.notification[role="alert"]');
    expect(alertEl?.classList.contains('warning')).toBe(true);

    const svgUse = doc.querySelector('.notification-header svg use');
    expect(svgUse?.getAttribute('href') || svgUse?.getAttribute('xlink:href')).toBe('#exclamation-triangle-fill');
  });
});

describe('Alert Component - Dismissible', () => {
  let container: AstroContainer;

  beforeEach(async () => {
    container = await AstroContainer.create();
  });

  it('should not render the footer timer if dismissible is false', async () => {
    const html = await container.renderToString(Alert, {
      props: { text: 'Test' } // dismissible defaults to false
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const footer = doc.querySelector('.notification-footer');
    expect(footer).toBeNull();
  });

  it('should render the footer timer with correct duration if dismissible is true', async () => {
    const html = await container.renderToString(Alert, {
      props: { text: 'Test', dismissible: true, duration: 5000 }
    });
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const footer = doc.querySelector('.notification-footer');
    expect(footer).not.toBeNull();
    
    // Check if Astro's define:vars applied the CSS variable correctly to the root element (or if it exists in the DOM)
    // Astro adds the define:vars styles to a wrapper or the root element.
    const rootEl = doc.querySelector('.alert-wrapper');
    const style = rootEl?.getAttribute('style');
    expect(style).toContain('--animationDurationSeconds: 5');
  });
});
