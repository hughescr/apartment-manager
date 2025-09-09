import { describe, it, expect, beforeEach } from 'bun:test';
import { promises as fs } from 'fs';

let buildingsComponentStateSrc: string;
let buildingsListStateSrc: string;

// Load centralized state files where sessionStorage logic now resides
beforeEach(async () => {
    if(!buildingsComponentStateSrc) {
        buildingsComponentStateSrc = await fs.readFile(new URL('../../../astro-src/lib/buildings-component/buildingsComponentState.ts', import.meta.url), 'utf8');
    }
    if(!buildingsListStateSrc) {
        buildingsListStateSrc = await fs.readFile(new URL('../../../astro-src/lib/buildings-list/buildingsListState.ts', import.meta.url), 'utf8');
    }
});

describe('Buildings tab persistence', () => {
    it('persists active tab using sessionStorage', () => {
        // sessionStorage logic moved to centralized buildingsComponentState.ts
        expect(buildingsComponentStateSrc).toContain('sessionStorage.setItem');
        expect(buildingsComponentStateSrc).toContain('sessionStorage.getItem');
    });

    it('updates history without reloading page', () => {
        // History management moved to centralized buildingsComponentState.ts
        expect(buildingsComponentStateSrc).toContain('history.pushState');
        expect(buildingsComponentStateSrc).toContain('history.replaceState');
        expect(buildingsComponentStateSrc).not.toContain('window.location.reload');
    });

    it('initializes tab state from sessionStorage in BuildingsList', () => {
        // BuildingsList state initialization moved to centralized buildingsListState.ts
        expect(buildingsListStateSrc).toContain('sessionStorage.getItem');
    });
});
