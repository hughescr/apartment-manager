/* eslint-disable @typescript-eslint/no-explicit-any -- Testing edge cases with invalid types */
/* eslint-disable lodash/prefer-lodash-method -- Using native methods to test edge cases */
// Note: This file intentionally uses 'any' types and native methods to test edge cases

import type {
    BuildingData,
    UnitTypeData,
    UnitData,
    Fee,
    Amenity
} from '../../../src/types/index.js';
import {
    FeeType,
    AmenityCategory
} from '../../../src/types/index.js';

/**
 * Building with null and undefined values
 */
export const nullUndefinedBuilding: BuildingData = {
    buildingID: 'building-null-001',
    street: undefined,
    city: undefined,
    state: undefined,
    zip: undefined,
    description: null as any, // Testing null where undefined expected
    yearBuilt: undefined,
    numberStories: undefined,
    totalUnits: undefined,
    propertyType: undefined,
    roomsForRent: undefined,
    photos: undefined,
    leaseLength: undefined,
    shortTermLeaseAllowed: undefined,
    propertyLicenseNumber: undefined,
    specialtyType: undefined,
    specialtySubType: undefined,
    propertyDescription: undefined,
    rentSpecials: undefined,
    incomeRestrictions: undefined,
    utilitiesIncluded: undefined,
    oneTimeFees: undefined,
    monthlyFees: undefined,
    parkingOptions: undefined,
    petPolicies: undefined,
    storageOptions: undefined,
    propertyAmenities: undefined,
    screeningCriteria: undefined,
    contactInfo: undefined,
    tourAvailability: undefined,
    applicationFee: undefined,
    acceptsOnlineApplications: undefined
};

/**
 * Building with empty arrays and objects
 */
export const emptyCollectionsBuilding: BuildingData = {
    buildingID: 'building-empty-001',
    street: '123 Empty St',
    city: 'Voidville',
    state: 'VA',
    zip: '00000',
    photos: [],
    rentSpecials: [],
    incomeRestrictions: {
        maxIncomeByHouseholdSize: {}
    },
    utilitiesIncluded: {},
    oneTimeFees: [],
    monthlyFees: [],
    parkingOptions: [],
    storageOptions: [],
    propertyAmenities: [],
    screeningCriteria: {},
    contactInfo: {
        officeHours: {}
    },
    tourAvailability: {
        tourHours: {}
    }
};

/**
 * Unit type with null/undefined values
 */
export const nullUndefinedUnitType: UnitTypeData = {
    buildingID: 'building-null-001',
    modelID: 'model-null-001',
    modelName: 'Null Model',
    countAvailable: undefined,
    dateAvailable: undefined,
    beds: null as any, // Testing null where number expected
    baths: null as any,
    maxOccupants: undefined,
    minRent: undefined,
    maxRent: undefined,
    perPersonRent: undefined,
    minSqft: undefined,
    maxSqft: undefined,
    deposit: undefined,
    minLeaseTerm: undefined,
    maxLeaseTerm: undefined,
    modelAmenities: undefined
};

/**
 * Unit with null/undefined values
 */
export const nullUndefinedUnit: UnitData = {
    buildingID: 'building-null-001',
    unitID: 'unit-null-001',
    description: undefined,
    beds: undefined,
    baths: undefined,
    sqft: undefined,
    rent: undefined,
    occupied: undefined,
    availableDate: undefined,
    modelID: undefined,
    unitNumber: undefined,
    maxOccupants: undefined,
    perPersonRent: undefined,
    deposit: undefined,
    minLeaseTerm: undefined,
    maxLeaseTerm: undefined,
    unitDescription: undefined,
    unitRentSpecial: undefined,
    unitAmenities: undefined,
    photos: undefined,
    feedInclusion: undefined,
    manualReferences: undefined
};

/**
 * Building with invalid data types
 */
export const invalidTypesBuilding: BuildingData = {
    buildingID: 'building-invalid-001',
    street: 123 as any, // Number instead of string
    city: true as any, // Boolean instead of string
    state: {} as any, // Object instead of string
    zip: [] as any, // Array instead of string
    yearBuilt: '2020' as any, // String instead of number
    numberStories: '5' as any, // String instead of number
    totalUnits: 'fifty' as any, // String instead of number
    propertyType: 'invalid-type' as any, // Invalid enum value
    roomsForRent: 'yes' as any, // String instead of boolean
    photos: 'not-an-array' as any, // String instead of array
    leaseLength: '12 months' as any, // String instead of number
    applicationFee: '$75' as any // String instead of number
};

/**
 * Unit type with invalid data types
 */
