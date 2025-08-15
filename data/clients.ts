import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SSMClient } from '@aws-sdk/client-ssm';
import _ from 'lodash';

// Client instances - lazily initialized
let _dynamoClient: DynamoDBDocumentClient | null = null;
let _s3Client: S3Client | null = null;
let _ssmClient: SSMClient | null = null;

// Test injection flags
let _testDynamoClient: DynamoDBDocumentClient | null = null;
let _testS3Client: S3Client | null = null;
let _testSSMClient: SSMClient | null = null;

// Helper functions for test DynamoDB mock
function createMockItemResponse(item: Record<string, unknown>, unitID: string) {
    return {
        buildingID: item.buildingID || 'test-building',
        unitID,
        ...item,
        _ct: new Date().toISOString(),
        _md: new Date().toISOString(),
        _et: unitID === 'BUILDING' ? 'Building' : 'Unit'
    };
}

function handleMockPutCommand(cmd: { input?: Record<string, unknown> }) {
    const item = cmd.input?.Item || cmd.input || {};
    const unitID = _.isString((item as Record<string, unknown>).unitID)
        ? (item as Record<string, unknown>).unitID as string
        : 'BUILDING';
    return Promise.resolve({
        Attributes: createMockItemResponse(item as Record<string, unknown>, unitID)
    });
}

function handleMockUpdateCommand(cmd: { input?: Record<string, unknown> }) {
    const updates = cmd.input?.Item || cmd.input || {};
    const key = cmd.input?.Key || {};
    let unitID = 'BUILDING';
    if(_.isString((key as Record<string, unknown>).unitID)) {
        unitID = (key as Record<string, unknown>).unitID as string;
    } else if(_.isString((updates as Record<string, unknown>).unitID)) {
        unitID = (updates as Record<string, unknown>).unitID as string;
    }
    return Promise.resolve({
        Attributes: createMockItemResponse(updates as Record<string, unknown>, unitID)
    });
}

function createTestDynamoClient(): DynamoDBDocumentClient {
    const mockSend = (command: unknown) => {
        const cmd = command as { constructor: { name: string }, input?: Record<string, unknown> };

        if(cmd.constructor.name === 'QueryCommand') {
            return Promise.resolve({ Items: [], Count: 0 });
        }
        if(cmd.constructor.name === 'GetItemCommand' || cmd.constructor.name === 'GetCommand') {
            return Promise.resolve({});
        }
        if(cmd.constructor.name === 'PutItemCommand' || cmd.constructor.name === 'PutCommand') {
            return handleMockPutCommand(cmd);
        }
        if(cmd.constructor.name === 'UpdateItemCommand' || cmd.constructor.name === 'UpdateCommand') {
            return handleMockUpdateCommand(cmd);
        }
        if(cmd.constructor.name === 'DeleteItemCommand' || cmd.constructor.name === 'DeleteCommand') {
            return Promise.resolve({});
        }
        if(cmd.constructor.name === 'ScanCommand') {
            return Promise.resolve({ Items: [], Count: 0 });
        }
        return Promise.resolve({});
    };

    return {
        send: mockSend,
        destroy: () => Promise.resolve(),
        config: {} as unknown,
        middlewareStack: {} as unknown
    } as unknown as DynamoDBDocumentClient;
}

/**
 * Get the DynamoDB Document client instance.
 * Creates a new client on first call, then reuses the same instance.
 * @param injectedClient - Optional client to use instead of creating one (for testing)
 */
export function getDynamoClient(injectedClient?: DynamoDBDocumentClient): DynamoDBDocumentClient {
    if(injectedClient) {
        return injectedClient;
    }

    // Check for test client first
    if(_testDynamoClient) {
        return _testDynamoClient;
    }

    // In test environment, use a basic mock if no test client is set
    if(process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test') {
        if(!_dynamoClient) {
            // Use fallback test mock
            const mockSend = createTestDynamoClient().send;

            _dynamoClient = {
                send: mockSend,
                destroy: () => Promise.resolve(),
                config: {} as unknown,
                middlewareStack: {} as unknown
            } as unknown as DynamoDBDocumentClient;
        }
        return _dynamoClient;
    }

    if(!_dynamoClient) {
        const client = new DynamoDBClient({});
        _dynamoClient = DynamoDBDocumentClient.from(client, {
            marshallOptions: {
                removeUndefinedValues: true,
                convertEmptyValues: false,
            },
            unmarshallOptions: {
                wrapNumbers: false,
            },
        });
    }
    return _dynamoClient;
}

/**
 * Get the S3 client instance.
 * Creates a new client on first call, then reuses the same instance.
 * @param injectedClient - Optional client to use instead of creating one (for testing)
 */
export function getS3Client(injectedClient?: S3Client): S3Client {
    if(injectedClient) {
        return injectedClient;
    }

    // Check for test client first
    if(_testS3Client) {
        return _testS3Client;
    }

    if(!_s3Client) {
        _s3Client = new S3Client({});
    }
    return _s3Client;
}

function createTestSSMClient(): SSMClient {
    const mockSend = (command: unknown) => {
        const cmd = command as { constructor: { name: string }, input?: Record<string, unknown> };

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
    };

    return {
        send: mockSend,
        destroy: () => Promise.resolve(),
        config: {} as unknown,
        middlewareStack: {} as unknown
    } as unknown as SSMClient;
}

/**
 * Get the SSM client instance.
 * Creates a new client on first call, then reuses the same instance.
 * @param injectedClient - Optional client to use instead of creating one (for testing)
 */
export function getSSMClient(injectedClient?: SSMClient): SSMClient {
    if(injectedClient) {
        return injectedClient;
    }

    // Check for test client first
    if(_testSSMClient) {
        return _testSSMClient;
    }

    // In test environment, use a basic mock if no test client is set
    if(process.env.BUN_ENV === 'test' || process.env.NODE_ENV === 'test') {
        if(!_ssmClient) {
            // Use fallback test mock
            const mockSend = createTestSSMClient().send;

            _ssmClient = {
                send: mockSend,
                destroy: () => Promise.resolve(),
                config: {} as unknown,
                middlewareStack: {} as unknown
            } as unknown as SSMClient;
        }
        return _ssmClient;
    }

    if(!_ssmClient) {
        _ssmClient = new SSMClient({ region: 'us-west-2' });
    }
    return _ssmClient;
}

/**
 * Set test clients for testing
 */
export function setTestClients(
    dynamoClient?: DynamoDBDocumentClient | null,
    s3Client?: S3Client | null,
    ssmClient?: SSMClient | null
): void {
    _testDynamoClient = dynamoClient ?? null;
    _testS3Client = s3Client ?? null;
    _testSSMClient = ssmClient ?? null;
}

/**
 * Reset all clients to null (for testing)
 */
export function resetClients(): void {
    _dynamoClient = null;
    _s3Client = null;
    _ssmClient = null;
    _testDynamoClient = null;
    _testS3Client = null;
    _testSSMClient = null;
}
