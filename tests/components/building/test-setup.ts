/**
 * Test setup file for building component tests.
 * This file sets up mocking and test data factories for component testing.
 */
import { mock, jest } from 'bun:test';
import type { BuildingData, UnitData, UnitTypeData } from '../../../astro-src/types';
import { PropertyType, PetType, FeeType, AmenityCategory, ParkingType, StorageType } from '../../../src/types/index.js';

// Set test environment
process.env.BUN_ENV = 'test';
process.env.SST_STAGE = 'test';

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

// Mock crypto module for consistent IDs in tests
const mockRandomUUID = jest.fn().mockReturnValue('test-uuid');
mock.module('crypto', () => ({
    randomUUID: mockRandomUUID
}));

// Mock fetch globally with proper typing
export const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch as unknown as typeof fetch;

// Helper to create mock Response objects
export const createMockResponse = (options: {
    ok: boolean
    status: number
    statusText?: string
    json?: () => Promise<unknown>
    text?: () => Promise<string>
}) => {
    return {
        ok: options.ok,
        status: options.status,
        statusText: options.statusText || '',
        headers: new Headers(),
        json: options.json || (() => Promise.resolve({})),
        text: options.text || (() => Promise.resolve('')),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        formData: () => Promise.resolve(new FormData()),
        clone: jest.fn(),
        body: null,
        bodyUsed: false,
        redirected: false,
        type: 'default' as ResponseType,
        url: '',
        bytes: () => Promise.resolve(new Uint8Array())
    } as Response;
};

// Mock window object for tests
export const mockWindow = {
    createBuildingState: jest.fn(), // Updated from createBuildingCardState
    buildingProviderData: jest.fn(),
    confirm: jest.fn().mockReturnValue(true),
    location: {
        reload: jest.fn()
    }
} as {
    createBuildingState: jest.Mock
    buildingProviderData: jest.Mock
    confirm: jest.Mock
    location: {
        reload: jest.Mock
    }
};

// Setup global window and confirm mocks
(global as unknown as { window: typeof mockWindow }).window = mockWindow;
(global as unknown as { confirm: typeof mockWindow.confirm }).confirm = mockWindow.confirm;

// Mock Alpine.js context for tests
export const mockAlpineContext = {
    $el: {
        dataset: {} as Record<string, string>
    },
    $watch: jest.fn(),
    $nextTick: jest.fn().mockImplementation((callback: () => void) => {
        setTimeout(callback, 0);
        return Promise.resolve();
    }),
    $dispatch: jest.fn()
};

// Test data factory functions
export const createTestBuildingData = (overrides: Partial<BuildingData> = {}): BuildingData => ({
    buildingID: 'test-building-123',
    buildingName: 'Test Apartment Complex',
    street: '123 Test Street',
    city: 'Test City',
    state: 'TS',
    zip: '12345',
    propertyType: PropertyType.APARTMENT,
    latitude: 40.7128,
    longitude: -74.0060,
    yearBuilt: 2020,
    totalUnits: 100,
    description: 'A beautiful test apartment complex with modern amenities.',
    photos: [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.jpg'
    ],
    leaseLength: 12,
    oneTimeFees: [
        {
            type: FeeType.APPLICATION,
            amount: 50,
            description: 'Application Fee',
            refundable: false
        },
        {
            type: FeeType.SECURITY_DEPOSIT,
            amount: 500,
            description: 'Security Deposit',
            refundable: true
        }
    ],
    monthlyFees: [
        {
            type: FeeType.PARKING,
            amount: 50,
            description: 'Parking',
            refundable: false
        }
    ],
    utilitiesIncluded: {
        water: true,
        sewer: true,
        trash: true,
        gas: false,
        electricity: false,
        cable: false,
        internet: true,
        heat: true,
        'air-conditioning': true
    },
    parkingOptions: [
        {
            type: ParkingType.COVERED,
            included: false,
            fee: 100,
            description: 'Covered garage parking'
        }
    ],
    storageOptions: [
        {
            type: StorageType.EXTERNAL_UNIT,
            included: false,
            fee: 25,
            description: 'Climate-controlled storage closet'
        }
    ],
    petPolicies: {
        allowed: true,
        petTypes: [
            {
                type: PetType.DOG,
                weightLimit: 50,
                countLimit: 2,
                fee: 25,
                deposit: 200,
                breedRestrictions: ['No aggressive breeds']
            },
            {
                type: PetType.CAT,
                countLimit: 2,
                fee: 15,
                deposit: 100
            }
        ]
    },
    propertyAmenities: [
        {
            name: 'Swimming Pool',
            category: AmenityCategory.PROPERTY
        },
        {
            name: 'Fitness Center',
            category: AmenityCategory.PROPERTY
        },
        {
            name: 'Business Center',
            category: AmenityCategory.PROPERTY
        },
        {
            name: 'Resident Lounge',
            category: AmenityCategory.COMMUNITY
        }
    ],
    contactInfo: {
        phone: '(555) 123-4567',
        email: 'leasing@testcomplex.com',
        propertyWebsite: 'https://testcomplex.com',
        officeHours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '10:00', close: '17:00' },
            sunday: { open: '12:00', close: '17:00' }
        }
    },
    screeningCriteria: {
        incomeRatio: 3,
        minCreditScore: 600,
        maxOccupantsPerBedroom: 2,
        backgroundCheckRequired: true,
        evictionHistory: true,
        criminalHistory: true,
        references: 2,
        employmentVerification: true,
        rentalHistory: true
    },
    rentSpecials: [
        {
            title: 'Move-in Special',
            startDate: '2024-01-01',
            endDate: '2024-03-31',
            description: 'First month free with 12-month lease'
        }
    ],
    updatedAt: new Date(),
    ...overrides
});

export const createTestUnitTypeData = (overrides: Partial<UnitTypeData> = {}): UnitTypeData => ({
    modelID: 'model-1bd',
    buildingID: 'test-building-123',
    modelName: '1 Bedroom 1 Bath',
    beds: 1,
    baths: 1,
    minSqft: 750,
    maxSqft: 850,
    minRent: 2200,
    maxRent: 2800,
    deposit: 500,
    maxOccupants: 2,
    countAvailable: 5,
    dateAvailable: new Date().toISOString(),
    modelAmenities: [
        {
            name: 'In-unit washer/dryer',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Stainless steel appliances',
            category: AmenityCategory.UNIT
        }
    ],
    updatedAt: new Date(),
    ...overrides
});

export const createTestUnitData = (overrides: Partial<UnitData> = {}): UnitData => ({
    unitID: 'unit-test-101',
    buildingID: 'test-building-123',
    modelID: 'model-1bd',
    unitNumber: '101',
    beds: 1,
    baths: 1,
    sqft: 800,
    rent: 2500,
    deposit: 500,
    vacancyClass: 'Unoccupied',
    availableDate: new Date().toISOString(),
    description: 'Bright corner unit with city views',
    maxOccupants: 2,
    minLeaseTerm: 6,
    maxLeaseTerm: 18,
    unitAmenities: [
        {
            name: 'Balcony',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Walk-in closet',
            category: AmenityCategory.UNIT
        }
    ],
    photos: [
        'https://example.com/unit-photo1.jpg',
        'https://example.com/unit-photo2.jpg'
    ],
    unitRentSpecial: {
        title: 'Summer Special',
        startDate: '2024-06-01',
        endDate: '2024-08-31',
        description: 'Half off first month rent'
    },
    updatedAt: new Date(),
    ...overrides
});

// Export additional mocks
export { mockRandomUUID, mockLogger };

// Re-export jest for convenience
export { jest };
