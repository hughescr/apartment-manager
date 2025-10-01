/**
 * Shared test fixtures and utilities for building tests.
 * Contains test data, helper functions, and expected result generators.
 */

import { PropertyType, UtilityType, FeeType, PetType, ParkingType, StorageType, AmenityCategory, DayOfWeek, BuildingData, UnitData, UnitTypeData, VacancyClass } from '../../src/types';
import { getDefaultBuildingData } from '../../src/types';
import { fill, merge, repeat } from 'lodash';

/**
 * Standard test building with comprehensive data for most test scenarios.
 */
export const testBuilding = {
    buildingID:            'eEUxh8XdGF1RsxfmwHPpYD', // Short-uuid format
    buildingName:          '123 Test',
    street:                '123 Test St',
    city:                  'Testville',
    state:                 'TS',
    zip:                   '12345',
    description:           'A test building',
    yearBuilt:             2020,
    numberStories:         3,
    totalUnits:            10,
    // New fields
    propertyType:          PropertyType.APARTMENT,
    roomsForRent:          false,
    photos:                ['https://s3.example.com/photo1.jpg', 'https://s3.example.com/photo2.jpg'],
    leaseLength:           12,
    shortTermLeaseAllowed: false,
    propertyLicenseNumber: 'LIC-123',
    propertyDescription:   'Modern apartment building with great amenities',
    rentSpecials:          [
        { title: 'Summer Special', description: '$500 off first month', startDate: '2024-06-01', endDate: '2024-08-31' }
    ],
    incomeRestrictions: { amiLimit: 80, maxIncomeByHouseholdSize: { '1': 50000, '2': 60000 } },
    utilitiesIncluded:  { [UtilityType.WATER]: true, [UtilityType.TRASH]: true, [UtilityType.SEWER]: true },
    oneTimeFees:        [
        { type: FeeType.APPLICATION, amount: 50, description: 'Non-refundable application fee' }
    ],
    monthlyFees: [
        { type: FeeType.PARKING, amount: 100, description: 'Covered parking' }
    ],
    parkingOptions: [
        { type: ParkingType.COVERED, included: false, fee: 100, spaces: 1 }
    ],
    petPolicies: {
        allowed:    true,
        types:      [PetType.CAT, PetType.DOG],
        maxCount:   2,
        deposit:    300,
        monthlyFee: 50
    },
    storageOptions: [
        { type: StorageType.CLOSET, included: true, description: 'Large walk-in closet' }
    ],
    propertyAmenities: [
        { name: 'Pool', category: AmenityCategory.PROPERTY },
        { name: 'Fitness Center', category: AmenityCategory.PROPERTY }
    ],
    screeningCriteria: {
        incomeRatio:             3,
        minCreditScore:          650,
        backgroundCheckRequired: true
    },
    contactInfo: {
        name:  'Test Leasing Office',
        phone: '555-1234',
        email: 'leasing@test.com'
    },
    tourAvailability: {
        inPersonTours:   true,
        virtualTours:    true,
        selfGuidedTours: false
    },
    applicationFee:            50,
    acceptsOnlineApplications: true
};

/**
 * Minimal building for testing basic functionality with defaults.
 */
export const minimalBuilding = {
    buildingID:   'eL66f2Km4MG8SrtsamWvPU', // Short-uuid format
    buildingName: '456 Minimal',
    street:       '456 Minimal Ave'
};

/**
 * Building with complex nested structures for testing deep object handling.
 */
export const complexBuilding = {
    buildingID:   'bfDFDKH11u7AhktrYKYewM', // Short-uuid format
    buildingName: '999 Complex',
    street:       '999 Complex St',
    rentSpecials: [
        { title: 'Special 1', description: 'First special' },
        { title: 'Special 2', description: 'Second special', startDate: '2024-12-01' }
    ],
    propertyAmenities: [
        { name: 'Pool', category: AmenityCategory.PROPERTY },
        { name: 'Gym', category: AmenityCategory.PROPERTY },
        { name: 'Sauna', category: AmenityCategory.PROPERTY, description: 'Finnish sauna' }
    ]
};

/**
 * Building with special characters and Unicode for testing character encoding.
 */
export const specialCharsBuilding = {
    ...testBuilding,
    buildingID:          'fG3k9HmQr2X8pLsY6wBnEt', // Short-uuid format
    buildingName:        '123 O\'Brien',
    street:              '123 O\'Brien St. #456',
    description:         'Test "building" with <special> & characters',
    propertyDescription: 'Line 1\nLine 2\tTabbed\rCarriage Return',
    contactInfo:         {
        name:  'José García-López',
        email: 'test+special@example.com'
    }
};

/**
 * Building with Unicode characters for testing international support.
 */
export const unicodeBuilding = {
    ...testBuilding,
    buildingID:          'cR7x2MvQ8uBn4wKgYzHjNp', // Short-uuid format
    buildingName:        '北京市朝阳区建国路123号', // Chinese characters - full address as name
    street:              '北京市朝阳区建国路123号', // Chinese characters
    description:         'مبنى سكني فاخر', // Arabic text
    propertyDescription: '🏢 Modern building with 🌳 garden and 🏊 pool! 😊',
    contactInfo:         {
        name: 'Владимир Петров' // Cyrillic characters
    }
};

/**
 * Building with empty values for testing null/undefined/empty handling.
 */
export const emptyValuesBuilding = {
    buildingID:          'dP8m5NzR1wTg3vXjKqLcSe', // Short-uuid format
    buildingName:        '', // empty string
    street:              '', // empty string
    city:                undefined, // undefined (DynamoDB Toolbox doesn't accept null for strings)
    // state is undefined (not included)
    zip:                 '12345',
    description:         '',
    propertyDescription: undefined // undefined instead of null
};

