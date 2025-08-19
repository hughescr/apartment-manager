import { BuildingData, getDefaultBuildingData, BuildingDynamoDBItem } from '../src/types';
import { ApartmentTable, getBuildingEntity, getApartmentTable, Building } from './model';

import { QueryCommand } from 'dynamodb-toolbox/table/actions/query';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand, $set } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

import { isArray, isError, isObject, isString, map, merge, omit } from 'lodash';
import _ from 'lodash';

import  { logger } from '@hughescr/logger';

// Array fields that require complete replacement (not partial update)
const ARRAY_FIELDS = [
    'photos', 'rentSpecials', 'oneTimeFees', 'monthlyFees',
    'parkingOptions', 'storageOptions', 'propertyAmenities', 'propertyHighlights'
] as const;

/**
 * Prepares updates by wrapping EMPTY array fields with $set() for complete replacement
 * Only empty arrays need special handling to persist correctly in DynamoDB
 */
function prepareUpdatesWithArrayReplacement(updates: Partial<BuildingData> & Record<string, unknown>): Record<string, unknown> {
    const preparedUpdates = { ...updates };

    // Apply $set() to ALL array fields to ensure complete replacement (not partial update)
    for(const field of ARRAY_FIELDS) {
        if(field in updates && isArray(updates[field])) {
            (preparedUpdates as Record<string, unknown>)[field] = $set(updates[field]);
        }
    }

    // Handle nested arrays in petPolicies - only wrap empty arrays
    if(updates.petPolicies && isObject(updates.petPolicies)) {
        const petPolicies = updates.petPolicies;
        const updatedPetPolicies = { ...petPolicies };
        let hasEmptyArrays = false;

        if('petTypes' in petPolicies && isArray(petPolicies.petTypes) && petPolicies.petTypes.length === 0) {
            (updatedPetPolicies as Record<string, unknown>).petTypes = $set([]);
            hasEmptyArrays = true;
        }
        if('breedRestrictions' in petPolicies && isArray(petPolicies.breedRestrictions) && petPolicies.breedRestrictions.length === 0) {
            (updatedPetPolicies as Record<string, unknown>).breedRestrictions = $set([]);
            hasEmptyArrays = true;
        }

        if(hasEmptyArrays) {
            preparedUpdates.petPolicies = updatedPetPolicies;
        }
    }

    return preparedUpdates;
}

/**
 * Handles explicit array field overwrites to ensure empty arrays persist correctly
 */
function handleArrayFieldOverwrites(mergedData: Record<string, unknown>, updates: Partial<BuildingData>): void {
    // Handle array fields explicitly - if they exist in updates, use them as-is (including empty arrays)
    for(const field of ARRAY_FIELDS) {
        if(field in updates && (updates as Record<string, unknown>)[field] !== undefined) {
            mergedData[field] = (updates as Record<string, unknown>)[field];
        }
    }
}

/**
 * Handles nested array overwrites within petPolicies to ensure empty arrays persist correctly
 */
function handlePetPolicyArrayOverwrites(mergedData: Record<string, unknown>, existingBuilding: BuildingData, updates: Partial<BuildingData>): void {
    if(updates.petPolicies) {
        mergedData.petPolicies = {
            ...existingBuilding.petPolicies,
            ...updates.petPolicies
        };

        // Handle nested arrays within petPolicies with proper type casting
        const petPolicies = mergedData.petPolicies as BuildingData['petPolicies'];
        if(updates.petPolicies && 'petTypes' in updates.petPolicies && updates.petPolicies.petTypes !== undefined && petPolicies) {
            petPolicies.petTypes = updates.petPolicies.petTypes;
        }
        if(updates.petPolicies && 'breedRestrictions' in updates.petPolicies && updates.petPolicies.breedRestrictions !== undefined && petPolicies) {
            petPolicies.breedRestrictions = updates.petPolicies.breedRestrictions;
        }
    }
}

