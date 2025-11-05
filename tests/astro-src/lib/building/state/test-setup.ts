/**
 * Test setup file for building state management tests.
 * Uses jest.fn() patterns instead of mock.module() to avoid Bun's global state issues.
 * This file sets up mocking and test data factories for state management testing.
 */
import { jest, spyOn } from 'bun:test';
import type { BuildingData, UnitTypeData } from '../../../../../astro-src/types';
import type { ExtendedUnitData } from '../../../../../astro-src/lib/building/types';
import type { AlpineMagics } from '../../../../../astro-src/lib/alpine-types';
import { PropertyType, PetType, FeeType, AmenityCategory, ParkingType, StorageType } from '../../../../../src/types/index.js';
import { replace, toUpper } from 'lodash';

// Set test environment
import { generateBuildingId } from '../../../../../src/utils/building-id.js';
process.env.SST_STAGE = 'test';

// Import the actual logger to spy on it
import { logger } from '@hughescr/logger';
import * as crypto from 'crypto';

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

// Mock crypto module for consistent IDs in tests
const mockRandomUUID = jest.fn().mockReturnValue('test-uuid-state');
const cryptoSpy = spyOn(crypto, 'randomUUID').mockImplementation(mockRandomUUID);

// Mock fetch globally with proper typing
export const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch as unknown as typeof fetch;

// Helper to create mock Response objects
export const createMockResponse = (options: {
    ok:          boolean
    status:      number
    statusText?: string
    json?:       () => Promise<unknown>
    text?:       () => Promise<string>
}) => {
    // If json is provided but text is not, automatically create text from json
    const textMethod = options.text ?? (async () => {
        if(options.json) {
            const jsonData = await options.json();
            return JSON.stringify(jsonData);
        }
        return '';
    });

    return {
        ok:          options.ok,
        status:      options.status,
        statusText:  options.statusText ?? '',
        headers:     new Headers(),
        json:        options.json ?? (() => Promise.resolve({})),
        text:        textMethod,
        blob:        () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        formData:    () => Promise.resolve(new FormData()),
        clone:       jest.fn(),
        body:        null,
        bodyUsed:    false,
        redirected:  false,
        type:        'default' as ResponseType,
        url:         '',
        bytes:       () => Promise.resolve(new Uint8Array())
    } as Response;
};

// Mock window and setTimeout/clearTimeout for tests
export const mockSetTimeout = jest.fn().mockImplementation((callback: () => void, delay: number) => {
    // For tests, execute immediately unless delay is needed
    if(delay === 0) {
        callback();
        return 1;
    }
    return setTimeout(callback, delay);
});

export const mockClearTimeout = jest.fn().mockImplementation((id: ReturnType<typeof setTimeout>) => {
    return clearTimeout(id);
});

// Mock window object for tests
export const mockWindow = {
    createBuildingState:  jest.fn(),
    buildingProviderData: jest.fn(),
    confirm:              jest.fn().mockReturnValue(true),
    location:             {
        reload: jest.fn(),
        href:   ''
    }
    // Note: setTimeout and clearTimeout removed to allow fake timers to work properly
    // mockSetTimeout and mockClearTimeout are still available for direct use if needed
} as {
    createBuildingState:  jest.Mock
    buildingProviderData: jest.Mock
    confirm:              jest.Mock
    location: {
        reload: jest.Mock
        href:   string
    }
};

// Setup global window and confirm mocks
(global as unknown as { window: typeof mockWindow }).window = mockWindow;
(global as unknown as { confirm: typeof mockWindow.confirm }).confirm = mockWindow.confirm;

// Create a singleton mock Alpine context for reuse
export const mockAlpineContext = {
    $el: {
        dataset: {} as Record<string, string>
    } as HTMLElement,
    $watch:    jest.fn(),
    $nextTick: jest.fn().mockImplementation((callback?: () => void) => {
        // Execute immediately for tests
        if(callback) {
            return callback();
        }
        return Promise.resolve();
    }),
    $dispatch: jest.fn(),
    $store:    {},
    $root:     { dataset: {} } as HTMLElement,
    $refs:     {} as Record<string, HTMLElement>,
    $data:     {} as Record<string, unknown>
} as unknown as AlpineMagics;

// Add watchers storage for testing
(mockAlpineContext as unknown as { _watchers?: Map<string, (value: unknown) => void> })._watchers = new Map();

