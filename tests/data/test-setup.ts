/**
 * Test setup file that must be imported BEFORE any data layer modules.
 * This sets up all the necessary mocks for DynamoDB operations.
 */
import { mock, jest } from 'bun:test';
import _ from 'lodash';

// Import AWS SDK command classes before mocking
import {
    QueryCommand as DynamoQueryCommand,
    GetItemCommand as DynamoGetItemCommand,
    PutItemCommand as DynamoPutItemCommand,
    UpdateItemCommand as DynamoUpdateItemCommand,
    DeleteItemCommand as DynamoDeleteItemCommand,
    TransactWriteItemsCommand as DynamoTransactWriteItemsCommand
} from '@aws-sdk/client-dynamodb';

import {
    PutObjectCommand as S3PutObjectCommand,
    GetObjectCommand as S3GetObjectCommand,
    DeleteObjectCommand as S3DeleteObjectCommand,
    ListObjectsV2Command as S3ListObjectsV2Command
} from '@aws-sdk/client-s3';

import {
    PutParameterCommand as SSMPutParameterCommand,
    GetParameterCommand as SSMGetParameterCommand,
    DeleteParameterCommand as SSMDeleteParameterCommand,
    DescribeParametersCommand as SSMDescribeParametersCommand
} from '@aws-sdk/client-ssm';

// Import lib-dynamodb commands
import {
    QueryCommand as LibDynamoQueryCommand,
    GetCommand as LibDynamoGetCommand,
    PutCommand as LibDynamoPutCommand,
    UpdateCommand as LibDynamoUpdateCommand,
    DeleteCommand as LibDynamoDeleteCommand,
    TransactWriteCommand as LibDynamoTransactWriteCommand
} from '@aws-sdk/lib-dynamodb';

// Set test environment
process.env.BUN_ENV = 'test';
process.env.SST_STAGE = 'test';

// Mock logger with proper error handling
const mockLogger = {
    info: jest.fn().mockImplementation((...args: unknown[]) => {
        // Consume all arguments including error objects to prevent unhandled errors
        _.forEach(args, (arg) => {
            if(_.isError(arg)) {
                // Consume error silently
            }
        });
    }),
    warn: jest.fn().mockImplementation((...args: unknown[]) => {
        // Consume all arguments including error objects to prevent unhandled errors
        _.forEach(args, (arg) => {
            if(_.isError(arg)) {
                // Consume error silently
            }
        });
    }),
    error: jest.fn().mockImplementation((...args: unknown[]) => {
        // Consume all arguments including error objects to prevent unhandled errors
        _.forEach(args, (arg) => {
            if(_.isError(arg)) {
                // Consume error silently
            }
        });
    }),
    debug: jest.fn().mockImplementation((...args: unknown[]) => {
        // Consume all arguments including error objects to prevent unhandled errors
        _.forEach(args, (arg) => {
            if(_.isError(arg)) {
                // Consume error silently
            }
        });
    })
};

mock.module('@hughescr/logger', () => ({
    logger: mockLogger
}));

// Mock functions that track calls and provide responses
const mockDestroy = () => Promise.resolve();

// Mock crypto module for consistent UUIDs in tests
const mockRandomUUID = jest.fn().mockReturnValue('test-uuid');

// Mock S3 request presigner with default implementation
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://presigned-url.example.com');
// Type for DynamoDB item with optional properties
type DynamoItem = Record<string, unknown> & {
    buildingID?: string
    unitID?: string
};

// Helper function to determine entity type based on unitID
function getEntityType(unitID: string): string {
    if(_.startsWith(unitID, 'UNIT#') || (unitID !== 'BUILDING' && !_.startsWith(unitID, 'MODEL#'))) {
        return 'Unit';
    }
    if(_.startsWith(unitID, 'MODEL#')) {
        return 'UnitType';
    }
    return 'Building';
}

// Helper function to handle put commands
function handlePutCommand(cmd: { input?: Record<string, unknown> }) {
    const item = cmd.input?.Item || cmd.input || {};
    const unitID = (item as DynamoItem).unitID || 'BUILDING';
    const entityType = getEntityType(unitID);

    const responseItem = {
        buildingID: (item as DynamoItem).buildingID || 'test-building',
        unitID: unitID,
        ...item,
        _ct: new Date().toISOString(),
        _md: new Date().toISOString(),
        _et: entityType
    };

    return Promise.resolve({
        Attributes: responseItem,
        Item: responseItem
    });
}

