import { describe, it, expect, beforeEach } from 'bun:test';
import { promises as fs } from 'fs';

let componentSrc: string;

beforeEach(async () => {
    if(!componentSrc) {
        componentSrc = await fs.readFile(new URL('../../astro-src/components/forms/ScreeningCriteriaForm.astro', import.meta.url), 'utf8');
    }
});

describe('ScreeningCriteriaForm presets', () => {
    it('includes Portland preset with legal limits', () => {
        expect(componentSrc).toContain("applyPreset('portland')");
        expect(componentSrc).toContain('Portland');
        expect(componentSrc).toContain('incomeRatio: 2.5');
        expect(componentSrc).toContain('minCreditScore: 500');
    });

    it('includes San Francisco preset with landlord-friendly values', () => {
        expect(componentSrc).toContain("applyPreset('sanFrancisco')");
        expect(componentSrc).toContain('San Francisco');
        expect(componentSrc).toContain('incomeRatio: 3');
        expect(componentSrc).toContain('minCreditScore: 700');
    });
});
