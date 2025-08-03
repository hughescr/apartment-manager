import type {
    MappedBuilding,
    MappedUnitType,
    MappedUnit
} from '../../../src/mappers/types.js';

/**
 * Expected mapped output for complete building on Apartments.com
 */
export const completeBuildingExpected: MappedBuilding = {
    externalId: 'building-complete-001',
    name: 'building-complete-001',
    address: {
        street: '1234 Luxury Lane',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102'
    },
    propertyType: 'Apartment',
    yearBuilt: 2022,
    totalUnits: 50,
    description: 'Experience luxury living in the heart of San Francisco. Our premium apartment complex offers stunning views, modern amenities, and a prime location near downtown. Each unit features high-end finishes, stainless steel appliances, and floor-to-ceiling windows. Residents enjoy access to our rooftop terrace, fitness center, and 24/7 concierge service.',
    photos: [
        'https://s3.amazonaws.com/bucket/building-complete-001/exterior.jpg',
        'https://s3.amazonaws.com/bucket/building-complete-001/lobby.jpg',
        'https://s3.amazonaws.com/bucket/building-complete-001/pool.jpg',
        'https://s3.amazonaws.com/bucket/building-complete-001/gym.jpg'
    ],
    leaseTerms: {
        minMonths: 12,
        maxMonths: 12,
        defaultMonths: 12
    },
    fees: [
        {
            type: 'Application Fee',
            amount: 75,
            description: 'Non-refundable application processing fee',
            refundable: false
        },
        {
            type: 'Administrative Fee',
            amount: 250,
            description: 'Administrative fee for lease preparation',
            refundable: false
        },
        {
            type: 'Move-in Fee',
            amount: 150,
            description: 'Move-in coordination fee',
            refundable: false
        },
        {
            type: 'Pet Fee',
            amount: 50,
            description: 'Monthly pet rent per pet',
            refundable: undefined
        },
        {
            type: 'Parking Fee',
            amount: 200,
            description: 'Monthly parking fee for garage space',
            refundable: undefined
        },
        {
            type: 'Storage Fee',
            amount: 75,
            description: 'Monthly storage unit fee',
            refundable: undefined
        },
        {
            type: 'Security Deposit',
            amount: 2500,
            description: 'Refundable security deposit',
            refundable: true
        },
        {
            type: 'Key Deposit',
            amount: 100,
            description: 'Refundable key and fob deposit',
            refundable: true
        }
    ],
    utilities: {
        Water: true,
        Sewer: true,
        Trash: true,
        Gas: false,
        Electricity: false,
        Cable: false,
        Internet: true,
        Heat: true,
        'A/C': true
    },
    parking: [
        {
            type: 'Garage',
            included: false,
            fee: 200,
            description: 'Secure underground parking with 24/7 access'
        },
        {
            type: 'Covered',
            included: false,
            fee: 150,
            description: 'Covered parking in adjacent structure'
        },
        {
            type: 'Uncovered',
            included: true,
            fee: undefined,
            description: 'One uncovered space included with lease'
        }
    ],
    petPolicy: {
        allowed: true,
        types: ['Dogs', 'Cats', 'Birds', 'Fish'],
        maxCount: 2,
        weightLimit: 75,
        deposit: 500,
        monthlyFee: 50,
        restrictions: 'All pets must be registered with management. Dogs require proof of training.'
    },
    amenities: [
        { name: 'Pool', category: 'Property' },
        { name: 'Gym', category: 'Property' },
        { name: 'Rooftop Terrace', category: 'Property' },
        { name: 'Business Center', category: 'Property' },
        { name: 'Dog Park', category: 'Property' },
        { name: 'Concierge Service', category: 'Community' },
        { name: 'Controlled Access', category: 'Community' }
    ],
    contactInfo: {
        name: 'Luxury Living Leasing Office',
        phone: '(415) 555-0123',
        email: 'leasing@luxuryliving.com',
        website: 'https://www.luxuryliving.com',
        officeHours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '10:00', close: '17:00' },
            sunday: { open: '12:00', close: '16:00' }
        }
    },
    tourOptions: {
        selfGuidedTours: true,
        virtualTours: true,
        inPersonTours: true,
        tourSchedulingUrl: 'https://www.luxuryliving.com/schedule-tour',
        tourHours: {
            monday: { open: '09:00', close: '17:00' },
            tuesday: { open: '09:00', close: '17:00' },
            wednesday: { open: '09:00', close: '17:00' },
            thursday: { open: '09:00', close: '17:00' },
            friday: { open: '09:00', close: '17:00' },
            saturday: { open: '10:00', close: '16:00' },
            sunday: { open: '12:00', close: '16:00' }
        }
    },
    applicationFee: 75,
    rentSpecials: [
        {
            title: 'Move-In Special',
            startDate: '2024-01-01',
            endDate: '2024-03-31',
            description: 'Get one month free when you sign a 12-month lease'
        },
        {
            title: 'Refer a Friend',
            description: 'Receive $500 off your rent when you refer a friend who signs a lease'
        }
    ],
    incomeRestrictions: {
        amiLimit: 120,
        maxIncomeByHouseholdSize: {
            '1': 95000,
            '2': 108000,
            '3': 122000,
            '4': 135000
        }
    },
    screeningCriteria: {
        incomeRatio: 3,
        minCreditScore: 700,
        maxOccupantsPerBedroom: 2,
        backgroundCheckRequired: true,
        evictionHistory: true,
        criminalHistory: true,
        references: 3,
        employmentVerification: true,
        rentalHistory: true,
        notes: 'All applicants over 18 must submit separate applications'
    }
};

