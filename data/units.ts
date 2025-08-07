import { UnitData } from '../src/types';
import { ApartmentTable, Unit } from './model';

import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

import { logger } from '@hughescr/logger';
import _ from 'lodash';

// This type is no longer used as we switched to Record<string, unknown> for DynamoDB compatibility

// Helper function to convert feed data for database storage
function prepareFeedDataForDB(feedLastPulled?: Partial<Record<string, { timestamp: Date, ipAddress?: string }>>, feedLastModified?: Date): { feedLastPulled?: Record<string, unknown>, feedLastModified?: string } {
    const result: { feedLastPulled?: Record<string, unknown>, feedLastModified?: string } = {};

    if(feedLastPulled && _.keys(feedLastPulled).length > 0) {
        const filteredPulled = _.pickBy(feedLastPulled, value => value !== undefined);
        const cleanedPulled = _.mapValues(filteredPulled, pullData => ({
            timestamp: pullData.timestamp.toISOString(),
            ...(pullData.ipAddress && { ipAddress: pullData.ipAddress })
        }));
        if(_.keys(cleanedPulled).length > 0) {
            result.feedLastPulled = cleanedPulled;
        }
    }

    if(feedLastModified) {
        result.feedLastModified = feedLastModified.toISOString();
    }

    return result;
}

// Helper function to convert raw database item to UnitData
function convertRawItemToUnitData(rawItem: Record<string, unknown>): UnitData {
    const result: Partial<UnitData> = {
        buildingID: rawItem.buildingID as string,
        unitID: rawItem.unitID as string,
        description: rawItem.description as string | undefined,
        beds: rawItem.beds as number | undefined,
        baths: rawItem.baths as number | undefined,
        sqft: rawItem.sqft as number | undefined,
        rent: rawItem.rent as number | undefined,
        occupied: rawItem.occupied as boolean | undefined,
        availableDate: rawItem.availableDate as string | undefined,
        modelID: rawItem.modelID as string | undefined,
        unitNumber: rawItem.unitNumber as string | undefined,
        maxOccupants: rawItem.maxOccupants as number | undefined,
        perPersonRent: rawItem.perPersonRent as number | undefined,
        deposit: rawItem.deposit as number | undefined,
        minLeaseTerm: rawItem.minLeaseTerm as number | undefined,
        maxLeaseTerm: rawItem.maxLeaseTerm as number | undefined,
        unitDescription: rawItem.unitDescription as string | undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex nested types from DynamoDB
        unitRentSpecial: rawItem.unitRentSpecial as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Complex nested types from DynamoDB
        unitAmenities: rawItem.unitAmenities as any[] | undefined,
        photos: rawItem.photos as string[] | undefined,
        features: rawItem.features as string[] | undefined,
        notes: rawItem.notes as string | undefined,
        feedInclusion: rawItem.feedInclusion as Partial<Record<string, boolean>> | undefined,
        manualReferences: rawItem.manualReferences as Partial<Record<string, string>> | undefined
    };

    // Convert feedLastPulled timestamps from strings to Date objects
    if(rawItem.feedLastPulled && _.isObject(rawItem.feedLastPulled)) {
        const feedLastPulled = rawItem.feedLastPulled as Record<string, { timestamp: string, ipAddress?: string }>;
        result.feedLastPulled = _.mapValues(feedLastPulled, pullData => ({
            ...pullData,
            timestamp: new Date(pullData.timestamp)
        }));
    }

    // Convert feedLastModified from string to Date object
    if(rawItem.feedLastModified && _.isString(rawItem.feedLastModified)) {
        result.feedLastModified = new Date(rawItem.feedLastModified);
    }

    // Convert updatedAt from string to Date object
    if(rawItem.updatedAt && _.isString(rawItem.updatedAt)) {
        result.updatedAt = new Date(rawItem.updatedAt);
    }

    return result as UnitData;
}

