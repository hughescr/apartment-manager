import { describe, test, expect, mock } from 'bun:test';
import { createUnit, deleteUnit, getUnit, getUnits, updateUnit } from '../../data/units';
import { UnitData } from '../../astro-src/types';

describe('Data Layer - Units', () => {
    test('should create a unit', async () => {
        const newUnit: UnitData = { buildingID: 'bld-1', unitID: 'new-unit', rent: 1200 };
        mock.module('../../data/units', () => ({
            createUnit: (data: UnitData) => ({ ...data, unitID: 'mock-unit-id' }),
        }));
        const result = await createUnit(newUnit);
        expect(result).toHaveProperty('unitID', 'mock-unit-id');
        expect(result).toHaveProperty('rent', 1200);
    });

    test('should get a unit', async () => {
        const mockUnit = { buildingID: 'bld-1', unitID: 'mock-unit-id', rent: 1500 };
        mock.module('../../data/units', () => ({
            getUnit: (buildingID: string, unitID: string) => (buildingID === 'bld-1' && unitID === 'mock-unit-id' ? mockUnit : undefined),
        }));
        const result = await getUnit('bld-1', 'mock-unit-id');
        expect(result).toEqual(mockUnit);
    });

    test('should list all units for a building', async () => {
        const mockUnits = [{ buildingID: 'bld-1', unitID: 'mock-unit-id', rent: 1500 }];
        mock.module('../../data/units', () => ({
            getUnits: (buildingID: string) => (buildingID === 'bld-1' ? mockUnits : []),
        }));
        const result = await getUnits('bld-1');
        expect(result).toEqual(mockUnits);
    });

    test('should update a unit', async () => {
        const updatedUnitData = { rent: 1250 };
        const updatedUnit = { buildingID: 'bld-1', unitID: 'mock-unit-id', rent: 1250 };
        mock.module('../../data/units', () => ({
            updateUnit: (buildingID: string, unitID: string, data: Partial<UnitData>) => (buildingID === 'bld-1' && unitID === 'mock-unit-id' ? { ...updatedUnit, ...data } : undefined),
        }));
        const result = await updateUnit('bld-1', 'mock-unit-id', updatedUnitData);
        expect(result).toEqual(updatedUnit);
    });

    test('should delete a unit', async () => {
        mock.module('../../data/units', () => ({
            deleteUnit: (buildingID: string, unitID: string) => (buildingID === 'bld-1' && unitID === 'mock-unit-id'),
        }));
        const result = await deleteUnit('bld-1', 'mock-unit-id');
        expect(result).toBe(true);
    });

    test('should handle error when deleting a unit', async () => {
        mock.module('../../data/units', () => ({
            deleteUnit: (buildingID: string, unitID: string) => (!(buildingID === 'bld-1' && unitID === 'error-unit-id')),
        }));
        const result = await deleteUnit('bld-1', 'error-unit-id');
        expect(result).toBe(false);
    });
});
