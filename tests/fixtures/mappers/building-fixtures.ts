import type { BuildingData } from '../../../src/types/index.js';
import {
    PropertyType,
    UtilityType,
    FeeType,
    PetType,
    ParkingType,
    StorageType,
    AmenityCategory,
    DayOfWeek
} from '../../../src/types/index.js';

/**
 * Complete building with all possible fields populated
 */
export const completeBuilding: BuildingData = {
    buildingID: 'building-complete-001',
    street: '1234 Luxury Lane',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    description: 'Premium apartment complex',
    yearBuilt: 2022,
    numberStories: 5,
    totalUnits: 50,
    propertyType: PropertyType.APARTMENT,
    roomsForRent: false,
    photos: [
        'https://s3.amazonaws.com/bucket/building-complete-001/exterior.jpg',
        'https://s3.amazonaws.com/bucket/building-complete-001/lobby.jpg',
        'https://s3.amazonaws.com/bucket/building-complete-001/pool.jpg',
        'https://s3.amazonaws.com/bucket/building-complete-001/gym.jpg'
    ],
    leaseLength: 12,
    shortTermLeaseAllowed: true,
    propertyLicenseNumber: 'SF-LIC-2022-001',
    specialtyType: 'luxury',
    specialtySubType: 'high-rise',
    propertyDescription: 'Experience luxury living in the heart of San Francisco. Our premium apartment complex offers stunning views, modern amenities, and a prime location near downtown. Each unit features high-end finishes, stainless steel appliances, and floor-to-ceiling windows. Residents enjoy access to our rooftop terrace, fitness center, and 24/7 concierge service.',
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
    utilitiesIncluded: {
        [UtilityType.WATER]: true,
        [UtilityType.SEWER]: true,
        [UtilityType.TRASH]: true,
        [UtilityType.GAS]: false,
        [UtilityType.ELECTRICITY]: false,
        [UtilityType.CABLE]: false,
        [UtilityType.INTERNET]: true,
        [UtilityType.HEAT]: true,
        [UtilityType.AIR_CONDITIONING]: true
    },
    oneTimeFees: [
        {
            type: FeeType.APPLICATION,
            amount: 75,
            description: 'Non-refundable application processing fee',
            refundable: false
        },
        {
            type: FeeType.ADMIN,
            amount: 250,
            description: 'Administrative fee for lease preparation',
            refundable: false
        },
        {
            type: FeeType.SECURITY_DEPOSIT,
            amount: 2500,
            description: 'Refundable security deposit',
            refundable: true
        },
        {
            type: FeeType.MOVE_IN,
            amount: 150,
            description: 'Move-in coordination fee',
            refundable: false
        },
        {
            type: FeeType.KEY_DEPOSIT,
            amount: 100,
            description: 'Refundable key and fob deposit',
            refundable: true
        }
    ],
    monthlyFees: [
        {
            type: FeeType.PET_FEE,
            amount: 50,
            description: 'Monthly pet rent per pet'
        },
        {
            type: FeeType.PARKING,
            amount: 200,
            description: 'Monthly parking fee for garage space'
        },
        {
            type: FeeType.STORAGE,
            amount: 75,
            description: 'Monthly storage unit fee'
        }
    ],
    parkingOptions: [
        {
            type: ParkingType.GARAGE,
            included: false,
            fee: 200,
            spaces: 1,
            description: 'Secure underground parking with 24/7 access'
        },
        {
            type: ParkingType.COVERED,
            included: false,
            fee: 150,
            spaces: 1,
            description: 'Covered parking in adjacent structure'
        },
        {
            type: ParkingType.UNCOVERED,
            included: true,
            spaces: 1,
            description: 'One uncovered space included with lease'
        }
    ],
    petPolicies: {
        allowed: true,
        types: [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.FISH],
        maxCount: 2,
        weightLimit: 75,
        breedRestrictions: ['Pit Bull', 'Rottweiler', 'German Shepherd', 'Doberman'],
        deposit: 500,
        monthlyFee: 50,
        oneTimeFee: 250,
        notes: 'All pets must be registered with management. Dogs require proof of training.'
    },
    storageOptions: [
        {
            type: StorageType.CLOSET,
            included: true,
            description: 'Large walk-in closet in unit'
        },
        {
            type: StorageType.BASEMENT,
            included: false,
            fee: 75,
            dimensions: '5x10',
            description: 'Climate-controlled basement storage units available'
        },
        {
            type: StorageType.GARAGE,
            included: false,
            fee: 100,
            dimensions: '10x10',
            description: 'Garage storage cages available'
        }
    ],
    propertyAmenities: [
        {
            name: 'Swimming Pool',
            category: AmenityCategory.PROPERTY,
            description: 'Resort-style pool with cabanas'
        },
        {
            name: 'Fitness Center',
            category: AmenityCategory.PROPERTY,
            description: '24/7 access with cardio and weight equipment'
        },
        {
            name: 'Rooftop Terrace',
            category: AmenityCategory.PROPERTY,
            description: 'Panoramic city views with BBQ areas'
        },
        {
            name: 'Business Center',
            category: AmenityCategory.PROPERTY,
            description: 'Computers, printers, and conference rooms'
        },
        {
            name: 'Dog Park',
            category: AmenityCategory.PROPERTY,
            description: 'Fenced area for off-leash play'
        },
        {
            name: 'Concierge Service',
            category: AmenityCategory.COMMUNITY,
            description: '24/7 front desk and package acceptance'
        },
        {
            name: 'Controlled Access',
            category: AmenityCategory.COMMUNITY,
            description: 'Secure entry with video intercom'
        }
    ],
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
    },
    contactInfo: {
        name: 'Luxury Living Leasing Office',
        phone: '(415) 555-0123',
        email: 'leasing@luxuryliving.com',
        propertyWebsite: 'https://www.luxuryliving.com',
        officeHours: {
            [DayOfWeek.MONDAY]: { open: '09:00', close: '18:00' },
            [DayOfWeek.TUESDAY]: { open: '09:00', close: '18:00' },
            [DayOfWeek.WEDNESDAY]: { open: '09:00', close: '18:00' },
            [DayOfWeek.THURSDAY]: { open: '09:00', close: '18:00' },
            [DayOfWeek.FRIDAY]: { open: '09:00', close: '18:00' },
            [DayOfWeek.SATURDAY]: { open: '10:00', close: '17:00' },
            [DayOfWeek.SUNDAY]: { open: '12:00', close: '16:00' }
        }
    },
    tourAvailability: {
        selfGuidedTours: true,
        virtualTours: true,
        inPersonTours: true,
        tourSchedulingUrl: 'https://www.luxuryliving.com/schedule-tour',
        tourHours: {
            [DayOfWeek.MONDAY]: { open: '09:00', close: '17:00' },
            [DayOfWeek.TUESDAY]: { open: '09:00', close: '17:00' },
            [DayOfWeek.WEDNESDAY]: { open: '09:00', close: '17:00' },
            [DayOfWeek.THURSDAY]: { open: '09:00', close: '17:00' },
            [DayOfWeek.FRIDAY]: { open: '09:00', close: '17:00' },
            [DayOfWeek.SATURDAY]: { open: '10:00', close: '16:00' },
            [DayOfWeek.SUNDAY]: { open: '12:00', close: '16:00' }
        }
    },
    applicationFee: 75,
    acceptsOnlineApplications: true
};

