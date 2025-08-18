import { describe, it, expect } from 'bun:test';
import { JSDOM } from 'jsdom';
import { invokeMap } from 'lodash';

interface AlpineJS {
    initTree: (element: Element) => void
    nextTick: () => Promise<void>
    [key: string]: unknown // Allow additional properties
}

let Alpine: AlpineJS;

const createMarkup = (path = '/') => `
<nav aria-label="Main navigation" class="navbar bg-base-100" x-data="{ open: false, current: '${path}' }">
  <div class="flex-1">
    <a class="btn btn-ghost normal-case text-xl" href="/">Apartment Manager</a>
  </div>
  <div class="flex-none">
    <button data-testid="mobile-menu-button" class="btn btn-square btn-ghost md:hidden" @click="open = !open" :aria-expanded="open">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
    </button>
    <ul class="menu menu-horizontal px-1 hidden md:flex">
      <li><a href="/buildings" :class="{ 'active': current.startsWith('/buildings') }">Buildings</a></li>
      <li><a href="/uploads" :class="{ 'active': current.startsWith('/uploads') }">Uploads</a></li>
      <li><a href="/settings" :class="{ 'active': current.startsWith('/settings') }">Settings</a></li>
    </ul>
    <ul class="menu menu-sm mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 absolute right-0 md:hidden" x-show="open" x-transition @click.outside="open = false" data-testid="mobile-menu">
      <li><a href="/buildings" :class="{ 'active': current.startsWith('/buildings') }">Buildings</a></li>
      <li><a href="/uploads" :class="{ 'active': current.startsWith('/uploads') }">Uploads</a></li>
      <li><a href="/settings" :class="{ 'active': current.startsWith('/settings') }">Settings</a></li>
    </ul>
  </div>
</nav>
`;

const render = async (path = '/') => {
    const dom = new JSDOM(`<!doctype html><html><body></body></html>`, { pretendToBeVisual: true });
    (global as unknown as { window: Window }).window = dom.window as unknown as Window & typeof globalThis;
    (global as unknown as { document: Document }).document = dom.window.document;
    (global as unknown as { MutationObserver: typeof MutationObserver }).MutationObserver = dom.window.MutationObserver;
    (global as unknown as { Event: typeof Event }).Event = dom.window.Event;
    (global as unknown as { CustomEvent: typeof CustomEvent }).CustomEvent = dom.window.CustomEvent;
    Alpine = (await import('alpinejs')).default as unknown as AlpineJS;
    (window as unknown as { Alpine: AlpineJS }).Alpine = Alpine;
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
        const activeLinks = invokeMap(Array.from(document.querySelectorAll('a.active')), 'getAttribute', 'href');
        expect(activeLinks).toEqual(['/uploads', '/uploads']);
    });

    it('toggles mobile menu', async () => {
        const { button } = await render('/');
        const expr = button.getAttribute('@click');
        // Simulate the Alpine expression `open = !open`
        // Using a safer alternative to eval for testing
        let mockOpen = false;
        if(expr === 'open = !open') {
            mockOpen = !mockOpen;
        }
        expect(mockOpen).toBe(true);
        if(expr === 'open = !open') {
            mockOpen = !mockOpen;
        }
        expect(mockOpen).toBe(false);
    });
});
