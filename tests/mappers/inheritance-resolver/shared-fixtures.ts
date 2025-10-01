import { fill, forEach, repeat } from 'lodash';
import { AmenityCategory, FeeType, PropertyType } from '../../../src/types';
import type { UnitData, UnitTypeData, BuildingData, Amenity } from '../../../src/types';

/**
 * Shared test fixtures for inheritance-resolver tests
 * Common data used across all decomposed test files
 */

export const buildingData: BuildingData = {
    buildingID:          'BLDG-001',
    street:              '123 Main St',
    city:                'Test City',
    state:               'TS',
    zip:                 '12345',
    leaseLength:         12,
    propertyDescription: 'Beautiful property with many amenities',
    photos:              [
        'https://example.com/building1.jpg',
        'https://example.com/building2.jpg'
    ],
    propertyAmenities: [
        { name: 'Swimming Pool', category: AmenityCategory.PROPERTY },
        { name: 'Fitness Center', category: AmenityCategory.PROPERTY }
    ],
    oneTimeFees: [
        { type: FeeType.APPLICATION, amount: 50, refundable: false },
        { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true }
    ],
    monthlyFees: [
        { type: FeeType.PARKING, amount: 100, refundable: false }
    ]
};

export const unitTypeData: UnitTypeData = {
    buildingID:     'BLDG-001',
    modelID:        'MODEL-001',
    modelName:      '2BR/2BA Standard',
    beds:           2,
    baths:          2,
    minSqft:        900,
    maxSqft:        950,
    minRent:        1500,
    maxRent:        1700,
    deposit:        1500,
    maxOccupants:   4,
    perPersonRent:  100,
    minLeaseTerm:   6,
    maxLeaseTerm:   24,
    modelAmenities: [
        { name: 'Air Conditioning', category: AmenityCategory.UNIT },
        { name: 'Dishwasher', category: AmenityCategory.UNIT }
    ]
};

export const unitData: UnitData = {
    buildingID:      'BLDG-001',
    unitID:          'UNIT-001',
    modelID:         'MODEL-001',
    unitNumber:      '101',
    beds:            undefined, // Should inherit from model
    baths:           undefined, // Should inherit from model
    sqft:            925,
    rent:            1600,
    availableDate:   '2024-01-01',
    unitDescription: 'Corner unit with great views',
    photos:          [
        'https://example.com/unit101-1.jpg',
        'https://example.com/unit101-2.jpg'
    ]
};

// Additional fixtures for edge cases and complex scenarios

export const buildingDataWithPropertyType: BuildingData = {
    ...buildingData,
    propertyType: PropertyType.APARTMENT
};

export const unitDataWithStringNumbers: UnitData = {
    buildingID: 'BLDG-001',
    unitID:     'UNIT-001',
    beds:       '2' as unknown as number,
    baths:      '1.5' as unknown as number,
    sqft:       '900' as unknown as number,
    rent:       '1500' as unknown as number,
    deposit:    '1000' as unknown as number
};

export const unitDataWithBooleanStrings: UnitData = {
    buildingID: 'BLDG-001',
    unitID:     'UNIT-001',
    occupied:   'true' as unknown as boolean
};

export const unitDataWithNulls: UnitData = {
    buildingID:    'BLDG-001',
    unitID:        'UNIT-001',
    beds:          null as unknown as number,
    baths:         undefined,
    unitAmenities: null as unknown as Amenity[],
    photos:        null as unknown as string[]
};

export const unitDataWithSpecialNumbers: UnitData = {
    buildingID: 'BLDG-001',
    unitID:     'UNIT-001',
    beds:       NaN,
    baths:      Infinity,
    sqft:       -0,
    rent:       -Infinity
};

export const unitDataWithMaxValues: UnitData = {
    buildingID: 'BLDG-001',
    unitID:     'UNIT-001',
    beds:       Number.MAX_SAFE_INTEGER,
    sqft:       Number.MAX_SAFE_INTEGER,
    rent:       Number.MAX_SAFE_INTEGER
};

// Helper functions for creating test data