export const invalidTypesUnitType: UnitTypeData = {
    buildingID: 'building-invalid-001',
    modelID: 'model-invalid-001',
    modelName: 123 as any, // Number instead of string
    beds: '2' as any, // String instead of number
    baths: '1.5' as any, // String instead of number
    minRent: '$2000' as any, // String with $ instead of number
    maxRent: '2500.00' as any, // String instead of number
    dateAvailable: 'January 1st' as any, // Invalid date format
    modelAmenities: 'not-an-array' as any // String instead of array
};

/**
 * Building with missing required fields
 */
export const missingRequiredBuilding: any = {
    // Missing buildingID - required field
    street: '789 Missing ID Lane',
    city: 'Errorville',
    state: 'ER',
    zip: '99999'
};

/**
 * Unit type with missing required fields
 */
export const missingRequiredUnitType: any = {
    // Missing buildingID and modelID
    modelName: 'Missing IDs Model',
    beds: 2,
    baths: 1
};

/**
 * Unit with missing required fields
 */
export const missingRequiredUnit: any = {
    // Missing buildingID and unitID
    beds: 1,
    baths: 1,
    rent: 1500
};

/**
 * Building with special characters in text fields
 */
export const specialCharsBuilding: BuildingData = {
    buildingID: 'building-special-001',
    street: '123 O\'Brien & Sons "Luxury" <Apartments>',
    city: 'San José',
    state: 'CA',
    zip: '95110-1234',
    description: 'Special chars: & < > " \' © ™ ® • – — … €',
    propertyDescription: `Line 1
Line 2 with "quotes"
Line 3 with 'apostrophes'
Line 4 with <html> tags
Line 5 with & ampersand
Line 6 with émojis 🏠 🏢 🌟`,
    propertyLicenseNumber: 'LIC#2023/456-A&B',
    rentSpecials: [{
        title: '50% Off! "Limited Time"',
        description: 'Save $$$ & more! <Special Offer>'
    }],
    petPolicies: {
        allowed: true,
        notes: 'Dogs & cats welcome! No "aggressive" breeds.'
    },
    screeningCriteria: {
        notes: 'Background & credit check required. Must meet 3x rent/income ratio.'
    }
};

/**
 * Unit with special characters
 */
export const specialCharsUnit: UnitData = {
    buildingID: 'building-special-001',
    unitID: 'unit-special-001',
    unitNumber: '#A-1',
    description: 'Unit with "special" features & <amenities>',
    unitDescription: `Beautiful unit with:
• Hardwood floors
• Granite counters
• Stainless steel appliances
• "Smart home" features
• Private balcony with city views

Price: $2,500/mo (utilities included)
Available: Now!`,
    unitRentSpecial: {
        title: '½ Month Free!',
        description: 'Sign & Save™ - Limited time offer*'
    }
};

/**
 * Building with extremely long strings
 */
export const longStringsBuilding: BuildingData = {
    buildingID: 'building-long-001',
    street: 'A'.repeat(500), // 500 character street name
    city: 'B'.repeat(100), // 100 character city name
    state: 'CA',
    zip: '12345-6789-0000', // Unusually long ZIP
    description: 'Short description',
    propertyDescription: 'Lorem ipsum '.repeat(500), // ~6000 characters
    propertyLicenseNumber: 'LIC-'.repeat(50), // 200 characters
    rentSpecials: Array(50).fill(null).map((_, i) => ({
        title: `Special Offer ${i + 1}: ${' Deal'.repeat(20)}`,
        description: 'Description '.repeat(100)
    })),
    propertyAmenities: Array(100).fill(null).map((_, i) => ({
        name: `Amenity ${i + 1}: ${'Feature '.repeat(10)}`,
        category: AmenityCategory.PROPERTY,
        description: 'Long description '.repeat(50)
    }))
};

/**
 * Unit type with extreme values
 */
export const extremeValuesUnitType: UnitTypeData = {
    buildingID: 'building-extreme-001',
    modelID: 'model-extreme-001',
    modelName: 'Extreme Model',
    beds: 0, // Studio
    baths: 0.5, // Half bath only
    minRent: 1, // $1 rent
    maxRent: 999999, // Nearly $1M rent
    minSqft: 1, // 1 sq ft
    maxSqft: 99999, // Nearly 100k sq ft
    deposit: 0, // No deposit
    maxOccupants: 50, // Extreme occupancy
    countAvailable: 9999, // Huge availability
    minLeaseTerm: 0, // No minimum
    maxLeaseTerm: 999 // 83+ years
};

/**
 * Unit with extreme values
 */
