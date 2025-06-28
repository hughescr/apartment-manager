import { BuildingData } from '../astro-src/types';
import { ApartmentTable, Building } from './model';

import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

export async function getBuildings(): Promise<BuildingData[]> {
    const { Items } = await ApartmentTable.build(ScanCommand)
        .entities(Building)
        .send();
    return Items as BuildingData[];
}

export async function getBuilding(buildingID: string): Promise<BuildingData | undefined> {
    const { Item } = await Building.build(GetItemCommand)
        .key({ buildingID, unitID: 'BUILDING' })
        .send();
    return Item as (BuildingData | undefined);
}

export async function createBuilding(building: BuildingData): Promise<BuildingData | undefined> {
    const { Attributes } = await Building.build(PutItemCommand)
        .item({ ...building, unitID: 'BUILDING' })
        .send();
    return Attributes;
}

export async function updateBuilding(buildingID: string, updates: Partial<BuildingData>): Promise<BuildingData | undefined> {
    const { Attributes } = await Building.build(UpdateItemCommand)
        .item({ ...updates, buildingID, unitID: 'BUILDING' })
        .send();
    return Attributes;
}

export async function deleteBuilding(buildingID: string): Promise<boolean> {
    await Building.build(DeleteItemCommand)
        .key({ buildingID, unitID: 'BUILDING' })
        .send();
    return true;
}
