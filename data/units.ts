import { UnitData } from '../src/types';
import { ApartmentTable, Unit } from './model';

import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

import { logger } from '@hughescr/logger';
import _ from 'lodash';

// Type for DynamoDB representation where enums are converted to strings
type UnitDataForDB = Omit<UnitData, 'websiteStatus' | 'listingIds'> & {
    websiteStatus?: Record<string, string>
    listingIds?: Record<string, string>
};

export async function getUnits(buildingID: string) {
    const { Items } = await ApartmentTable.build(QueryCommand)
    .entities(Unit)
    .query({ partition: buildingID })
    .options({ consistent: true })
    .send();
    // Remove the UNIT# prefix from unitID when returning
    return _.map(Items, item => ({
        ..._.omit(item, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: _.replace(item.unitID || '', /^UNIT#/, '') || item.unitID
    })) as UnitData[];
}

export async function getUnit(buildingID: string, unitID: string) {
    const { Item } = await Unit.build(GetItemCommand)
        .key({ buildingID, unitID: `UNIT#${unitID}` })
        .send();
    if(!Item) {
        return undefined;
    }
    // Remove the UNIT# prefix from unitID when returning
    return {
        ..._.omit(Item, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: _.replace(Item.unitID || '', /^UNIT#/, '') || Item.unitID
    } as UnitData;
}

export async function createUnit(unit: UnitData) {
    // Convert enum values to strings for DynamoDB
    const { websiteStatus, listingIds, ...restUnit } = unit;

    const unitForDB: UnitDataForDB = {
        ...restUnit,
        unitID: `UNIT#${unit.unitID}`,
        ...(websiteStatus && {
            websiteStatus: _(websiteStatus)
                .pickBy(value => value !== undefined)
                .mapValues(String)
                .value() as Record<string, string>
        }),
        ...(listingIds && {
            listingIds: _(listingIds)
                .pickBy(value => value !== undefined)
                .mapValues(String)
                .value() as Record<string, string>
        })
    };

    const { Attributes } = await Unit.build(PutItemCommand)
        .item(unitForDB)
        .options({
            condition: { // Fail if unit already exists
                and: [
                    { attr: 'buildingID', exists: false },
                    { attr: 'unitID', exists: false },
                ],
            },
            returnValuesOnConditionFalse: 'ALL_OLD',
        })
        .send();
    if(!Attributes) {
        return unit;
    }
    // Remove the UNIT# prefix from unitID when returning
    const result = Attributes as UnitData & { unitID: string };
    return {
        ..._.omit(result, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: _.replace(result.unitID || '', /^UNIT#/, '') || result.unitID
    } as UnitData;
}

export async function updateUnit(buildingID: string, unitID: string, updates: Partial<UnitData>) {
    // Convert enum values to strings for DynamoDB
    const { websiteStatus, listingIds, ...restUpdates } = updates;

    const updatesForDB = {
        ...restUpdates,
        ...(websiteStatus && {
            websiteStatus: _(websiteStatus)
                .pickBy(value => value !== undefined)
                .mapValues(String)
                .value() as Record<string, string>
        }),
        ...(listingIds && {
            listingIds: _(listingIds)
                .pickBy(value => value !== undefined)
                .mapValues(String)
                .value() as Record<string, string>
        }),
        buildingID,
        unitID: `UNIT#${unitID}`
    };

    const { Attributes } = await Unit.build(UpdateItemCommand)
        .item(updatesForDB)
        .options({ returnValues: 'ALL_NEW' })
        .send();
    if(!Attributes) {
        return undefined;
    }
    // Remove the UNIT# prefix from unitID when returning
    return {
        ..._.omit(Attributes, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: _.replace(Attributes.unitID || '', /^UNIT#/, '') || Attributes.unitID
    } as UnitData;
}

export async function deleteUnit(buildingID: string, unitID: string): Promise<boolean> {
    try {
        await Unit.build(DeleteItemCommand)
            .key({ buildingID, unitID: `UNIT#${unitID}` })
            .send();
        return true;
    } catch(error) {
        logger.error('Error deleting unit:', error);
        return false;
    }
}
