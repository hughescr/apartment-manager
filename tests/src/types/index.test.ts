import { describe, it, expect } from 'bun:test';
import {
    // Enumerations
    PropertyType,
    UtilityType,
    FeeType,
    PetType,
    ParkingType,
    StorageType,
    AmenityCategory,
    WebsiteStatus,
    DayOfWeek,

    // Interfaces
    RentSpecial,
    IncomeRestriction,
    Fee,
    PetPolicy,
    ParkingOption,
    StorageOption,
    ScreeningCriteria,
    ContactInfo,
    TourAvailability,
    Amenity,
    BuildingData,
    UnitTypeData,
    UnitData,
    Unit,
    Building,
    UnitType,
    DynamoDBItem,
    BuildingDynamoDBItem,
    UnitDynamoDBItem,
    UnitTypeDynamoDBItem,
    PartialBuildingData,
    PartialUnitData,
    PartialUnitTypeData,

    // Default value generators
    getDefaultBuildingData,
    getDefaultUnitData,
    getDefaultUnitTypeData
} from '../../../src/types';

describe('Type Definitions', () => {
    describe('Enumerations', () => {
        it('PropertyType should have correct values', () => {
            expect(PropertyType.APARTMENT as string).toBe('apartment');
            expect(PropertyType.CONDO as string).toBe('condo');
            expect(PropertyType.TOWNHOME as string).toBe('townhome');
            expect(PropertyType.SINGLE_FAMILY as string).toBe('single-family');
            expect(PropertyType.HOUSE as string).toBe('house');
            expect(Object.keys(PropertyType).length).toBe(5);
        });

        it('UtilityType should have correct values', () => {
            expect(UtilityType.WATER as string).toBe('water');
            expect(UtilityType.SEWER as string).toBe('sewer');
            expect(UtilityType.TRASH as string).toBe('trash');
            expect(UtilityType.GAS as string).toBe('gas');
            expect(UtilityType.ELECTRICITY as string).toBe('electricity');
            expect(UtilityType.CABLE as string).toBe('cable');
            expect(UtilityType.INTERNET as string).toBe('internet');
            expect(UtilityType.HEAT as string).toBe('heat');
            expect(UtilityType.AIR_CONDITIONING as string).toBe('air-conditioning');
            expect(Object.keys(UtilityType).length).toBe(9);
        });

        it('FeeType should have correct values', () => {
            expect(FeeType.APPLICATION as string).toBe('application');
            expect(FeeType.ADMIN as string).toBe('admin');
            expect(FeeType.SECURITY_DEPOSIT as string).toBe('security-deposit');
            expect(FeeType.PET_DEPOSIT as string).toBe('pet-deposit');
            expect(FeeType.PET_FEE as string).toBe('pet-fee');
            expect(FeeType.PARKING as string).toBe('parking');
            expect(FeeType.STORAGE as string).toBe('storage');
            expect(FeeType.MOVE_IN as string).toBe('move-in');
            expect(FeeType.KEY_DEPOSIT as string).toBe('key-deposit');
            expect(FeeType.CLEANING as string).toBe('cleaning');
            expect(Object.keys(FeeType).length).toBe(10);
        });

        it('PetType should have correct values', () => {
            expect(PetType.DOG as string).toBe('dog');
            expect(PetType.CAT as string).toBe('cat');
            expect(PetType.BIRD as string).toBe('bird');
            expect(PetType.FISH as string).toBe('fish');
            expect(PetType.SMALL_ANIMAL as string).toBe('small-animal');
            expect(PetType.NO_PETS as string).toBe('no-pets');
            expect(Object.keys(PetType).length).toBe(6);
        });

        it('ParkingType should have correct values', () => {
            expect(ParkingType.GARAGE as string).toBe('garage');
            expect(ParkingType.COVERED as string).toBe('covered');
            expect(ParkingType.UNCOVERED as string).toBe('uncovered');
            expect(ParkingType.STREET as string).toBe('street');
            expect(ParkingType.NONE as string).toBe('none');
            expect(Object.keys(ParkingType).length).toBe(5);
        });

        it('StorageType should have correct values', () => {
            expect(StorageType.CLOSET as string).toBe('closet');
            expect(StorageType.BASEMENT as string).toBe('basement');
            expect(StorageType.GARAGE as string).toBe('garage');
            expect(StorageType.EXTERNAL_UNIT as string).toBe('external-unit');
            expect(StorageType.NONE as string).toBe('none');
            expect(Object.keys(StorageType).length).toBe(5);
        });

        it('AmenityCategory should have correct values', () => {
            expect(AmenityCategory.UNIT as string).toBe('unit');
            expect(AmenityCategory.PROPERTY as string).toBe('property');
            expect(AmenityCategory.COMMUNITY as string).toBe('community');
            expect(Object.keys(AmenityCategory).length).toBe(3);
        });

        it('WebsiteStatus should have correct values', () => {
            expect(WebsiteStatus.ACTIVE as string).toBe('active');
            expect(WebsiteStatus.INACTIVE as string).toBe('inactive');
            expect(WebsiteStatus.PENDING as string).toBe('pending');
            expect(WebsiteStatus.ERROR as string).toBe('error');
            expect(Object.keys(WebsiteStatus).length).toBe(4);
        });

        it('DayOfWeek should have correct values', () => {
            expect(DayOfWeek.MONDAY as string).toBe('monday');
            expect(DayOfWeek.TUESDAY as string).toBe('tuesday');
            expect(DayOfWeek.WEDNESDAY as string).toBe('wednesday');
            expect(DayOfWeek.THURSDAY as string).toBe('thursday');
            expect(DayOfWeek.FRIDAY as string).toBe('friday');
            expect(DayOfWeek.SATURDAY as string).toBe('saturday');
            expect(DayOfWeek.SUNDAY as string).toBe('sunday');
            expect(Object.keys(DayOfWeek).length).toBe(7);
        });
    });

    describe('Complex Nested Structures', () => {
        describe('RentSpecial', () => {
            it('should accept valid RentSpecial data', () => {
                const validSpecial: RentSpecial = {
                    title: 'Summer Special',
                    startDate: '2024-06-01',
                    endDate: '2024-08-31',
                    description: '$500 off first month'
                };
                expect(validSpecial.title).toBe('Summer Special');
                expect(validSpecial.startDate).toBe('2024-06-01');
                expect(validSpecial.endDate).toBe('2024-08-31');
                expect(validSpecial.description).toBe('$500 off first month');
            });

            it('should accept RentSpecial without dates', () => {
                const specialWithoutDates: RentSpecial = {
                    title: 'Move-in Special',
                    description: 'Free application fee'
                };
                expect(specialWithoutDates.startDate).toBeUndefined();
                expect(specialWithoutDates.endDate).toBeUndefined();
            });
        });

        describe('IncomeRestriction', () => {
            it('should accept valid IncomeRestriction data', () => {
                const restriction: IncomeRestriction = {
                    amiLimit: 80,
                    maxIncomeByHouseholdSize: {
                        '1': 50000,
                        '2': 57000,
                        '3': 64000,
                        '4': 71000
                    }
                };
                expect(restriction.amiLimit).toBe(80);
                expect(restriction.maxIncomeByHouseholdSize[1]).toBe(50000);
                expect(restriction.maxIncomeByHouseholdSize[4]).toBe(71000);
            });

            it('should accept IncomeRestriction without amiLimit', () => {
                const restriction: IncomeRestriction = {
                    maxIncomeByHouseholdSize: { '1': 50000 }
                };
                expect(restriction.amiLimit).toBeUndefined();
            });
        });

        describe('Fee', () => {
            it('should accept valid Fee data', () => {
                const fee: Fee = {
                    type: FeeType.APPLICATION,
                    amount: 50,
                    description: 'Non-refundable application fee',
                    refundable: false
                };
                expect(fee.type as string).toBe(FeeType.APPLICATION);
                expect(fee.amount).toBe(50);
                expect(fee.description).toBe('Non-refundable application fee');
                expect(fee.refundable).toBe(false);
            });

            it('should accept Fee with minimal data', () => {
                const fee: Fee = {
                    type: FeeType.PARKING,
                    amount: 100
                };
                expect(fee.description).toBeUndefined();
                expect(fee.refundable).toBeUndefined();
            });
        });

        describe('PetPolicy', () => {
            it('should accept comprehensive PetPolicy', () => {
                const policy: PetPolicy = {
                    allowed: true,
                    types: [PetType.DOG, PetType.CAT],
                    maxCount: 2,
                    weightLimit: 50,
                    breedRestrictions: ['Pit Bull', 'Rottweiler'],
                    deposit: 500,
                    monthlyFee: 50,
                    oneTimeFee: 200,
                    notes: 'Service animals exempt'
                };
                expect(policy.allowed).toBe(true);
                expect(policy.types).toContain(PetType.DOG);
                expect(policy.types).toContain(PetType.CAT);
                expect(policy.maxCount).toBe(2);
                expect(policy.weightLimit).toBe(50);
                expect(policy.breedRestrictions).toHaveLength(2);
            });

            it('should accept minimal PetPolicy for no pets', () => {
                const policy: PetPolicy = {
                    allowed: false
                };
                expect(policy.types).toBeUndefined();
                expect(policy.deposit).toBeUndefined();
            });
        });

        describe('ParkingOption', () => {
            it('should accept valid ParkingOption data', () => {
                const parking: ParkingOption = {
                    type: ParkingType.GARAGE,
                    included: false,
                    fee: 150,
                    spaces: 1,
                    description: 'Secure underground parking'
                };
                expect(parking.type as string).toBe(ParkingType.GARAGE);
                expect(parking.included).toBe(false);
                expect(parking.fee).toBe(150);
            });

            it('should accept included parking without fee', () => {
                const parking: ParkingOption = {
                    type: ParkingType.UNCOVERED,
                    included: true
                };
                expect(parking.fee).toBeUndefined();
            });
        });

        describe('StorageOption', () => {
            it('should accept valid StorageOption data', () => {
                const storage: StorageOption = {
                    type: StorageType.EXTERNAL_UNIT,
                    included: false,
                    fee: 50,
                    dimensions: '5x10',
                    description: 'Climate controlled'
                };
                expect(storage.type as string).toBe(StorageType.EXTERNAL_UNIT);
                expect(storage.dimensions).toBe('5x10');
            });
        });

        describe('ScreeningCriteria', () => {
            it('should accept comprehensive ScreeningCriteria', () => {
                const criteria: ScreeningCriteria = {
                    incomeRatio: 3,
                    minCreditScore: 650,
                    maxOccupantsPerBedroom: 2,
                    backgroundCheckRequired: true,
                    evictionHistory: true,
                    criminalHistory: true,
                    references: 3,
                    employmentVerification: true,
                    rentalHistory: true,
                    notes: 'Case-by-case basis for students'
                };
                expect(criteria.incomeRatio).toBe(3);
                expect(criteria.minCreditScore).toBe(650);
                expect(criteria.backgroundCheckRequired).toBe(true);
            });

            it('should accept partial ScreeningCriteria', () => {
                const criteria: ScreeningCriteria = {
                    minCreditScore: 600
                };
                expect(criteria.incomeRatio).toBeUndefined();
                expect(criteria.references).toBeUndefined();
            });
        });

        describe('ContactInfo', () => {
            it('should accept valid ContactInfo with office hours', () => {
                const contact: ContactInfo = {
                    name: 'Leasing Office',
                    phone: '555-1234',
                    email: 'leasing@example.com',
                    website: 'https://example.com',
                    officeHours: {
                        [DayOfWeek.MONDAY]: { open: '09:00', close: '18:00' },
                        [DayOfWeek.TUESDAY]: { open: '09:00', close: '18:00' },
                        [DayOfWeek.SATURDAY]: { open: '10:00', close: '16:00' }
                    }
                };
                expect(contact.officeHours?.[DayOfWeek.MONDAY]?.open).toBe('09:00');
                expect(contact.officeHours?.[DayOfWeek.SUNDAY]).toBeUndefined();
            });
        });

        describe('TourAvailability', () => {
            it('should accept valid TourAvailability data', () => {
                const tours: TourAvailability = {
                    selfGuidedTours: true,
                    virtualTours: true,
                    inPersonTours: true,
                    tourSchedulingUrl: 'https://tours.example.com',
                    tourHours: {
                        [DayOfWeek.MONDAY]: { open: '09:00', close: '17:00' }
                    }
                };
                expect(tours.selfGuidedTours).toBe(true);
                expect(tours.tourSchedulingUrl).toBe('https://tours.example.com');
            });
        });

        describe('Amenity', () => {
            it('should accept valid Amenity data', () => {
                const amenity: Amenity = {
                    name: 'In-unit washer/dryer',
                    category: AmenityCategory.UNIT,
                    description: 'Full-size washer and dryer included'
                };
                expect(amenity.name).toBe('In-unit washer/dryer');
                expect(amenity.category as string).toBe(AmenityCategory.UNIT);
            });

            it('should accept Amenity without description', () => {
                const amenity: Amenity = {
                    name: 'Pool',
                    category: AmenityCategory.PROPERTY
                };
                expect(amenity.description).toBeUndefined();
            });
        });
    });

    describe('Main Data Interfaces', () => {
        describe('BuildingData', () => {
            it('should accept complete BuildingData', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    street: '123 Main St',
                    city: 'Seattle',
                    state: 'WA',
                    zip: '98101',
                    description: 'Modern apartment complex',
                    yearBuilt: 2020,
                    numberStories: 5,
                    totalUnits: 50,
                    propertyType: PropertyType.APARTMENT,
                    roomsForRent: false,
                    photos: ['https://s3.example.com/photo1.jpg'],
                    leaseLength: 12,
                    shortTermLeaseAllowed: false,
                    propertyLicenseNumber: 'LIC-12345',
                    specialtyType: 'senior',
                    specialtySubType: '55+',
                    propertyDescription: 'Luxury senior living',
                    rentSpecials: [{
                        title: 'Move-in Special',
                        description: '$500 off first month'
                    }],
                    incomeRestrictions: {
                        amiLimit: 80,
                        maxIncomeByHouseholdSize: { '1': 50000 }
                    },
                    utilitiesIncluded: {
                        [UtilityType.WATER]: true,
                        [UtilityType.TRASH]: true
                    },
                    oneTimeFees: [{
                        type: FeeType.APPLICATION,
                        amount: 50
                    }],
                    monthlyFees: [{
                        type: FeeType.PARKING,
                        amount: 100
                    }],
                    parkingOptions: [{
                        type: ParkingType.GARAGE,
                        included: false,
                        fee: 100
                    }],
                    petPolicies: {
                        allowed: true,
                        types: [PetType.CAT, PetType.DOG]
                    },
                    storageOptions: [{
                        type: StorageType.CLOSET,
                        included: true
                    }],
                    propertyAmenities: [{
                        name: 'Fitness Center',
                        category: AmenityCategory.PROPERTY
                    }],
                    screeningCriteria: {
                        minCreditScore: 650
                    },
                    contactInfo: {
                        phone: '555-1234'
                    },
                    tourAvailability: {
                        virtualTours: true
                    },
                    applicationFee: 50,
                    acceptsOnlineApplications: true
                };
                expect(building.buildingID).toBe('bldg-123');
                expect(building.propertyType as string).toBe(PropertyType.APARTMENT);
                expect(building.rentSpecials).toHaveLength(1);
            });

            it('should accept minimal BuildingData with only required fields', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-456'
                };
                expect(building.buildingID).toBe('bldg-456');
                expect(building.street).toBeUndefined();
                expect(building.photos).toBeUndefined();
            });

            it('should handle empty arrays in BuildingData', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-789',
                    photos: [],
                    rentSpecials: [],
                    oneTimeFees: [],
                    monthlyFees: [],
                    parkingOptions: [],
                    storageOptions: [],
                    propertyAmenities: []
                };
                expect(building.photos).toHaveLength(0);
                expect(building.rentSpecials).toHaveLength(0);
            });
        });

        describe('UnitTypeData', () => {
            it('should accept complete UnitTypeData', () => {
                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-1',
                    modelName: '2BR Deluxe',
                    countAvailable: 5,
                    dateAvailable: '2024-03-01',
                    beds: 2,
                    baths: 2,
                    maxOccupants: 4,
                    minRent: 1500,
                    maxRent: 1800,
                    perPersonRent: 450,
                    minSqft: 900,
                    maxSqft: 1100,
                    deposit: 1500,
                    minLeaseTerm: 6,
                    maxLeaseTerm: 12,
                    modelAmenities: [{
                        name: 'Balcony',
                        category: AmenityCategory.UNIT
                    }]
                };
                expect(unitType.modelID).toBe('model-1');
                expect(unitType.beds).toBe(2);
                expect(unitType.modelAmenities).toHaveLength(1);
            });

            it('should accept minimal UnitTypeData with required fields', () => {
                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-2',
                    modelName: 'Studio',
                    beds: 0,
                    baths: 1
                };
                expect(unitType.minRent).toBeUndefined();
                expect(unitType.modelAmenities).toBeUndefined();
            });
        });

        describe('UnitData', () => {
            it('should accept complete UnitData', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-456',
                    description: 'Corner unit with view',
                    beds: 2,
                    baths: 2,
                    sqft: 1050,
                    rent: 1650,
                    occupied: false,
                    availableDate: '2024-03-15',
                    modelID: 'model-1',
                    unitNumber: '2A',
                    maxOccupants: 4,
                    perPersonRent: 412.50,
                    deposit: 1650,
                    minLeaseTerm: 12,
                    maxLeaseTerm: 24,
                    unitDescription: 'Beautiful corner unit',
                    unitRentSpecial: {
                        title: 'Unit Special',
                        description: 'Free parking'
                    },
                    unitAmenities: [{
                        name: 'City View',
                        category: AmenityCategory.UNIT
                    }],
                    photos: ['https://s3.example.com/unit456.jpg'],
                    websiteStatus: {
                        'apartments.com': WebsiteStatus.ACTIVE,
                        zillow: WebsiteStatus.PENDING
                    },
                    listingIds: {
                        'apartments.com': 'APT-123456',
                        zillow: 'ZIL-789012'
                    }
                };
                expect(unit.unitID).toBe('unit-456');
                expect(unit.websiteStatus?.['apartments.com'] as string).toBe(WebsiteStatus.ACTIVE);
                expect(unit.listingIds?.zillow).toBe('ZIL-789012');
            });

            it('should accept minimal UnitData with required fields', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-789'
                };
                expect(unit.buildingID).toBe('bldg-123');
                expect(unit.unitID).toBe('unit-789');
                expect(unit.occupied).toBeUndefined();
            });

            it('should handle partial websiteStatus and listingIds', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-999',
                    websiteStatus: {},
                    listingIds: {}
                };
                expect(unit.websiteStatus).toEqual({});
                expect(unit.listingIds).toEqual({});
            });
        });

        describe('Extended Interfaces', () => {
            it('Unit should extend UnitData', () => {
                const unit: Unit = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    originalUnit: {
                        buildingID: 'bldg-123',
                        unitID: 'unit-123'
                    },
                    apiURL: '/api/units/unit-123'
                };
                expect(unit.originalUnit).toBeDefined();
                expect(unit.apiURL).toBe('/api/units/unit-123');
            });

            it('Building should extend BuildingData', () => {
                const building: Building = {
                    buildingID: 'bldg-123',
                    street: '123 Main St'
                };
                expect(building.buildingID).toBe('bldg-123');
            });

            it('UnitType should extend UnitTypeData', () => {
                const unitType: UnitType = {
                    buildingID: 'bldg-123',
                    modelID: 'model-1',
                    modelName: '2BR',
                    beds: 2,
                    baths: 2
                };
                expect(unitType.modelID).toBe('model-1');
            });
        });
    });

    describe('DynamoDB Entity Types', () => {
        describe('DynamoDBItem', () => {
            it('should accept valid DynamoDBItem', () => {
                const item: DynamoDBItem = {
                    partitionKey: 'bldg-123',
                    sortKey: 'BUILDING',
                    entityType: 'building',
                    gsi1pk: 'MODEL#model-1',
                    gsi1sk: 'bldg-123'
                };
                expect(item.entityType).toBe('building');
                expect(item.gsi1pk).toBe('MODEL#model-1');
            });

            it('should accept DynamoDBItem without GSI keys', () => {
                const item: DynamoDBItem = {
                    partitionKey: 'bldg-123',
                    sortKey: 'BUILDING',
                    entityType: 'unit'
                };
                expect(item.gsi1pk).toBeUndefined();
                expect(item.gsi1sk).toBeUndefined();
            });
        });

        describe('BuildingDynamoDBItem', () => {
            it('should have proper structure for building entity', () => {
                const buildingItem: BuildingDynamoDBItem = {
                    buildingID: 'bldg-123',
                    street: '123 Main St',
                    entityType: 'building',
                    partitionKey: 'bldg-123',
                    sortKey: 'BUILDING'
                };
                expect(buildingItem.entityType).toBe('building');
                expect(buildingItem.partitionKey).toBe(buildingItem.buildingID);
                expect(buildingItem.sortKey).toBe('BUILDING');
            });
        });

        describe('UnitDynamoDBItem', () => {
            it('should have proper structure for unit entity', () => {
                const unitItem: UnitDynamoDBItem = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-456',
                    beds: 2,
                    entityType: 'unit',
                    partitionKey: 'bldg-123',
                    sortKey: 'UNIT#unit-456'
                };
                expect(unitItem.entityType).toBe('unit');
                expect(unitItem.partitionKey).toBe(unitItem.buildingID);
                expect(unitItem.sortKey).toBe('UNIT#unit-456');
            });
        });

        describe('UnitTypeDynamoDBItem', () => {
            it('should have proper structure for unitType entity with GSI', () => {
                const unitTypeItem: UnitTypeDynamoDBItem = {
                    buildingID: 'bldg-123',
                    modelID: 'model-1',
                    modelName: '2BR',
                    beds: 2,
                    baths: 2,
                    entityType: 'unitType',
                    partitionKey: 'bldg-123',
                    sortKey: 'MODEL#model-1',
                    gsi1pk: 'MODEL#model-1',
                    gsi1sk: 'bldg-123'
                };
                expect(unitTypeItem.entityType).toBe('unitType');
                expect(unitTypeItem.sortKey).toBe('MODEL#model-1');
                expect(unitTypeItem.gsi1pk).toBe('MODEL#model-1');
                expect(unitTypeItem.gsi1sk).toBe(unitTypeItem.buildingID);
            });
        });
    });

    describe('Partial Types for Updates', () => {
        it('PartialBuildingData should exclude buildingID', () => {
            const partialBuilding: PartialBuildingData = {
                street: '456 New St',
                city: 'Portland',
                // @ts-expect-error - buildingID should not be allowed
                buildingID: 'should-not-be-allowed'
            };
            expect(partialBuilding.street).toBe('456 New St');
        });

        it('PartialUnitData should exclude buildingID and unitID', () => {
            const partialUnit: PartialUnitData = {
                rent: 1500,
                occupied: true
            };
            expect(partialUnit.rent).toBe(1500);

            // Verify that buildingID and unitID are not part of the type
            // The following would cause TypeScript errors if uncommented:
            // partialUnit.buildingID = 'should-not-be-allowed';
            // partialUnit.unitID = 'should-not-be-allowed';
        });

        it('PartialUnitTypeData should exclude buildingID and modelID', () => {
            const partialUnitType: PartialUnitTypeData = {
                minRent: 1200,
                maxRent: 1400
            };
            expect(partialUnitType.minRent).toBe(1200);

            // Verify that buildingID and modelID are not part of the type
            // The following would cause TypeScript errors if uncommented:
            // partialUnitType.buildingID = 'should-not-be-allowed';
            // partialUnitType.modelID = 'should-not-be-allowed';
        });
    });

    describe('Default Value Generators', () => {
        describe('getDefaultBuildingData', () => {
            it('should return sensible defaults for BuildingData', () => {
                const defaults = getDefaultBuildingData();

                expect(defaults.propertyType as string).toBe(PropertyType.APARTMENT);
                expect(defaults.roomsForRent).toBe(false);
                expect(defaults.shortTermLeaseAllowed).toBe(false);
                expect(defaults.leaseLength).toBe(12);
                expect(defaults.acceptsOnlineApplications).toBe(true);
                expect(defaults.photos).toEqual([]);
                expect(defaults.rentSpecials).toEqual([]);
                expect(defaults.oneTimeFees).toEqual([]);
                expect(defaults.monthlyFees).toEqual([]);
                expect(defaults.parkingOptions).toEqual([]);
                expect(defaults.storageOptions).toEqual([]);
                expect(defaults.propertyAmenities).toEqual([]);
            });

            it('should have all utilities set to false by default', () => {
                const defaults = getDefaultBuildingData();
                const utilities = defaults.utilitiesIncluded!;

                expect(utilities[UtilityType.WATER]).toBe(false);
                expect(utilities[UtilityType.SEWER]).toBe(false);
                expect(utilities[UtilityType.TRASH]).toBe(false);
                expect(utilities[UtilityType.GAS]).toBe(false);
                expect(utilities[UtilityType.ELECTRICITY]).toBe(false);
                expect(utilities[UtilityType.CABLE]).toBe(false);
                expect(utilities[UtilityType.INTERNET]).toBe(false);
                expect(utilities[UtilityType.HEAT]).toBe(false);
                expect(utilities[UtilityType.AIR_CONDITIONING]).toBe(false);
            });

            it('should have default pet policy as not allowed', () => {
                const defaults = getDefaultBuildingData();
                expect(defaults.petPolicies).toEqual({ allowed: false });
            });

            it('should have comprehensive default screening criteria', () => {
                const defaults = getDefaultBuildingData();
                const criteria = defaults.screeningCriteria!;

                expect(criteria.incomeRatio).toBe(3);
                expect(criteria.minCreditScore).toBe(600);
                expect(criteria.maxOccupantsPerBedroom).toBe(2);
                expect(criteria.backgroundCheckRequired).toBe(true);
                expect(criteria.evictionHistory).toBe(true);
                expect(criteria.criminalHistory).toBe(true);
                expect(criteria.references).toBe(2);
                expect(criteria.employmentVerification).toBe(true);
                expect(criteria.rentalHistory).toBe(true);
            });
        });

        describe('getDefaultUnitData', () => {
            it('should return sensible defaults for UnitData', () => {
                const defaults = getDefaultUnitData();

                expect(defaults.occupied).toBe(false);
                expect(defaults.minLeaseTerm).toBe(12);
                expect(defaults.maxLeaseTerm).toBe(12);
                expect(defaults.photos).toEqual([]);
                expect(defaults.websiteStatus).toEqual({});
                expect(defaults.listingIds).toEqual({});
            });
        });

        describe('getDefaultUnitTypeData', () => {
            it('should return sensible defaults for UnitTypeData', () => {
                const defaults = getDefaultUnitTypeData();

                expect(defaults.countAvailable).toBe(0);
                expect(defaults.minLeaseTerm).toBe(12);
                expect(defaults.maxLeaseTerm).toBe(12);
                expect(defaults.modelAmenities).toEqual([]);
            });
        });
    });

    describe('Edge Cases and Boundary Conditions', () => {
        it('should handle zero values appropriately', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                beds: 0, // Studio
                baths: 0, // Should probably be at least 1, but testing edge case
                sqft: 0, // Invalid but testing
                rent: 0, // Free rent special?
                deposit: 0 // No deposit special
            };
            expect(unit.beds).toBe(0);
            expect(unit.rent).toBe(0);
        });

        it('should handle negative values in numeric fields', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                yearBuilt: -1, // Invalid but testing
                numberStories: -5, // Invalid but testing
                totalUnits: -10 // Invalid but testing
            };
            expect(building.yearBuilt).toBe(-1);
        });

        it('should handle very large numbers', () => {
            const restriction: IncomeRestriction = {
                maxIncomeByHouseholdSize: {
                    '1': Number.MAX_SAFE_INTEGER,
                    '10': 999999999
                }
            };
            expect(restriction.maxIncomeByHouseholdSize[1]).toBe(Number.MAX_SAFE_INTEGER);
        });

        it('should handle empty strings', () => {
            const building: BuildingData = {
                buildingID: '', // Should probably not be empty but testing
                street: '',
                city: '',
                state: '',
                zip: '',
                description: ''
            };
            expect(building.buildingID).toBe('');
            expect(building.street).toBe('');
        });

        it('should handle null/undefined in optional Record fields', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                websiteStatus: undefined,
                listingIds: undefined
            };
            expect(unit.websiteStatus).toBeUndefined();
            expect(unit.listingIds).toBeUndefined();
        });

        it('should handle ISO date strings', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-123',
                availableDate: '2024-12-31T23:59:59.999Z'
            };
            expect(unit.availableDate).toBe('2024-12-31T23:59:59.999Z');
        });

        it('should handle complex nested empty structures', () => {
            const building: BuildingData = {
                buildingID: 'bldg-123',
                rentSpecials: [],
                incomeRestrictions: {
                    maxIncomeByHouseholdSize: {}
                },
                utilitiesIncluded: {},
                petPolicies: {
                    allowed: true,
                    types: [],
                    breedRestrictions: []
                },
                contactInfo: {
                    officeHours: {}
                },
                tourAvailability: {
                    tourHours: {}
                }
            };
            expect(building.incomeRestrictions?.maxIncomeByHouseholdSize).toEqual({});
            expect(building.petPolicies?.types).toEqual([]);
        });

        it('should handle maximum array lengths', () => {
            const manyAmenities: Amenity[] = Array(1000).fill(null).map((_, i) => ({
                name: `Amenity ${i}`,
                category: AmenityCategory.UNIT
            }));

            const unitType: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-1',
                modelName: 'Test',
                beds: 1,
                baths: 1,
                modelAmenities: manyAmenities
            };

            expect(unitType.modelAmenities).toHaveLength(1000);
        });
    });
});