export function createLargeAmenitySet(count: number): Amenity[] {
    return Array.from({ length: count }, (_, i) => ({
        name:        `Amenity${i}`,
        category:    i % 2 === 0 ? AmenityCategory.UNIT : AmenityCategory.PROPERTY,
        description: `Description for amenity ${i}`
    }));
}

export function createSparseArray<T>(length: number, items: { index: number, value: T }[]): (T | undefined)[] {
    const array = new Array<T | undefined>(length);
    forEach(items, ({ index, value }) => {
        array[index] = value;
    });
    return array;
}

export function createVeryLongString(length: number): string {
    return repeat('A', length);
}

// Performance testing helpers

export function createDeepAmenityNesting(levels: number): Amenity[] {
    return Array.from({ length: levels }, (_, i) => ({
        name:        `Level${i}`,
        category:    AmenityCategory.UNIT,
        description: createVeryLongString(1000)
    }));
}

export function createUnitWithManyFields(): UnitData {
    return {
        buildingID:      'BLDG-001',
        unitID:          'UNIT-001',
        unitNumber:      '101',
        beds:            2,
        baths:           2,
        sqft:            900,
        rent:            1500,
        occupied:        false,
        availableDate:   '2024-01-01',
        description:     'Test',
        modelID:         'MODEL-001',
        maxOccupants:    4,
        perPersonRent:   100,
        deposit:         1500,
        minLeaseTerm:    6,
        maxLeaseTerm:    24,
        unitDescription: 'Test description',
        photos:          fill(Array(100), 'https://example.com/photo.jpg')
    };
}

// Advanced JS feature test fixtures

export function createUnitWithSymbols(): UnitData {
    const symbolKey = Symbol('test');
    return {
        buildingID:  'BLDG-001',
        unitID:      'UNIT-001',
        [symbolKey]: 'symbol value'
    } as UnitData;
}

export function createUnitWithGetterSetter(initialValue = 1000): UnitData {
    let internalValue = initialValue;
    return {
        buildingID: 'BLDG-001',
        unitID:     'UNIT-001',
        get rent() { return internalValue; },
        set rent(val: number) { internalValue = val; }
    } as UnitData;
}

export function createUnitWithThrowingGetter(): UnitData {
    return {
        buildingID: 'BLDG-001',
        unitID:     'UNIT-001',
        get beds() { throw new Error('Getter error'); }
    } as UnitData;
}

export function createFrozenUnit(data: Partial<UnitData> = {}): UnitData {
    return Object.freeze({
        buildingID: 'BLDG-001',
        unitID:     'UNIT-001',
        beds:       1,
        ...data
    }) as UnitData;
}

export function createSealedUnit(data: Partial<UnitData> = {}): UnitData {
    return Object.seal({
        buildingID: 'BLDG-001',
        unitID:     'UNIT-001',
        beds:       undefined,
        baths:      undefined,
        ...data
    }) as UnitData;
}

// Security test fixtures

export function createMaliciousUnit(): UnitData {
    return {
        buildingID:  'BLDG-001',
        unitID:      'UNIT-001',
        __proto__:   { polluted: true },
        constructor: { prototype: { polluted: true } }
    } as UnitData;
}

export const dangerousAmenity: Amenity = {
    name:     '__proto__',
    category: AmenityCategory.UNIT
};

export function createCircularAmenity(): Amenity & { self?: Amenity } {
    const amenity = { name: 'Circular', category: AmenityCategory.UNIT } as Amenity & { self?: Amenity };
    amenity.self = amenity;
    return amenity;
}

// Mixed type test fixtures

export const mixedPhotos: unknown[] = [
    'photo1.jpg',
    123,
    null,
    undefined,
    { url: 'photo2.jpg' },
    true,
    Symbol('photo')
];

export const mixedAmenities: unknown[] = [
    { name: 'Valid', category: AmenityCategory.UNIT },
    'invalid string',
    123,
    null,
    { name: 'Another', category: AmenityCategory.PROPERTY }
];

// Date and RegExp fixtures

export const validDate = new Date('2024-01-01');
export const invalidDate = new Date('invalid');
export const regexPattern = /test pattern/gi;
