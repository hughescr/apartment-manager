import { BuildingData, getDefaultBuildingData, BuildingDynamoDBItem } from '../src/types';
import { ApartmentTable, getBuildingEntity, getApartmentTable } from './model';

import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import { GetItemCommand } from 'dynamodb-toolbox/entity/actions/get';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { UpdateItemCommand, $set } from 'dynamodb-toolbox/entity/actions/update';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';

import _ from 'lodash';

import  { logger } from '@hughescr/logger';

// Array fields that require complete replacement (not partial update)
const ARRAY_FIELDS = [
    'photos', 'rentSpecials', 'oneTimeFees', 'monthlyFees',
    'parkingOptions', 'storageOptions', 'propertyAmenities'
] as const;

/**
 * Prepares updates by wrapping EMPTY array fields with $set() for complete replacement
 * Only empty arrays need special handling to persist correctly in DynamoDB
 */
function prepareUpdatesWithArrayReplacement(updates: Partial<BuildingData> & Record<string, unknown>): Record<string, unknown> {
    const preparedUpdates = { ...updates };

    // Apply $set() ONLY to EMPTY array fields to ensure they persist
    for(const field of ARRAY_FIELDS) {
        if(field in updates && _.isArray(updates[field]) && updates[field].length === 0) {
            (preparedUpdates as Record<string, unknown>)[field] = $set([]);
        }
    }

    // Handle nested arrays in petPolicies - only wrap empty arrays
    if(updates.petPolicies && _.isObject(updates.petPolicies)) {
        const petPolicies = updates.petPolicies;
        const updatedPetPolicies = { ...petPolicies };
        let hasEmptyArrays = false;

        if('petTypes' in petPolicies && _.isArray(petPolicies.petTypes) && petPolicies.petTypes.length === 0) {
            (updatedPetPolicies as Record<string, unknown>).petTypes = $set([]);
            hasEmptyArrays = true;
        }
        if('breedRestrictions' in petPolicies && _.isArray(petPolicies.breedRestrictions) && petPolicies.breedRestrictions.length === 0) {
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
    if('photos' in updates && updates.photos !== undefined) {
        mergedData.photos = updates.photos;
    }
    if('rentSpecials' in updates && updates.rentSpecials !== undefined) {
        mergedData.rentSpecials = updates.rentSpecials;
    }
    if('oneTimeFees' in updates && updates.oneTimeFees !== undefined) {
        mergedData.oneTimeFees = updates.oneTimeFees;
    }
    if('monthlyFees' in updates && updates.monthlyFees !== undefined) {
        mergedData.monthlyFees = updates.monthlyFees;
    }
    if('parkingOptions' in updates && updates.parkingOptions !== undefined) {
        mergedData.parkingOptions = updates.parkingOptions;
    }
    if('storageOptions' in updates && updates.storageOptions !== undefined) {
        mergedData.storageOptions = updates.storageOptions;
    }
    if('propertyAmenities' in updates && updates.propertyAmenities !== undefined) {
        mergedData.propertyAmenities = updates.propertyAmenities;
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
    const BuildingEntity = getBuildingEntity();
    const TableInstance = process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test'
        ? getApartmentTable()
        : ApartmentTable;

    const scanResult = await TableInstance.build(ScanCommand)
        .entities(BuildingEntity)
        .options({ consistent: true })
        .send();

    const buildings = _.map(scanResult.Items, (item) => {
        const typedItem = item as BuildingDynamoDBItem;
        const rawBuilding = _.omit(typedItem, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as BuildingData;
        // Convert updatedAt from string to Date if present
        if(typedItem?.updatedAt && _.isString(typedItem.updatedAt)) {
            (rawBuilding as BuildingData & { updatedAt?: Date }).updatedAt = new Date(typedItem.updatedAt);
        }
        // Merge with defaults to ensure all nested structures exist
        return _.merge({}, getDefaultBuildingData(), rawBuilding);
    });
    return buildings;
}

export async function getBuilding(buildingID: string) {
    const BuildingEntity = getBuildingEntity();
    const { Item } = await BuildingEntity.build(GetItemCommand)
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
    const BuildingEntity = getBuildingEntity();
    const { Attributes } = await BuildingEntity.build(PutItemCommand)
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
    const rawBuilding = _.omit(Attributes as Record<string, unknown>, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as BuildingData;
    // Convert updatedAt from string to Date if present
    if((Attributes as Record<string, unknown>).updatedAt) {
        rawBuilding.updatedAt = new Date((Attributes as Record<string, unknown>).updatedAt as string);
    }
    // Merge with defaults to ensure consistency with getBuilding behavior
    return _.merge({}, getDefaultBuildingData(), rawBuilding);
}

export async function updateBuilding(buildingID: string, updates: Partial<BuildingData>) {
    const now = new Date();
    const baseUpdates: Partial<BuildingData> = {
        ...updates,
        buildingID,
        updatedAt: now // Keep as Date for type compatibility
    };

    // Create updates for DB with string timestamp
    // Create updates for DB with string timestamp and required fields
    const dbUpdates: Record<string, unknown> = {
        ...baseUpdates,
        buildingID, // Ensure buildingID is always present
        unitID: 'BUILDING',
        updatedAt: now.toISOString() // Convert to string for DynamoDB
    };

    // Apply $set() for array fields to ensure complete replacement
    const updatesForDB = prepareUpdatesWithArrayReplacement(dbUpdates);

    try {
        // Try UpdateItemCommand first for backward compatibility with existing tests and behavior
        const BuildingEntity = getBuildingEntity();
        const { Attributes } = await BuildingEntity.build(UpdateItemCommand)
            .item(updatesForDB as Record<string, unknown> & { buildingID: string, unitID: string }) // Type assertion needed for $set() operators
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
        // If building doesn't exist (ConditionalCheckFailedException), return undefined
        if(_.isError(error) && error.message.includes('ConditionalCheckFailedException')) {
            return undefined;
        }

        // If UpdateItemCommand fails due to data persistence issues, fall back to PutItemCommand with merge logic
        logger.warn('UpdateItemCommand failed, falling back to PutItemCommand with merge logic:', error);

        try {
            // Get existing building data for proper merging
            const existingBuilding = await getBuilding(buildingID);
            if(!existingBuilding) {
                return undefined; // Building doesn't exist, return undefined instead of throwing
            }

            // Define array fields that should be overwritten, not merged (for debugging)
            // Arrays: photos, rentSpecials, oneTimeFees, monthlyFees, parkingOptions, storageOptions, propertyAmenities
            // Merge the updates with existing data
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

            logger.debug('Merged data for PutItemCommand fallback:', mergedData);

            // Use PutItemCommand as fallback for more reliable data persistence
            const BuildingEntity = getBuildingEntity();
            await BuildingEntity.build(PutItemCommand)
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
        const BuildingEntity = getBuildingEntity();
        await BuildingEntity.build(DeleteItemCommand)
            .key({ buildingID, unitID: 'BUILDING' })
            .send();
        return true;
    } catch(error) {
        logger.error('Error deleting building:', error);
        return false;
    }
}
