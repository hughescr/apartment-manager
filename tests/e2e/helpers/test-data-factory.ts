import {
    PropertyType,
    UtilityType,
    PetType,
    ParkingType,
    StorageType,
    AmenityCategory,
    type BuildingData,
    type UnitData,
    type UnitTypeData,
    type RentSpecial,
    type ParkingOption,
    type StorageOption,
    type PetPolicy,
    type ContactInfo
} from '../../../src/types';
import type { TestDataSet } from './seed-test-data';
import _ from 'lodash';

export class testDataFactory {
    private static timestamp = Date.now();
    private static testIdCounter = 0;

    static getNextTestId(): string {
        return `test-${this.timestamp}-${++this.testIdCounter}`;
    }

    static generateBuilding(overrides: Partial<BuildingData> = {}): BuildingData {
        const buildingID = overrides.buildingID || `building-${this.getNextTestId()}`;
        return {
            buildingID,
            street: '123 Test Street',
            city: 'San Francisco',
            state: 'CA',
            zip: '94102',
            description: 'Test building for E2E tests',
            yearBuilt: 2020,
            numberStories: 3,
            totalUnits: 24,
            propertyType: PropertyType.APARTMENT,
            leaseLength: 12,
            applicationFee: 50,
            propertyDescription: 'A modern apartment building with excellent amenities and convenient location.',
            acceptsOnlineApplications: true,
            shortTermLeaseAllowed: false,
            roomsForRent: false,
            photos: [],
            propertyLicenseNumber: 'LIC-123456',
            specialtyType: undefined,
            specialtySubType: undefined,
            rentSpecials: [],
            incomeRestrictions: undefined,
            utilitiesIncluded: {
                [UtilityType.WATER]: true,
                [UtilityType.TRASH]: true,
                [UtilityType.SEWER]: true,
                [UtilityType.ELECTRICITY]: false,
                [UtilityType.GAS]: false,
                [UtilityType.INTERNET]: false,
                [UtilityType.CABLE]: false
            },
            oneTimeFees: [],
            monthlyFees: [],
            parkingOptions: [],
            petPolicies: {
                allowed: false
            },
            storageOptions: [],
            propertyAmenities: [],
            screeningCriteria: {
                incomeRatio: 3,
                minCreditScore: 650,
                maxOccupantsPerBedroom: 2,
                backgroundCheckRequired: true,
                evictionHistory: true,
                criminalHistory: true,
                references: 2,
                employmentVerification: true,
                rentalHistory: true
            },
            contactInfo: {
                name: 'Test Manager',
                phone: '555-1234',
                email: 'manager@test.com',
                website: 'https://test-building.com'
            },
            tourAvailability: {
                selfGuidedTours: false,
                virtualTours: false,
                inPersonTours: true,
                tourHours: {
                    monday: { open: '09:00', close: '17:00' },
                    tuesday: { open: '09:00', close: '17:00' },
                    wednesday: { open: '09:00', close: '17:00' },
                    thursday: { open: '09:00', close: '17:00' },
                    friday: { open: '09:00', close: '17:00' },
                    saturday: { open: '10:00', close: '16:00' },
                    sunday: { open: '10:00', close: '16:00' }
                }
            },
            ...overrides
        };
    }

