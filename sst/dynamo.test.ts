import { describe, it, expect } from 'bun:test';

class DynamoMock {
    name: string;
    config: Record<string, unknown>;
    constructor(name: string, config: Record<string, unknown>) {
        this.name = name;
        this.config = config;
    }
}

describe('BuildingsUnitsTable schema', () => {
    it('contains address components', async () => {
        (globalThis as { sst?: unknown }).sst = { aws: { Dynamo: DynamoMock } };
        const { buildingsUnitsTable } = await import('./dynamo');
        const fields = buildingsUnitsTable.config.fields;
        expect(fields).toHaveProperty('street');
        expect(fields).toHaveProperty('city');
        expect(fields).toHaveProperty('state');
        expect(fields).toHaveProperty('zip');
        expect(fields).not.toHaveProperty('address');
    });
});