/**
 * Minimal building with only required fields
 */
export const minimalBuilding: BuildingData = {
    buildingID: 'building-minimal-001'
};

/**
 * Building with complex amenities and fees
 */
export const complexAmenitiesBuilding: BuildingData = {
    buildingID: 'building-amenities-001',
    street: '789 Amenity Ave',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    propertyType: PropertyType.APARTMENT,
    propertyAmenities: [
        // Unit amenities that might be inherited
        { name: 'In-Unit Washer/Dryer', category: AmenityCategory.UNIT },
        { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
        { name: 'Granite Countertops', category: AmenityCategory.UNIT },
        { name: 'Stainless Steel Appliances', category: AmenityCategory.UNIT },
        { name: 'Central Air', category: AmenityCategory.UNIT },
        { name: 'Walk-In Closet', category: AmenityCategory.UNIT },
        // Property amenities
        { name: 'Clubhouse', category: AmenityCategory.PROPERTY },
        { name: 'Game Room', category: AmenityCategory.PROPERTY },
        { name: 'Media Room', category: AmenityCategory.PROPERTY },
        { name: 'Yoga Studio', category: AmenityCategory.PROPERTY },
        { name: 'Pet Spa', category: AmenityCategory.PROPERTY },
        { name: 'Car Wash Station', category: AmenityCategory.PROPERTY },
        { name: 'Package Lockers', category: AmenityCategory.PROPERTY },
        // Community amenities
        { name: 'Gated Community', category: AmenityCategory.COMMUNITY },
        { name: 'On-Site Management', category: AmenityCategory.COMMUNITY },
        { name: 'Recycling Program', category: AmenityCategory.COMMUNITY },
        { name: 'Online Payments', category: AmenityCategory.COMMUNITY },
        { name: 'Emergency Maintenance', category: AmenityCategory.COMMUNITY }
    ],
    oneTimeFees: [
        { type: FeeType.APPLICATION, amount: 50 },
        { type: FeeType.ADMIN, amount: 200 },
        { type: FeeType.SECURITY_DEPOSIT, amount: 1000, refundable: true },
        { type: FeeType.PET_DEPOSIT, amount: 300, refundable: true },
        { type: FeeType.CLEANING, amount: 150 }
    ],
    monthlyFees: [
        { type: FeeType.PET_FEE, amount: 25 },
        { type: FeeType.PARKING, amount: 100 },
        { type: FeeType.STORAGE, amount: 50 }
    ]
};

/**
 * Building with detailed pet policies and parking options
 */
export const petFriendlyBuilding: BuildingData = {
    buildingID: 'building-pet-friendly-001',
    street: '456 Paw Print Place',
    city: 'Portland',
    state: 'OR',
    zip: '97201',
    propertyType: PropertyType.APARTMENT,
    petPolicies: {
        allowed: true,
        types: [PetType.DOG, PetType.CAT, PetType.BIRD, PetType.SMALL_ANIMAL],
        maxCount: 3,
        weightLimit: 100,
        breedRestrictions: [],
        deposit: 300,
        monthlyFee: 35,
        notes: 'We love pets! All breeds welcome. Pet interview required.'
    },
    parkingOptions: [
        { type: ParkingType.GARAGE, included: true, spaces: 1 },
        { type: ParkingType.GARAGE, included: false, fee: 150, spaces: 1, description: 'Additional garage space' },
        { type: ParkingType.COVERED, included: false, fee: 75, spaces: 1 },
        { type: ParkingType.UNCOVERED, included: false, fee: 50, spaces: 1 },
        { type: ParkingType.STREET, included: true, description: 'Street parking permits available' }
    ],
    propertyAmenities: [
        { name: 'Dog Park', category: AmenityCategory.PROPERTY },
        { name: 'Pet Washing Station', category: AmenityCategory.PROPERTY },
        { name: 'Dog Walking Service', category: AmenityCategory.COMMUNITY }
    ]
};

/**
 * Building with missing optional fields (tests defaults)
 */
export const sparseBuilding: BuildingData = {
    buildingID: 'building-sparse-001',
    street: '111 Basic Blvd',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85001',
    propertyType: PropertyType.APARTMENT,
    // Most optional fields omitted to test default handling
    petPolicies: {
        allowed: false
    },
    utilitiesIncluded: {
        [UtilityType.TRASH]: true
    }
};

/**
 * Student housing building with income restrictions
 */
export const studentHousingBuilding: BuildingData = {
    buildingID: 'building-student-001',
    street: '100 Campus Court',
    city: 'Berkeley',
    state: 'CA',
    zip: '94720',
    propertyType: PropertyType.APARTMENT,
    specialtyType: 'student',
    specialtySubType: 'undergraduate',
    roomsForRent: true,
    leaseLength: 9,
    shortTermLeaseAllowed: true,
    propertyDescription: 'Student housing near UC Berkeley campus. Individual rooms available with shared common areas.',
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
    },
    utilitiesIncluded: {
        [UtilityType.WATER]: true,
        [UtilityType.SEWER]: true,
        [UtilityType.TRASH]: true,
        [UtilityType.ELECTRICITY]: true,
        [UtilityType.INTERNET]: true,
        [UtilityType.HEAT]: true,
        [UtilityType.AIR_CONDITIONING]: true
    }
};

