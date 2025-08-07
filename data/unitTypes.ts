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
        .options({ consistent: true })
        .send();
    return _.map(Items, (item) => {
        const result = _.omit(item, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as UnitTypeData;
        // Convert updatedAt from string to Date if present
        if(item?.updatedAt) {
            result.updatedAt = new Date(item.updatedAt as string);
        }
        return result;
    }) as UnitTypeData[];
}

export async function getUnitType(buildingID: string, modelID: string) {
    const { Item } = await UnitType.build(GetItemCommand)
        .key({ buildingID, unitID: `MODEL#${modelID}` })
        .send();
    if(!Item) {
        return undefined;
    }
    const result = _.omit(Item, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as UnitTypeData;
    // Convert updatedAt from string to Date if present
    if(Item?.updatedAt) {
        result.updatedAt = new Date(Item.updatedAt as string);
    }
    return result;
}

export async function createUnitType(unitType: UnitTypeData) {
    const now = new Date();
    const { Attributes } = await UnitType.build(PutItemCommand)
        .item({ ...unitType, unitID: `MODEL#${unitType.modelID}`, updatedAt: now.toISOString() })
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
    const result = _.omit(Attributes as Record<string, unknown>, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as UnitTypeData;
    if((Attributes as Record<string, unknown>).updatedAt) {
        result.updatedAt = new Date((Attributes as Record<string, unknown>).updatedAt as string);
    }
    return result;
}

export async function updateUnitType(buildingID: string, modelID: string, updates: Partial<UnitTypeData>) {
    const now = new Date();
    const { Attributes } = await UnitType.build(UpdateItemCommand)
        .item({ ...updates, buildingID, modelID, unitID: `MODEL#${modelID}`, updatedAt: now.toISOString() })
        .options({ returnValues: 'ALL_NEW' })
        .send();
    if(!Attributes) {
        throw new Error('Failed to update unit type');
    }
    const result = _.omit(Attributes as Record<string, unknown>, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as UnitTypeData;
    if((Attributes as Record<string, unknown>).updatedAt) {
        result.updatedAt = new Date((Attributes as Record<string, unknown>).updatedAt as string);
    }
    return result;
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
    const filteredItems = _.filter(Items, ['modelID', modelID]);
    // Remove the UNIT# prefix from unitID and omit metadata fields
    return _.map(filteredItems, item => ({
        ..._.omit(item, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: _.replace(item.unitID || '', /^UNIT#/, '') || item.unitID
    })) as UnitData[];
}