/**
 * Building with maximum allowed item size for testing size limits.
 */
export const createLargeBuilding = () => ({
    ...testBuilding,
    buildingID:          'hK9p4QxV7zAy1nFjRmBsWu', // Short-uuid format
    buildingName:        '123 Test',
    propertyDescription: repeat('x', 350000), // ~350KB
    photos:              fill(Array(100), 'https://s3.example.com/very-long-photo-url-that-takes-up-space.jpg')
});

/**
 * Building with maximum array sizes for testing array limits.
 */
export const createMaxArrayBuilding = () => ({
    ...testBuilding,
    buildingID:        'jM2s8PwE6xCb5vLnKtGhRy', // Short-uuid format
    buildingName:      '123 Test',
    photos:            fill(Array(1000), 'https://s3.example.com/photo.jpg'),
    propertyAmenities: fill(Array(500), { name: 'Amenity', category: AmenityCategory.PROPERTY }),
    rentSpecials:      fill(Array(100), { title: 'Special', description: 'Deal' }),
    oneTimeFees:       fill(Array(50), { type: FeeType.APPLICATION, amount: 50 })
});

/**
 * Building with complex pet policies for testing nested object handling.
 */
export const complexPetPolicyBuilding = {
    ...testBuilding,
    buildingID:   'kN6u1TzH9qDf8sMjYvPcXw', // Short-uuid format
    buildingName: '123 Test',
    petPolicies:  {
        allowed:           true,
        types:             [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.FISH, PetType.SMALL_ANIMAL],
        maxCount:          3,
        weightLimit:       75,
        breedRestrictions: ['Pit Bull', 'Rottweiler', 'German Shepherd', 'Doberman'],
        deposit:           500,
        monthlyFee:        50,
        oneTimeFee:        250,
        notes:             'Service animals exempt from all restrictions. Exotic pets require approval.'
    }
};

/**
 * Building with complex tour availability including hours.
 */
export const complexTourBuilding = {
    ...testBuilding,
    buildingID:       'mQ5t7RvK3xGe2pLhBwNfZa', // Short-uuid format
    buildingName:     '123 Test',
    tourAvailability: {
        selfGuidedTours:   true,
        virtualTours:      true,
        inPersonTours:     true,
        tourSchedulingUrl: 'https://example.com/schedule',
        tourHours:         {
            [DayOfWeek.MONDAY]:    { open: '09:00', close: '18:00' },
            [DayOfWeek.TUESDAY]:   { open: '09:00', close: '18:00' },
            [DayOfWeek.WEDNESDAY]: { open: '09:00', close: '20:00' },
            [DayOfWeek.THURSDAY]:  { open: '09:00', close: '20:00' },
            [DayOfWeek.FRIDAY]:    { open: '09:00', close: '17:00' },
            [DayOfWeek.SATURDAY]:  { open: '10:00', close: '16:00' },
            [DayOfWeek.SUNDAY]:    { open: '12:00', close: '16:00' }
        }
    }
};

/**
 * Standard test unit for testing unit-related functionality.
 */
export const testUnit: UnitData = {
    buildingID:      'eEUxh8XdGF1RsxfmwHPpYD', // Same as testBuilding
    unitID:          '101',
    unitNumber:      '101',
    description:     'One bedroom apartment',
    beds:            1,
    baths:           1,
    sqft:            650,
    rent:            1500,
    occupied:        false,
    availableDate:   '2024-02-01',
    modelID:         'studio',
    maxOccupants:    2,
    perPersonRent:   750,
    deposit:         1000,
    minLeaseTerm:    6,
    maxLeaseTerm:    12,
    unitDescription: 'Modern studio apartment with updated fixtures',
    unitRentSpecial: {
        title:       'Unit Special',
        description: 'First month half price'
    },
    unitAmenities: [
        { name: 'In-unit Laundry', category: AmenityCategory.UNIT },
        { name: 'Balcony', category: AmenityCategory.UNIT }
    ],
    photos:        ['https://s3.example.com/unit1.jpg', 'https://s3.example.com/unit2.jpg'],
    features:      ['Hardwood floors', 'Granite counters'],
    notes:         'Recently renovated',
    vacancyClass:  'Unoccupied' as VacancyClass,
    vacateDate:    '2024-01-15',
    madeReadyDate: '2024-01-20',
    feedInclusion: {
        'apartments.com': true,
        'zillow.com':     false
    },
    manualReferences: {
        'apartments.com': 'APT123'
    }
};

/**
 * Standard test unit type for testing unit type functionality.
 */
export const testUnitType: UnitTypeData = {
    buildingID:     'eEUxh8XdGF1RsxfmwHPpYD', // Same as testBuilding
    modelID:        'studio',
    modelName:      'Studio Apartment',
    countAvailable: 3,
    dateAvailable:  '2024-02-01',
    beds:           0,
    baths:          1,
    maxOccupants:   2,
    minRent:        1200,
    maxRent:        1500,
    perPersonRent:  750,
    minSqft:        400,
    maxSqft:        550,
    deposit:        800,
    minLeaseTerm:   6,
    maxLeaseTerm:   12,
    modelAmenities: [
        { name: 'Murphy Bed', category: AmenityCategory.UNIT },
        { name: 'Kitchenette', category: AmenityCategory.UNIT }
    ]
};

/**
 * Helper to create expected result with merged defaults.
 */
export const getExpectedBuilding = (building: Partial<BuildingData>): BuildingData =>
    merge({}, getDefaultBuildingData(), building) as BuildingData;