    static generateUnitType(buildingID: string, overrides: Partial<UnitTypeData> = {}): UnitTypeData {
        const modelID = overrides.modelID || `model-${this.getNextTestId()}`;
        return {
            buildingID,
            modelID,
            modelName: 'Studio Deluxe',
            countAvailable: 5,
            dateAvailable: _.split(new Date().toISOString(), 'T')[0],
            beds: 0,
            baths: 1,
            maxOccupants: 2,
            minRent: 1800,
            maxRent: 2200,
            perPersonRent: 0,
            minSqft: 450,
            maxSqft: 550,
            deposit: 1800,
            minLeaseTerm: 12,
            maxLeaseTerm: 24,
            modelAmenities: [
                { name: 'Updated Kitchen', category: AmenityCategory.UNIT },
                { name: 'Large Windows', category: AmenityCategory.UNIT },
                { name: 'Hardwood Floors', category: AmenityCategory.UNIT },
                { name: 'Dishwasher', category: AmenityCategory.UNIT },
                { name: 'Microwave', category: AmenityCategory.UNIT },
                { name: 'Refrigerator', category: AmenityCategory.UNIT },
                { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                { name: 'Ceiling Fan', category: AmenityCategory.UNIT },
                { name: 'Balcony', category: AmenityCategory.UNIT },
                { name: 'High-Speed Internet Ready', category: AmenityCategory.UNIT }
            ],
            ...overrides
        };
    }

    static generateUnit(buildingID: string, modelID: string, overrides: Partial<UnitData> = {}): UnitData {
        const unitID = overrides.unitID || `unit-${this.getNextTestId()}`;
        return {
            buildingID,
            unitID,
            modelID,
            unitNumber: '101',
            beds: 0,
            baths: 1,
            sqft: 500,
            rent: 2000,
            availableDate: _.split(new Date().toISOString(), 'T')[0],
            maxOccupants: 2,
            perPersonRent: 0,
            deposit: 2000,
            minLeaseTerm: 12,
            maxLeaseTerm: 24,
            unitDescription: 'Beautiful studio apartment with city views',
            unitRentSpecial: undefined,
            unitAmenities: undefined, // Inherits from model
            photos: [],
            websiteStatus: {},
            listingIds: {},
            ...overrides
        };
    }

    static generateRentSpecial(overrides: Partial<RentSpecial> = {}): RentSpecial {
        return {
            title: 'Move-in Special',
            description: '$500 off first month rent',
            startDate: '2024-01-01',
            endDate: '2024-12-31',
            ...overrides
        };
    }

    static generateParkingOption(overrides: Partial<ParkingOption> = {}): ParkingOption {
        return {
            type: ParkingType.COVERED,
            included: false,
            fee: 100,
            spaces: 1,
            description: 'Covered parking space',
            ...overrides
        };
    }

    static generateStorageOption(overrides: Partial<StorageOption> = {}): StorageOption {
        return {
            type: StorageType.CLOSET,
            included: true,
            fee: 0,
            dimensions: '5x10',
            description: 'Walk-in closet',
            ...overrides
        };
    }

    static generatePetPolicy(overrides: Partial<PetPolicy> = {}): PetPolicy {
        return {
            allowed: true,
            types: [PetType.CAT, PetType.DOG],
            maxCount: 2,
            weightLimit: 25,
            deposit: 500,
            monthlyFee: 50,
            notes: 'Maximum 2 pets, under 25 lbs',
            ...overrides
        };
    }

    static generateContactInfo(overrides: Partial<ContactInfo> = {}): ContactInfo {
        return {
            name: 'Test Manager',
            phone: '555-1234',
            email: 'manager@test.com',
            website: 'https://test-building.com',
            ...overrides
        };
    }

    static generateFullTestDataSet(): TestDataSet {
        // Generate a complete test dataset with relationships
        const building1 = this.generateBuilding({
            buildingID: 'test-building-1',
            street: '100 Main St',
            propertyType: PropertyType.APARTMENT,
            totalUnits: 20,
            rentSpecials: [this.generateRentSpecial()],
            parkingOptions: [
                this.generateParkingOption({ type: ParkingType.COVERED }),
                this.generateParkingOption({ type: ParkingType.GARAGE, fee: 150 })
            ],
            petPolicies: this.generatePetPolicy(),
            storageOptions: [this.generateStorageOption()],
            propertyAmenities: [
                { name: 'Pool', category: AmenityCategory.PROPERTY },
                { name: 'Gym', category: AmenityCategory.PROPERTY },
                { name: 'Clubhouse', category: AmenityCategory.COMMUNITY },
                { name: 'Business Center', category: AmenityCategory.COMMUNITY }
            ]
        });

        const building2 = this.generateBuilding({
            buildingID: 'test-building-2',
            street: '200 Oak Ave',
            propertyType: PropertyType.TOWNHOME,
            totalUnits: 10
        });

        // Unit types for building 1
        const unitType1_1 = this.generateUnitType(building1.buildingID, {
            modelID: 'studio',
            modelName: 'Studio',
            beds: 0,
            baths: 1,
            minRent: 1500,
            maxRent: 1800
        });

        const unitType1_2 = this.generateUnitType(building1.buildingID, {
            modelID: '1br',
            modelName: '1 Bedroom',
            beds: 1,
            baths: 1,
            minRent: 2000,
            maxRent: 2400
        });

        const unitType1_3 = this.generateUnitType(building1.buildingID, {
            modelID: '2br',
            modelName: '2 Bedroom',
            beds: 2,
            baths: 2,
            minRent: 2800,
            maxRent: 3200
        });

        // Unit type for building 2
        const unitType2_1 = this.generateUnitType(building2.buildingID, {
            modelID: 'townhome',
            modelName: 'Townhome',
            beds: 3,
            baths: 2.5,
            minRent: 3500,
            maxRent: 4000
        });

        // Units for building 1
        const units: UnitData[] = [
            this.generateUnit(building1.buildingID, unitType1_1.modelID, {
                unitID: 'unit-101',
                unitNumber: '101',
                rent: 1600
            }),
            this.generateUnit(building1.buildingID, unitType1_1.modelID, {
                unitID: 'unit-102',
                unitNumber: '102',
                rent: 1650
            }),
            this.generateUnit(building1.buildingID, unitType1_2.modelID, {
                unitID: 'unit-201',
                unitNumber: '201',
                beds: 1,
                rent: 2200
            }),
            this.generateUnit(building1.buildingID, unitType1_2.modelID, {
                unitID: 'unit-202',
                unitNumber: '202',
                beds: 1,
                rent: 2250
            }),
            this.generateUnit(building1.buildingID, unitType1_3.modelID, {
                unitID: 'unit-301',
                unitNumber: '301',
                beds: 2,
                baths: 2,
                rent: 3000
            }),
            // Units for building 2
            this.generateUnit(building2.buildingID, unitType2_1.modelID, {
                unitID: 'unit-1',
                unitNumber: '1',
                beds: 3,
                baths: 2.5,
                rent: 3750
            }),
            this.generateUnit(building2.buildingID, unitType2_1.modelID, {
                unitID: 'unit-2',
                unitNumber: '2',
                beds: 3,
                baths: 2.5,
                rent: 3800
            })
        ];

        return {
            buildings: [building1, building2],
            unitTypes: [unitType1_1, unitType1_2, unitType1_3, unitType2_1],
            units
        };
    }

    static generateMinimalTestDataSet(): TestDataSet {
        // Generate minimal dataset for quick tests
        const building = this.generateBuilding({
            buildingID: 'test-minimal',
            totalUnits: 2
        });

        const unitType = this.generateUnitType(building.buildingID, {
            modelID: 'basic',
            modelName: 'Basic Unit'
        });

        const unit = this.generateUnit(building.buildingID, unitType.modelID, {
            unitID: 'unit-1',
            unitNumber: '1'
        });

        return {
            buildings: [building],
            unitTypes: [unitType],
            units: [unit]
        };
    }
}