// Mock Alpine.js context factory for tests
export const createMockAlpineContext = (overrides: Partial<AlpineMagics> = {}): AlpineMagics => ({
    $el: {
        dataset: {} as Record<string, string>
    } as HTMLElement,
    $watch: jest.fn().mockImplementation((property: string, callback: (newValue: unknown, oldValue: unknown) => void) => {
        // Store watchers for later triggering in tests
        const context = mockAlpineContext as unknown as { _watchers?: Map<string, (newValue: unknown, oldValue: unknown) => void> };
        if(!(context._watchers ?? false)) {
            context._watchers = new Map();
        }
        context._watchers?.set(property, callback);
    }),
    $nextTick: jest.fn().mockImplementation((callback?: () => void) => {
        // Execute immediately for tests
        if(callback) {
            return callback();
        }
        return Promise.resolve();
    }),
    $dispatch: jest.fn(),
    $store:    {},
    $root:     { dataset: {} } as HTMLElement,
    $refs:     {} as Record<string, HTMLElement>,
    $data:     {} as Record<string, unknown>,
    $id:       jest.fn().mockImplementation((_name: string, index?: number) => {
        // Generate predictable IDs for testing as numbers (matches test expectations)
        return (index ?? Math.floor(Math.random() * 1000));
    }),
    ...overrides
} as unknown as AlpineMagics);

// Helper to trigger watchers in tests
export const triggerWatcher = (property: string, newValue: unknown, oldValue?: unknown): void => {
    const watchers = (mockAlpineContext as unknown as { _watchers?: Map<string, (newValue: unknown, oldValue: unknown) => void> })._watchers;
    const watcher = watchers?.get(property);
    if(watcher) {
        watcher(newValue, oldValue ?? null);
    }
};

