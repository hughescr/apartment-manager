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

import { isObject, map } from 'lodash';

/**
 * Add DynamoDB Toolbox v2 metadata fields to an item
 */
function addToolboxMetadata(item: unknown): unknown {
    if(!item || !isObject(item)) {
        return item;
    }

    // Add required metadata fields for DynamoDB Toolbox v2
    const itemWithMetadata = item as Record<string, unknown>;

    // Entity type detection is no longer needed since we let DynamoDB Toolbox handle _et
    // Keeping the logic commented for reference
    // let entityType = 'Unknown';
    // if(itemWithMetadata.unitID === 'BUILDING') {
    //     entityType = 'Building';
    // } else if(isString(itemWithMetadata.unitID) && startsWith(itemWithMetadata.unitID, 'MODEL#')) {
    //     entityType = 'UnitType';
    // } else if(isString(itemWithMetadata.unitID) && startsWith(itemWithMetadata.unitID, 'UNIT#')) {
    //     entityType = 'Unit';
    // } else if(itemWithMetadata.unitID) {
    //     // Fallback for unitID values that don't follow the expected patterns
    //     entityType = 'Unit';
    // }

    return {
        ...itemWithMetadata,
        // Don't add _et automatically - let DynamoDB Toolbox handle it
        // _et: itemWithMetadata._et || entityType, // Entity type
        _ct: itemWithMetadata._ct || new Date().toISOString(), // Created timestamp
        _md: itemWithMetadata._md || new Date().toISOString(), // Modified timestamp
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
