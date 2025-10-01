import { BuildingData, UnitData, UnitTypeData, getDefaultBuildingData } from '../src/types';
import { ApartmentTable, getApartmentTable } from './model';
import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import { logger } from '@hughescr/logger';
import { isString, map, omit, merge, replace, mapValues, groupBy, filter, isObject, forEach } from 'lodash';
import _ from 'lodash';

/**
 * Interface for the unified all-data response
 * This structure maintains compatibility with existing frontend components
 * while providing all data in a single response
 */
export interface AllDataResponse {
    buildings:           BuildingData[]
    unitsByBuilding:     Record<string, UnitData[]>
    unitTypesByBuilding: Record<string, UnitTypeData[]>
}

/**
 * Raw DynamoDB item type for processing scan results
 */
type RawDynamoDBItem = Record<string, unknown> & {
    buildingID: string
    unitID:     string
    updatedAt?: string
    created?:   unknown
    modified?:  unknown
    _et?:       unknown
    _ct?:       unknown
    _md?:       unknown
};

/**
 * Helper function to convert feed data from DynamoDB format to UnitData format
 */
function convertFeedDataFromDB(rawItem: RawDynamoDBItem): {
    feedLastPulled?:   Partial<Record<string, { timestamp: Date, ipAddress?: string }>>
    feedLastModified?: Date
} {
    const result: {
        feedLastPulled?:   Partial<Record<string, { timestamp: Date, ipAddress?: string }>>
        feedLastModified?: Date
    } = {};

    if(rawItem.feedLastPulled && isObject(rawItem.feedLastPulled)) {
        const feedLastPulled = rawItem.feedLastPulled as Record<string, { timestamp: string, ipAddress?: string }>;
        result.feedLastPulled = mapValues(feedLastPulled, pullData => ({
            ...pullData,
            timestamp: new Date(pullData.timestamp)
        }));
    }

    if(rawItem.feedLastModified && isString(rawItem.feedLastModified)) {
        result.feedLastModified = new Date(rawItem.feedLastModified);
    }

    return result;
}

/**
 * Convert raw DynamoDB building item to BuildingData
 */
