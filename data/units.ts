import { UnitData } from '../astro-src/types';
import { Unit } from './model';

export async function getUnits(buildingID: string): Promise<UnitData[]> {
    const { Items } = await Unit.query(buildingID, {
        filters: [{ attr: 'unitID', ne: 'BUILDING' }]
    }).exec();
    return Items as UnitData[];
}

export async function getUnit(buildingID: string, unitID: string): Promise<UnitData | undefined> {
    const { Item } = await Unit.get({ buildingID, unitID }).exec();
    return Item as UnitData | undefined;
}

export async function createUnit(unit: UnitData): Promise<UnitData> {
    await Unit.put(unit).exec();
    return unit;
}

export async function updateUnit(buildingID: string, unitID: string, updates: Partial<UnitData>): Promise<UnitData> {
    const { Attributes } = await Unit.update({ ...updates, buildingID, unitID }).exec();
    return Attributes as UnitData;
}

export async function deleteUnit(buildingID: string, unitID: string): Promise<boolean> {
    await Unit.delete({ buildingID, unitID }).exec();
    return true;
}
