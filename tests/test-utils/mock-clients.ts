/**
 * Test utilities for creating mock AWS clients
 * This module provides factory functions for creating type-safe mock clients
 * for testing purposes, keeping test code out of production modules.
 */
import { mock } from 'bun:test';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { S3Client } from '@aws-sdk/client-s3';

/**
 * Creates a mock DynamoDB Document Client for testing
 * @param sendImplementation - Optional implementation for the send method
 * @returns Mock DynamoDB Document Client
 */
export function createMockDynamoClient(
    sendImplementation?: (command: unknown) => Promise<unknown>
): DynamoDBDocumentClient {
    const mockSend = mock(sendImplementation || ((_command: unknown) => Promise.resolve({})));

    return {
        send: mockSend,
        // Add other methods if needed for specific tests
    } as unknown as DynamoDBDocumentClient;
}

/**
 * Creates a mock S3 Client for testing
 * @param sendImplementation - Optional implementation for the send method
 * @returns Mock S3 Client
 */
export function createMockS3Client(
    sendImplementation?: (command: unknown) => Promise<unknown>
): S3Client {
    const mockSend = mock(sendImplementation || ((_command: unknown) => Promise.resolve({})));

    return {
        send: mockSend,
        // Add other methods if needed for specific tests
    } as unknown as S3Client;
}

/**
 * Helper to create standard mock responses for DynamoDB operations
 */
export const mockDynamoResponses = {
    /**
     * Create a successful GetCommand response
     */
    getItem: (item?: Record<string, unknown>) => ({
        Item: item,
        $metadata: { httpStatusCode: 200 }
    }),

    /**
     * Create a successful PutCommand response
     */
    putItem: () => ({
        $metadata: { httpStatusCode: 200 }
    }),

    /**
     * Create a successful UpdateCommand response
     */
    updateItem: (attributes?: Record<string, unknown>) => ({
        Attributes: attributes,
        $metadata: { httpStatusCode: 200 }
    }),

    /**
     * Create a successful DeleteCommand response
     */
    deleteItem: () => ({
        $metadata: { httpStatusCode: 200 }
    }),

    /**
     * Create a successful QueryCommand response
     */
    query: (items: Record<string, unknown>[] = []) => ({
        Items: items,
        Count: items.length,
        ScannedCount: items.length,
        $metadata: { httpStatusCode: 200 }
    }),

    /**
     * Create a successful ScanCommand response
     */
    scan: (items: Record<string, unknown>[] = []) => ({
        Items: items,
        Count: items.length,
        ScannedCount: items.length,
        $metadata: { httpStatusCode: 200 }
    })
};

/**
 * Helper to create standard mock responses for S3 operations
 */
export const mockS3Responses = {
    /**
     * Create a successful PutObjectCommand response
     */
    putObject: (eTag = '"mock-etag"') => ({
        ETag: eTag,
        $metadata: { httpStatusCode: 200 }
    }),

    /**
     * Create a successful DeleteObjectCommand response
     */
    deleteObject: () => ({
        $metadata: { httpStatusCode: 204 }
    }),

    /**
     * Create a successful GetObjectCommand response
     */
    getObject: (body: string | Buffer = '') => ({
        Body: {
            transformToString: async () => body.toString(),
            transformToByteArray: async () =>
                (body instanceof Buffer ? new Uint8Array(body) : new TextEncoder().encode(body.toString()))
        },
        $metadata: { httpStatusCode: 200 }
    }),

    /**
     * Create a successful ListObjectsV2Command response
     */
    listObjects: (contents: { Key: string, Size: number }[] = []) => ({
        Contents: contents,
        IsTruncated: false,
        $metadata: { httpStatusCode: 200 }
    })
};

/**
 * Create a mock client that tracks all calls
 */
export interface TrackedMockClient<T> {
    client: T
    calls: { command: unknown, response: unknown }[]
    reset: () => void
}

/**
 * Create a tracked mock DynamoDB client that records all calls
 */
export function createTrackedDynamoClient(
    responses?: Map<string, unknown>
): TrackedMockClient<DynamoDBDocumentClient> {
    const calls: { command: unknown, response: unknown }[] = [];

    const sendImplementation = async (command: unknown): Promise<unknown> => {
        const commandName = command?.constructor.name || 'UnknownCommand';
        const response = responses?.get(commandName) || {} as unknown;
        calls.push({ command, response });
        return response;
    };

    const client = createMockDynamoClient(sendImplementation);

    return {
        client,
        calls,
        reset: () => {
            calls.length = 0;
            (client.send as ReturnType<typeof mock>).mockClear();
        }
    };
}

/**
 * Create a tracked mock S3 client that records all calls
 */
export function createTrackedS3Client(
    responses?: Map<string, unknown>
): TrackedMockClient<S3Client> {
    const calls: { command: unknown, response: unknown }[] = [];

    const sendImplementation = async (command: unknown): Promise<unknown> => {
        const commandName = command?.constructor.name || 'UnknownCommand';
        const response = responses?.get(commandName) || {} as unknown;
        calls.push({ command, response });
        return response;
    };

    const client = createMockS3Client(sendImplementation as (command: unknown) => Promise<unknown>);

    return {
        client,
        calls,
        reset: () => {
            calls.length = 0;
            (client.send as ReturnType<typeof mock>).mockClear();
        }
    };
}
