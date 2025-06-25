import { UnitData } from '../astro-src/types';
import { filter, find, findIndex } from 'lodash';

const units: UnitData[] = [
    {
        buildingID: 'bldg-1',
        unitID: 'unit-101',
        unitDescription: 'A cozy 1-bedroom apartment.',
        beds: 1,
        baths: 1,
        sqft: 650,
        rent: 1500,
        occupied: false,
        availableDate: '2025-07-01',
    },
    {
        buildingID: 'bldg-1',
        unitID: 'unit-102',
        unitDescription: 'A spacious 2-bedroom apartment.',
        beds: 2,
        baths: 2,
        sqft: 900,
        rent: 2200,
        occupied: true,
    },
];

export const getUnits = async (buildingID: string) => filter(units, { buildingID });
export const getUnit = async (buildingID: string, unitID: string) => find(units, { buildingID, unitID });
export const createUnit = async (unit: UnitData) => {
    units.push(unit);
    return unit;
};
export const updateUnit = async (buildingID: string, unitID: string, updates: Partial<UnitData>) => {
    const index = findIndex(units, { buildingID, unitID });
    if(index === -1) {
        return null;
    }
    units[index] = { ...units[index], ...updates };
    return units[index];
};
export const deleteUnit = async (buildingID: string, unitID: string) => {
    const index = findIndex(units, { buildingID, unitID });
    if(index === -1) {
        return false;
    }
    units.splice(index, 1);
    return true;
};