/**
 * Senior living building
 */
export const seniorLivingBuilding: BuildingData = {
    buildingID: 'building-senior-001',
    street: '555 Golden Years Lane',
    city: 'Scottsdale',
    state: 'AZ',
    zip: '85250',
    propertyType: PropertyType.APARTMENT,
    specialtyType: 'senior',
    specialtySubType: '55+',
    propertyDescription: 'Active adult community for residents 55 and better. Resort-style amenities and social activities.',
    yearBuilt: 2018,
    totalUnits: 120,
    propertyAmenities: [
        { name: 'Golf Course Access', category: AmenityCategory.COMMUNITY },
        { name: 'Library', category: AmenityCategory.PROPERTY },
        { name: 'Card Room', category: AmenityCategory.PROPERTY },
        { name: 'Walking Trails', category: AmenityCategory.PROPERTY },
        { name: 'Shuttle Service', category: AmenityCategory.COMMUNITY },
        { name: 'Social Activities', category: AmenityCategory.COMMUNITY }
    ],
    petPolicies: {
        allowed: true,
        types: [PetType.DOG, PetType.CAT],
        maxCount: 2,
        weightLimit: 30,
        deposit: 200,
        notes: 'Small pets only'
    },
    parkingOptions: [
        { type: ParkingType.COVERED, included: true, spaces: 1 }
    ]
};