// Test data factory functions for state management
// Note: Uses string dates for consistency with JSON serialization
export const createTestBuildingData = (overrides: Partial<BuildingData> = {}): BuildingData => ({
    buildingID:   generateBuildingId(), // Use valid short-uuid format
    buildingName: '123 State Test Street',
    street:       '123 State Test Street',
    city:         'State Test City',
    state:        'ST',
    zip:          '12345',
    propertyType: PropertyType.APARTMENT,
    latitude:     40.7128,
    longitude:    -74.0060,
    yearBuilt:    2020,
    totalUnits:   100,
    description:  'A beautiful test apartment complex for state management testing.',
    photos:       [
        'https://example.com/state-photo1.jpg',
        'https://example.com/state-photo2.jpg'
    ],
    leaseLength: 12,
    oneTimeFees: [
        {
            type:        FeeType.APPLICATION,
            amount:      50,
            description: 'Application Fee',
            refundable:  false
        },
        {
            type:        FeeType.SECURITY_DEPOSIT,
            amount:      500,
            description: 'Security Deposit',
            refundable:  true
        }
    ],
    monthlyFees: [
        {
            type:        FeeType.PARKING,
            amount:      50,
            description: 'Parking',
            refundable:  false
        }
    ],
    utilitiesIncluded: {
        water:              true,
        sewer:              true,
        trash:              true,
        gas:                false,
        electricity:        false,
        cable:              false,
        internet:           true,
        heat:               true,
        'air-conditioning': true
    },
    parkingOptions: [
        {
            type:        ParkingType.COVERED,
            included:    false,
            fee:         100,
            description: 'Covered garage parking'
        }
    ],
    storageOptions: [
        {
            type:        StorageType.EXTERNAL_UNIT,
            included:    false,
            fee:         25,
            description: 'Climate-controlled storage closet'
        }
    ],
    petPolicies: {
        allowed:  true,
        petTypes: [
            {
                type:              PetType.DOG,
                weightLimit:       50,
                countLimit:        2,
                fee:               25,
                deposit:           200,
                breedRestrictions: ['No aggressive breeds']
            },
            {
                type:       PetType.CAT,
                countLimit: 2,
                fee:        15,
                deposit:    100
            }
        ]
    },
    propertyAmenities: [
        {
            name:     'Swimming Pool',
            category: AmenityCategory.PROPERTY
        },
        {
            name:     'Fitness Center',
            category: AmenityCategory.PROPERTY
        }
    ],
    contactInfo: {
        phone:           '(555) 123-4567',
        email:           'leasing@statetestcomplex.com',
        propertyWebsite: 'https://statetestcomplex.com',
        officeHours:     {
            monday:    { open: '09:00', close: '18:00' },
            tuesday:   { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday:  { open: '09:00', close: '18:00' },
            friday:    { open: '09:00', close: '18:00' },
            saturday:  { open: '10:00', close: '17:00' },
            sunday:    { open: '12:00', close: '17:00' }
        }
    },
    screeningCriteria: {
        incomeRatio:             3,
        minCreditScore:          600,
        maxOccupantsPerBedroom:  2,
        backgroundCheckRequired: true,
        evictionHistory:         true,
        criminalHistory:         true,
        references:              2,
        employmentVerification:  true,
        rentalHistory:           true
    },
    rentSpecials: [
        {
            id:          1,
            title:       'State Test Special',
            startDate:   '2024-01-01',
            endDate:     '2024-03-31',
            description: 'First month free with 12-month lease'
        }
    ],
    updatedAt: new Date('2024-01-01T12:00:00.000Z'), // Fixed date for consistent testing
    ...overrides
});

export const createTestExtendedUnitData = (overrides: Partial<ExtendedUnitData> = {}): ExtendedUnitData => ({
    unitID:        'unit-state-101',
    buildingID:    generateBuildingId(), // Use valid short-uuid format
    modelID:       'model-1bd',
    unitNumber:    '101',
    beds:          1,
    baths:         1,
    sqft:          800,
    rent:          2500,
    deposit:       500,
    vacancyClass:  'Unoccupied',
    availableDate: new Date().toISOString(),
    description:   'Bright corner unit for state testing',
    maxOccupants:  2,
    minLeaseTerm:  6,
    maxLeaseTerm:  18,
    unitAmenities: [
        {
            name:     'Balcony',
            category: AmenityCategory.UNIT
        }
    ],
    photos: [
        'https://example.com/state-unit-photo1.jpg'
    ],
    unitRentSpecial: {
        title:       'State Unit Special',
        startDate:   '2024-06-01',
        endDate:     '2024-08-31',
        description: 'Half off first month rent'
    },
    updatedAt:   new Date('2024-01-01T12:00:00.000Z'), // Fixed date for consistent testing
    // Extended properties for state management
    lastUpdated: new Date().toISOString(),
    status:      'available',
    currentRent: 2500,
    editingRent: false,
    savingField: null,
    ...overrides
});

export const createTestUnitTypeData = (overrides: Partial<UnitTypeData> = {}): UnitTypeData => ({
    modelID:        'model-state-1bd',
    buildingID:     generateBuildingId(), // Use valid short-uuid format
    modelName:      '1 Bedroom 1 Bath State Test',
    beds:           1,
    baths:          1,
    minSqft:        750,
    maxSqft:        850,
    minRent:        2200,
    maxRent:        2800,
    deposit:        500,
    maxOccupants:   2,
    countAvailable: 5,
    dateAvailable:  new Date().toISOString(),
    modelAmenities: [
        {
            name:     'In-unit washer/dryer',
            category: AmenityCategory.UNIT
        }
    ],
    updatedAt: new Date('2024-01-01T12:00:00.000Z'), // Fixed date for consistent testing
    ...overrides
});

// Mock API service responses
export const createMockApiResponse = (data?: unknown, success = true, error?: string) => ({
    success,
    data,
    error
});

// Mock HTML element with dataset for testing
export const createMockHtmlElement = (dataset: Record<string, string> = {}): HTMLElement => {
    const mockElement = {
        dataset: {
            buildingData:     JSON.stringify(createTestBuildingData()),
            initialUnits:     JSON.stringify([createTestExtendedUnitData()]),
            initialUnitTypes: JSON.stringify([createTestUnitTypeData()]),
            apiUrl:           '/api/buildings/test-building-state',
            ...dataset
        },
        hasAttribute: jest.fn().mockImplementation((attr: string) => {
            const attrKey = replace(replace(attr, 'data-', ''), /-([a-z])/g, (_, letter) => toUpper(letter));
            return attrKey in mockElement.dataset;
        }),
        querySelector: jest.fn().mockReturnValue(null)
    };
    return mockElement as unknown as HTMLElement;
};

// Function to reset all mocks
const resetAllMocks = () => {
    // Clear all function mocks
    jest.clearAllMocks();

    // Reset fetch mock - use both clear and reset for complete cleanup
    mockFetch.mockClear();
    mockFetch.mockReset();

    // Reset crypto mock
    mockRandomUUID.mockClear();
    mockRandomUUID.mockReturnValue('test-uuid-state');
    cryptoSpy.mockImplementation(mockRandomUUID);

    // Reset window mocks
    mockWindow.createBuildingState.mockClear();
    mockWindow.buildingProviderData.mockClear();
    mockWindow.confirm.mockClear();
    mockWindow.location.reload.mockClear();
    mockWindow.location.href = '';

    // Reset Alpine context mocks
    (mockAlpineContext.$watch as jest.Mock).mockClear();
    (mockAlpineContext.$nextTick as jest.Mock).mockClear();
    (mockAlpineContext.$dispatch as jest.Mock).mockClear();

    // Clear watchers
    const watchers = (mockAlpineContext as unknown as { _watchers?: Map<string, (value: unknown) => void> })._watchers;
    watchers?.clear();

    // Reset timeout mocks
    mockSetTimeout.mockClear();
    mockClearTimeout.mockClear();
};

// Export additional mocks
export {
    mockRandomUUID,
    mockLogger,
    loggerInfoSpy,
    loggerWarnSpy,
    loggerErrorSpy,
    loggerDebugSpy,
    resetAllMocks
};

// Re-export jest for convenience
export { jest };