// Helper function to handle update commands
function handleUpdateCommand(cmd: { input?: Record<string, unknown> }) {
    const key = cmd.input?.Key || {};
    const updates = cmd.input?.Item || cmd.input || {};
    const unitID = (key as DynamoItem).unitID || (updates as DynamoItem).unitID || 'BUILDING';
    const entityType = getEntityType(unitID);

    const responseItem = {
        buildingID: (key as DynamoItem).buildingID || (updates as DynamoItem).buildingID || 'test-building',
        unitID: unitID,
        ...updates,
        _ct: new Date().toISOString(),
        _md: new Date().toISOString(),
        _et: entityType
    };

    return Promise.resolve({
        Attributes: responseItem,
        Item: responseItem
    });
}

// Create DynamoDB mock with reset capability
const createDynamoDbMock = () => {
    const mockFn = jest.fn();
    // Default implementation that returns proper responses for DynamoDB Toolbox
    mockFn.mockImplementation((command: unknown) => {
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

        if(cmd.constructor.name === 'TransactWriteItemsCommand' || cmd.constructor.name === 'TransactWriteCommand') {
            return Promise.resolve({});
        }

        return Promise.reject(new Error(`Unmocked DynamoDB command: ${cmd.constructor.name}`));
    });
    return mockFn;
};

let dynamoDbMock = createDynamoDbMock();

// Create S3 mock with reset capability
const createS3Mock = () => {
    const mockFn = jest.fn();
    // Default implementation that returns success
    mockFn.mockImplementation((command: unknown) => {
        const cmd = command as { constructor: { name: string } };
        if(cmd.constructor.name === 'PutObjectCommand') {
            return Promise.resolve({
                ETag: '"mock-etag"',
                VersionId: 'mock-version-id',
            });
        }
        if(cmd.constructor.name === 'GetObjectCommand') {
            return Promise.resolve({
                Body: {
                    transformToString: () => Promise.resolve('mock-content'),
                },
                ContentType: 'text/plain',
            });
        }
        if(cmd.constructor.name === 'DeleteObjectCommand') {
            return Promise.resolve({});
        }
        if(cmd.constructor.name === 'ListObjectsV2Command') {
            return Promise.resolve({
                Contents: [],
                IsTruncated: false,
            });
        }
        return Promise.reject(new Error(`Unmocked S3 command: ${cmd.constructor.name}`));
    });
    return mockFn;
};

let s3Mock = createS3Mock();

// Create SSM mock with reset capability
const createSSMMock = () => {
    const mockFn = jest.fn();
    // Default implementation that returns success
    mockFn.mockImplementation((command: unknown) => {
        const cmd = command as { constructor: { name: string } };
        if(cmd.constructor.name === 'PutParameterCommand') {
            return Promise.resolve({
                Version: 1,
                Tier: 'Standard'
            });
        }
        if(cmd.constructor.name === 'GetParameterCommand') {
            return Promise.resolve({
                Parameter: {
                    Name: '/apartment-manager/test/credentials/test-site',
                    Value: '{"apiKey":"test-key"}',
                    Type: 'SecureString',
                    Version: 1
                }
            });
        }
        if(cmd.constructor.name === 'DeleteParameterCommand') {
            return Promise.resolve({});
        }
        if(cmd.constructor.name === 'DescribeParametersCommand') {
            return Promise.resolve({
                Parameters: [],
                NextToken: undefined
            });
        }
        return Promise.reject(new Error(`Unmocked SSM command: ${cmd.constructor.name}`));
    });
    return mockFn;
};

let ssmMock = createSSMMock();

// Mock the SST module FIRST before any other imports can access it
mock.module('sst', () => ({
    Resource: {
        BuildingsUnits: {
            name: 'test-table-name'
        },
        ProfilesBucket: {
            name: 'test-profile-bucket'
        },
        ListingsBucket: {
            name: 'test-listings-bucket'
        },
        PhotosBucket: {
            name: 'test-photos-bucket'
        }
    }
}));

