import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'fs';

const componentSrc = readFileSync(new URL('../../../astro-src/components/BuildingsComponent.astro', import.meta.url), 'utf8');
const listSrc = readFileSync(new URL('../../../astro-src/components/BuildingsList.astro', import.meta.url), 'utf8');

describe('Buildings tab persistence', () => {
  it('persists active tab using sessionStorage', () => {
    expect(componentSrc).toContain('sessionStorage.setItem');
    expect(componentSrc).toContain('sessionStorage.getItem');
  });

  it('updates history without reloading page', () => {
    expect(componentSrc).toContain('history.pushState');
    expect(componentSrc).toContain('history.replaceState');
    expect(componentSrc).not.toContain('window.location.reload');
  });

  it('initializes tab state from sessionStorage in BuildingsList', () => {
    expect(listSrc).toContain('sessionStorage.getItem');
  });
});