/**
 * Affordable housing building with AMI restrictions
 */
export const affordableHousingBuilding: BuildingData = {
    buildingID: 'building-affordable-001',
    street: '200 Community Circle',
    city: 'Oakland',
    state: 'CA',
    zip: '94607',
    propertyType: PropertyType.APARTMENT,
    specialtyType: 'affordable',
    propertyLicenseNumber: 'OAK-AFF-2023-042',
    propertyDescription: 'Income-restricted affordable housing. Applicants must qualify based on Area Median Income (AMI) limits.',
    incomeRestrictions: {
        amiLimit: 60,
        maxIncomeByHouseholdSize: {
            '1': 42000,
            '2': 48000,
            '3': 54000,
            '4': 60000,
            '5': 64800,
            '6': 69600
        }
    },
    oneTimeFees: [
        { type: FeeType.APPLICATION, amount: 25, description: 'Reduced application fee' }
    ],
    screeningCriteria: {
        incomeRatio: 2.5,
        minCreditScore: 580,
        backgroundCheckRequired: true,
        employmentVerification: true,
        notes: 'Income verification required. Must not exceed 60% AMI.'
    },
    acceptsOnlineApplications: true
};

/**
 * Townhome community
 */
export const townhomeBuilding: BuildingData = {
    buildingID: 'building-townhome-001',
    street: '300 Townhome Terrace',
    city: 'Raleigh',
    state: 'NC',
    zip: '27601',
    propertyType: PropertyType.TOWNHOME,
    yearBuilt: 2020,
    totalUnits: 25,
    propertyDescription: 'Luxury townhome community with private entrances and attached garages.',
    photos: [
        'https://s3.amazonaws.com/bucket/townhome-001/exterior.jpg',
        'https://s3.amazonaws.com/bucket/townhome-001/interior.jpg'
    ],
    parkingOptions: [
        { type: ParkingType.GARAGE, included: true, spaces: 2, description: 'Private 2-car garage' }
    ],
    storageOptions: [
        { type: StorageType.GARAGE, included: true, description: 'Additional storage in garage' }
    ],
    propertyAmenities: [
        { name: 'Private Entrance', category: AmenityCategory.UNIT },
        { name: 'Fenced Yard', category: AmenityCategory.UNIT },
        { name: 'Community Playground', category: AmenityCategory.PROPERTY }
    ]
};

/**
 * Building with no pets allowed
 */
export const noPetsBuilding: BuildingData = {
    buildingID: 'building-no-pets-001',
    street: '999 Allergy Avenue',
    city: 'Seattle',
    state: 'WA',
    zip: '98101',
    propertyType: PropertyType.APARTMENT,
    petPolicies: {
        allowed: false
    },
    propertyDescription: 'Pet-free community for those with allergies or who prefer a pet-free environment.',
    propertyAmenities: [
        { name: 'Allergy-Friendly HVAC', category: AmenityCategory.PROPERTY },
        { name: 'No Pet Policy', category: AmenityCategory.COMMUNITY }
    ]
};
