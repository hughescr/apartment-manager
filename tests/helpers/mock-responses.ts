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

import { isObject, map, merge } from 'lodash';
import { getDefaultBuildingData } from '../../src/types/index.js';

/**
 * Add DynamoDB Toolbox v2 metadata fields to an item and merge defaults for Building entities
 * This simulates the same default merging that production getBuilding()/getBuildings() do
 */
function addToolboxMetadata(item: unknown): unknown {
    if(!item || !isObject(item)) {
        return item;
    }

    const itemWithMetadata = item as Record<string, unknown>;

    // Apply default merging for Building entities to match production behavior
    let processedItem = itemWithMetadata;
    if(itemWithMetadata.unitID === 'BUILDING') {
        // Merge with defaults like production does: _.merge({}, getDefaultBuildingData(), rawBuilding)
        processedItem = merge({}, getDefaultBuildingData(), itemWithMetadata);
    }

    return {
        ...processedItem,
        // Don't add _et automatically - let DynamoDB Toolbox handle it
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
