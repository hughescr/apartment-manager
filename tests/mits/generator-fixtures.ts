import type { BuildingData, UnitData, UnitTypeData, VacancyClass, Deposit, PetTypePolicy, ContactInfo } from '../../src/types';
import { AmenityCategory } from '../../src/types';

/**
 * Test fixtures and utilities for MITS generator tests
 */

export function createMockBuilding(): BuildingData {
    return {
        buildingID: 'test-building-1',
        buildingName: 'Sunset Apartments',
        street: '123 Main St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        latitude: 34.0522,
        longitude: -118.2437,
        description: 'Modern apartment complex',
        yearBuilt: 2020,
        numberStories: 3,
        totalUnits: 24,
        propertyDescription: 'Beautiful apartments with modern amenities',
        contactInfo: {
            name: 'John Doe',
            phone: '(555) 123-4567',
            email: 'contact@sunsetapts.com',
            propertyWebsite: 'https://sunsetapts.com'
        },
        propertyAmenities: [
            { name: 'Pool', category: AmenityCategory.COMMUNITY },
            { name: 'Gym', category: AmenityCategory.PROPERTY }
        ],
        petPolicies: {
            allowed: true,
            deposit: 500,
            monthlyFee: 25
        },
        applicationFee: 50,
        acceptsOnlineApplications: true
    };
}

export function createMockUnitTypes(): UnitTypeData[] {
    return [
        {
            buildingID: 'test-building-1',
            modelID: 'model-1',
            modelName: 'Studio Deluxe',
            beds: 0,
            baths: 1,
            minRent: 1200,
            maxRent: 1400,
            minSqft: 450,
            maxSqft: 550,
            deposit: 1200,
            countAvailable: 3
        },
        {
            buildingID: 'test-building-1',
            modelID: 'model-2',
            modelName: 'One Bedroom',
            beds: 1,
            baths: 1,
            minRent: 1600,
            maxRent: 1800,
            minSqft: 750,
            maxSqft: 850,
            deposit: 1600,
            countAvailable: 5
        }
    ];
}

export function createMockUnits(): UnitData[] {
    return [
        {
            buildingID: 'test-building-1',
            unitID: 'unit-101',
            unitNumber: '101',
            modelID: 'model-1',
            beds: 0,
            baths: 1,
            sqft: 500,
            rent: 1300,
            occupied: false,
            availableDate: '2025-02-01',
            deposit: 1300,
            feedInclusion: {
                apartments_com: true,
                zillow: true
            }
        },
        {
            buildingID: 'test-building-1',
            unitID: 'unit-201',
            unitNumber: '201',
            modelID: 'model-2',
            beds: 1,
            baths: 1,
            sqft: 800,
            rent: 1700,
            occupied: false,
            availableDate: '2025-02-15',
            deposit: 1700,
            feedInclusion: {
                apartments_com: true,
                zillow: false
            }
        }
    ];
}

export function createMockUnitsWithVacancyClass(): UnitData[] {
    const baseUnit = createMockUnits()[0];
    return [
        {
            ...baseUnit,
            unitID: 'unit-unoccupied',
            unitNumber: '101',
            vacancyClass: 'Unoccupied' as VacancyClass,
            feedInclusion: { apartments_com: true, zillow: true }
        },
        {
            ...baseUnit,
            unitID: 'unit-occupied',
            unitNumber: '102',
            vacancyClass: 'Occupied' as VacancyClass,
            feedInclusion: { apartments_com: true, zillow: true }
        },
        {
            ...baseUnit,
            unitID: 'unit-notice',
            unitNumber: '103',
            vacancyClass: 'Notice' as VacancyClass,
            feedInclusion: { apartments_com: true, zillow: true }
        },
        {
            ...baseUnit,
            unitID: 'unit-down',
            unitNumber: '104',
            vacancyClass: 'Down' as VacancyClass,
            feedInclusion: { apartments_com: true, zillow: true }
        }
    ];
}

