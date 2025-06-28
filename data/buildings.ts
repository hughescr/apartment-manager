import { BuildingData } from '../astro-src/types';
import { ApartmentTable, Building } from './model';

import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

export async function getBuildings() {
    const { Items } = await ApartmentTable.build(ScanCommand)
        .entities(Building)
        .send();
    return Items;
}

export async function getBuilding(buildingID: string) {
    const { Item } = await Building.build(GetItemCommand)
        .key({ buildingID, unitID: 'BUILDING' })
        .send();
    return Item;
}

export async function createBuilding(building: BuildingData) {
    const { Attributes } = await Building.build(PutItemCommand)
        .item({ ...building, unitID: 'BUILDING' })
        .send();
    return Attributes;
}

export async function updateBuilding(buildingID: string, updates: Partial<BuildingData>) {
    const { Attributes } = await Building.build(UpdateItemCommand)
        .item({ ...updates, buildingID, unitID: 'BUILDING' })
        .send();
    return Attributes;
}

export async function deleteBuilding(buildingID: string) {
    await Building.build(DeleteItemCommand)
        .key({ buildingID, unitID: 'BUILDING' })
        .send();
    return true;
}
