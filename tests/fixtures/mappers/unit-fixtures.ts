import type { UnitData } from '../../../src/types/index.js';
import { AmenityCategory } from '../../../src/types/index.js';

/**
 * Complete unit with all fields populated
 */
export const completeUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-complete-001',
    description: 'Corner unit with panoramic views',
    beds: 2,
    baths: 2,
    sqft: 1100,
    rent: 3200,
    occupied: false,
    availableDate: '2024-02-01',
    modelID: 'model-2bed-001',
    unitNumber: '1201',
    maxOccupants: 4,
    perPersonRent: 800,
    deposit: 3200,
    minLeaseTerm: 12,
    maxLeaseTerm: 24,
    unitDescription: 'Stunning corner unit on the 12th floor featuring floor-to-ceiling windows, hardwood floors throughout, and breathtaking city views. Recently renovated kitchen with quartz countertops and stainless steel appliances. Master suite includes walk-in closet and spa-like bathroom.',
    unitRentSpecial: {
        title: 'Corner Unit Special',
        description: '$500 off first month rent',
        startDate: '2024-01-01',
        endDate: '2024-03-31'
    },
    unitAmenities: [
        {
            name: 'Corner Windows',
            category: AmenityCategory.UNIT,
            description: 'Windows on two sides for extra light'
        },
        {
            name: 'City Views',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Recently Renovated',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Hardwood Floors',
            category: AmenityCategory.UNIT
        }
    ],
    photos: [
        'https://s3.amazonaws.com/bucket/unit-complete-001/living-room.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/kitchen.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/master-bedroom.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/bathroom.jpg',
        'https://s3.amazonaws.com/bucket/unit-complete-001/view.jpg'
    ],
    feedInclusion: {
        apartments_com: true,
        zillow: true
    },
    manualReferences: {
        apartments_com: 'APT-SF-1201',
        zillow: 'ZIL-123456789'
    }
};

/**
 * Unit inheriting most data from unit type
 */
export const inheritingUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-inheriting-001',
    modelID: 'model-1bed-001',
    unitNumber: '305',
    occupied: false,
    availableDate: '2024-01-15',
    // Most fields will be inherited from model-1bed-001
    feedInclusion: {
        apartments_com: true
    }
};

/**
 * Unit inheriting from building (no model)
 */
export const buildingInheritUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-building-inherit-001',
    unitNumber: '101',
    beds: 0, // Studio
    baths: 1,
    sqft: 500,
    rent: 1600,
    occupied: false,
    availableDate: '2024-02-15',
    // Will inherit lease terms and other defaults from building
    unitDescription: 'Cozy studio with updated kitchen'
};

/**
 * Unit with field overrides
 */
export const overrideUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-override-001',
    modelID: 'model-2bed-001',
    unitNumber: '805',
    beds: 2,
    baths: 2,
    sqft: 1150, // Override model's sqft range
    rent: 3500, // Override model's rent range
    deposit: 4000, // Override model's deposit
    minLeaseTerm: 6, // Override model's lease terms
    maxLeaseTerm: 12,
    occupied: false,
    availableDate: '2024-03-01',
    unitDescription: 'Premium unit with upgrades',
    unitAmenities: [
        {
            name: 'Upgraded Appliances',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Custom Closets',
            category: AmenityCategory.UNIT
        }
    ],
    photos: [
        'https://s3.amazonaws.com/bucket/unit-override-001/main.jpg'
    ]
};

/**
 * Occupied unit
 */
export const occupiedUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-occupied-001',
    unitNumber: '501',
    beds: 1,
    baths: 1,
    sqft: 700,
    rent: 2100,
    occupied: true,
    availableDate: '2024-08-01', // Future date when lease ends
    feedInclusion: {
        apartments_com: false,
        zillow: false
    }
};

/**
 * Unit with minimal data
 */
export const minimalUnit: UnitData = {
    buildingID: 'building-minimal-001',
    unitID: 'unit-minimal-001'
};

/**
 * Unit with no rent
 */
export const noRentUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-norent-001',
    unitNumber: '999',
    beds: 1,
    baths: 1,
    sqft: 650,
    occupied: false,
    description: 'Contact for pricing'
};

/**
 * Unit with no availability date
 */
export const noDateUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-nodate-001',
    unitNumber: '201',
    beds: 2,
    baths: 1,
    sqft: 850,
    rent: 2400,
    occupied: false
};

/**
 * Student housing room
 */
export const studentRoom: UnitData = {
    buildingID: 'building-student-001',
    unitID: 'unit-student-001',
    modelID: 'model-room-001',
    unitNumber: 'A-201',
    beds: 1,
    baths: 0, // Shared bathroom
    sqft: 120,
    rent: 850,
    occupied: false,
    availableDate: '2024-08-15', // Fall semester
    maxOccupants: 1,
    deposit: 500,
    minLeaseTerm: 9,
    maxLeaseTerm: 12,
    unitDescription: 'Single room in 4-bedroom suite with shared common areas',
    photos: [
        'https://s3.amazonaws.com/bucket/student-001/room.jpg',
        'https://s3.amazonaws.com/bucket/student-001/common-area.jpg'
    ]
};

/**
 * Senior living unit
 */
