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
                    return { Attributes: { ...(this.Item as object), buildingID: 'mock-id' } };
                }
                if(commandName.includes('Get')) {
                    return { Item: { buildingID: (this.Key as { buildingID: string }).buildingID, unitID: 'BUILDING', street: 'Mock Street' } };
                }
                if(commandName.includes('Scan')) {
                    return { Items: [{ buildingID: 'mock-id', unitID: 'BUILDING', street: 'Mock Street' }] };
                }
                if(commandName.includes('Update')) {
                    return { Attributes: { ...(this.Item as object), buildingID: (this.Item as { buildingID: string }).buildingID } };
                }
                if(commandName.includes('Delete')) {
                    if (this.Key && (this.Key as { buildingID: string }).buildingID === 'error-id') {
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
        Building: { build: createMock },
        ApartmentTable: { build: createMock },
    };
});

import { createBuilding, deleteBuilding, getBuilding, getBuildings, updateBuilding } from '../../data/buildings';
import { BuildingData } from '../../astro-src/types';

describe('Data Layer - Buildings', () => {
    it('should create a building', async () => {
        const newBuilding: BuildingData = { buildingID: 'new-building', unitID: 'BUILDING', street: '123 Main St' };
        const result = await createBuilding(newBuilding);
        expect(result).toHaveProperty('buildingID', 'mock-id');
        expect(result).toHaveProperty('street', '123 Main St');
    });

    it('should get a building', async () => {
        const result = await getBuilding('mock-id');
        expect(result).toEqual({ buildingID: 'mock-id', unitID: 'BUILDING', street: 'Mock Street' });
    });

    it('should list all buildings', async () => {
        const result = await getBuildings();
        expect(result).toEqual([{ buildingID: 'mock-id', unitID: 'BUILDING', street: 'Mock Street' }]);
    });

    it('should update a building', async () => {
        const updates: Partial<BuildingData> = { street: '456 Oak Ave' };
        const result = await updateBuilding('mock-id', updates);
        expect(result).toEqual({ buildingID: 'mock-id', street: '456 Oak Ave', unitID: 'BUILDING' });
    });

    it('should delete a building', async () => {
        const result = await deleteBuilding('mock-id');
        expect(result).toBe(true);
    });

    it('should handle error when deleting a building', async () => {
        const result = await deleteBuilding('error-id');
        expect(result).toBe(false);
    });
});
