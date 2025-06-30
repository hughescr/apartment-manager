import { describe, test, expect, mock } from 'bun:test';
import { createBuilding, deleteBuilding, getBuilding, getBuildings, updateBuilding } from '../../data/buildings';
import { BuildingData } from '../../astro-src/types';

describe('Data Layer - Buildings', () => {
    test('should create a building', async () => {
        const newBuilding: BuildingData = { buildingID: 'new-building', unitID: 'BUILDING', street: '123 Main St' };
        mock.module('../../data/buildings', () => ({
            createBuilding: (data: BuildingData) => ({ ...data, buildingID: 'mock-id' }),
        }));
        const result = await createBuilding(newBuilding);
        expect(result).toHaveProperty('buildingID', 'mock-id');
        expect(result).toHaveProperty('street', '123 Main St');
    });

    test('should get a building', async () => {
        const mockBuilding: BuildingData = { buildingID: 'mock-id', unitID: 'BUILDING', street: 'Mock Street' };
        mock.module('../../data/buildings', () => ({
            getBuilding: (id: string) => (id === 'mock-id' ? mockBuilding : undefined),
        }));
        const result = await getBuilding('mock-id');
        expect(result).toEqual(mockBuilding);
    });

    test('should list all buildings', async () => {
        const mockBuildings: BuildingData[] = [{ buildingID: 'mock-id', unitID: 'BUILDING', street: 'Mock Street' }];
        mock.module('../../data/buildings', () => ({
            getBuildings: () => mockBuildings,
        }));
        const result = await getBuildings();
        expect(result).toEqual(mockBuildings);
    });

    test('should update a building', async () => {
        const updatedBuildingData = { street: '456 Oak Ave' };
        const updatedBuilding: BuildingData = { buildingID: 'mock-id', unitID: 'BUILDING', street: '456 Oak Ave' };
        mock.module('../../data/buildings', () => ({
            updateBuilding: (id: string, data: Partial<BuildingData>) => (id === 'mock-id' ? { ...updatedBuilding, ...data } : undefined),
        }));
        const result = await updateBuilding('mock-id', updatedBuildingData);
        expect(result).toEqual(updatedBuilding);
    });

    test('should delete a building', async () => {
        mock.module('../../data/buildings', () => ({
            deleteBuilding: (id: string) => (id === 'mock-id'),
        }));
        const result = await deleteBuilding('mock-id');
        expect(result).toBe(true);
    });

    test('should handle error when deleting a building', async () => {
        mock.module('../../data/buildings', () => ({
            deleteBuilding: (id: string) => (id !== 'error-id'),
        }));
        const result = await deleteBuilding('error-id');
        expect(result).toBe(false);
    });
});
