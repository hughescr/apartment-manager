import { UnitData, VacancyClass, RentSpecial, Amenity } from '../src/types';
import { ApartmentTable, getApartmentTable, getUnitEntity, Unit } from './model';

import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

import { logger } from '@hughescr/logger';
import { assign, isObject, isString, keys, map, mapValues, omit, pickBy, replace } from 'lodash';

// Note: DynamoDB Toolbox .item() calls require 'any' due to library constraints

// This type is no longer used as we switched to Record<string, unknown> for DynamoDB compatibility

// Helper function to convert feed data for database storage
function prepareFeedDataForDB(feedLastPulled?: Partial<Record<string, { timestamp: Date, ipAddress?: string }>>, feedLastModified?: Date): { feedLastPulled?: Record<string, unknown>, feedLastModified?: string } {
    const result: { feedLastPulled?: Record<string, unknown>, feedLastModified?: string } = {};

    if(feedLastPulled && keys(feedLastPulled).length > 0) {
        const filteredPulled = pickBy(feedLastPulled, value => value !== undefined);
        const cleanedPulled = mapValues(filteredPulled, pullData => ({
            timestamp: pullData.timestamp.toISOString(),
            ...(pullData.ipAddress && { ipAddress: pullData.ipAddress })
        }));
        if(keys(cleanedPulled).length > 0) {
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
        unitRentSpecial: rawItem.unitRentSpecial as RentSpecial | undefined,
        unitAmenities: rawItem.unitAmenities as Amenity[] | undefined,
        photos: rawItem.photos as string[] | undefined,
        features: rawItem.features as string[] | undefined,
        notes: rawItem.notes as string | undefined,
        vacancyClass: rawItem.vacancyClass as VacancyClass | undefined,
        vacateDate: rawItem.vacateDate as string | undefined,
        madeReadyDate: rawItem.madeReadyDate as string | undefined,
        feedInclusion: rawItem.feedInclusion as Partial<Record<string, boolean>> | undefined,
        manualReferences: rawItem.manualReferences as Partial<Record<string, string>> | undefined
    };

    // Convert feedLastPulled timestamps from strings to Date objects
    if(rawItem.feedLastPulled && isObject(rawItem.feedLastPulled)) {
        const feedLastPulled = rawItem.feedLastPulled as Record<string, { timestamp: string, ipAddress?: string }>;
        result.feedLastPulled = mapValues(feedLastPulled, pullData => ({
            ...pullData,
            timestamp: new Date(pullData.timestamp)
        }));
    }

    // Convert feedLastModified from string to Date object
    if(rawItem.feedLastModified && isString(rawItem.feedLastModified)) {
        result.feedLastModified = new Date(rawItem.feedLastModified);
    }

    // Convert updatedAt from string to Date object
    if(rawItem.updatedAt && isString(rawItem.updatedAt)) {
        result.updatedAt = new Date(rawItem.updatedAt);
    }

    return result as UnitData;
}

export async function getUnits(buildingID: string) {
    const { Items } = await (getApartmentTable() as typeof ApartmentTable).build(QueryCommand)
    .entities(getUnitEntity() as typeof Unit)
    .query({ partition: buildingID })
    .options({ consistent: true })
    .send();

    // Remove the UNIT# prefix from unitID and convert date strings back to Date objects
    return map(Items, (item) => {
        const rawItem: Record<string, unknown> = {
            ...omit(item, ['created', 'modified', '_et', '_ct', '_md']),
            unitID: replace(item.unitID || '', /^UNIT#/, '') || item.unitID
        };

        const cleanedItem = convertRawItemToUnitData(rawItem);

        return cleanedItem;
    }) as UnitData[];
}

export async function getUnit(buildingID: string, unitID: string) {
    const UnitEntity = getUnitEntity() as typeof Unit;
    const { Item } = await UnitEntity.build(GetItemCommand)
        .key({ buildingID, unitID: `UNIT#${unitID}` })
        .send();
    if(!Item) {
        return undefined;
    }
    // Remove the UNIT# prefix from unitID and convert date strings back to Date objects
    const rawItem: Record<string, unknown> = {
        ...omit(Item, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: replace(Item.unitID || '', /^UNIT#/, '') || Item.unitID
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
    if(feedInclusion && keys(feedInclusion).length > 0) {
        const cleanedInclusion = pickBy(feedInclusion, value => value !== undefined);
        if(keys(cleanedInclusion).length > 0) {
            unitForDB.feedInclusion = cleanedInclusion;
        }
    }

    if(manualReferences && keys(manualReferences).length > 0) {
        const cleanedReferences = pickBy(manualReferences, value => value !== undefined);
        if(keys(cleanedReferences).length > 0) {
            unitForDB.manualReferences = cleanedReferences;
        }
    }

    // Add prepared feed data
    const feedData = prepareFeedDataForDB(feedLastPulled, feedLastModified);
    assign(unitForDB, feedData);

    const UnitEntity = getUnitEntity() as typeof Unit;
    const { Attributes } = await UnitEntity.build(PutItemCommand)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DynamoDB Toolbox .item() requires any for library compatibility
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
        ...omit(Attributes as Record<string, unknown>, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: replace((Attributes as Record<string, unknown>)?.unitID as string || '', /^UNIT#/, '') || (Attributes as Record<string, unknown>)?.unitID as string
    };

    return convertRawItemToUnitData(rawItem);
}

// Helper function to prepare unit data for database operations
function prepareUnitDataForDB(updates: Partial<UnitData>, buildingID: string, unitID: string): Record<string, unknown> {
    const { feedLastPulled, feedLastModified, feedInclusion, manualReferences, ...restUpdates } = updates;
    const now = new Date();
    const updatesForDB: Record<string, unknown> = {
        ...restUpdates,
        buildingID,
        unitID: `UNIT#${unitID}`,
        updatedAt: now.toISOString()
    };

    // Only add fields that have values to avoid partial record issues
    if(feedInclusion && keys(feedInclusion).length > 0) {
        const cleanedInclusion = pickBy(feedInclusion, value => value !== undefined);
        if(keys(cleanedInclusion).length > 0) {
            updatesForDB.feedInclusion = cleanedInclusion;
        }
    }

    if(manualReferences && keys(manualReferences).length > 0) {
        const cleanedReferences = pickBy(manualReferences, value => value !== undefined);
        if(keys(cleanedReferences).length > 0) {
            updatesForDB.manualReferences = cleanedReferences;
        }
    }

    // Add prepared feed data
    const feedData = prepareFeedDataForDB(feedLastPulled, feedLastModified);
    assign(updatesForDB, feedData);

    return updatesForDB;
}

// Helper function to try UpdateItemCommand
async function tryUpdateItemCommand(updatesForDB: Record<string, unknown>): Promise<UnitData | undefined> {
    const UnitEntity = getUnitEntity() as typeof Unit;

    logger.info('tryUpdateItemCommand: Starting DynamoDB update', {
        updatesForDB: JSON.stringify(updatesForDB, null, 2),
        context: 'tryUpdateItemCommand_start'
    });

    const { Attributes } = await UnitEntity.build(UpdateItemCommand)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DynamoDB Toolbox .item() requires any for library compatibility
        .item(updatesForDB as any)
        .options({ returnValues: 'ALL_NEW' })
        .send();

    logger.info('tryUpdateItemCommand: DynamoDB update completed', {
        hasAttributes: !!Attributes,
        attributes: Attributes ? JSON.stringify(Attributes, null, 2) : 'null',
        context: 'tryUpdateItemCommand_completed'
    });

    if(!Attributes) {
        logger.warn('tryUpdateItemCommand: No attributes returned - item may not exist', {
            buildingID: updatesForDB.buildingID,
            unitID: updatesForDB.unitID,
            context: 'tryUpdateItemCommand_no_attributes'
        });
        return undefined;
    }

    // Remove the UNIT# prefix from unitID and convert date strings back to Date objects
    const rawItem: Record<string, unknown> = {
        ...omit(Attributes as Record<string, unknown>, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: replace((Attributes as Record<string, unknown>)?.unitID as string || '', /^UNIT#/, '') || (Attributes as Record<string, unknown>)?.unitID as string
    };

    const convertedResult = convertRawItemToUnitData(rawItem);

    logger.info('tryUpdateItemCommand: Successfully converted result', {
        convertedResult: JSON.stringify(convertedResult, null, 2),
        context: 'tryUpdateItemCommand_success'
    });

    return convertedResult;
}

// Helper function to fallback to PutItemCommand with merge logic
async function fallbackToPutItemCommand(
    buildingID: string,
    unitID: string,
    restUpdates: Partial<UnitData>,
    feedLastPulled?: Partial<Record<string, { timestamp: Date, ipAddress?: string }>>,
    feedLastModified?: Date,
    feedInclusion?: Partial<Record<string, boolean>>,
    manualReferences?: Partial<Record<string, string>>
): Promise<UnitData> {
    // Get existing unit data for proper merging
    const existingUnit = await getUnit(buildingID, unitID);
    if(!existingUnit) {
        throw new Error('Unit not found for update');
    }

    const now = new Date();
    const mergedData = {
        ...existingUnit,
        ...restUpdates,
        buildingID,
        unitID: `UNIT#${unitID}`,
        updatedAt: now.toISOString()
    };

    // Add conditional fields to merged data
    if(feedInclusion && keys(feedInclusion).length > 0) {
        const cleanedInclusion = pickBy(feedInclusion, value => value !== undefined);
        if(keys(cleanedInclusion).length > 0) {
            mergedData.feedInclusion = cleanedInclusion;
        }
    }

    if(manualReferences && keys(manualReferences).length > 0) {
        const cleanedReferences = pickBy(manualReferences, value => value !== undefined);
        if(keys(cleanedReferences).length > 0) {
            mergedData.manualReferences = cleanedReferences;
        }
    }

    const feedData = prepareFeedDataForDB(feedLastPulled, feedLastModified);
    assign(mergedData, feedData);

    // Use PutItemCommand as fallback for more reliable data persistence
    const UnitEntity = getUnitEntity() as typeof Unit;
    await UnitEntity.build(PutItemCommand)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DynamoDB Toolbox .item() requires any for library compatibility
        .item(mergedData as any)
        .send();

    // Return the merged data since PutItemCommand doesn't return the item
    const rawItem: Record<string, unknown> = {
        ...omit(mergedData, ['created', 'modified', '_et', '_ct', '_md']),
        unitID: replace(mergedData.unitID as string || '', /^UNIT#/, '') || mergedData.unitID as string
    };

    return convertRawItemToUnitData(rawItem);
}

export async function updateUnit(buildingID: string, unitID: string, updates: Partial<UnitData>) {
    logger.info('updateUnit called', {
        buildingID,
        unitID,
        updates: JSON.stringify(updates, null, 2),
        context: 'updateUnit_start'
    });

    const { feedLastPulled, feedLastModified, feedInclusion, manualReferences, ...restUpdates } = updates;
    const updatesForDB = prepareUnitDataForDB(updates, buildingID, unitID);

    logger.info('Prepared updates for DB', {
        buildingID,
        unitID,
        updatesForDB: JSON.stringify(updatesForDB, null, 2),
        context: 'updateUnit_prepared_data'
    });

    try {
        // Try UpdateItemCommand first for backward compatibility with existing tests and behavior
        logger.info('Attempting UpdateItemCommand', { buildingID, unitID, context: 'updateUnit_trying_update' });
        const updateResult = await tryUpdateItemCommand(updatesForDB);

        if(updateResult) {
            logger.info('UpdateItemCommand successful', {
                buildingID,
                unitID,
                result: JSON.stringify(updateResult, null, 2),
                context: 'updateUnit_update_success'
            });
            return updateResult;
        } else {
            logger.warn('UpdateItemCommand returned undefined - item may not exist or no changes made', {
                buildingID,
                unitID,
                context: 'updateUnit_update_undefined'
            });
            // Return undefined when UpdateItemCommand returns undefined (indicates item doesn't exist or no changes)
            return undefined;
        }
    } catch(error) {
        // If UpdateItemCommand fails due to data persistence issues, fall back to PutItemCommand with merge logic
        logger.warn('UpdateItemCommand failed, falling back to PutItemCommand with merge logic', {
            error,
            buildingID,
            unitID,
            context: 'updateUnit_update_failed'
        });

        try {
            logger.info('Attempting PutItemCommand fallback', { buildingID, unitID, context: 'updateUnit_trying_put' });
            const putResult = await fallbackToPutItemCommand(buildingID, unitID, restUpdates, feedLastPulled, feedLastModified, feedInclusion, manualReferences);

            logger.info('PutItemCommand fallback successful', {
                buildingID,
                unitID,
                result: JSON.stringify(putResult, null, 2),
                context: 'updateUnit_put_success'
            });
            return putResult;
        } catch(fallbackError) {
            logger.error('Both UpdateItemCommand and PutItemCommand fallback failed', {
                fallbackError,
                buildingID,
                unitID,
                context: 'updateUnit_both_failed'
            });
            throw fallbackError;
        }
    }
}

export async function deleteUnit(buildingID: string, unitID: string): Promise<boolean> {
    try {
        const UnitEntity = getUnitEntity() as typeof Unit;
        await UnitEntity.build(DeleteItemCommand)
            .key({ buildingID, unitID: `UNIT#${unitID}` })
            .send();
        return true;
    } catch(error) {
        logger.error('Error deleting unit:', error);
        return false;
    }
}
