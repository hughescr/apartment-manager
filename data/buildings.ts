import { BuildingData, getDefaultBuildingData } from '../src/types';
import { ApartmentTable, Building } from './model';

import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

import _ from 'lodash';

import  { logger } from '@hughescr/logger';

export async function getBuildings() {
    const scanResult = await ApartmentTable.build(ScanCommand)
        .entities(Building)
        .options({ consistent: true })
        .send();

    const buildings = _.map(scanResult.Items, (item) => {
        const rawBuilding = _.omit(item, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as BuildingData;
        // Convert updatedAt from string to Date if present
        if(item?.updatedAt) {
            rawBuilding.updatedAt = new Date(item.updatedAt as string);
        }
        // Merge with defaults to ensure all nested structures exist
        return _.merge({}, getDefaultBuildingData(), rawBuilding);
    });
    return buildings;
}

export async function getBuilding(buildingID: string) {
    const { Item } = await Building.build(GetItemCommand)
        .key({ buildingID, unitID: 'BUILDING' })
        .send();

    if(Item === undefined) {
        return undefined;
    }

    const rawBuilding = _.omit(Item, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as BuildingData;
    // Convert updatedAt from string to Date if present
    if(Item?.updatedAt) {
        rawBuilding.updatedAt = new Date(Item.updatedAt as string);
    }
    // Merge with defaults to ensure all nested structures exist
    return _.merge({}, getDefaultBuildingData(), rawBuilding);
}

export async function createBuilding(building: BuildingData) {
    const now = new Date();
    const { Attributes } = await Building.build(PutItemCommand)
        .item({ ...building, unitID: 'BUILDING', updatedAt: now.toISOString() })
        .options({
            condition: { // Fail if unit already exists
                attr: 'buildingID', exists: false,
            },
            returnValuesOnConditionFalse: 'ALL_OLD',
        })
        .send();
    if(!Attributes) {
        return building;
    }
    const result = _.omit(Attributes as Record<string, unknown>, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as BuildingData;
    if((Attributes as Record<string, unknown>).updatedAt) {
        result.updatedAt = new Date((Attributes as Record<string, unknown>).updatedAt as string);
    }
    return result;
}

export async function updateBuilding(buildingID: string, updates: Partial<BuildingData>) {
    const now = new Date();
    const updatesForDB = {
        ...updates,
        buildingID,
        unitID: 'BUILDING',
        updatedAt: now.toISOString()
    };

    try {
        // Try UpdateItemCommand first for backward compatibility with existing tests and behavior
        const { Attributes } = await Building.build(UpdateItemCommand)
            .item(updatesForDB)
            .options({ returnValues: 'ALL_NEW' })
            .send();

        if(!Attributes) {
            return undefined;
        }

        const result = _.omit(Attributes as Record<string, unknown>, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as BuildingData;
        if((Attributes as Record<string, unknown>).updatedAt) {
            result.updatedAt = new Date((Attributes as Record<string, unknown>).updatedAt as string);
        }
        return result;
    } catch(error) {
        // If UpdateItemCommand fails due to data persistence issues, fall back to PutItemCommand with merge logic
        logger.warn('UpdateItemCommand failed, falling back to PutItemCommand with merge logic:', error);

        try {
            // Get existing building data for proper merging
            const existingBuilding = await getBuilding(buildingID);
            if(!existingBuilding) {
                throw new Error('Building not found for update');
            }

            // Merge the updates with existing data
            const mergedData = {
                ...existingBuilding,
                ...updates,
                buildingID,
                unitID: 'BUILDING',
                updatedAt: now.toISOString()
            };

            // Use PutItemCommand as fallback for more reliable data persistence
            await Building.build(PutItemCommand)
                .item(mergedData)
                .send();

            // Return the merged data since PutItemCommand doesn't return the item
            const result = _.omit(mergedData, ['unitID']) as unknown as BuildingData;
            if(mergedData.updatedAt) {
                result.updatedAt = new Date(mergedData.updatedAt as string);
            }
            return result;
        } catch(fallbackError) {
            logger.error('Both UpdateItemCommand and PutItemCommand fallback failed:', fallbackError);
            throw fallbackError;
        }
    }
}

export async function deleteBuilding(buildingID: string): Promise<boolean> {
    try {
        await Building.build(DeleteItemCommand)
            .key({ buildingID, unitID: 'BUILDING' })
            .send();
        return true;
    } catch(error) {
        logger.error('Error deleting building:', error);
        return false;
    }
}
