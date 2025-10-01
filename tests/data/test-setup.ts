/**
 * Test setup file that provides resetable mocks without using mock.module().
 * This approach allows proper test isolation by avoiding permanent global state.
 */
import { jest } from 'bun:test';
import { assign, isArray, isNumber, isObject, isString, map, some } from 'lodash';
import { resetClients } from '../../data/clients';

// Set test environment
process.env.BUN_ENV = 'test';
process.env.SST_STAGE = 'test';

// Mock crypto functions
const mockRandomUUID = jest.fn().mockReturnValue('test-uuid');

// Mock S3 presigner
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://presigned-url.example.com');

// Mock SST Resource
const mockSSTResource = {
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
    },
    RADAR_SECRET_KEY: {
        value: 'prv_test_mock_radar_key_12345'
    }
};

// Import the actual logger to spy on it
import { logger } from '@hughescr/logger';
import { spyOn } from 'bun:test';

// Create spies on the actual logger methods
const loggerInfoSpy = spyOn(logger, 'info');
const loggerWarnSpy = spyOn(logger, 'warn');
const loggerErrorSpy = spyOn(logger, 'error');
const loggerDebugSpy = spyOn(logger, 'debug');

// Mock logger implementation (for backward compatibility)
const mockLogger = {
    info:  loggerInfoSpy,
    warn:  loggerWarnSpy,
    error: loggerErrorSpy,
    debug: loggerDebugSpy
};

// Test setup now uses clean Jest mocks without helper types or functions
// Tests configure their own mock responses using Jest's mock methods

// Note: Helper functions removed since tests now configure their own mock responses
// Tests should use mockResolvedValue/mockRejectedValue to configure specific responses

// Helper to detect if dynamoDbMock has been explicitly configured by tests
// Simple approach: just call the mock and let it handle its own configuration
// If tests have configured specific behaviors, those will be used
// Otherwise, fall back to entity filtering

// Create DynamoDB mock function with basic default implementation
// CRITICAL: This must be completely stateless to prevent pollution between tests
const createDynamoDbMock = () => {
    const mockFn = jest.fn();

    // CRITICAL: Reset implementation completely each time to avoid state pollution
    mockFn.mockImplementation((command: unknown) => {
        const cmd = command as { constructor: { name: string } };

        // Provide basic default responses for all DynamoDB commands
        // Each response is a fresh object to prevent shared references
        if(cmd.constructor.name === 'QueryCommand') {
            return Promise.resolve({
                Items:            [],
                Count:            0,
                ScannedCount:     0,
                LastEvaluatedKey: undefined
            });
        }
        if(cmd.constructor.name === 'GetItemCommand' || cmd.constructor.name === 'GetCommand') {
            return Promise.resolve({ Item: undefined });
        }
        if(cmd.constructor.name === 'PutItemCommand' || cmd.constructor.name === 'PutCommand') {
            // Extract the input from the command to check ReturnValues
            const cmdWithInput = cmd as { input?: { ReturnValues?: string, Item?: Record<string, unknown> } };
            // Return the item that was put if returnValues is set to ALL_NEW
            const returnValues = cmdWithInput.input?.ReturnValues;
            const attributes = (returnValues === 'ALL_NEW') ? cmdWithInput.input?.Item || {} : {};
            return Promise.resolve({
                Attributes:            attributes,
                ConsumedCapacity:      undefined,
                ItemCollectionMetrics: undefined
            });
        }
        if(cmd.constructor.name === 'UpdateItemCommand' || cmd.constructor.name === 'UpdateCommand') {
            return Promise.resolve({
                Attributes:            {},
                ConsumedCapacity:      undefined,
                ItemCollectionMetrics: undefined
            });
        }
        if(cmd.constructor.name === 'DeleteItemCommand' || cmd.constructor.name === 'DeleteCommand') {
            return Promise.resolve({
                Attributes:            undefined,
                ConsumedCapacity:      undefined,
                ItemCollectionMetrics: undefined
            });
        }
        if(cmd.constructor.name === 'ScanCommand') {
            return Promise.resolve({
                Items:            [],
                Count:            0,
                ScannedCount:     0,
                LastEvaluatedKey: undefined
            });
        }

        // Default fallback for unknown commands
        return Promise.resolve({});
    });

    // Track configuration using a simpler approach based on mock state
    // We'll check if the mock has been called or has results, which indicates explicit configuration

    // Add support for direct calls (when used as send method)
    // CRITICAL: Create a fresh reference each time
    const sendMethod = jest.fn().mockImplementation(mockFn);
    (mockFn as typeof mockFn & { send: typeof sendMethod }).send = sendMethod;

    return mockFn;
};

