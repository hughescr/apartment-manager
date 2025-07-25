import { UnitTypeData, UnitData } from '../src/types';
import { ApartmentTable, UnitType, Unit } from './model';

import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

import { logger } from '@hughescr/logger';
import _ from 'lodash';

export async function getUnitTypes(buildingID: string) {
    const { Items } = await ApartmentTable.build(QueryCommand)
        .entities(UnitType)
        .query({
            partition: buildingID,
            range: { beginsWith: 'MODEL#' }
        })
        .send();
    return _.map(Items, (item) => {
        const { unitID: _unitID, ...rest } = item;
        return rest;
    }) as UnitTypeData[];
}

export async function getUnitType(buildingID: string, modelID: string) {
    const { Item } = await UnitType.build(GetItemCommand)
        .key({ buildingID, unitID: `MODEL#${modelID}` })
        .send();
    if(!Item) {
        return undefined;
    }
    const { unitID: _unitID, ...rest } = Item;
    return rest as UnitTypeData;
}

export async function createUnitType(unitType: UnitTypeData) {
    const { Attributes } = await UnitType.build(PutItemCommand)
        .item({ ...unitType, unitID: `MODEL#${unitType.modelID}` })
        .options({
            condition: { // Fail if unit type already exists
                and: [
                    { attr: 'buildingID', exists: false },
                    { attr: 'unitID', exists: false },
                ],
            },
            returnValuesOnConditionFalse: 'ALL_OLD',
        })
        .send();
    if(!Attributes) {
        return unitType;
    }
    const { unitID: _unitID, ...rest } = Attributes as unknown as Record<string, unknown>;
    return rest as unknown as UnitTypeData;
}

export async function updateUnitType(buildingID: string, modelID: string, updates: Partial<UnitTypeData>) {
    const { Attributes } = await UnitType.build(UpdateItemCommand)
        .item({ ...updates, buildingID, modelID, unitID: `MODEL#${modelID}` })
        .options({ returnValues: 'ALL_NEW' })
        .send();
    const { unitID: _unitID, ...rest } = Attributes as unknown as Record<string, unknown>;
    return rest as unknown as UnitTypeData;
}

export async function deleteUnitType(buildingID: string, modelID: string): Promise<boolean> {
    try {
        await UnitType.build(DeleteItemCommand)
            .key({ buildingID, unitID: `MODEL#${modelID}` })
            .send();
        return true;
    } catch(error) {
        logger.error('Error deleting unit type:', error);
        return false;
    }
}

export async function getUnitsByModelID(buildingID: string, modelID: string) {
    const { Items } = await ApartmentTable.build(QueryCommand)
        .entities(Unit)
        .query({ partition: buildingID })
        .send();
    return _.filter(Items, ['modelID', modelID]) as UnitData[];
}
