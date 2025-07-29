import { mock } from 'bun:test';
import { constant } from 'lodash';

interface MockSendFunction {
    (...args: unknown[]): Promise<unknown>
    mock: {
        calls: unknown[][]
        results: unknown[]
        mockClear(): void
        mockResolvedValue(value: unknown): void
        mockRejectedValue(error: unknown): void
    }
}

export interface DynamoDBMocks {
    mockSend: MockSendFunction
    DynamoDBDocumentClient: unknown
    GetCommand: unknown
    PutCommand: unknown
    QueryCommand: unknown
    UpdateCommand: unknown
    DeleteCommand: unknown
    BatchWriteCommand: unknown
    BatchGetCommand: unknown
    ScanCommand: unknown
    TransactGetCommand: unknown
    TransactWriteCommand: unknown
}

export interface S3Mocks {
    mockSend: MockSendFunction
    S3Client: unknown
    PutObjectCommand: unknown
    DeleteObjectCommand: unknown
    GetObjectCommand: unknown
}

/**
 * Mock DynamoDB at the module level. This should be called in beforeAll() at the file level.
 * Returns mock functions that can be used for assertions in tests.
 */
export function mockDynamoDB(): DynamoDBMocks {
    const mockSend = mock(() => Promise.resolve({})) as MockSendFunction;

    const DynamoDBDocumentClient = {
        from: mock(() => ({
            send: mockSend
        }))
    };

    const GetCommand = mock(() => ({}));
    const PutCommand = mock(() => ({}));
    const QueryCommand = mock(() => ({}));
    const UpdateCommand = mock(() => ({}));
    const DeleteCommand = mock(() => ({}));
    const BatchWriteCommand = mock(() => ({}));
    const BatchGetCommand = mock(() => ({}));
    const ScanCommand = mock(() => ({}));
    const TransactGetCommand = mock(() => ({}));
    const TransactWriteCommand = mock(() => ({}));

    // Mock the lib-dynamodb module
    mock.module('@aws-sdk/lib-dynamodb', () => ({
        DynamoDBDocumentClient,
        GetCommand,
        PutCommand,
        QueryCommand,
        UpdateCommand,
        DeleteCommand,
        BatchWriteCommand,
        BatchGetCommand,
        ScanCommand,
        TransactGetCommand,
        TransactWriteCommand
    }));

    // Also mock the client-dynamodb module for completeness
    mock.module('@aws-sdk/client-dynamodb', () => ({
        DynamoDBClient: mock(() => ({}))
    }));

    return {
        mockSend,
        DynamoDBDocumentClient,
        GetCommand,
        PutCommand,
        QueryCommand,
        UpdateCommand,
        DeleteCommand,
        BatchWriteCommand,
        BatchGetCommand,
        ScanCommand,
        TransactGetCommand,
        TransactWriteCommand
    };
}

/**
 * Mock S3 at the module level. This should be called in beforeAll() at the file level.
 * Returns mock functions that can be used for assertions in tests.
 */
export function mockS3(): S3Mocks {
    const mockSend = mock(() => Promise.resolve({})) as MockSendFunction;

    const S3Client = mock(() => ({
        send: mockSend
    }));

    const PutObjectCommand = mock(() => ({}));
    const DeleteObjectCommand = mock(() => ({}));
    const GetObjectCommand = mock(() => ({}));

    mock.module('@aws-sdk/client-s3', () => ({
        S3Client,
        PutObjectCommand,
        DeleteObjectCommand,
        GetObjectCommand
    }));

    return {
        mockSend,
        S3Client,
        PutObjectCommand,
        DeleteObjectCommand,
        GetObjectCommand
    };
}

/**
 * Mock crypto module for ID generation
 */
export function mockCrypto() {
    const mockRandomUUID = mock(constant('test-uuid'));

    mock.module('crypto', () => ({
        randomUUID: mockRandomUUID
    }));

    return { mockRandomUUID };
}

/**
 * Mock S3 Request Presigner
 */
export function mockS3RequestPresigner() {
    const mockGetSignedUrl = mock(() => Promise.resolve('https://presigned-url.example.com'));

    mock.module('@aws-sdk/s3-request-presigner', () => ({
        getSignedUrl: mockGetSignedUrl
    }));

    return { mockGetSignedUrl };
}
