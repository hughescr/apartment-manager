import type { UnitTypeData } from '../../../src/types/index.js';
import { AmenityCategory } from '../../../src/types/index.js';

/**
 * Standard studio unit type
 */
export const studioUnitType: UnitTypeData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    modelID: 'model-studio-001',
    modelName: 'Cozy Studio',
    countAvailable: 5,
    dateAvailable: '2024-02-01',
    beds: 0,
    baths: 1,
    maxOccupants: 2,
    minRent: 1500,
    maxRent: 1800,
    perPersonRent: 900,
    minSqft: 450,
    maxSqft: 550,
    deposit: 1500,
    minLeaseTerm: 6,
    maxLeaseTerm: 12,
    modelAmenities: [
        {
            name: 'Kitchen Island',
            category: AmenityCategory.UNIT,
            description: 'Extra counter space with breakfast bar'
        },
        {
            name: 'Murphy Bed',
            category: AmenityCategory.UNIT,
            description: 'Space-saving wall bed'
        }
    ]
};

/**
 * Standard 1-bedroom unit type
 */
export const oneBedUnitType: UnitTypeData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    modelID: 'model-1bed-001',
    modelName: 'Classic One Bedroom',
    countAvailable: 10,
    dateAvailable: '2024-01-15',
    beds: 1,
    baths: 1,
    maxOccupants: 3,
    minRent: 2000,
    maxRent: 2300,
    minSqft: 650,
    maxSqft: 750,
    deposit: 2000,
    minLeaseTerm: 12,
    maxLeaseTerm: 15,
    modelAmenities: [
        {
            name: 'Walk-In Closet',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Balcony',
            category: AmenityCategory.UNIT
        }
    ]
};

/**
 * Standard 2-bedroom unit type
 */
export const twoBedUnitType: UnitTypeData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    modelID: 'model-2bed-001',
    modelName: 'Spacious Two Bedroom',
    countAvailable: 8,
    dateAvailable: '2024-03-01',
    beds: 2,
    baths: 2,
    maxOccupants: 4,
    minRent: 2800,
    maxRent: 3200,
    minSqft: 950,
    maxSqft: 1100,
    deposit: 2800,
    minLeaseTerm: 12,
    maxLeaseTerm: 24,
    modelAmenities: [
        {
            name: 'Master Suite',
            category: AmenityCategory.UNIT,
            description: 'Master bedroom with en-suite bathroom'
        },
        {
            name: 'Double Vanity',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Pantry',
            category: AmenityCategory.UNIT
        }
    ]
};

/**
 * Luxury 3-bedroom unit type
 */
export const threeBedUnitType: UnitTypeData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    modelID: 'model-3bed-001',
    modelName: 'Premium Three Bedroom',
    countAvailable: 3,
    dateAvailable: '2024-04-01',
    beds: 3,
    baths: 2.5,
    maxOccupants: 6,
    minRent: 4000,
    maxRent: 4500,
    minSqft: 1400,
    maxSqft: 1600,
    deposit: 4000,
    minLeaseTerm: 12,
    maxLeaseTerm: 24,
    modelAmenities: [
        {
            name: 'Den/Office',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Powder Room',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Large Terrace',
            category: AmenityCategory.UNIT,
            description: 'Wraparound terrace with city views'
        },
        {
            name: 'Two Parking Spaces',
            category: AmenityCategory.UNIT
        }
    ]
};

/**
 * Unit type with all fields populated
 */
export const completeUnitType: UnitTypeData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    modelID: 'model-complete-001',
    modelName: 'Deluxe Corner Unit',
    countAvailable: 2,
    dateAvailable: '2024-02-15',
    beds: 2,
    baths: 2.5,
    maxOccupants: 5,
    minRent: 3500,
    maxRent: 4000,
    perPersonRent: 800,
    minSqft: 1200,
    maxSqft: 1350,
    deposit: 3500,
    minLeaseTerm: 6,
    maxLeaseTerm: 18,
    modelAmenities: [
        {
            name: 'Floor-to-Ceiling Windows',
            category: AmenityCategory.UNIT,
            description: 'Panoramic views with maximum natural light'
        },
        {
            name: 'Premium Appliances',
            category: AmenityCategory.UNIT,
            description: 'Sub-Zero refrigerator, Wolf range, Bosch dishwasher'
        },
        {
            name: 'Wine Fridge',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Smart Home Features',
            category: AmenityCategory.UNIT,
            description: 'Nest thermostat, smart locks, automated blinds'
        },
        {
            name: 'Fireplace',
            category: AmenityCategory.UNIT,
            description: 'Gas fireplace with remote control'
        }
    ]
};

/**
 * Unit type with minimal fields
 */
export const minimalUnitType: UnitTypeData = {
    buildingID: 'building-minimal-001',
    modelID: 'model-minimal-001',
    modelName: 'Basic Model',
    beds: 1,
    baths: 1
};

/**
 * Unit type with custom amenities
 */