function convertRawItemToBuildingData(rawItem: RawDynamoDBItem): BuildingData {
    const cleanItem = omit(rawItem, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as BuildingData;

    // Convert updatedAt from string to Date if present
    if(rawItem.updatedAt && isString(rawItem.updatedAt)) {
        cleanItem.updatedAt = new Date(rawItem.updatedAt);
    }

    // Use defaults as base and merge actual data on top to preserve non-empty values
    const defaults = getDefaultBuildingData();
    const result = merge({}, defaults, cleanItem);

    // Ensure actual values aren't overwritten by empty defaults for top-level string fields
    if(cleanItem.zip !== undefined) {
        result.zip = cleanItem.zip;
    }
    if(cleanItem.street !== undefined) {
        result.street = cleanItem.street;
    }
    if(cleanItem.city !== undefined) {
        result.city = cleanItem.city;
    }
    if(cleanItem.state !== undefined) {
        result.state = cleanItem.state;
    }

    // Ensure nested fields are preserved
    if(cleanItem.contactInfo) {
        result.contactInfo = merge({}, defaults.contactInfo || {}, cleanItem.contactInfo);
    }

    return result;
}

/**
 * Convert raw DynamoDB unit item to UnitData
 */
function convertRawItemToUnitData(rawItem: RawDynamoDBItem): UnitData {
    const result: Partial<UnitData> = {
        buildingID:       rawItem.buildingID,
        unitID:           replace(rawItem.unitID, /^UNIT#/, ''), // Remove UNIT# prefix
        description:      rawItem.description as string | undefined,
        beds:             rawItem.beds as number | undefined,
        baths:            rawItem.baths as number | undefined,
        sqft:             rawItem.sqft as number | undefined,
        rent:             rawItem.rent as number | undefined,
        occupied:         rawItem.occupied as boolean | undefined,
        availableDate:    rawItem.availableDate as string | undefined,
        modelID:          rawItem.modelID as string | undefined,
        unitNumber:       rawItem.unitNumber as string | undefined,
        maxOccupants:     rawItem.maxOccupants as number | undefined,
        perPersonRent:    rawItem.perPersonRent as number | undefined,
        deposit:          rawItem.deposit as number | undefined,
        minLeaseTerm:     rawItem.minLeaseTerm as number | undefined,
        maxLeaseTerm:     rawItem.maxLeaseTerm as number | undefined,
        unitDescription:  rawItem.unitDescription as string | undefined,
        unitRentSpecial:  rawItem.unitRentSpecial as UnitData['unitRentSpecial'],
        unitAmenities:    rawItem.unitAmenities as UnitData['unitAmenities'],
        photos:           rawItem.photos as string[] | undefined,
        features:         rawItem.features as string[] | undefined,
        notes:            rawItem.notes as string | undefined,
        vacancyClass:     rawItem.vacancyClass as UnitData['vacancyClass'],
        vacateDate:       rawItem.vacateDate as string | undefined,
        madeReadyDate:    rawItem.madeReadyDate as string | undefined,
        feedInclusion:    rawItem.feedInclusion as Partial<Record<string, boolean>> | undefined,
        manualReferences: rawItem.manualReferences as Partial<Record<string, string>> | undefined
    };

    // Convert feed data from strings to Date objects
    const feedData = convertFeedDataFromDB(rawItem);
    if(feedData.feedLastPulled) {
        result.feedLastPulled = feedData.feedLastPulled;
    }
    if(feedData.feedLastModified) {
        result.feedLastModified = feedData.feedLastModified;
    }

    // Convert updatedAt from string to Date object
    if(rawItem.updatedAt && isString(rawItem.updatedAt)) {
        result.updatedAt = new Date(rawItem.updatedAt);
    }

    return result as UnitData;
}

/**
 * Convert raw DynamoDB unit type item to UnitTypeData
 */
function convertRawItemToUnitTypeData(rawItem: RawDynamoDBItem): UnitTypeData {
    const result = omit(rawItem, ['unitID', 'created', 'modified', '_et', '_ct', '_md']) as unknown as UnitTypeData;

    // Convert updatedAt from string to Date if present
    if(rawItem.updatedAt && isString(rawItem.updatedAt)) {
        result.updatedAt = new Date(rawItem.updatedAt);
    }

    return result;
}

/**
 * Performs a single DynamoDB table scan to fetch ALL apartment data.
 * Organizes the results into buildings, units by building, and unit types by building.
 *
 * This approach is optimal for small datasets (expected <1000 items total) where
 * network latency dominates over in-memory processing time.
 *
 * @returns Promise<AllDataResponse> All apartment data organized by type
 */
export async function getAllData(): Promise<AllDataResponse> {
    const TableInstance = (process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test'
        ? getApartmentTable()
        : ApartmentTable) as typeof ApartmentTable;

    logger.debug('Starting unified DynamoDB scan for all apartment data');

    // Perform single table scan to get all items
    const scanResult = await TableInstance.build(ScanCommand)
        .options({ consistent: false }) // Eventually consistent is fine for this use case
        .send();

    if(!scanResult.Items || scanResult.Items.length === 0) {
        logger.warn('No items found in DynamoDB scan');
        return {
            buildings:           [],
            unitsByBuilding:     {},
            unitTypesByBuilding: {}
        };
    }

    logger.debug('DynamoDB scan completed', {
        itemCount:        scanResult.Items.length,
        scannedCount:     scanResult.ScannedCount,
        consumedCapacity: scanResult.ConsumedCapacity
    });

    // Group items by type based on unitID pattern
    const rawItems = scanResult.Items as RawDynamoDBItem[];

    const buildingItems = filter(rawItems, { unitID: 'BUILDING' });
    const unitItems = filter(rawItems, item => _.startsWith(item.unitID, 'UNIT#'));
    const unitTypeItems = filter(rawItems, item => _.startsWith(item.unitID, 'MODEL#'));

    logger.debug('Items grouped by type', {
        buildingCount: buildingItems.length,
        unitCount:     unitItems.length,
        unitTypeCount: unitTypeItems.length
    });

    // Convert buildings
    const buildings = map(buildingItems, convertRawItemToBuildingData);

    // Convert and group units by buildingID
    const units = map(unitItems, convertRawItemToUnitData);
    const unitsByBuilding = groupBy(units, 'buildingID');

    // Convert and group unit types by buildingID
    const unitTypes = map(unitTypeItems, convertRawItemToUnitTypeData);
    const unitTypesByBuilding = groupBy(unitTypes, 'buildingID');

    // Ensure all buildings have arrays (even if empty) for consistent data structure
    const result: AllDataResponse = {
        buildings,
        unitsByBuilding:     {},
        unitTypesByBuilding: {}
    };

    // Initialize empty arrays for all buildings to ensure consistent structure
    forEach(buildings, (building) => {
        result.unitsByBuilding[building.buildingID] = unitsByBuilding[building.buildingID] || [];
        result.unitTypesByBuilding[building.buildingID] = unitTypesByBuilding[building.buildingID] || [];
    });

    logger.debug('Unified data processing completed', {
        buildingCount:          result.buildings.length,
        buildingsWithUnits:     _(result.unitsByBuilding).pickBy(units => units.length > 0).keys().value().length,
        buildingsWithUnitTypes: _(result.unitTypesByBuilding).pickBy(types => types.length > 0).keys().value().length
    });

    return result;
}
