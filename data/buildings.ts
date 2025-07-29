import { BuildingData } from '../src/types';
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

    const buildings = _.map(scanResult.Items, item => _.omit(item, ['unitID', 'created', 'modified', '_et', '_ct', '_md'])) as BuildingData[];
    return buildings;
}

export async function getBuilding(buildingID: string) {
    const { Item } = await Building.build(GetItemCommand)
        .key({ buildingID, unitID: 'BUILDING' })
        .send();
    return Item === undefined ? undefined : _.omit(Item, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as BuildingData;
}

export async function createBuilding(building: BuildingData) {
    const { Attributes } = await Building.build(PutItemCommand)
        .item({ ...building, unitID: 'BUILDING' })
        .options({
            condition: { // Fail if unit already exists
                attr: 'buildingID', exists: false,
            },
            returnValuesOnConditionFalse: 'ALL_OLD',
        })
        .send();
    return (_.omit(Attributes, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as BuildingData) || building;
}

export async function updateBuilding(buildingID: string, updates: Partial<BuildingData>) {
    const { Attributes } = await Building.build(UpdateItemCommand)
        .item({ ...updates, buildingID, unitID: 'BUILDING' })
        .options({ returnValues: 'ALL_NEW' })
        .send();
    return _.omit(Attributes, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as BuildingData;
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