/**
 * Expected mapped output for minimal building on Apartments.com
 */
export const minimalBuildingExpected: MappedBuilding = {
    externalId: 'building-minimal-001',
    name: 'building-minimal-001',
    address: {
        street: '',
        city: '',
        state: '',
        zip: ''
    },
    propertyType: 'Apartment',
    leaseTerms: {
        minMonths: undefined,
        maxMonths: undefined,
        defaultMonths: 12
    },
    fees: [],
    utilities: {},
    parking: [],
    amenities: []
};

/**
 * Expected mapped output for pet-friendly building on Apartments.com
 */
export const petFriendlyBuildingExpected: MappedBuilding = {
    externalId: 'building-pet-friendly-001',
    name: 'building-pet-friendly-001',
    address: {
        street: '456 Paw Print Place',
        city: 'Portland',
        state: 'OR',
        zip: '97201'
    },
    propertyType: 'Apartment',
    leaseTerms: {
        minMonths: undefined,
        maxMonths: undefined,
        defaultMonths: 12
    },
    fees: [],
    utilities: {},
    parking: [
        {
            type: 'Garage',
            included: true
        },
        {
            type: 'Garage',
            included: false,
            fee: 150,
            description: 'Additional garage space'
        },
        {
            type: 'Covered',
            included: false,
            fee: 75
        },
        {
            type: 'Uncovered',
            included: false,
            fee: 50
        },
        {
            type: 'Street',
            included: true,
            description: 'Street parking permits available'
        }
    ],
    petPolicy: {
        allowed: true,
        types: ['Dogs', 'Cats', 'Birds', 'Small Animals'],
        maxCount: 3,
        weightLimit: 100,
        deposit: 300,
        monthlyFee: 35,
        restrictions: 'We love pets! All breeds welcome. Pet interview required.'
    },
    amenities: [
        {
            name: 'Dog Park',
            category: 'Property'
        },
        {
            name: 'Pet Washing Station',
            category: 'Property'
        },
        {
            name: 'Dog Walking Service',
            category: 'Community'
        }
    ]
};

/**
 * Expected mapped output for complete unit type on Apartments.com
 */
export const completeUnitTypeExpected: MappedUnitType = {
    externalId: 'model-complete-001',
    modelName: 'Deluxe Corner Unit',
    beds: 2,
    baths: 2.5,
    sqft: {
        min: 1200,
        max: 1350
    },
    rent: {
        min: 3500,
        max: 4000
    },
    deposit: 3500,
    maxOccupants: 5,
    countAvailable: 2,
    dateAvailable: '02/15/2024',
    amenities: [
        { name: 'Floor-to-Ceiling Windows', category: 'Unit' },
        { name: 'Premium Appliances', category: 'Unit' },
        { name: 'Wine Fridge', category: 'Unit' },
        { name: 'Smart Home Features', category: 'Unit' },
        { name: 'Fireplace', category: 'Unit' }
    ],
    photos: []
};

/**
 * Expected mapped output for minimal unit type on Apartments.com
 */
