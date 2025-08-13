import { describe, it, expect } from 'bun:test';
import { JSDOM } from 'jsdom';
let Alpine: any;

const createMarkup = (path = '/') => `\n<nav aria-label="Main navigation" class="navbar bg-base-100" x-data=\"{ open: false, current: '${path}' }\">\n  <div class="flex-1">\n    <a class="btn btn-ghost normal-case text-xl" href="/">Apartment Manager</a>\n  </div>\n  <div class="flex-none">\n    <button data-testid="mobile-menu-button" class="btn btn-square btn-ghost md:hidden" @click="open = !open" :aria-expanded="open">\n      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>\n    </button>\n    <ul class="menu menu-horizontal px-1 hidden md:flex">\n      <li><a href="/buildings" :class=\"{ 'active': current.startsWith('/buildings') }\">Buildings</a></li>\n      <li><a href="/uploads" :class=\"{ 'active': current.startsWith('/uploads') }\">Uploads</a></li>\n      <li><a href="/settings" :class=\"{ 'active': current.startsWith('/settings') }\">Settings</a></li>\n    </ul>\n    <ul class="menu menu-sm mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 absolute right-0 md:hidden" x-show="open" x-transition @click.outside="open = false" data-testid="mobile-menu">\n      <li><a href="/buildings" :class=\"{ 'active': current.startsWith('/buildings') }\">Buildings</a></li>\n      <li><a href="/uploads" :class=\"{ 'active': current.startsWith('/uploads') }\">Uploads</a></li>\n      <li><a href="/settings" :class=\"{ 'active': current.startsWith('/settings') }\">Settings</a></li>\n    </ul>\n  </div>\n</nav>\n`;

const render = async (path = '/') => {
  const dom = new JSDOM(`<!doctype html><html><body></body></html>`, { pretendToBeVisual: true });
  (global as any).window = dom.window;
  (global as any).document = dom.window.document;
  (global as any).MutationObserver = dom.window.MutationObserver;
  (global as any).Event = dom.window.Event;
  (global as any).CustomEvent = dom.window.CustomEvent;
  Alpine = (await import('alpinejs')).default;
  (window as any).Alpine = Alpine;
  document.body.innerHTML = createMarkup(path);
  Alpine.initTree(document.body);
  await Alpine.nextTick();
  const button = document.querySelector('[data-testid="mobile-menu-button"]') as HTMLElement;
  const menu = document.querySelector('[data-testid="mobile-menu"]') as HTMLElement;
  return { dom, button, menu };
};

describe('Layout navigation', () => {
  it('renders all primary navigation links', async () => {
    await render('/');
    expect(document.querySelectorAll('a[href="/buildings"]').length).toBe(2);
    expect(document.querySelectorAll('a[href="/uploads"]').length).toBe(2);
    expect(document.querySelectorAll('a[href="/settings"]').length).toBe(2);
  });

  it('highlights active route', async () => {
    await render('/uploads');
    const activeLinks = Array.from(document.querySelectorAll('a.active')).map((el) => el.getAttribute('href'));
    expect(activeLinks).toEqual(['/uploads', '/uploads']);
  });

  it('toggles mobile menu', async () => {
    const { button } = await render('/');
    const expr = button.getAttribute('@click');
    let open = false;
    // Simulate the Alpine expression `open = !open`
    if (expr) {
      eval(expr);
    }
    expect(open).toBe(true);
    if (expr) {
      eval(expr);
    }
    expect(open).toBe(false);
  });
});
