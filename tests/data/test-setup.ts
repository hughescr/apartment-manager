/**
 * Test setup file that must be imported BEFORE any data layer modules.
 * This sets up all the necessary mocks for DynamoDB operations.
 */
import { mock, jest } from 'bun:test';

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

// Mock logger
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
};

mock.module('@hughescr/logger', () => ({
    logger: mockLogger
}));

// Mock functions that track calls and provide responses
const mockDestroy = () => Promise.resolve();

// Create DynamoDB mock
const dynamoDbMock = (() => {
    const mockFn = jest.fn();
    // Default implementation that returns empty results
    mockFn.mockImplementation((command: unknown) => {
        const cmd = command as { constructor: { name: string } };
        // Handle both client-dynamodb and lib-dynamodb commands
        if(cmd.constructor.name === 'QueryCommand') {
            return Promise.resolve({ Items: [], Count: 0 });
        }
        if(cmd.constructor.name === 'GetItemCommand' || cmd.constructor.name === 'GetCommand') {
            return Promise.resolve({});
        }
        if(cmd.constructor.name === 'PutItemCommand' || cmd.constructor.name === 'PutCommand') {
            return Promise.resolve({});
        }
        if(cmd.constructor.name === 'UpdateItemCommand' || cmd.constructor.name === 'UpdateCommand') {
            return Promise.resolve({});
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
})();

// Create S3 mock
const s3Mock = (() => {
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
})();

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

// Mock AWS SDK v3 DynamoDB Client
mock.module('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: class MockDynamoDBClient {
        send = dynamoDbMock;
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
        send = s3Mock;
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
            send: dynamoDbMock,
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

// Mock crypto module for consistent UUIDs in tests
const mockRandomUUID = jest.fn().mockReturnValue('test-uuid');
mock.module('crypto', () => ({
    randomUUID: mockRandomUUID
}));

// Mock S3 request presigner with default implementation
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://presigned-url.example.com');
mock.module('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: mockGetSignedUrl
}));

// Export mocks for test files to use
export { dynamoDbMock, s3Mock, mockRandomUUID, mockGetSignedUrl };

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