export const minimalUnitTypeExpected: MappedUnitType = {
    externalId: 'model-minimal-001',
    modelName: 'Basic Model',
    beds: 1,
    baths: 1,
    sqft: {},
    rent: {},
    amenities: [],
    photos: []
};

/**
 * Expected mapped output for complete unit on Apartments.com
 */
export const completeUnitExpected: MappedUnit = {
    externalId: 'unit-complete-001',
    unitNumber: '1201',
    modelName: 'Deluxe Corner Unit',
    beds: 2,
    baths: 2,
    sqft: 1100,
    rent: 3200,
    deposit: 3200,
    dateAvailable: '02/01/2024',
    description: 'Stunning corner unit on the 12th floor featuring floor-to-ceiling windows, hardwood floors throughout, and breathtaking city views. Recently renovated kitchen with quartz countertops and stainless steel appliances. Master suite includes walk-in closet and spa-like bathroom.',
    maxOccupants: 4,
    leaseTerms: {
        minMonths: 12,
        maxMonths: 24
    },
    amenities: [
        { name: 'Floor-to-Ceiling Windows', category: 'Unit' },
        { name: 'Premium Appliances', category: 'Unit' },
        { name: 'Wine Fridge', category: 'Unit' },
        { name: 'Smart Home Features', category: 'Unit' },
        { name: 'Fireplace', category: 'Unit' },
        { name: 'Corner Windows', category: 'Unit' },
        { name: 'City Views', category: 'Unit' },
        { name: 'Recently Renovated', category: 'Unit' },
        { name: 'Wood Floors', category: 'Unit' }
    ],
    photos: [
        'https://s3.amazonaws.com/bucket/unit-complete-001/living-room.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/kitchen.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/master-bedroom.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/bathroom.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/view.jpg'
    ],
    rentSpecial: {
        title: 'Corner Unit Special',
        description: '$500 off first month rent',
        startDate: '2024-01-01',
        endDate: '2024-03-31'
    }
};

/**
 * Expected mapped output for inheriting unit on Apartments.com
 */
export const inheritingUnitExpected: MappedUnit = {
    externalId: 'unit-inheriting-001',
    unitNumber: '305',
    modelName: 'Classic One Bedroom',
    beds: 1,
    baths: 1,
    sqft: 650, // Inherited from model minSqft
    rent: 2000, // Inherited from model minRent
    deposit: 2000, // Inherited from model
    dateAvailable: '01/15/2024',
    maxOccupants: 3, // Inherited from model
    leaseTerms: {
        minMonths: 12, // Inherited from model
        maxMonths: 15 // Inherited from model
    },
    amenities: [
        {
            name: 'Walk-In Closet',
            category: 'Unit'
        },
        {
            name: 'Balcony',
            category: 'Unit'
        }
    ],
    photos: [] // No photos on unit, none inherited from model
};

/**
 * Expected mapped output for minimal unit on Apartments.com
 */
export const minimalUnitExpected: MappedUnit = {
    externalId: 'unit-minimal-001',
    unitNumber: 'unit-minimal-001',
    beds: 0,
    baths: 0,
    rent: 0,
    amenities: [],
    photos: []
};

/**
 * Expected mapped output for student housing building on Apartments.com
 */
export const studentHousingBuildingExpected: MappedBuilding = {
    externalId: 'building-student-001',
    name: 'building-student-001',
    address: {
        street: '100 Campus Court',
        city: 'Berkeley',
        state: 'CA',
        zip: '94720'
    },
    propertyType: 'Apartment',
    description: 'Student housing near UC Berkeley campus. Individual rooms available with shared common areas.',
    leaseTerms: {
        minMonths: 9,
        maxMonths: 9,
        defaultMonths: 9
    },
    fees: [],
    utilities: {
        Water: true,
        Sewer: true,
        Trash: true,
        Electricity: true,
        Internet: true,
        Heat: true,
        'A/C': true
    },
    parking: [],
    amenities: [],
    incomeRestrictions: {
        maxIncomeByHouseholdSize: {
            '1': 35000,
            '2': 40000,
            '3': 45000,
            '4': 50000
        }
    },
    screeningCriteria: {
        incomeRatio: 2,
        minCreditScore: 600,
        maxOccupantsPerBedroom: 1,
        backgroundCheckRequired: true,
        employmentVerification: false,
        notes: 'Must provide proof of enrollment'
    }
};
