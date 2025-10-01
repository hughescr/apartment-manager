/**
 * Clean test setup for buildings tests using the new mocking system.
 * This file provides test-specific mock configuration without mock.module().
 */

// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, jest, resetAllMocks } from './test-setup';
import { mockQueryResponse, mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';
import { resetClients } from '../../data/clients';

/**
 * Helper functions for mock implementations
 */
const createItemResponse = (item: Record<string, unknown>, unitID: string) => {
    const buildingID = (item as Record<string, unknown> & { buildingID?: string }).buildingID || 'test-building';
    return {
        Attributes: { ...item, buildingID, unitID, _ct: new Date().toISOString(), _md: new Date().toISOString() },
        Item:       { ...item, buildingID, unitID, _ct: new Date().toISOString(), _md: new Date().toISOString() }
    };
};

const handlePutCommand = (cmd: { input?: Record<string, unknown> }) => {
    const item = cmd.input?.Item || cmd.input || {};
    const itemWithUnitId = item as Record<string, unknown> & { unitID?: string, buildingID?: string };
    const unitID = itemWithUnitId.unitID || 'BUILDING';
    const buildingID = itemWithUnitId.buildingID || 'test-building';
    return Promise.resolve(createItemResponse({ ...item, buildingID } as Record<string, unknown>, unitID));
};

const handleUpdateCommand = (cmd: { input?: Record<string, unknown> }) => {
    const updates = cmd.input?.Item || cmd.input || {};
    const key = cmd.input?.Key || {};
    const keyWithUnitId = key as Record<string, unknown> & { unitID?: string, buildingID?: string };
    const updatesWithUnitId = updates as Record<string, unknown> & { unitID?: string, buildingID?: string };
    const unitID = keyWithUnitId.unitID || updatesWithUnitId.unitID || 'BUILDING';
    const buildingID = keyWithUnitId.buildingID || updatesWithUnitId.buildingID || 'test-building';
    return Promise.resolve(createItemResponse({ ...updates, buildingID } as Record<string, unknown>, unitID));
};

/**
 * Helper function to create default mock implementation
 */
const createDefaultMockImplementation = () => (command: unknown) => {
    const cmd = command as { constructor: { name: string }, input?: Record<string, unknown> };

    // Handle both client-dynamodb and lib-dynamodb commands
    if(cmd.constructor.name === 'QueryCommand') {
        return Promise.resolve({ Items: [], Count: 0 });
    }

    if(cmd.constructor.name === 'GetItemCommand' || cmd.constructor.name === 'GetCommand') {
        return Promise.resolve({});
    }

    if(cmd.constructor.name === 'PutItemCommand' || cmd.constructor.name === 'PutCommand') {
        return handlePutCommand(cmd);
    }

    if(cmd.constructor.name === 'UpdateItemCommand' || cmd.constructor.name === 'UpdateCommand') {
        return handleUpdateCommand(cmd);
    }

    if(cmd.constructor.name === 'DeleteItemCommand' || cmd.constructor.name === 'DeleteCommand') {
        return Promise.resolve({});
    }

    return Promise.reject(new Error(`Unmocked DynamoDB command: ${cmd.constructor.name}`));
};

/**
 * Setup function for each test file to call in beforeAll
 */
export const setupBuildingsTests = () => {
    // Reset mocks at the start of this test file to prevent cross-file pollution
    resetAllMocks();

    // Also reset the data layer clients to ensure they pick up our test mocks
    resetClients();
};

/**
 * Setup function for each test to call in beforeEach
 */
export const setupBuildingsTest = () => {
    // Reset all mock state including queued responses
    jest.clearAllMocks();
    jest.restoreAllMocks();

    // CRITICAL: Reset the mock completely to clear any queued responses
    dynamoDbMock.mockReset();

    // Restore the default implementation after reset to ensure clean state
    dynamoDbMock.mockImplementation(createDefaultMockImplementation());

    // Reset clients to ensure fresh connections for each test
    resetClients();
};

/**
 * Cleanup function for each test to call in afterEach
 */
export const cleanupBuildingsTest = () => {
    // Additional safety: Clear any remaining mock implementations to prevent leakage
    dynamoDbMock.mockClear();

    // Restore the default implementation to ensure clean state for next test
    dynamoDbMock.mockImplementation(createDefaultMockImplementation());
};

// Export test utilities
export {
    dynamoDbMock,
    jest,
    resetAllMocks,
    mockQueryResponse,
    mockGetResponse,
    mockPutResponse,
    mockUpdateResponse,
    mockDeleteResponse,
    createDefaultMockImplementation
};