export async function getUnits(buildingID: string) {
    const { Items } = await ApartmentTable.build(QueryCommand)
    .entities(Unit)
    .query({ partition: buildingID })
    .options({ consistent: true })
    .send();
    // Remove the UNIT# prefix from unitID and convert date strings back to Date objects
    return _.map(Items, (item) => {
        const rawItem: Record<string, unknown> = {
            ..._.omit(item, ['created', 'modified', '_et', '_ct', '_md']),
            unitID: _.replace(item.unitID || '', /^UNIT#/, '') || item.unitID
        };

        const cleanedItem = convertRawItemToUnitData(rawItem);

        return cleanedItem;
    }) as UnitData[];
}

export async function getUnit(buildingID: string, unitID: string) {
    const { Item } = await Unit.build(GetItemCommand)
        .key({ buildingID, unitID: `UNIT#${unitID}` })
        .send();
    if(!Item) {
        return undefined;
    }
    // Remove the UNIT# prefix from unitID and convert date strings back to Date objects
    const rawItem: Record<string, unknown> = {
        ..._.omit(Item, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: _.replace(Item.unitID || '', /^UNIT#/, '') || Item.unitID
    };

    return convertRawItemToUnitData(rawItem);
}

export async function createUnit(unit: UnitData) {
    // Convert Date objects to strings for DynamoDB and filter undefined values
    const { feedLastPulled, feedLastModified, feedInclusion, manualReferences, ...restUnit } = unit;

    const now = new Date();
    const unitForDB: Record<string, unknown> = {
        ...restUnit,
        unitID: `UNIT#${unit.unitID}`,
        updatedAt: now.toISOString()
    };

    // Only add fields that have values to avoid partial record issues
    if(feedInclusion && _.keys(feedInclusion).length > 0) {
        const cleanedInclusion = _.pickBy(feedInclusion, value => value !== undefined);
        if(_.keys(cleanedInclusion).length > 0) {
            unitForDB.feedInclusion = cleanedInclusion;
        }
    }

    if(manualReferences && _.keys(manualReferences).length > 0) {
        const cleanedReferences = _.pickBy(manualReferences, value => value !== undefined);
        if(_.keys(cleanedReferences).length > 0) {
            unitForDB.manualReferences = cleanedReferences;
        }
    }

    // Add prepared feed data
    const feedData = prepareFeedDataForDB(feedLastPulled, feedLastModified);
    _.assign(unitForDB, feedData);

    const { Attributes } = await Unit.build(PutItemCommand)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DynamoDB Toolbox requires any for complex item types
        .item(unitForDB as any)
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
    // Remove the UNIT# prefix from unitID and convert date strings back to Date objects
    const rawItem: Record<string, unknown> = {
        ..._.omit(Attributes as Record<string, unknown>, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: _.replace((Attributes as Record<string, unknown>)?.unitID as string || '', /^UNIT#/, '') || (Attributes as Record<string, unknown>)?.unitID as string
    };

    return convertRawItemToUnitData(rawItem);
}

export async function updateUnit(buildingID: string, unitID: string, updates: Partial<UnitData>) {
    // Convert Date objects to strings for DynamoDB and filter undefined values
    const { feedLastPulled, feedLastModified, feedInclusion, manualReferences, ...restUpdates } = updates;

    const now = new Date();
    const updatesForDB: Record<string, unknown> = {
        ...restUpdates,
        buildingID,
        unitID: `UNIT#${unitID}`,
        updatedAt: now.toISOString()
    };

    // Only add fields that have values to avoid partial record issues
    if(feedInclusion && _.keys(feedInclusion).length > 0) {
        const cleanedInclusion = _.pickBy(feedInclusion, value => value !== undefined);
        if(_.keys(cleanedInclusion).length > 0) {
            updatesForDB.feedInclusion = cleanedInclusion;
        }
    }

    if(manualReferences && _.keys(manualReferences).length > 0) {
        const cleanedReferences = _.pickBy(manualReferences, value => value !== undefined);
        if(_.keys(cleanedReferences).length > 0) {
            updatesForDB.manualReferences = cleanedReferences;
        }
    }

    // Add prepared feed data
    const feedData = prepareFeedDataForDB(feedLastPulled, feedLastModified);
    _.assign(updatesForDB, feedData);
    const { Attributes } = await Unit.build(UpdateItemCommand)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DynamoDB Toolbox requires any for complex item types
        .item(updatesForDB as any)
        .options({ returnValues: 'ALL_NEW' })
        .send();
    if(!Attributes) {
        return undefined;
    }
    // Remove the UNIT# prefix from unitID and convert date strings back to Date objects
    const rawItem: Record<string, unknown> = {
        ..._.omit(Attributes as Record<string, unknown>, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: _.replace((Attributes as Record<string, unknown>)?.unitID as string || '', /^UNIT#/, '') || (Attributes as Record<string, unknown>)?.unitID as string
    };

    return convertRawItemToUnitData(rawItem);
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
