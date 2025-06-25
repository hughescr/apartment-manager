import { BuildingData } from '../astro-src/types';
import { find, findIndex } from 'lodash';

const buildings: BuildingData[] = [
    {
        buildingID: 'bldg-1',
        unitID: 'BUILDING',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        buildingDescription: 'A lovely building in the heart of Anytown.',
        yearBuilt: 2020,
        numberStories: 3,
        totalUnits: 10,
    },
];

export const getBuildings = async () => buildings;
export const getBuilding = async (buildingID: string) => find(buildings, { buildingID });
export const createBuilding = async (building: BuildingData) => {
    buildings.push(building);
    return building;
};
export const updateBuilding = async (buildingID: string, updates: Partial<BuildingData>) => {
    const index = findIndex(buildings, { buildingID });
    if(index === -1) {
        return null;
    }
    buildings[index] = { ...buildings[index], ...updates };
    return buildings[index];
};
export const deleteBuilding = async (buildingID: string) => {
    const index = findIndex(buildings, { buildingID });
    if(index === -1) {
        return false;
    }
    buildings.splice(index, 1);
    return true;
};