export const extremeValuesUnit: UnitData = {
    buildingID: 'building-extreme-001',
    unitID: 'unit-extreme-001',
    unitNumber: '99999',
    beds: 99,
    baths: 99.5,
    sqft: 999999,
    rent: 0.01, // 1 cent rent
    perPersonRent: 0.001, // Fraction of a cent
    deposit: 1000000, // $1M deposit
    minLeaseTerm: 0.5, // Half month?
    maxLeaseTerm: 1200 // 100 years
};

/**
 * Building with circular references (should be handled properly)
 */
const circularFee: Fee = {
    type: FeeType.APPLICATION,
    amount: 50
};
// Add circular reference
(circularFee as any).circularRef = circularFee;

export const circularRefBuilding: BuildingData = {
    buildingID: 'building-circular-001',
    street: '123 Circular St',
    city: 'Loopville',
    state: 'LP',
    zip: '00000',
    oneTimeFees: [circularFee]
};

/**
 * Building with deeply nested structures
 */
export const deeplyNestedBuilding: BuildingData = {
    buildingID: 'building-nested-001',
    street: '456 Nested Ave',
    city: 'Deeptown',
    state: 'DP',
    zip: '11111',
    incomeRestrictions: {
        amiLimit: 80,
        maxIncomeByHouseholdSize: Object.fromEntries(
            Array(20).fill(null).map((_, i) => [String(i + 1), (i + 1) * 30000])
        )
    },
    contactInfo: {
        officeHours: {
            monday: { open: '00:00', close: '23:59' },
            tuesday: { open: '00:00', close: '23:59' },
            wednesday: { open: '00:00', close: '23:59' },
            thursday: { open: '00:00', close: '23:59' },
            friday: { open: '00:00', close: '23:59' },
            saturday: { open: '00:00', close: '23:59' },
            sunday: { open: '00:00', close: '23:59' }
        }
    }
};

/**
 * Unit with all possible status combinations
 */
export const allStatusesUnit: UnitData = {
    buildingID: 'building-status-001',
    unitID: 'unit-status-001',
    unitNumber: 'S-001',
    beds: 1,
    baths: 1,
    rent: 1500,
    feedInclusion: {
        apartments_com: true,
        zillow: false,
        other_site: true,
        another_site: false,
        fake_site: false
    },
    manualReferences: {
        apartments_com: '',
        zillow: ' ', // Whitespace only
        other_site: 'ID-'.repeat(100), // Very long ID
        another_site: '!!!SPECIAL###ID@@@',
        fake_site: null as any // Null instead of string
    }
};

/**
 * Fee with invalid values
 */
export const invalidFeeBuilding: BuildingData = {
    buildingID: 'building-invalid-fee-001',
    street: '789 Bad Fee Blvd',
    city: 'Feeville',
    state: 'FE',
    zip: '22222',
    oneTimeFees: [
        {
            type: 'invalid-fee-type' as any,
            amount: -100, // Negative amount
            description: '',
            refundable: 'maybe' as any // String instead of boolean
        },
        {
            type: FeeType.APPLICATION,
            amount: NaN, // Not a number
            refundable: null as any
        },
        {
            type: FeeType.ADMIN,
            amount: Infinity // Infinite amount
        }
    ]
};

/**
 * Pet policy with edge cases
 */
export const edgeCasePetBuilding: BuildingData = {
    buildingID: 'building-pet-edge-001',
    street: '321 Pet Edge Pkwy',
    city: 'Petsburg',
    state: 'PE',
    zip: '33333',
    petPolicies: {
        allowed: true,
        types: [], // Empty types array
        maxCount: 0, // Zero pets allowed despite allowed: true
        weightLimit: -1, // Negative weight
        breedRestrictions: Array(100).fill('Breed'), // Many restrictions
        deposit: 0.5, // Fractional deposit
        monthlyFee: -50, // Negative fee (credit?)
        oneTimeFee: 99999, // Extreme fee
        notes: '' // Empty notes
    }
};

/**
 * Amenity with invalid values
 */
export const invalidAmenitiesBuilding: BuildingData = {
    buildingID: 'building-amenity-invalid-001',
    street: '654 Bad Amenity Ave',
    city: 'Amenityville',
    state: 'AM',
    zip: '44444',
    propertyAmenities: [
        {
            name: '', // Empty name
            category: 'invalid-category' as any,
            description: null as any
        },
        {
            name: null as any, // Null name
            category: AmenityCategory.UNIT
        },
        {
            name: 123 as any, // Number instead of string
            category: null as any
        }
    ] as Amenity[]
};