export async function getBuildings() {
    const BuildingEntity = getBuildingEntity() as typeof Building;
    const TableInstance = (process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test'
        ? getApartmentTable()
        : ApartmentTable) as typeof ApartmentTable;

    // Use QueryCommand with GSI to efficiently get all buildings (unitID = 'BUILDING')
    const queryResult = await TableInstance.build(QueryCommand)
        .entities(BuildingEntity)
        .query({
            index: 'unitTypeIndex',
            partition: 'BUILDING'
        })
        .options({ consistent: false }) // GSI queries cannot be strongly consistent
        .send();

    const buildings = map(queryResult.Items, (item) => {
        const typedItem = item as unknown as BuildingDynamoDBItem;
        const rawBuilding = omit(typedItem, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as BuildingData;
        // Convert updatedAt from string to Date if present
        if(typedItem?.updatedAt && isString(typedItem.updatedAt)) {
            (rawBuilding as BuildingData & { updatedAt?: Date }).updatedAt = new Date(typedItem.updatedAt);
        }
        // Use defaults as base and merge actual data on top to preserve non-empty values
        const defaults = getDefaultBuildingData();
        const result = merge({}, defaults, rawBuilding);

        // Ensure actual values aren't overwritten by empty defaults for top-level string fields
        if(rawBuilding.zip !== undefined) {
            result.zip = rawBuilding.zip;
        }
        if(rawBuilding.street !== undefined) {
            result.street = rawBuilding.street;
        }
        if(rawBuilding.city !== undefined) {
            result.city = rawBuilding.city;
        }
        if(rawBuilding.state !== undefined) {
            result.state = rawBuilding.state;
        }

        // Ensure nested fields are preserved
        if(rawBuilding.contactInfo) {
            result.contactInfo = merge({}, defaults.contactInfo || {}, rawBuilding.contactInfo);
        }

        return result;
    });
    return buildings;
}

export async function getBuilding(buildingID: string) {
    const BuildingEntity = getBuildingEntity() as typeof Building;
    const { Item } = await BuildingEntity.build(GetItemCommand)
        .key({ buildingID, unitID: 'BUILDING' })
        .send();

    if(Item === undefined) {
        return undefined;
    }

    const rawBuilding = omit(Item, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as BuildingData;
    // Convert updatedAt from string to Date if present
    if(Item?.updatedAt) {
        rawBuilding.updatedAt = new Date(Item.updatedAt as string);
    }
    // Start with defaults, then overlay actual data to preserve all fields including empty strings
    const defaults = getDefaultBuildingData();
    const result = { ...defaults } as BuildingData;

    // Apply all fields from rawBuilding, preserving even empty strings and undefined
    _(rawBuilding)
        .keys()
        .forEach((key) => {
            const typedKey = key as keyof BuildingData;
            const value = rawBuilding[typedKey];
            // For nested objects like contactInfo, replace entirely rather than merging
            if(typedKey === 'contactInfo' && value !== undefined) {
                result.contactInfo = value as typeof result.contactInfo;
            } else if(value !== undefined) {
                (result as unknown as Record<string, unknown>)[typedKey] = value;
            }
        });

    return result;
}

export async function createBuilding(building: BuildingData) {
    const now = new Date();
    const BuildingEntity = getBuildingEntity() as typeof Building;

    // Prepare the item that will be stored in DynamoDB
    const itemToStore = { ...building, unitID: 'BUILDING', updatedAt: now.toISOString() };

    try {
        const { Attributes } = await BuildingEntity.build(PutItemCommand)
            .item(itemToStore)
            .options({
                condition: { // Fail if unit already exists
                    attr: 'buildingID', exists: false,
                },
                returnValuesOnConditionFalse: 'ALL_OLD',
            })
            .send();

        if(Attributes) {
            // Condition failed - item already exists, return the existing building
            const existingData = Attributes as Record<string, unknown>;
            // If ALL_OLD returned empty object, there was no existing item, so return what we stored
            if(_.keys(existingData).length === 0) {
                return formatBuildingResult(itemToStore);
            }
            return formatBuildingResult(existingData);
        }
        // Item was created successfully, return the processed building data (what we actually stored)
        // Since PutItemCommand with NONE doesn't return the item, we return our processed data
        return formatBuildingResult(itemToStore);
    } catch(error) {
        // If there's any error, log it and re-throw
        logger.error('Error in createBuilding:', error);
        throw error;
    }
}

/**
 * Prepares update data with proper timestamps and database fields
 */
function prepareUpdateData(buildingID: string, updates: Partial<BuildingData>, now: Date): Record<string, unknown> {
    const baseUpdates: Partial<BuildingData> = {
        ...updates,
        buildingID,
        updatedAt: now // Keep as Date for type compatibility
    };

    // Create updates for DB with string timestamp and required fields
    const dbUpdates: Record<string, unknown> = {
        ...baseUpdates,
        buildingID, // Ensure buildingID is always present
        unitID: 'BUILDING',
        updatedAt: now.toISOString() // Convert to string for DynamoDB
    };

    // Apply $set() for array fields to ensure complete replacement
    return prepareUpdatesWithArrayReplacement(dbUpdates);
}

/**
 * Formats DynamoDB attributes to BuildingData format
 */
function formatBuildingResult(attributes: Record<string, unknown>): BuildingData {
    const result = omit(attributes, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as BuildingData;
    if(attributes.updatedAt) {
        result.updatedAt = new Date(attributes.updatedAt as string);
    }
    return result;
}

/**
 * Attempts direct update using UpdateItemCommand
 */
async function performDirectUpdate(_buildingID: string, updatesForDB: Record<string, unknown>): Promise<BuildingData | undefined> {
    const BuildingEntity = getBuildingEntity() as typeof Building;
    const { Attributes } = await BuildingEntity.build(UpdateItemCommand)
        .item(updatesForDB as Record<string, unknown> & { buildingID: string, unitID: string }) // Type assertion needed for $set() operators
        .options({ returnValues: 'ALL_NEW' })
        .send();

    if(!Attributes) {
        return undefined;
    }

    return formatBuildingResult(Attributes as Record<string, unknown>);
}

/**
 * Merges updates with existing building data, handling array field overwrites
 */
function mergeWithExistingData(
    existingBuilding: BuildingData,
    updates: Partial<BuildingData>,
    buildingID: string,
    now: Date
): Record<string, unknown> {
    const mergedData = {
        ...existingBuilding,
        ...updates,
        buildingID,
        unitID: 'BUILDING',
        updatedAt: now.toISOString()
    };

    // Handle array field overwrites using extracted function
    handleArrayFieldOverwrites(mergedData, updates);

    // Handle petPolicies nested arrays using extracted function
    handlePetPolicyArrayOverwrites(mergedData, existingBuilding, updates);

    return mergedData;
}

/**
 * Performs fallback update using PutItemCommand with proper data merging
 */
async function performFallbackUpdate(
    buildingID: string,
    updates: Partial<BuildingData>,
    now: Date
): Promise<BuildingData | undefined> {
    // Get existing building data for proper merging
    const existingBuilding = await getBuilding(buildingID);
    if(!existingBuilding) {
        return undefined; // Building doesn't exist, return undefined instead of throwing
    }

    const mergedData = mergeWithExistingData(existingBuilding, updates, buildingID, now);

    logger.debug('Merged data for PutItemCommand fallback:', mergedData);

    // Use PutItemCommand as fallback for more reliable data persistence
    const BuildingEntity = getBuildingEntity() as typeof Building;
    await BuildingEntity.build(PutItemCommand)
        .item(mergedData as Record<string, unknown> & { buildingID: string, unitID: string })
        .send();

    // Return the merged data since PutItemCommand doesn't return the item
    const result = omit(mergedData, ['unitID']) as unknown as BuildingData;
    if(mergedData.updatedAt) {
        result.updatedAt = new Date(mergedData.updatedAt as string);
    }
    return result;
}

export async function updateBuilding(buildingID: string, updates: Partial<BuildingData>): Promise<BuildingData | undefined> {
    const now = new Date();
    const updatesForDB = prepareUpdateData(buildingID, updates, now);

    try {
        // Try UpdateItemCommand first for backward compatibility with existing tests and behavior
        return await performDirectUpdate(buildingID, updatesForDB);
    } catch(error) {
        // If building doesn't exist (ConditionalCheckFailedException), return undefined
        if(isError(error) && error.message.includes('ConditionalCheckFailedException')) {
            return undefined;
        }

        // If UpdateItemCommand fails due to data persistence issues, fall back to PutItemCommand with merge logic
        logger.warn('UpdateItemCommand failed, falling back to PutItemCommand with merge logic:', error);

        try {
            return await performFallbackUpdate(buildingID, updates, now);
        } catch(fallbackError) {
            logger.error('Both UpdateItemCommand and PutItemCommand fallback failed:', fallbackError);
            throw fallbackError;
        }
    }
}

export async function deleteBuilding(buildingID: string): Promise<boolean> {
    try {
        const BuildingEntity = getBuildingEntity() as typeof Building;
        await BuildingEntity.build(DeleteItemCommand)
            .key({ buildingID, unitID: 'BUILDING' })
            .send();
        return true;
    } catch(error) {
        logger.error('Error deleting building:', error);
        return false;
    }
}
