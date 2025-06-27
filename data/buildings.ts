import { BuildingData } from '../astro-src/types';
import { Building } from './model';

export async function getBuildings(): Promise<BuildingData[]> {
    const { Items } = await Building.scan().exec();
    return Items as BuildingData[];
}

export async function getBuilding(buildingID: string): Promise<BuildingData | undefined> {
    const { Item } = await Building.get({ buildingID, unitID: 'BUILDING' }).exec();
    return Item as BuildingData | undefined;
}

export async function createBuilding(building: BuildingData): Promise<BuildingData> {
    await Building.put({ ...building, unitID: 'BUILDING' }).exec();
    return building;
}

export async function updateBuilding(buildingID: string, updates: Partial<BuildingData>): Promise<BuildingData> {
    const { Attributes } = await Building.update({ ...updates, buildingID, unitID: 'BUILDING' }).exec();
    return Attributes as BuildingData;
}

export async function deleteBuilding(buildingID: string): Promise<boolean> {
    await Building.delete({ buildingID, unitID: 'BUILDING' }).exec();
    return true;
}
