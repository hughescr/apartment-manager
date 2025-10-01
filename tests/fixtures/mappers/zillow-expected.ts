import type {
    MappedBuilding,
    MappedUnitType,
    MappedUnit
} from '../../../src/mappers/types.js';

/**
 * Expected mapped output for complete building on Zillow
 * Note: Zillow uses buildings as templates for units
 */
export const completeBuildingZillowExpected: MappedBuilding = {
    externalId: 'wgey4dDPEd8qEMGtGoMef7',
    name:       'wgey4dDPEd8qEMGtGoMef7',
    address:    {
        street: '1234 Luxury Lane',
        city:   'San Francisco',
        state:  'CA',
        zip:    '94102'
    },
    propertyType: 'Apartment',
    yearBuilt:    2022,
    totalUnits:   50,
    description:  'Experience luxury living in the heart of San Francisco. Our premium apartment complex offers stunning views, modern amenities, and a prime location near downtown. Each unit features high-end finishes, stainless steel appliances, and floor-to-ceiling windows. Residents enjoy access to our rooftop terrace, fitness center, and 24/7 concierge service.',
    photos:       [
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/exterior.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/lobby.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/pool.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/gym.jpg'
    ],
    leaseTerms: {
        minMonths:     12,
        maxMonths:     12,
        defaultMonths: 12
    },
    fees: [
        {
            type:        'Application',
            amount:      75,
            description: 'Non-refundable application processing fee',
            refundable:  false
        },
        {
            type:        'Administrative',
            amount:      250,
            description: 'Administrative fee for lease preparation',
            refundable:  false
        },
        {
            type:        'Move-in',
            amount:      150,
            description: 'Move-in coordination fee',
            refundable:  false
        },
        {
            type:        'Pet',
            amount:      50,
            description: 'Monthly pet rent per pet',
            refundable:  undefined
        },
        {
            type:        'Parking',
            amount:      200,
            description: 'Monthly parking fee for garage space',
            refundable:  undefined
        },
        {
            type:        'Storage',
            amount:      75,
            description: 'Monthly storage unit fee',
            refundable:  undefined
        },
        {
            type:        'Security Deposit',
            amount:      2500,
            description: 'Refundable security deposit',
            refundable:  true
        },
        {
            type:        'Key Deposit',
            amount:      100,
            description: 'Refundable key and fob deposit',
            refundable:  true
        }
    ],
    utilities: {
        Water:              true,
        Sewer:              true,
        Trash:              true,
        Internet:           true,
        Heat:               true,
        'Air Conditioning': true
    },
    parking: [
        {
            type:        'Garage',
            included:    false,
            fee:         200,
            description: 'Secure underground parking with 24/7 access'
        },
        {
            type:        'Covered Parking',
            included:    false,
            fee:         150,
            description: 'Covered parking in adjacent structure'
        },
        {
            type:        'Off-street Parking',
            included:    true,
            fee:         undefined,
            description: 'One uncovered space included with lease'
        }
    ],
    petPolicy: {
        allowed:      true,
        types:        ['Dog', 'Cat', 'Bird', 'Fish'],
        maxCount:     2,
        weightLimit:  75,
        deposit:      750, // Combined deposit + one-time fee
        monthlyFee:   50,
        restrictions: 'Breed restrictions: Pit Bull, Rottweiler, German Shepherd, Doberman. All pets must be registered with management. Dogs require proof of training.'
    },
    amenities: [
        { name: 'Pool', category: 'Property' },
        { name: 'Fitness center', category: 'Property' },
        { name: 'Rooftop Terrace', category: 'Property' },
        { name: 'Business Center', category: 'Property' },
        { name: 'Dog Park', category: 'Property' },
        { name: 'Concierge Service', category: 'Community' },
        { name: 'Controlled Access', category: 'Community' }
    ],
    contactInfo: {
        name:            'Luxury Living Leasing Office',
        phone:           '(415) 555-0123',
        email:           'leasing@luxuryliving.com',
        propertyWebsite: 'https://www.luxuryliving.com',
        officeHours:     {
            monday:    { open: '09:00', close: '18:00' },
            tuesday:   { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday:  { open: '09:00', close: '18:00' },
            friday:    { open: '09:00', close: '18:00' },
            saturday:  { open: '10:00', close: '17:00' },
            sunday:    { open: '12:00', close: '16:00' }
        }
    },
    tourOptions: {
        selfGuidedTours:   true,
        virtualTours:      true,
        inPersonTours:     true,
        tourSchedulingUrl: 'https://www.luxuryliving.com/schedule-tour',
        tourHours:         {
            monday:    { open: '09:00', close: '17:00' },
            tuesday:   { open: '09:00', close: '17:00' },
            wednesday: { open: '09:00', close: '17:00' },
            thursday:  { open: '09:00', close: '17:00' },
            friday:    { open: '09:00', close: '17:00' },
            saturday:  { open: '10:00', close: '16:00' },
            sunday:    { open: '12:00', close: '16:00' }
        }
    },
    applicationFee: 75,
    rentSpecials:   [
        {
            title:       'Move-In Special',
            startDate:   '2024-01-01',
            endDate:     '2024-03-31',
            description: 'Get one month free when you sign a 12-month lease'
        },
        {
            title:       'Refer a Friend',
            description: 'Receive $500 off your rent when you refer a friend who signs a lease'
        }
    ],
    incomeRestrictions: {
        amiLimit:                 120,
        maxIncomeByHouseholdSize: {
            '1': 95000,
            '2': 108000,
            '3': 122000,
            '4': 135000
        }
    },
    screeningCriteria: {
        incomeRatio:             3,
        minCreditScore:          700,
        maxOccupantsPerBedroom:  2,
        backgroundCheckRequired: true,
        evictionHistory:         true,
        criminalHistory:         true,
        references:              3,
        employmentVerification:  true,
        rentalHistory:           true,
        notes:                   'All applicants over 18 must submit separate applications'
    }
};

/**
 * Expected mapped unit type on Zillow
 * Note: Zillow doesn't really use unit types, this is just a template
 */
export const completeUnitTypeZillowExpected: MappedUnitType = {
    externalId: 'model-complete-001',
    modelName:  'Deluxe Corner Unit',
    beds:       2,
    baths:      2.5,
    sqft:       {
        min: 1200,
        max: 1350
    },
    rent: {
        min: 3500,
        max: 4000
    },
    deposit:        3500,
    maxOccupants:   5,
    countAvailable: 2,
    dateAvailable:  '2024-02-15',
    amenities:      [
        { name: 'Floor-to-Ceiling Windows', category: 'Interior' },
        { name: 'Premium Appliances', category: 'Interior' },
        { name: 'Wine Fridge', category: 'Interior' },
        { name: 'Smart Home Features', category: 'Interior' },
        { name: 'Fireplace', category: 'Interior' }
    ],
    photos: []
};

/**
 * Expected mapped complete unit on Zillow (flattened with all data)
 */
export const completeUnitZillowExpected: MappedUnit = {
    externalId:    'unit-complete-001',
    unitNumber:    '1201',
    modelName:     'Deluxe Corner Unit',
    beds:          2,
    baths:         2,
    sqft:          1100,
    rent:          3200,
    deposit:       3200,
    dateAvailable: '2024-02-01',
    description:   'Experience luxury living in the heart of San Francisco. Our premium apartment complex offers stunning views, modern amenities, and a prime location near downtown. Each unit features high-end finishes, stainless steel appliances, and floor-to-ceiling windows. Residents enjoy access to our rooftop terrace, fitness center, and 24/7 concierge service.\n\nStunning corner unit on the 12th floor featuring floor-to-ceiling windows, hardwood floors throughout, and breathtaking city views. Recently renovated kitchen with quartz countertops and stainless steel appliances. Master suite includes walk-in closet and spa-like bathroom.',
    maxOccupants:  4,
    leaseTerms:    {
        minMonths: 12,
        maxMonths: 24
    },
    amenities: [
        { name: 'Pool', category: 'Property' },
        { name: 'Fitness center', category: 'Property' },
        { name: 'Rooftop Terrace', category: 'Property' },
        { name: 'Business Center', category: 'Property' },
        { name: 'Dog Park', category: 'Property' },
        { name: 'Concierge Service', category: 'Community' },
        { name: 'Controlled Access', category: 'Community' },
        { name: 'Floor-to-Ceiling Windows', category: 'Interior' },
        { name: 'Premium Appliances', category: 'Interior' },
        { name: 'Wine Fridge', category: 'Interior' },
        { name: 'Smart Home Features', category: 'Interior' },
        { name: 'Fireplace', category: 'Interior' },
        { name: 'Corner Windows', category: 'Interior' },
        { name: 'City Views', category: 'Interior' },
        { name: 'Recently Renovated', category: 'Interior' },
        { name: 'Hardwood floors', category: 'Interior' }
    ],
    photos: [
        // Unit photos first
        'https://s3.amazonaws.com/bucket/unit-complete-001/living-room.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/kitchen.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/master-bedroom.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/bathroom.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/view.jpg',
        // Building photos
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/exterior.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/lobby.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/pool.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/gym.jpg'
    ],
    rentSpecial: {
        title:       'Corner Unit Special',
        description: '$500 off first month rent',
        startDate:   '2024-01-01',
        endDate:     '2024-03-31'
    }
};

/**
 * Expected mapped inheriting unit on Zillow (flattened)
 */
export const inheritingUnitZillowExpected: MappedUnit = {
    externalId:    'unit-inheriting-001',
    unitNumber:    '305',
    modelName:     'Classic One Bedroom',
    beds:          1,
    baths:         1,
    sqft:          650,
    rent:          2000,
    deposit:       2000,
    dateAvailable: '2024-01-15',
    description:   'Experience luxury living in the heart of San Francisco. Our premium apartment complex offers stunning views, modern amenities, and a prime location near downtown. Each unit features high-end finishes, stainless steel appliances, and floor-to-ceiling windows. Residents enjoy access to our rooftop terrace, fitness center, and 24/7 concierge service.',
    maxOccupants:  3,
    leaseTerms:    {
        minMonths: 12,
        maxMonths: 15
    },
    amenities: [
        // All building amenities
        {
            name:     'Swimming Pool',
            category: 'Property'
        },
        {
            name:     'Fitness Center',
            category: 'Property'
        },
        {
            name:     'Rooftop Terrace',
            category: 'Property'
        },
        {
            name:     'Business Center',
            category: 'Property'
        },
        {
            name:     'Dog Park',
            category: 'Property'
        },
        {
            name:     'Concierge Service',
            category: 'Community'
        },
        {
            name:     'Controlled Access',
            category: 'Community'
        },
        // Model amenities
        {
            name:     'Walk-In Closet',
            category: 'Interior'
        },
        {
            name:     'Balcony',
            category: 'Interior'
        }
    ],
    photos: [
        // Building photos only (no unit photos)
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/exterior.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/lobby.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/pool.jpg',
        'https://s3.amazonaws.com/bucket/wgey4dDPEd8qEMGtGoMef7/gym.jpg'
    ],
    rentSpecial: {
        title:       'Move-In Special',
        startDate:   '2024-01-01',
        endDate:     '2024-03-31',
        description: 'Get one month free when you sign a 12-month lease'
    }
};

/**
 * Expected mapped minimal unit on Zillow
 */
export const minimalUnitZillowExpected: MappedUnit = {
    externalId:  'unit-minimal-001',
    unitNumber:  'unit-minimal-001',
    beds:        0,
    baths:       0,
    rent:        0,
    description: '0 bed, 0 bath unit',
    amenities:   [],
    photos:      []
};

/**
 * Expected mapped no-pets building on Zillow
 */
export const noPetsBuildingZillowExpected: MappedBuilding = {
    externalId: 'building-no-pets-001',
    name:       'building-no-pets-001',
    address:    {
        street: '999 Allergy Avenue',
        city:   'Seattle',
        state:  'WA',
        zip:    '98101'
    },
    propertyType: 'Apartment',
    description:  'Pet-free community for those with allergies or who prefer a pet-free environment.',
    leaseTerms:   {
        minMonths:     undefined,
        maxMonths:     undefined,
        defaultMonths: 12
    },
    fees:      [],
    utilities: {},
    parking:   [],
    petPolicy: {
        allowed:      false,
        restrictions: 'No pets allowed'
    },
    amenities: [
        {
            name:     'Allergy-Friendly HVAC',
            category: 'Property'
        },
        {
            name:     'No Pet Policy',
            category: 'Community'
        }
    ]
};

/**
 * Expected mapped student room on Zillow (flattened for room rental)
 */
export const studentRoomZillowExpected: MappedUnit = {
    externalId:    'unit-student-001',
    unitNumber:    'A-201',
    modelName:     'Single Occupancy Room',
    beds:          1,
    baths:         0,
    sqft:          120,
    rent:          850,
    deposit:       500,
    dateAvailable: '2024-08-15',
    description:   'Student housing near UC Berkeley campus. Individual rooms available with shared common areas.\n\nSingle room in 4-bedroom suite with shared common areas',
    maxOccupants:  1,
    leaseTerms:    {
        minMonths: 9,
        maxMonths: 12
    },
    amenities: [
        // Model amenities
        {
            name:     'Furnished',
            category: 'Interior'
        },
        {
            name:     'Shared Kitchen',
            category: 'Interior'
        },
        {
            name:     'Shared Bathroom',
            category: 'Interior'
        },
        {
            name:     'Study Room Access',
            category: 'Property'
        }
    ],
    photos: [
        'https://s3.amazonaws.com/bucket/student-001/room.jpg',
        'https://s3.amazonaws.com/bucket/student-001/common-area.jpg'
    ]
};
