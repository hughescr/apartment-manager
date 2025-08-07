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
    const { Attributes } = await Building.build(UpdateItemCommand)
        .item({ ...updates, buildingID, unitID: 'BUILDING', updatedAt: now.toISOString() })
        .options({ returnValues: 'ALL_NEW' })
        .send();
    if(!Attributes) {
        throw new Error('Failed to update building');
    }
    const result = _.omit(Attributes as Record<string, unknown>, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as BuildingData;
    if((Attributes as Record<string, unknown>).updatedAt) {
        result.updatedAt = new Date((Attributes as Record<string, unknown>).updatedAt as string);
    }
    return result;
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
