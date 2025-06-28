import { UnitData } from '../astro-src/types';
import { ApartmentTable, Unit } from './model';

import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

export async function getUnits(buildingID: string): Promise<UnitData[]> {
    const { Items } = await ApartmentTable.build(QueryCommand)
    .entities(Unit)
    .query({ partition: buildingID })
    .options({
        filters: {
            Unit: { attr: 'unitID', ne: 'BUILDING' }
        },
    })
    .send();
    return Items as UnitData[];
}

export async function getUnit(buildingID: string, unitID: string): Promise<UnitData | undefined> {
    const { Item } = await Unit.build(GetItemCommand)
        .key({ buildingID, unitID })
        .send();
    return Item as UnitData | undefined;
}

export async function createUnit(unit: UnitData): Promise<UnitData | undefined> {
    const { Attributes } = await Unit.build(PutItemCommand)
        .item(unit)
        .send();
    return Attributes;
}

export async function updateUnit(buildingID: string, unitID: string, updates: Partial<UnitData>): Promise<UnitData | undefined> {
    const { Attributes } = await Unit.build(UpdateItemCommand)
        .item({ ...updates, buildingID, unitID })
        .send();
    return Attributes;
}

export async function deleteUnit(buildingID: string, unitID: string): Promise<boolean> {
    await Unit.build(DeleteItemCommand)
        .key({ buildingID, unitID })
        .send();
    return true;
}
