/**
 * Helper functions to generate properly structured AWS DynamoDB responses
 * for use in tests. These match the expected response formats from AWS SDK.
 */

export interface MockResponseOptions {
    Items?: unknown[]
    Item?: unknown
    Attributes?: unknown
    Count?: number
    ScannedCount?: number
}

import { isObject, map, isString, startsWith } from 'lodash';

/**
 * Add DynamoDB Toolbox v2 metadata fields to an item
 * This simulates the metadata that DynamoDB Toolbox adds to items
 */
function addToolboxMetadata(item: unknown): unknown {
    if(!item || !isObject(item)) {
        return item;
    }

    const itemWithMetadata = item as Record<string, unknown>;

    // Don't apply defaults here - the getBuilding/getBuildings functions will do that
    // We're mocking the raw DynamoDB response, not the processed result
    const processedItem = itemWithMetadata;

    // Determine entity type based on unitID pattern
    let entityType = 'Building'; // default
    if(isString(processedItem.unitID)) {
        if(startsWith(processedItem.unitID, 'MODEL#')) {
            entityType = 'UnitType';
        } else if(startsWith(processedItem.unitID, 'UNIT#') || (processedItem.unitID !== 'BUILDING' && !startsWith(processedItem.unitID, 'MODEL#'))) {
            entityType = 'Unit';
        }
    }

    return {
        ...processedItem,
        _et: processedItem._et || entityType, // Entity type for DynamoDB Toolbox
        _ct: processedItem._ct || new Date().toISOString(), // Created timestamp
        _md: processedItem._md || new Date().toISOString(), // Modified timestamp
    };
}

/**
 * Create a mock response for DynamoDB Scan operations
 */
export function mockScanResponse(items: unknown[]): { Items: unknown[] } {
    return { Items: map(items, addToolboxMetadata) };
}

/**
 * Create a mock response for DynamoDB Query operations
 */
export function mockQueryResponse(items: unknown[]): { Items: unknown[], Count: number } {
    return {
        Items: map(items, addToolboxMetadata),
        Count: items.length
    };
}

/**
 * Create a mock response for DynamoDB GetItem operations
 */
export function mockGetResponse(item: unknown | undefined): { Item?: unknown } {
    return item ? { Item: addToolboxMetadata(item) } : {};
}

/**
 * Create a mock response for DynamoDB PutItem operations
 */
export function mockPutResponse(item: unknown): { Attributes: unknown } {
    return { Attributes: addToolboxMetadata(item) };
}

/**
 * Create a mock response for DynamoDB UpdateItem operations
 */
export function mockUpdateResponse(item: unknown): { Attributes: unknown } {
    return { Attributes: addToolboxMetadata(item) };
}

/**
 * Create a mock response for DynamoDB DeleteItem operations
 */
export function mockDeleteResponse(): Record<string, never> {
    return {};
}

/**
 * Create a mock response for DynamoDB BatchWrite operations
 */
export function mockBatchWriteResponse(): { UnprocessedItems: Record<string, never> } {
    return { UnprocessedItems: {} };
}
