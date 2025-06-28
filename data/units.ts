import { UnitData } from '../astro-src/types';
import { ApartmentTable, Unit } from './model';

import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

import { logger } from '@hughescr/logger';

export async function getUnits(buildingID: string) {
    const { Items } = await ApartmentTable.build(QueryCommand)
    .entities(Unit)
    .query({ partition: buildingID })
    .send();
    return Items;
}

export async function getUnit(buildingID: string, unitID: string) {
    const { Item } = await Unit.build(GetItemCommand)
        .key({ buildingID, unitID })
        .send();
    return Item;
}

export async function createUnit(unit: UnitData) {
    logger.debug(`Creating unit: ${JSON.stringify(unit)}`);
    const { Attributes } = await Unit.build(PutItemCommand)
        .item(unit)
        .send();
    return Attributes;
}

export async function updateUnit(buildingID: string, unitID: string, updates: Partial<UnitData>) {
    const { Attributes } = await Unit.build(UpdateItemCommand)
        .item({ ...updates, buildingID, unitID })
        .send();
    return Attributes;
}

export async function deleteUnit(buildingID: string, unitID: string) {
    await Unit.build(DeleteItemCommand)
        .key({ buildingID, unitID })
        .send();
    return true;
}