// Create S3 mock function
const createS3Mock = () => {
    const mockFn = jest.fn();
    mockFn.mockImplementation((command: unknown) => {
        const cmd = command as { constructor: { name: string } };
        if(cmd.constructor.name === 'PutObjectCommand') {
            return Promise.resolve({
                ETag:      '"mock-etag"',
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
                Contents:    [],
                IsTruncated: false,
            });
        }
        return Promise.reject(new Error(`Unmocked S3 command: ${cmd.constructor.name}`));
    });
    return mockFn;
};

// Create SSM mock function
const createSSMMock = () => {
    const mockFn = jest.fn();
    mockFn.mockImplementation((command: unknown) => {
        const cmd = command as { constructor: { name: string } };
        if(cmd.constructor.name === 'PutParameterCommand') {
            return Promise.resolve({
                Version: 1,
                Tier:    'Standard'
            });
        }
        if(cmd.constructor.name === 'GetParameterCommand') {
            return Promise.resolve({
                Parameter: {
                    Name:    '/apartment-manager/test/credentials/test-site',
                    Value:   '{"apiKey":"test-key"}',
                    Type:    'SecureString',
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
                NextToken:  undefined
            });
        }
        return Promise.reject(new Error(`Unmocked SSM command: ${cmd.constructor.name}`));
    });
    return mockFn;
};

// Initialize mock instances
let dynamoDbMock = createDynamoDbMock();
let s3Mock = createS3Mock();
let ssmMock = createSSMMock();

// Interface for mock data clients
interface MockDataClients {
    getDynamoClient: () => {
        send:    typeof dynamoDbMock
        destroy: jest.Mock
        config:  Record<string, unknown>
    }
    getS3Client: () => {
        send:    typeof s3Mock
        destroy: jest.Mock
    }
    getSSMClient: () => {
        send:            typeof ssmMock
        destroy:         jest.Mock
        config:          Record<string, unknown>
        middlewareStack: Record<string, unknown>
    }
    setTestClients:    jest.Mock
    resetClients:      jest.Mock
    getApartmentTable: () => {
        build: jest.Mock
    }
}
// Mock data/clients module to use test implementations - need to handle test environment properly
// Override global require for data/clients in test environment
if(process.env.BUN_ENV === 'test') {
    // This is a fallback approach for Bun test environment

    // Set up a mock for module resolution
    (globalThis as typeof globalThis & { mockDataClients?: MockDataClients }).mockDataClients = {
        getDynamoClient: () => ({
            send:    dynamoDbMock,
            destroy: jest.fn().mockResolvedValue(undefined),
            config:  {}
        }),
        getS3Client: () => ({
            send:    s3Mock,
            destroy: jest.fn().mockResolvedValue(undefined)
        }),
        getSSMClient: () => ({
            send:            ssmMock,
            destroy:         jest.fn().mockResolvedValue(undefined),
            config:          {},
            middlewareStack: {}
        }),
        setTestClients:    jest.fn(),
        resetClients:      jest.fn(),
        // Enhanced mock table that properly handles entity filtering
        getApartmentTable: () => {
            const tableContext = {
                entities: [] as { name: string }[]
            };

            return {
                build: jest.fn().mockImplementation((_CommandClass) => {
                    const commandBuilder = {
                        entities: jest.fn().mockImplementation((...entities) => {
                            tableContext.entities = map(entities, entity => ({ name: entity.name }));
                            return commandBuilder;
                        }),
                        query:   jest.fn().mockReturnThis(),
                        options: jest.fn().mockReturnThis(),
                        send:    jest.fn().mockImplementation(async (command?: Record<string, unknown>) => {
                            // Create a QueryCommand-like object that preserves the constructor name
                            const QueryCommand = class QueryCommand {
                                constructor(input: unknown) {
                                    assign(this, input);
                                }
                            };

                            // Build the command object from the command builder state
                            const commandObj = new QueryCommand({
                                TableName:                 'test-table-name',
                                KeyConditionExpression:    'buildingID = :buildingID',
                                ExpressionAttributeValues: {
                                    ':buildingID': 'test-building-id'
                                },
                                // ConsistentRead is undefined unless explicitly set
                                ConsistentRead: undefined,
                                ...command
                            });

                            // First try dynamoDbMock to respect any test configurations
                            const mockResponse = await dynamoDbMock(commandObj);

                            // Check if this is a default empty response (indicating no explicit test configuration)
                            const isDefaultResponse = mockResponse
                              && isArray(mockResponse.Items)
                              && mockResponse.Items.length === 0
                              && mockResponse.Count === 0;

                            // If it's a default response and we have entities to filter, apply entity filtering
                            if(isDefaultResponse && tableContext.entities.length > 0) {
                                // Apply entity filtering logic for unconfigured mocks
                                // Entity names: map(tableContext.entities, 'name')
                                return {
                                    Items:            [], // Filtered results would go here
                                    Count:            0,
                                    ScannedCount:     0,
                                    LastEvaluatedKey: undefined
                                };
                            }

                            // Otherwise return the mock's configured response as-is
                            return mockResponse;
                        })
                    };
                    return commandBuilder;
                })
            };
        }
    };

    // Set up SST Resource mock globally
    (globalThis as typeof globalThis & { mockSSTResource?: typeof mockSSTResource }).mockSSTResource = mockSSTResource;
}

// Entity-level mocks for DynamoDB Toolbox v2.x
// These handle entity identification and filtering for proper DynamoDB Toolbox v2 compatibility

// Validation helper functions to reduce complexity
const validateRequiredFields = (itemData: Record<string, unknown>) => {
    if(!itemData.buildingID) {
        throw new Error('buildingID is required');
    }
};

const validateNumericTypes = (itemData: Record<string, unknown>) => {
    if('yearBuilt' in itemData && isString(itemData.yearBuilt)) {
        throw new Error('Right side of assignment cannot be destructured');
    }
};

const validateBooleanTypes = (itemData: Record<string, unknown>) => {
    if('roomsForRent' in itemData && isNumber(itemData.roomsForRent)) {
        throw new Error('Right side of assignment cannot be destructured');
    }
};

// Helper function to check if a value is a DynamoDB Toolbox operator (like $set([]))
const isDynamoDBOperator = (value: unknown): boolean => {
    return isObject(value) && value !== null
      && some(Object.getOwnPropertySymbols(value), sym => sym.toString().includes('$'));
};

const validateArrayTypes = (itemData: Record<string, unknown>) => {
    // Include all array fields that might use $set() operators
    const arrayFields = [
        'photos', 'propertyAmenities', 'rentSpecials', 'oneTimeFees',
        'monthlyFees', 'parkingOptions', 'storageOptions'
    ];
    for(const field of arrayFields) {
        const fieldValue = itemData[field];
        if(field in itemData && fieldValue !== null && fieldValue !== undefined) {
            // Allow arrays or DynamoDB Toolbox operators (like $set([]))
            if(!isArray(fieldValue) && !isDynamoDBOperator(fieldValue)) {
                throw new Error(`${field} must be an array`);
            }
        }
    }

    // Handle nested arrays in petPolicies
    if('petPolicies' in itemData && isObject(itemData.petPolicies)) {
        const petPolicies = itemData.petPolicies as Record<string, unknown>;
        const nestedArrayFields = ['petTypes', 'types', 'breedRestrictions'];
        for(const field of nestedArrayFields) {
            const fieldValue = petPolicies[field];
            if(field in petPolicies && fieldValue !== null && fieldValue !== undefined) {
                if(!isArray(fieldValue) && !isDynamoDBOperator(fieldValue)) {
                    throw new Error(`petPolicies.${field} must be an array`);
                }
            }
        }
    }
};

// Main validation function
const validateEntityItemData = (itemData: Record<string, unknown>) => {
    validateRequiredFields(itemData);
    validateNumericTypes(itemData);
    validateBooleanTypes(itemData);
    validateArrayTypes(itemData);
};

const createEntityMock = (entityName: string) => {
    // CRITICAL: Create completely fresh command context for each entity mock
    // This prevents state pollution between test files
    const createFreshCommandContext = () => ({
        entities:    [] as { name: string }[],
        lastCommand: null as string | null,
        itemData:    null as Record<string, unknown> | null,
        optionsData: null as Record<string, unknown> | null
    });

    // Store command context for entity filtering
    const commandContext = createFreshCommandContext();

    // Enhanced mock command builder that properly handles entity filtering
    const mockCommandBuilder = {
        item: jest.fn().mockImplementation((itemData: Record<string, unknown>) => {
            // Store the item data for later use in send()
            commandContext.itemData = itemData;
            // Perform basic type validation to simulate DynamoDB Toolbox validation
            if(itemData) {
                validateEntityItemData(itemData);
            }
            return mockCommandBuilder;
        }),
        key:     jest.fn().mockReturnThis(),
        options: jest.fn().mockImplementation((optionsData: Record<string, unknown>) => {
            // Store the options data for later use in send()
            commandContext.optionsData = optionsData;
            return mockCommandBuilder;
        }),
        entities: jest.fn().mockImplementation((...entities) => {
            // Store the entities for filtering during send()
            commandContext.entities = map(entities, entity => ({
                name: entity.name || entity.entityName || entityName || 'Unknown'
            }));
            return mockCommandBuilder;
        }),
        send: jest.fn().mockImplementation(async (command?: Record<string, unknown>) => {
            // Determine the command class based on what was stored during build()
            let CommandClass;
            const commandName = commandContext.lastCommand || 'QueryCommand';

            // Create appropriate command class based on the stored command type
            switch(commandName) {
                case 'PutItemCommand':
                case 'PutCommand':
                    CommandClass = class PutItemCommand {
                        constructor(input: unknown) {
                            assign(this, input);
                        }
                    };
                    break;
                case 'UpdateItemCommand':
                case 'UpdateCommand':
                    CommandClass = class UpdateItemCommand {
                        constructor(input: unknown) {
                            assign(this, input);
                        }
                    };
                    break;
                case 'GetItemCommand':
                case 'GetCommand':
                    CommandClass = class GetItemCommand {
                        constructor(input: unknown) {
                            assign(this, input);
                        }
                    };
                    break;
                case 'DeleteItemCommand':
                case 'DeleteCommand':
                    CommandClass = class DeleteItemCommand {
                        constructor(input: unknown) {
                            assign(this, input);
                        }
                    };
                    break;
                case 'QueryCommand':
                default:
                    CommandClass = class QueryCommand {
                        constructor(input: unknown) {
                            assign(this, input);
                        }
                    };
                    break;
            }

            // Build the command object from the command builder state
            // Build the command object from the command builder state
            const commandObj = new CommandClass({
                TableName: 'test-table-name',
                ...command
            });

            // For PutItemCommand, include the item data in the expected format
            if(commandName === 'PutItemCommand' || commandName === 'PutCommand') {
                (commandObj as Record<string, unknown>).input = {
                    Item:         commandContext.itemData,
                    ReturnValues: commandContext.optionsData?.returnValues,
                    ...commandContext.optionsData
                };
            }

            // Call dynamoDbMock with the properly typed command
            const mockResponse = await dynamoDbMock(commandObj);

            // Return the mock response directly
            return mockResponse;
        })
    };

    // Mock entity with proper metadata and enhanced methods
    const mockEntity = {
        name:       entityName,
        entityName: entityName, // Add entityName property for compatibility
        table:      {
            name:         'test-table-name',
            partitionKey: { name: 'buildingID', type: 'string' },
            sortKey:      { name: 'unitID', type: 'string' }
        },
        build: jest.fn().mockImplementation((CommandClass) => {
            // Store the command type for context
            commandContext.lastCommand = CommandClass?.name || 'UnknownCommand';
            return mockCommandBuilder;
        }),
        // Legacy methods for backward compatibility
        query: jest.fn().mockImplementation(() => dynamoDbMock()),
        scan:  jest.fn().mockImplementation(() => dynamoDbMock()),
        get:   jest.fn().mockImplementation(() => dynamoDbMock())
    };

    return { mockEntity, mockCommandBuilder, commandContext };
};
let buildingEntityMock = createEntityMock('Building');
let unitEntityMock = createEntityMock('Unit');
let unitTypeEntityMock = createEntityMock('UnitType');

// Set entity mocks globally to avoid require() calls in data/model.ts (only in test environment)
if(process.env.BUN_ENV === 'test') {
    (globalThis as typeof globalThis & { buildingEntityMock?: typeof buildingEntityMock }).buildingEntityMock = buildingEntityMock;
    (globalThis as typeof globalThis & { unitEntityMock?: typeof unitEntityMock }).unitEntityMock = unitEntityMock;
    (globalThis as typeof globalThis & { unitTypeEntityMock?: typeof unitTypeEntityMock }).unitTypeEntityMock = unitTypeEntityMock;
}

// Mock client classes that can be instantiated in tests
export class TestDynamoDBClient {
    send = dynamoDbMock;
    destroy = jest.fn().mockResolvedValue(undefined);
}

export class TestS3Client {
    send = s3Mock;
    destroy = jest.fn().mockResolvedValue(undefined);
}

export class TestSSMClient {
    send = ssmMock;
    destroy = jest.fn().mockResolvedValue(undefined);
    config = {};
    middlewareStack = {};
}

export const TestDynamoDBDocumentClient = {
    from: (_client: unknown, _config?: unknown) => ({
        send:    dynamoDbMock,
        destroy: jest.fn().mockResolvedValue(undefined),
        config:  {}
    })
};

// Create the mock data clients object that can be accessed by model.ts
const createMockDataClients = () => ({
    getDynamoClient: () => ({
        send:    dynamoDbMock,
        destroy: jest.fn().mockResolvedValue(undefined),
        config:  {}
    }),
    getS3Client: () => ({
        send:    s3Mock,
        destroy: jest.fn().mockResolvedValue(undefined)
    }),
    getSSMClient: () => ({
        send:            ssmMock,
        destroy:         jest.fn().mockResolvedValue(undefined),
        config:          {},
        middlewareStack: {}
    }),
    setTestClients:    jest.fn(),
    resetClients:      jest.fn(),
    // Enhanced mock table that properly handles entity filtering
    getApartmentTable: () => {
        return {
            build: jest.fn().mockImplementation((_CommandClass) => {
                // Create fresh context for each command build
                const commandContext = {
                    entities: [] as { name: string }[]
                };

                const commandBuilder = {
                    entities: jest.fn().mockImplementation((...entities) => {
                        commandContext.entities = map(entities, entity => ({
                            name: entity.name || entity.entityName || 'Unknown'
                        }));
                        return commandBuilder;
                    }),
                    query:   jest.fn().mockReturnThis(),
                    options: jest.fn().mockReturnThis(),
                    send:    jest.fn().mockImplementation(async (command?: Record<string, unknown>) => {
                        // Create a QueryCommand-like object that preserves the constructor name
                        const QueryCommand = class QueryCommand {
                            constructor(input: unknown) {
                                assign(this, input);
                            }
                        };

                        // Build the command object from the command builder state
                        const commandObj = new QueryCommand({
                            TableName:                 'test-table-name',
                            KeyConditionExpression:    'buildingID = :buildingID',
                            ExpressionAttributeValues: {
                                ':buildingID': 'test-building-id'
                            },
                            // ConsistentRead is undefined unless explicitly set
                            ConsistentRead: undefined,
                            ...command
                        });

                        // First try dynamoDbMock to respect any test configurations
                        const mockResponse = await dynamoDbMock(commandObj);

                        // Check if this is a default empty response (indicating no explicit test configuration)
                        const isDefaultResponse = mockResponse
                          && isArray(mockResponse.Items)
                          && mockResponse.Items.length === 0
                          && mockResponse.Count === 0;

                        // If it's a default response and we have entities to filter, apply entity filtering
                        if(isDefaultResponse && commandContext.entities.length > 0) {
                            // Apply entity filtering logic for unconfigured mocks
                            // Entity names: map(commandContext.entities, 'name')
                            return {
                                Items:            [], // Filtered results would go here
                                Count:            0,
                                ScannedCount:     0,
                                LastEvaluatedKey: undefined
                            };
                        }

                        // Otherwise return the mock's configured response as-is
                        return mockResponse;
                    })
                };
                return commandBuilder;
            })
        };
    }
});

// Create a global instance that can be accessed
let mockDataClients = createMockDataClients();

// Global mock reset function - this is the key to proper test isolation
const resetAllMocks = () => {
    // CRITICAL: Clear ALL global test state first
    if(typeof globalThis !== 'undefined') {
        // Clear debug state that might affect entity filtering
        delete (globalThis as typeof globalThis & { debugEntityFiltering?: unknown[] }).debugEntityFiltering;

        // Clear any test-specific caches or state
        const globalState = globalThis as typeof globalThis & {
            testCache?: Map<string, unknown>
            mockCache?: Map<string, unknown>
        };
        globalState.testCache?.clear();
        globalState.mockCache?.clear();
    }

    // Reset client cache first to ensure fresh clients are created
    resetClients();

    // Create completely fresh mock instances with no shared state
    dynamoDbMock = createDynamoDbMock();
    s3Mock = createS3Mock();
    ssmMock = createSSMMock();

    // Reset entity mocks with completely fresh implementations
    // CRITICAL: Clear any existing command context before creating new mocks
    buildingEntityMock = createEntityMock('Building');
    unitEntityMock = createEntityMock('Unit');
    unitTypeEntityMock = createEntityMock('UnitType');

    // CRITICAL: Reset command contexts to ensure no state pollution
    buildingEntityMock.commandContext.entities = [];
    buildingEntityMock.commandContext.lastCommand = null;
    unitEntityMock.commandContext.entities = [];
    unitEntityMock.commandContext.lastCommand = null;
    unitTypeEntityMock.commandContext.entities = [];
    unitTypeEntityMock.commandContext.lastCommand = null;

    // Recreate mockDataClients with fresh instances
    mockDataClients = createMockDataClients();

    // CRITICAL: Completely replace global references to ensure no shared state
    const globalRefs = globalThis as typeof globalThis & {
        mockDataClients?:    MockDataClients
        buildingEntityMock?: typeof buildingEntityMock
        unitEntityMock?:     typeof unitEntityMock
        unitTypeEntityMock?: typeof unitTypeEntityMock
    };

    // Delete existing references before setting new ones
    delete globalRefs.mockDataClients;
    delete globalRefs.buildingEntityMock;
    delete globalRefs.unitEntityMock;
    delete globalRefs.unitTypeEntityMock;

    // Set fresh references
    globalRefs.mockDataClients = mockDataClients;
    globalRefs.buildingEntityMock = buildingEntityMock;
    globalRefs.unitEntityMock = unitEntityMock;
    globalRefs.unitTypeEntityMock = unitTypeEntityMock;

    // Reset mocked functions from jest.mock calls with fresh state
    mockRandomUUID.mockClear();
    mockRandomUUID.mockReturnValue('test-uuid');
    mockGetSignedUrl.mockClear();
    mockGetSignedUrl.mockResolvedValue('https://presigned-url.example.com');

    // CRITICAL: Clear logger spies to prevent state pollution
    loggerInfoSpy.mockClear();
    loggerWarnSpy.mockClear();
    loggerErrorSpy.mockClear();
    loggerDebugSpy.mockClear();

    // Update the client classes to use new mock instances
    TestDynamoDBClient.prototype.send = dynamoDbMock;
    TestS3Client.prototype.send = s3Mock;
    TestSSMClient.prototype.send = ssmMock;

    // Update client classes with fresh configurations
    TestSSMClient.prototype.config = {};
    TestSSMClient.prototype.middlewareStack = {};
    TestDynamoDBDocumentClient.from = (_client: unknown, _config?: unknown) => ({
        send:    dynamoDbMock,
        destroy: jest.fn().mockResolvedValue(undefined),
        config:  {}
    });

    // CRITICAL: Force Jest to clear all mock state
    try {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    } catch{
        // Jest methods might not be available in all environments
    }

    // Test clients will be reinitialized automatically when needed
};

// CRITICAL: Expose reset function globally so setup-global.ts can use it
// This ensures complete isolation across ALL test files
if(typeof globalThis !== 'undefined') {
    (globalThis as typeof globalThis & { testDataResetFunction?: () => void }).testDataResetFunction = resetAllMocks;
}

// Helper function to create test clients that tests can use directly
const createTestDocumentClient = () => TestDynamoDBDocumentClient.from(new TestDynamoDBClient());
const createTestS3Client = () => new TestS3Client();
const createTestSSMClient = () => new TestSSMClient();

// Note: Tests can use createTestDocumentClient() and createTestS3Client()
// to create mock clients when needed, or rely on the automatic fallback
// mock clients created in the data/clients.ts module for test environment

// Export mocks and utilities for test files to use
export {
    dynamoDbMock,
    s3Mock,
    ssmMock,
    buildingEntityMock,
    unitEntityMock,
    unitTypeEntityMock,
    mockRandomUUID,
    mockGetSignedUrl,
    mockLogger,
    loggerInfoSpy,
    loggerWarnSpy,
    loggerErrorSpy,
    loggerDebugSpy,
    mockSSTResource,
    resetAllMocks,
    createTestDocumentClient,
    createTestS3Client,
    createTestSSMClient,
    mockDataClients
};

// Re-export jest for convenience
export { jest };
