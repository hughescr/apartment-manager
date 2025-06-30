import { mock, describe, expect, it } from 'bun:test';

mock.module('../../data/model', () => {
    const createMock = (CommandClass: { name: string }) => {
        const commandInstance = {
            Item: null as unknown,
            Key: null as unknown,
            item: function(item: unknown) {
                this.Item = item;
                return this;
            },
            key: function(key: unknown) {
                this.Key = key;
                return this;
            },
            options: function() { return this; },
            entities: function() { return this; },
            query: function() { return this; },
            send: async function() {
                const commandName = CommandClass.name;
                if(commandName.includes('Put')) {
                    return { Attributes: { ...(this.Item as object), unitID: 'mock-unit-id' } };
                }
                if(commandName.includes('Get')) {
                    return { Item: { buildingID: 'bld-1', unitID: (this.Key as { unitID: string }).unitID, rent: 1500 } };
                }
                if(commandName.includes('Query')) {
                    return { Items: [{ buildingID: 'bld-1', unitID: 'mock-unit-id', rent: 1500 }] };
                }
                if(commandName.includes('Update')) {
                    return { Attributes: { ...(this.Item as object), unitID: (this.Item as { unitID: string }).unitID } };
                }
                if(commandName.includes('Delete')) {
                    if (this.Key && (this.Key as { unitID: string }).unitID === 'error-unit-id') {
                        throw new Error('Mock delete error');
                    }
                    return {};
                }
                return {};
            }
        };
        return commandInstance;
    };

    return {
        Unit: { build: createMock },
        ApartmentTable: { build: createMock },
    };
});

import { createUnit, deleteUnit, getUnit, getUnits, updateUnit } from '../../data/units';
import { UnitData } from '../../astro-src/types';

describe('Data Layer - Units', () => {
    it('should create a unit', async () => {
        const newUnit: UnitData = { buildingID: 'bld-1', unitID: 'new-unit', rent: 1200 };
        const result = await createUnit(newUnit);
        expect(result).toHaveProperty('unitID', 'mock-unit-id');
        expect(result).toHaveProperty('rent', 1200);
    });

    it('should get a unit', async () => {
        const result = await getUnit('bld-1', 'mock-unit-id');
        expect(result).toEqual({ buildingID: 'bld-1', unitID: 'mock-unit-id', rent: 1500 });
    });

    it('should list all units for a building', async () => {
        const result = await getUnits('bld-1');
        expect(result).toEqual([{ buildingID: 'bld-1', unitID: 'mock-unit-id', rent: 1500 }]);
    });

    it('should update a unit', async () => {
        const updates: Partial<UnitData> = { rent: 1250 };
        const result = await updateUnit('bld-1', 'mock-unit-id', updates);
        expect(result).toEqual({ buildingID: 'bld-1', unitID: 'mock-unit-id', rent: 1250 });
    });

    it('should delete a unit', async () => {
        const result = await deleteUnit('bld-1', 'mock-unit-id');
        expect(result).toBe(true);
    });

    it('should handle error when deleting a unit', async () => {
        const result = await deleteUnit('bld-1', 'error-unit-id');
        expect(result).toBe(false);
    });
});
