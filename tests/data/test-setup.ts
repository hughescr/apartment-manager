/**
 * Test setup file that must be imported BEFORE any data layer modules.
 * This sets up all the necessary mocks for DynamoDB operations.
 */
import { mock } from 'bun:test';

// Set test environment
process.env.BUN_ENV = 'test';

// Mock lodash FIRST for CommonJS compatibility with @hughescr/logger
mock.module('lodash', () => {
    /* eslint-disable @typescript-eslint/no-explicit-any -- Mock implementation needs to handle various types */
    /* eslint-disable @typescript-eslint/no-empty-function -- noop needs to be an empty function */
    /* eslint-disable lodash/prefer-lodash-method -- We're implementing lodash methods ourselves */
    /* eslint-disable lodash/prefer-lodash-typecheck -- We're implementing lodash methods ourselves */
    /* eslint-disable lodash/prefer-noop -- We're implementing lodash noop ourselves */

    // Create a chainable wrapper class
    class LodashWrapper {
        private _value: any;

        constructor(value: any) {
            this._value = value;
        }

        pickBy(predicate: (value: any, key: string) => boolean): LodashWrapper {
            if(typeof this._value !== 'object' || this._value === null) {
                return new LodashWrapper({});
            }

            const result: any = {};
            Object.keys(this._value).forEach((key) => {
                if(predicate(this._value[key], key)) {
                    result[key] = this._value[key];
                }
            });

            return new LodashWrapper(result);
        }

        mapValues(iteratee: ((value: any, key: string) => any) | any): LodashWrapper {
            if(typeof this._value !== 'object' || this._value === null) {
                return new LodashWrapper({});
            }

            const result: any = {};
            Object.keys(this._value).forEach((key) => {
                // Handle both function iteratees and constructor functions (like String)
                if(typeof iteratee === 'function') {
                    result[key] = iteratee(this._value[key], key);
                } else {
                    result[key] = iteratee;
                }
            });

            return new LodashWrapper(result);
        }

        value(): any {
            return this._value;
        }

        fill(value: any): LodashWrapper {
            if(Array.isArray(this._value)) {
                return new LodashWrapper(this._value.fill(value));
            }
            return this;
        }

        map(iteratee: any): LodashWrapper {
            if(Array.isArray(this._value)) {
                return new LodashWrapper(this._value.map(iteratee));
            }
            return new LodashWrapper([]);
        }
    }

    const lodashMethods = {
        forEach: (collection: any, iteratee: any) => {
            if(Array.isArray(collection)) {
                collection.forEach(iteratee);
            } else {
                Object.keys(collection).forEach(key => iteratee(collection[key], key));
            }
        },
        map: (collection: any, iteratee: any) => {
            if(Array.isArray(collection)) {
                return collection.map(iteratee);
            }
            return Object.keys(collection).map(key => iteratee(collection[key], key));
        },
        filter: (collection: any, predicate: any) => {
            if(Array.isArray(collection)) {
                if(Array.isArray(predicate)) {
                    const [key, value] = predicate;
                    return collection.filter(item => item[key] === value);
                }
                return collection.filter(predicate);
            }
            return [];
        },
        omit: (object: any, keys: string[]) => {
            const result = { ...object };
            keys.forEach(key => delete result[key]);
            return result;
        },
        replace: (string: string, pattern: RegExp | string, replacement: string) => {
            return string.replace(pattern, replacement);
        },
        constant: (value: any) => () => value,
        isObject: (value: any) => value !== null && typeof value === 'object',
        isString: (value: any) => typeof value === 'string',
        startsWith: (string: string, target: string) => string.startsWith(target),
        endsWith: (string: string, target: string) => string.endsWith(target),
        split: (string: string, separator: string) => string.split(separator),
        toLower: (string: string) => string.toLowerCase(),
        every: (collection: any[], predicate: any) => collection.every(predicate),
        keys: (object: any) => Object.keys(object),
        noop: () => {},
        isError: (value: any) => value instanceof Error,
        isArray: Array.isArray,
        some: (collection: any[], predicate: any) => collection.some(predicate),
        trim: (string: string) => string.trim(),
        isEmpty: (value: any) => {
            if(value == null) {
                return true;
            }
            if(Array.isArray(value) || typeof value === 'string') {
                return value.length === 0;
            }
            if(typeof value === 'object') {
                return Object.keys(value).length === 0;
            }
            return false;
        },
        isNumber: (value: any) => typeof value === 'number' && !isNaN(value),
        fill: (array: any[], value: any) => array.fill(value),
        // Add standalone versions of chain methods
        pickBy: (object: any, predicate: (value: any, key: string) => boolean) => {
            if(typeof object !== 'object' || object === null) {
                return {};
            }

            const result: any = {};
            Object.keys(object).forEach((key) => {
                if(predicate(object[key], key)) {
                    result[key] = object[key];
                }
            });

            return result;
        },
        mapValues: (object: any, iteratee: ((value: any, key: string) => any) | any) => {
            if(typeof object !== 'object' || object === null) {
                return {};
            }

            const result: any = {};
            Object.keys(object).forEach((key) => {
                // Handle both function iteratees and constructor functions (like String)
                if(typeof iteratee === 'function') {
                    result[key] = iteratee(object[key], key);
                } else {
                    result[key] = iteratee;
                }
            });

            return result;
        },
    };

    // Create the main lodash function that creates chainable wrappers
    const lodashChain = Object.assign(
        (value: any) => new LodashWrapper(value),
        lodashMethods,
        {
            // Add chain method for compatibility
            chain: (value: any) => new LodashWrapper(value)
        }
    );

    /* eslint-enable @typescript-eslint/no-explicit-any -- Re-enable after mock implementation */
    /* eslint-enable @typescript-eslint/no-empty-function -- Re-enable after mock implementation */
    /* eslint-enable lodash/prefer-lodash-method -- Re-enable after mock implementation */
    /* eslint-enable lodash/prefer-lodash-typecheck -- Re-enable after mock implementation */
    /* eslint-enable lodash/prefer-noop -- Re-enable after mock implementation */

    // Support both ESM and CommonJS usage
    // The default export should be the chainable function itself
    return {
        ...lodashChain,  // This includes both the function and all methods
        'default': lodashChain,
    };
});