// Global mock reset function that can be called between test files
const resetAllMocks = () => {
    // Create fresh mock instances
    dynamoDbMock = createDynamoDbMock();
    s3Mock = createS3Mock();
    ssmMock = createSSMMock();
    mockRandomUUID.mockClear();
    mockRandomUUID.mockReturnValue('test-uuid');
    mockGetSignedUrl.mockClear();
    mockGetSignedUrl.mockResolvedValue('https://presigned-url.example.com');

    // Reset logger mocks
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();

    // Set up default successful responses for security tests
    dynamoDbMock.mockImplementation((command: unknown) => {
        const cmd = command as { constructor: { name: string }, input?: Record<string, unknown> };

        if(cmd.constructor.name === 'PutItemCommand' || cmd.constructor.name === 'PutCommand') {
            return handlePutCommand(cmd);
        }

        if(cmd.constructor.name === 'GetItemCommand' || cmd.constructor.name === 'GetCommand') {
            return Promise.resolve({});
        }

        if(cmd.constructor.name === 'UpdateItemCommand' || cmd.constructor.name === 'UpdateCommand') {
            return handleUpdateCommand(cmd);
        }

        if(cmd.constructor.name === 'QueryCommand') {
            return Promise.resolve({ Items: [], Count: 0 });
        }

        if(cmd.constructor.name === 'DeleteItemCommand' || cmd.constructor.name === 'DeleteCommand') {
            return Promise.resolve({});
        }

        if(cmd.constructor.name === 'TransactWriteItemsCommand' || cmd.constructor.name === 'TransactWriteCommand') {
            return Promise.resolve({});
        }

        return Promise.reject(new Error(`Unmocked DynamoDB command: ${cmd.constructor.name}`));
    });
};

// Mock AWS SDK v3 DynamoDB Client
mock.module('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: class MockDynamoDBClient {
        get send() { return dynamoDbMock; }
        destroy = mockDestroy;
    },
    // Re-export command classes
    QueryCommand: DynamoQueryCommand,
    GetItemCommand: DynamoGetItemCommand,
    PutItemCommand: DynamoPutItemCommand,
    UpdateItemCommand: DynamoUpdateItemCommand,
    DeleteItemCommand: DynamoDeleteItemCommand,
    TransactWriteItemsCommand: DynamoTransactWriteItemsCommand,
}));

// Mock AWS SDK v3 S3 Client
mock.module('@aws-sdk/client-s3', () => ({
    S3Client: class MockS3Client {
        get send() { return s3Mock; }
        destroy = mockDestroy;
    },
    // Re-export command classes
    PutObjectCommand: S3PutObjectCommand,
    GetObjectCommand: S3GetObjectCommand,
    DeleteObjectCommand: S3DeleteObjectCommand,
    ListObjectsV2Command: S3ListObjectsV2Command,
}));

// Mock AWS SDK v3 lib-dynamodb (Document Client)
mock.module('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: (_client: unknown, _config?: unknown) => ({
            get send() { return dynamoDbMock; },
            destroy: mockDestroy,
            config: {}
        })
    },
    // Re-export command classes
    QueryCommand: LibDynamoQueryCommand,
    GetCommand: LibDynamoGetCommand,
    PutCommand: LibDynamoPutCommand,
    UpdateCommand: LibDynamoUpdateCommand,
    DeleteCommand: LibDynamoDeleteCommand,
    TransactWriteCommand: LibDynamoTransactWriteCommand
}));

// Mock crypto module
mock.module('crypto', () => ({
    randomUUID: mockRandomUUID
}));

// Mock S3 request presigner
mock.module('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: mockGetSignedUrl
}));

// Mock AWS SDK v3 SSM Client
mock.module('@aws-sdk/client-ssm', () => ({
    SSMClient: class MockSSMClient {
        get send() { return ssmMock; }
        destroy = mockDestroy;
    },
    // Re-export command classes
    PutParameterCommand: SSMPutParameterCommand,
    GetParameterCommand: SSMGetParameterCommand,
    DeleteParameterCommand: SSMDeleteParameterCommand,
    DescribeParametersCommand: SSMDescribeParametersCommand,
}));

// Export mocks for test files to use
export { dynamoDbMock, s3Mock, ssmMock, mockRandomUUID, mockGetSignedUrl, mockLogger, resetAllMocks };

// Re-export jest for convenience
export { jest };

// Note: s3-request-presigner mock is handled per-test in individual test files

// Re-export lib-dynamodb commands for tests to use
export {
    LibDynamoQueryCommand as QueryCommand,
    LibDynamoGetCommand as GetCommand,
    LibDynamoPutCommand as PutCommand,
    LibDynamoUpdateCommand as UpdateCommand,
    LibDynamoDeleteCommand as DeleteCommand,
    LibDynamoTransactWriteCommand as TransactWriteCommand
};