export const seniorUnit: UnitData = {
    buildingID: 'building-senior-001',
    unitID: 'unit-senior-001',
    modelID: 'model-senior-001',
    unitNumber: '103',
    beds: 1,
    baths: 1,
    sqft: 750,
    rent: 1900,
    occupied: false,
    availableDate: '2024-02-01',
    unitDescription: 'Ground floor unit with patio access',
    unitAmenities: [
        {
            name: 'Patio Access',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Ground Floor',
            category: AmenityCategory.UNIT,
            description: 'No stairs required'
        }
    ]
};

/**
 * Affordable housing unit
 */
export const affordableUnit: UnitData = {
    buildingID: 'building-affordable-001',
    unitID: 'unit-affordable-001',
    modelID: 'model-affordable-001',
    unitNumber: '205',
    beds: 1,
    baths: 1,
    sqft: 575,
    rent: 850,
    deposit: 850,
    occupied: false,
    availableDate: '2024-01-01',
    minLeaseTerm: 12,
    maxLeaseTerm: 12,
    unitDescription: 'Income-restricted unit. Must qualify at 60% AMI or below.',
    feedInclusion: {
        apartments_com: true,
        zillow: true
    }
};

/**
 * Townhome unit
 */
export const townhomeUnit: UnitData = {
    buildingID: 'building-townhome-001',
    unitID: 'unit-townhome-001',
    modelID: 'model-townhome-001',
    unitNumber: '15',
    beds: 3,
    baths: 2.5,
    sqft: 1850,
    rent: 3400,
    deposit: 3400,
    occupied: false,
    availableDate: '2024-03-01',
    minLeaseTerm: 12,
    maxLeaseTerm: 24,
    unitDescription: 'End unit townhome with extra windows and larger yard',
    unitAmenities: [
        {
            name: 'End Unit',
            category: AmenityCategory.UNIT,
            description: 'Extra windows and privacy'
        },
        {
            name: 'Large Yard',
            category: AmenityCategory.UNIT
        }
    ],
    photos: [
        'https://s3.amazonaws.com/bucket/townhome-001/exterior.jpg',
        'https://s3.amazonaws.com/bucket/townhome-001/interior.jpg',
        'https://s3.amazonaws.com/bucket/townhome-001/yard.jpg'
    ]
};

/**
 * Unit with error status
 */
export const errorStatusUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-error-001',
    unitNumber: '666',
    beds: 1,
    baths: 1,
    sqft: 700,
    rent: 2000,
    occupied: false,
    availableDate: '2024-01-01',
    feedInclusion: {
        apartments_com: false,
        zillow: false
    },
    manualReferences: {
        apartments_com: 'APT-ERROR-001'
    }
};

/**
 * Unit with long descriptions and many amenities
 */
export const verboseUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-verbose-001',
    unitNumber: '1001',
    beds: 2,
    baths: 2,
    sqft: 1000,
    rent: 2800,
    occupied: false,
    availableDate: '2024-02-15',
    description: 'This is a very long description that might be truncated by some systems. It contains detailed information about every aspect of the unit including the flooring, wall colors, appliance brands, window treatments, closet configurations, bathroom fixtures, lighting fixtures, and much more.',
    unitDescription: 'Welcome to your new home! This exceptional two-bedroom, two-bathroom residence offers the perfect blend of comfort and sophistication. As you enter, you\'ll be greeted by an open-concept living space bathed in natural light from oversized windows. The gourmet kitchen features top-of-the-line stainless steel appliances, custom cabinetry, and a large island perfect for entertaining. The spacious master suite boasts a walk-in closet and a luxurious en-suite bathroom with dual vanities and a glass-enclosed shower. The second bedroom is equally impressive, offering flexibility as a guest room, home office, or nursery. Additional highlights include in-unit laundry, hardwood floors throughout, central air conditioning, and a private balcony with stunning views. This unit has been meticulously maintained and is move-in ready. Located in a full-service building with an array of amenities, you\'ll enjoy the convenience of urban living with the comfort of a true home.',
    unitAmenities: [
        { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
        { name: 'Stainless Steel Appliances', category: AmenityCategory.UNIT },
        { name: 'Granite Countertops', category: AmenityCategory.UNIT },
        { name: 'In-Unit Washer/Dryer', category: AmenityCategory.UNIT },
        { name: 'Central Air', category: AmenityCategory.UNIT },
        { name: 'Walk-In Closet', category: AmenityCategory.UNIT },
        { name: 'Balcony', category: AmenityCategory.UNIT },
        { name: 'City Views', category: AmenityCategory.UNIT },
        { name: 'Dual Vanity', category: AmenityCategory.UNIT },
        { name: 'Kitchen Island', category: AmenityCategory.UNIT },
        { name: 'Pantry', category: AmenityCategory.UNIT },
        { name: 'Ceiling Fans', category: AmenityCategory.UNIT },
        { name: 'Recessed Lighting', category: AmenityCategory.UNIT },
        { name: 'Crown Molding', category: AmenityCategory.UNIT },
        { name: 'Window Treatments', category: AmenityCategory.UNIT }
    ]
};

/**
 * Unit available immediately
 */
export const immediateUnit: UnitData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    unitID: 'unit-immediate-001',
    unitNumber: '401',
    beds: 1,
    baths: 1,
    sqft: 650,
    rent: 1950,
    occupied: false,
    availableDate: new Date().toISOString(), // Today
    unitDescription: 'Available for immediate move-in!',
    feedInclusion: {
        apartments_com: true,
        zillow: true
    }
};