export const customAmenitiesUnitType: UnitTypeData = {
    buildingID: 'building-amenities-001',
    modelID: 'model-custom-001',
    modelName: 'Artist Loft',
    beds: 1,
    baths: 1,
    minRent: 2200,
    maxRent: 2500,
    minSqft: 800,
    maxSqft: 900,
    modelAmenities: [
        {
            name: 'High Ceilings',
            category: AmenityCategory.UNIT,
            description: '14-foot exposed beam ceilings'
        },
        {
            name: 'Art Studio Space',
            category: AmenityCategory.UNIT,
            description: 'Dedicated area with north-facing windows'
        },
        {
            name: 'Industrial Kitchen',
            category: AmenityCategory.UNIT,
            description: 'Commercial-grade appliances'
        },
        {
            name: 'Concrete Floors',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Gallery Lighting',
            category: AmenityCategory.UNIT,
            description: 'Track lighting system for artwork display'
        }
    ]
};

/**
 * Affordable housing unit type
 */
export const affordableUnitType: UnitTypeData = {
    buildingID: 'building-affordable-001',
    modelID: 'model-affordable-001',
    modelName: 'Income-Restricted One Bedroom',
    countAvailable: 15,
    dateAvailable: '2024-01-01',
    beds: 1,
    baths: 1,
    maxOccupants: 2,
    minRent: 800,
    maxRent: 900,
    minSqft: 550,
    maxSqft: 600,
    deposit: 800,
    minLeaseTerm: 12,
    maxLeaseTerm: 12,
    modelAmenities: [
        {
            name: 'Energy-Efficient Appliances',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Accessible Design',
            category: AmenityCategory.UNIT,
            description: 'ADA-compliant features available'
        }
    ]
};

/**
 * Senior living unit type
 */
export const seniorLivingUnitType: UnitTypeData = {
    buildingID: 'building-senior-001',
    modelID: 'model-senior-001',
    modelName: 'Active Adult Suite',
    countAvailable: 20,
    beds: 1,
    baths: 1,
    maxOccupants: 2,
    minRent: 1800,
    maxRent: 2200,
    minSqft: 700,
    maxSqft: 850,
    deposit: 1000,
    minLeaseTerm: 6,
    maxLeaseTerm: 12,
    modelAmenities: [
        {
            name: 'Emergency Call System',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Grab Bars',
            category: AmenityCategory.UNIT,
            description: 'Safety bars in bathroom'
        },
        {
            name: 'Step-In Shower',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Wide Doorways',
            category: AmenityCategory.UNIT,
            description: 'Wheelchair accessible'
        }
    ]
};

/**
 * Townhome unit type
 */
export const townhomeUnitType: UnitTypeData = {
    buildingID: 'building-townhome-001',
    modelID: 'model-townhome-001',
    modelName: 'Executive Townhome',
    countAvailable: 4,
    beds: 3,
    baths: 2.5,
    maxOccupants: 6,
    minRent: 3200,
    maxRent: 3500,
    minSqft: 1800,
    maxSqft: 2000,
    deposit: 3200,
    minLeaseTerm: 12,
    maxLeaseTerm: 24,
    modelAmenities: [
        {
            name: 'Private Garage',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Fenced Backyard',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Multiple Levels',
            category: AmenityCategory.UNIT,
            description: 'Three-story layout'
        },
        {
            name: 'Basement Storage',
            category: AmenityCategory.UNIT
        }
    ]
};

/**
 * Room for rent unit type (for student housing)
 */
export const roomForRentUnitType: UnitTypeData = {
    buildingID: 'building-student-001',
    modelID: 'model-room-001',
    modelName: 'Single Occupancy Room',
    countAvailable: 30,
    beds: 1,
    baths: 0, // Shared bathroom
    maxOccupants: 1,
    minRent: 800,
    maxRent: 950,
    minSqft: 120,
    maxSqft: 150,
    deposit: 500,
    minLeaseTerm: 9,
    maxLeaseTerm: 12,
    modelAmenities: [
        {
            name: 'Furnished',
            category: AmenityCategory.UNIT,
            description: 'Bed, desk, chair, and dresser included'
        },
        {
            name: 'Shared Kitchen',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Shared Bathroom',
            category: AmenityCategory.UNIT
        },
        {
            name: 'Study Room Access',
            category: AmenityCategory.PROPERTY
        }
    ]
};

/**
 * Unit type with no available units
 */
export const unavailableUnitType: UnitTypeData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    modelID: 'model-unavailable-001',
    modelName: 'Penthouse Suite',
    countAvailable: 0,
    beds: 4,
    baths: 3.5,
    maxOccupants: 8,
    minRent: 8000,
    maxRent: 10000,
    minSqft: 2500,
    maxSqft: 3000,
    deposit: 10000,
    minLeaseTerm: 12,
    maxLeaseTerm: 24
};

/**
 * Unit type with missing rent information
 */
export const noRentUnitType: UnitTypeData = {
    buildingID: 'wgey4dDPEd8qEMGtGoMef7',
    modelID: 'model-norent-001',
    modelName: 'Coming Soon Model',
    beds: 2,
    baths: 2,
    minSqft: 900,
    maxSqft: 1000,
    modelAmenities: [
        {
            name: 'Coming Soon',
            category: AmenityCategory.UNIT,
            description: 'Details to be announced'
        }
    ]
};