export function createSecondMockBuilding(): BuildingData {
    return {
        buildingID: 'test-building-2',
        buildingName: 'Sunrise Apartments',
        street: '456 Oak St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        latitude: 37.7749,  // San Francisco coordinates to prevent geocoding
        longitude: -122.4194
    };
}

export function createSecondMockUnitTypes(): UnitTypeData[] {
    return [
        {
            buildingID: 'test-building-2',
            modelID: 'model-3',
            modelName: 'Two Bedroom',
            beds: 2,
            baths: 2,
            minRent: 2000,
            maxRent: 2500
        }
    ];
}

export function createSecondMockUnits(): UnitData[] {
    return [
        {
            buildingID: 'test-building-2',
            unitID: 'unit-301',
            unitNumber: '301',
            modelID: 'model-3',
            beds: 2,
            baths: 2,
            rent: 2200,
            feedInclusion: { apartments_com: true }
        }
    ];
}

export function createEnhancedDeposit(): Deposit {
    return {
        amount: 2000,
        refundable: true
    };
}

export function createNonRefundableDeposit(): Deposit {
    return {
        amount: 1800,
        refundable: false
    };
}

export function createPartialRefundDeposit(): Deposit {
    return {
        amount: 2500,
        refundable: false,
        partialRefundPercentage: 75
    };
}

export function createComplexDeposit(): Deposit {
    return {
        amount: 3200,
        refundable: true,
        partialRefundPercentage: 90
    };
}

export function createBasicPetTypes(): PetTypePolicy[] {
    return [
        {
            type: 'dog',
            weightLimit: 50,
            countLimit: 2,
            fee: 35,
            deposit: 400,
            breedRestrictions: ['Pit Bull', 'Rottweiler']
        },
        {
            type: 'cat',
            countLimit: 3,
            fee: 20,
            deposit: 200
        }
    ];
}

export function createComplexPetTypes(): PetTypePolicy[] {
    return [
        {
            type: 'dog',
            weightLimit: 75,
            countLimit: 1,
            fee: 50,
            deposit: 600,
            breedRestrictions: ['Pit Bull', 'Rottweiler', 'Doberman']
        },
        {
            type: 'cat',
            countLimit: 2,
            fee: 25,
            deposit: 300
        },
        {
            type: 'bird',
            countLimit: 3,
            fee: 15,
            deposit: 100
        }
    ];
}

export function createBuildingWithWebsites(): BuildingData {
    const building = createMockBuilding();
    return {
        ...building,
        contactInfo: {
            ...building.contactInfo,
            propertyWebsite: 'https://property-specific.com',
            managementWebsite: 'https://management-company.com'
        }
    };
}

export function createLegacyBuildingWithWebsite(): BuildingData {
    const building = createMockBuilding();
    return {
        ...building,
        contactInfo: {
            ...building.contactInfo,
            website: 'https://legacy-website.com',
            propertyWebsite: undefined,
            managementWebsite: undefined
        } as ContactInfo & { website?: string }
    };
}

export function createMinimalBuilding(): BuildingData {
    return {
        buildingID: 'test-min',
        buildingName: 'Minimal Building'
    };
}

export function createBuildingWithSpecialChars(): BuildingData {
    const building = createMockBuilding();
    return {
        ...building,
        buildingName: 'Smith & Jones Apartments',
        propertyDescription: 'Units < 1000 sqft with "great" views & more'
    };
}

export function createBuildingWithoutAddress(): BuildingData {
    const building = createMockBuilding();
    return {
        ...building,
        street: undefined,
        city: undefined,
        state: undefined,
        zip: undefined
    };
}

export function createLargeUnits(count = 100): UnitData[] {
    const baseUnit = createMockUnits()[0];
    const largeUnits: UnitData[] = [];
    for(let i = 0; i < count; i++) {
        largeUnits.push({
            ...baseUnit,
            unitID: `unit-${i}`,
            unitNumber: `${i}`,
            feedInclusion: { apartments_com: true }
        });
    }
    return largeUnits;
}