// Mock the SST module FIRST before any other imports can access it
mock.module('sst', () => ({
    Resource: {
        BuildingsUnits: {
            name: 'test-table-name'
        }
    }
}));

// Store reference to logger mocks for validation
let loggerMocks: Record<string, ReturnType<typeof mock>> | undefined;

// Mock the logger module
mock.module('@hughescr/logger', () => {
    const errorMock = mock();
    const warnMock = mock();
    const infoMock = mock();
    const debugMock = mock();

    loggerMocks = {
        error: errorMock,
        warn: warnMock,
        info: infoMock,
        debug: debugMock,
    };

    return {
        logger: loggerMocks,
    };
});

// Now import types after mocking
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { constant, forEach } from 'lodash';

// Create the mock send function that will be used by all tests
export const mockSend = mock(() => Promise.resolve({}));

// Create mock S3 send function that can be accessed by tests
export const mockS3Send = mock(() => Promise.resolve({}));

// Create a mock DynamoDB Document Client
const mockDynamoClient = {
    send: mockSend
} as unknown as DynamoDBDocumentClient;

// Create a mock S3 Client
const mockS3Client = {
    send: mockS3Send
};

// Mock the clients module to return our mock clients
mock.module('../../data/clients', () => ({
    getDynamoClient: () => mockDynamoClient,
    getS3Client: () => mockS3Client
}));

// Mock the db module to return our mock client and table name
mock.module('../../data/db', () => ({
    db: mockDynamoClient,
    tableName: 'test-table-name',
    getTableName: constant('test-table-name')
}));

// Mock crypto for ID generation
mock.module('crypto', () => ({
    randomUUID: mock(constant('test-uuid'))
}));

/**
 * Helper to clear all mock calls between tests
 */
export function clearMocks() {
    mockSend.mockClear();
    mockS3Send.mockClear();

    // Clear logger mocks if available
    if(loggerMocks) {
        forEach(['error', 'warn', 'info', 'debug'], (method) => {
            const mockFn = loggerMocks![method as keyof typeof loggerMocks];
            if(mockFn?.mock) {
                mockFn.mockClear();
            }
        });
    }
}

/**
 * Validate that mocks are in a clean state
 * Returns validation result with any issues found
 */
export function validateMockState() {
    const issues: string[] = [];

    // Check mockSend
    if(mockSend.mock && mockSend.mock.calls.length > 0) {
        issues.push(`mockSend has ${mockSend.mock.calls.length} uncleaned calls`);
    }

    // Check mockS3Send
    if(mockS3Send.mock && mockS3Send.mock.calls.length > 0) {
        issues.push(`mockS3Send has ${mockS3Send.mock.calls.length} uncleaned calls`);
    }

    // Check logger mocks if available
    if(loggerMocks) {
        forEach(['error', 'warn', 'info', 'debug'], (method) => {
            const mockFn = loggerMocks![method as keyof typeof loggerMocks];
            if(mockFn?.mock && mockFn.mock.calls.length > 0) {
                issues.push(`logger.${method} has ${mockFn.mock.calls.length} uncleaned calls`);
            }
        });
    }

    return {
        isClean: issues.length === 0,
        issues
    };
}

/**
 * Preload data layer modules to ensure all exports are available
 * This prevents module loading race conditions in Bun's test runner
 */
export async function preloadDataModules() {
    // Preload all data layer modules to ensure exports are resolved
    await import('../../data/buildings');
    await import('../../data/units');
    await import('../../data/unitTypes');
    await import('../../data/model');
}
