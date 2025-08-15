/**
 * Shared utilities and imports for type edge case tests
 * Reduces duplication across focused test files
 */

// Common test framework imports - re-exported for convenience
import { describe as bunDescribe, it as bunIt, expect as bunExpect } from 'bun:test';
import lodash from 'lodash';

export const describe = bunDescribe;
export const it = bunIt;
export const expect = bunExpect;
export const _ = lodash;

// Complete type and enum imports for all test files
export type {
    // Core Types
    Fee,
    PetPolicy,
    Amenity,
    BuildingData,
    UnitData,
    UnitTypeData,
    ParkingOption,
    StorageOption,
    RentSpecial,
    ContactInfo,
    TourAvailability,
    IncomeRestriction,
    ScreeningCriteria
} from '../../../src/types';

export {
    // Enums
    FeeType,
    PetType,
    AmenityCategory,
    PropertyType,
    ParkingType,
    StorageType,
    UtilityType,
    DayOfWeek,
    WebsiteStatus
} from '../../../src/types';

// Import types for function implementations
import type { Fee, PetPolicy, BuildingData, UnitData } from '../../../src/types';
import { FeeType, PetType } from '../../../src/types';

/**
 * Common test helper functions
 */

/**
 * Creates a basic Fee object for testing
 */
export const createTestFee = (overrides: Partial<Fee> = {}): Fee => ({
    type: FeeType.APPLICATION,
    amount: 100,
    ...overrides
});

/**
 * Creates a basic PetPolicy object for testing
 */
export const createTestPetPolicy = (overrides: Partial<PetPolicy> = {}): PetPolicy => ({
    allowed: true,
    types: [PetType.DOG],
    weightLimit: 50,
    deposit: 200,
    ...overrides
});

/**
 * Creates a basic BuildingData object for testing
 */
export const createTestBuilding = (overrides: Partial<BuildingData> = {}): BuildingData => ({
    buildingID: 'test-building-001',
    buildingName: 'Test Building',
    street: '123 Test St',
    city: 'Test City',
    state: 'CA',
    zip: '12345',
    ...overrides
});

/**
 * Creates a basic UnitData object for testing
 */
export const createTestUnit = (overrides: Partial<UnitData> = {}): UnitData => ({
    buildingID: 'test-building-001',
    unitID: 'test-unit-001',
    unitNumber: '101',
    beds: 0, // Studio
    baths: 1,
    sqft: 500,
    rent: 1200,
    ...overrides
});

/**
 * Common test validation patterns
 */
export const TestPatterns = {
    INVALID_DATES: [
        'not-a-date',
        '2023-13-01', // Invalid month
        '2023-02-30', // Invalid day
        '2023/02/28', // Wrong format
        'Feb 28, 2023', // Wrong format
        '28-02-2023', // Wrong format
    ],

    INVALID_TIMES: [
        '25:00', // Invalid hour
        '12:60', // Invalid minute
        '12:30:60', // Invalid second
        'noon', // Not numeric
        '12:30 PM', // With AM/PM
    ],

    BOUNDARY_VALUES: {
        RENT: {
            negative: [-1, -100, -0.01],
            zero: [0],
            maximum: [999999, 1000000], // Test at boundary
        },
        SQUARE_FEET: {
            negative: [-1, -100],
            zero: [0],
            maximum: [99999, 100000],
        },
        PERCENTAGE: {
            negative: [-1, -0.01],
            overHundred: [100.01, 200, 1000],
        },
    }
};

/**
 * Common assertion helpers
 */
export const TestAssertions = {
    /**
     * Asserts that a value should be accepted by TypeScript (compile-time check)
     */
    shouldCompile: <T>(value: T): void => {
        expect(value).toBeDefined();
    },

    /**
     * Tests that enum assignment works with type casting
     */
    testEnumAssignment: <T>(enumValue: T, testValue: unknown): void => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing type system edge cases requires any casting
        const result = testValue as any as T;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing type system edge cases requires any casting
        expect(result).toBe(testValue as any);
        // Also verify the original enum value exists for reference
        expect(enumValue).toBeDefined();
    }
};
