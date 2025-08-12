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

// Helper function to prepare unit type data for database operations
function prepareUnitTypeDataForDB(updates: Partial<UnitTypeData>, buildingID: string, modelID: string): Record<string, unknown> {
    const now = new Date();
    return {
        ...updates,
        buildingID,
        modelID,
        unitID: `MODEL#${modelID}`,
        updatedAt: now.toISOString()
    };
}

// Helper function to convert database item to UnitTypeData
function convertItemToUnitTypeData(item: Record<string, unknown>): UnitTypeData {
    const result = _.omit(item, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as UnitTypeData;
    if(item.updatedAt) {
        result.updatedAt = new Date(item.updatedAt as string);
    }
    return result;
}

// Helper function to try UpdateItemCommand
async function tryUpdateUnitTypeCommand(updatesForDB: Record<string, unknown>): Promise<UnitTypeData | undefined> {
    // updatesForDB is guaranteed to have buildingID and unitID from prepareUnitTypeDataForDB
    const typedUpdates = updatesForDB as Record<string, unknown> & { buildingID: string, unitID: string };
    const { Attributes } = await UnitType.build(UpdateItemCommand)
        .item(typedUpdates)
        .options({ returnValues: 'ALL_NEW' })
        .send();

    if(!Attributes) {
        return undefined;
    }

    return convertItemToUnitTypeData(Attributes as Record<string, unknown>);
}

// Helper function to fallback to PutItemCommand with merge logic
async function fallbackToPutItemCommandForUnitType(buildingID: string, modelID: string, updates: Partial<UnitTypeData>): Promise<UnitTypeData> {
    // Get existing unit type data for proper merging
    const existingUnitType = await getUnitType(buildingID, modelID);
    if(!existingUnitType) {
        throw new Error('Unit type not found for update');
    }

    const now = new Date();
    const mergedData = {
        ...existingUnitType,
        ...updates,
        buildingID,
        modelID,
        unitID: `MODEL#${modelID}`,
        updatedAt: now.toISOString()
    };

    // Use PutItemCommand as fallback for more reliable data persistence
    await UnitType.build(PutItemCommand)
        .item(mergedData)
        .send();

    // Return the merged data since PutItemCommand doesn't return the item
    return convertItemToUnitTypeData(mergedData);
}

export async function updateUnitType(buildingID: string, modelID: string, updates: Partial<UnitTypeData>) {
    const updatesForDB = prepareUnitTypeDataForDB(updates, buildingID, modelID);

    try {
        // Try UpdateItemCommand first for backward compatibility with existing tests and behavior
        const result = await tryUpdateUnitTypeCommand(updatesForDB);
        if(result) {
            return result;
        }
        // If UpdateItemCommand returns undefined Attributes, fall back to PutItemCommand
        logger.warn('UpdateItemCommand returned undefined Attributes, falling back to PutItemCommand with merge logic');
        return await fallbackToPutItemCommandForUnitType(buildingID, modelID, updates);
    } catch(error) {
        // If UpdateItemCommand fails due to data persistence issues, fall back to PutItemCommand with merge logic
        logger.warn('UpdateItemCommand failed, falling back to PutItemCommand with merge logic:', error);

        try {
            return await fallbackToPutItemCommandForUnitType(buildingID, modelID, updates);
        } catch(fallbackError) {
            logger.error('Both UpdateItemCommand and PutItemCommand fallback failed:', fallbackError);
            throw fallbackError;
        }
    }
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
