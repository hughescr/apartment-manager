import { describe, it, expect } from 'bun:test';
import _ from 'lodash';
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
            expect(_.keys(PropertyType).length).toBe(5);
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
            expect(_.keys(UtilityType).length).toBe(9);
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
            expect(_.keys(FeeType).length).toBe(10);
        });

        it('PetType should have correct values', () => {
            expect(PetType.DOG as string).toBe('dog');
            expect(PetType.CAT as string).toBe('cat');
            expect(PetType.BIRD as string).toBe('bird');
            expect(PetType.FISH as string).toBe('fish');
            expect(PetType.SMALL_ANIMAL as string).toBe('small-animal');
            expect(PetType.NO_PETS as string).toBe('no-pets');
            expect(_.keys(PetType).length).toBe(6);
        });

        it('ParkingType should have correct values', () => {
            expect(ParkingType.GARAGE as string).toBe('garage');
            expect(ParkingType.COVERED as string).toBe('covered');
            expect(ParkingType.UNCOVERED as string).toBe('uncovered');
            expect(ParkingType.STREET as string).toBe('street');
            expect(ParkingType.NONE as string).toBe('none');
            expect(_.keys(ParkingType).length).toBe(5);
        });

        it('StorageType should have correct values', () => {
            expect(StorageType.CLOSET as string).toBe('closet');
            expect(StorageType.BASEMENT as string).toBe('basement');
            expect(StorageType.GARAGE as string).toBe('garage');
            expect(StorageType.EXTERNAL_UNIT as string).toBe('external-unit');
            expect(StorageType.NONE as string).toBe('none');
            expect(_.keys(StorageType).length).toBe(5);
        });

        it('AmenityCategory should have correct values', () => {
            expect(AmenityCategory.UNIT as string).toBe('unit');
            expect(AmenityCategory.PROPERTY as string).toBe('property');
            expect(AmenityCategory.COMMUNITY as string).toBe('community');
            expect(_.keys(AmenityCategory).length).toBe(3);
        });

        it('WebsiteStatus should have correct values', () => {
            expect(WebsiteStatus.ACTIVE as string).toBe('active');
            expect(WebsiteStatus.INACTIVE as string).toBe('inactive');
            expect(WebsiteStatus.PENDING as string).toBe('pending');
            expect(WebsiteStatus.ERROR as string).toBe('error');
            expect(_.keys(WebsiteStatus).length).toBe(4);
        });

        it('DayOfWeek should have correct values', () => {
            expect(DayOfWeek.MONDAY as string).toBe('monday');
            expect(DayOfWeek.TUESDAY as string).toBe('tuesday');
            expect(DayOfWeek.WEDNESDAY as string).toBe('wednesday');
            expect(DayOfWeek.THURSDAY as string).toBe('thursday');
            expect(DayOfWeek.FRIDAY as string).toBe('friday');
            expect(DayOfWeek.SATURDAY as string).toBe('saturday');
            expect(DayOfWeek.SUNDAY as string).toBe('sunday');
            expect(_.keys(DayOfWeek).length).toBe(7);
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

    describe('Enum Edge Cases', () => {
        describe('Empty and Null Enum Values', () => {
            it('should accept null/undefined enum values in optional fields', () => {
                const fee: Fee = {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: null enum value
                    type: null as any, // Type system allows this with 'as any'
                    amount: 100
                };
                expect(fee.type).toBeNull();

                const fee2: Fee = {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: undefined enum value
                    type: undefined as any,
                    amount: 100
                };
                expect(fee2.type).toBeUndefined();
            });

            it('should handle undefined enum values in arrays', () => {
                const policy: PetPolicy = {
                    allowed: true,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: null/undefined in enum array
                    types: [PetType.DOG, undefined as any, PetType.CAT, null as any]
                };
                expect(policy.types).toContain(undefined);
                expect(policy.types).toContain(null);
                expect(policy.types).toHaveLength(4);
            });
        });

        describe('Invalid Enum Assignments', () => {
            it('should accept non-enum string values with type assertion', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    propertyType: 'invalid-type' as PropertyType
                };
                expect(building.propertyType).toBe('invalid-type');

                const building2: BuildingData = {
                    buildingID: 'bldg-456',
                    propertyType: 'APARTMENT' as PropertyType // Wrong case
                };
                expect(building2.propertyType).toBe('APARTMENT');
            });

            it('should accept numeric values as enum with type assertion', () => {
                const amenity: Amenity = {
                    name: 'Test',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: numeric value as enum
                    category: 123 as any as AmenityCategory
                };
                expect(amenity.category).toBe(123);

                const amenity2: Amenity = {
                    name: 'Test2',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: boolean value as enum
                    category: true as any as AmenityCategory
                };
                expect(amenity2.category).toBe(true);
            });

            it('should accept object types as enum values', () => {
                const parking: ParkingOption = {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: object as enum value
                    type: { invalid: 'object' } as any as ParkingType,
                    included: true
                };
                expect(typeof parking.type).toBe('object');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing property on object-typed enum
                expect((parking.type as any).invalid).toBe('object');
            });
        });

        describe('Enum Array Edge Cases', () => {
            it('should accept empty arrays for enum array fields', () => {
                const policy: PetPolicy = {
                    allowed: true,
                    types: []
                };
                expect(policy.types).toEqual([]);
                expect(policy.types).toHaveLength(0);
            });

            it('should accept arrays with invalid enum values', () => {
                const policy: PetPolicy = {
                    allowed: true,
                    types: ['invalid-pet' as PetType, '' as PetType, '   ' as PetType]
                };
                expect(policy.types).toContain('invalid-pet');
                expect(policy.types).toContain('');
                expect(policy.types).toContain('   ');
            });

            it('should accept mixed valid and invalid enum values', () => {
                const policy: PetPolicy = {
                    allowed: true,
                    types: [
                        PetType.DOG,
                        'not-a-pet' as PetType,
                        PetType.CAT,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: numeric in enum array
                        123 as any,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: null in enum array
                        null as any,
                        PetType.BIRD
                    ]
                };
                expect(policy.types).toHaveLength(6);
                expect(policy.types![0]).toBe(PetType.DOG);
                expect(policy.types![1]).toBe('not-a-pet');
                expect(policy.types![3]).toBe(123);
            });

            it('should accept very large enum arrays', () => {
                const manyTypes = _.fill(Array(10000), PetType.DOG);
                const policy: PetPolicy = {
                    allowed: true,
                    types: manyTypes
                };
                expect(policy.types).toHaveLength(10000);
            });
        });

        describe('Case Sensitivity in Enum Values', () => {
            it('should accept wrong-case enum values with type assertion', () => {
                const status: Record<string, WebsiteStatus> = {
                    site1: 'ACTIVE' as WebsiteStatus, // Should be lowercase
                    site2: 'Active' as WebsiteStatus, // Mixed case
                    site3: 'AcTiVe' as WebsiteStatus, // Random case
                    site4: WebsiteStatus.ACTIVE // Correct
                };
                expect(status.site1).toBe('ACTIVE');
                expect(status.site2).toBe('Active');
                expect(status.site3).toBe('AcTiVe');
                expect(status.site4).toBe('active');
            });

            it('should handle case variations in day names', () => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing flexible key types for office hours
                const hours: Record<string, any> = {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: uppercase day name
                    ['MONDAY' as any]: { open: '09:00', close: '17:00' },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: mixed case day name
                    ['Monday' as any]: { open: '10:00', close: '18:00' },
                    ['monday']: { open: '11:00', close: '19:00' },
                    [DayOfWeek.MONDAY]: { open: '12:00', close: '20:00' }
                };
                expect(hours.MONDAY).toBeDefined();
                expect(hours.Monday).toBeDefined();
                expect(hours.monday).toBeDefined();
                expect(hours[DayOfWeek.MONDAY]).toBeDefined();
            });
        });

        describe('Whitespace in Enum Values', () => {
            it('should accept enum values with leading/trailing whitespace', () => {
                const fee: Fee = {
                    type: '  application  ' as FeeType,
                    amount: 50
                };
                expect(fee.type).toBe('  application  ');

                const fee2: Fee = {
                    type: '\tapplication\n' as FeeType,
                    amount: 50
                };
                expect(fee2.type).toBe('\tapplication\n');
            });

            it('should accept enum values with internal spaces', () => {
                const storage: StorageOption = {
                    type: 'external unit' as StorageType, // Missing hyphen
                    included: true
                };
                expect(storage.type).toBe('external unit');

                const property: BuildingData = {
                    buildingID: 'bldg-123',
                    propertyType: 'single family' as PropertyType // Missing hyphen
                };
                expect(property.propertyType).toBe('single family');
            });
        });

        describe('Special Characters in Enum Strings', () => {
            it('should accept enum values with special characters', () => {
                const utility: Record<string, boolean> = {
                    ['water!@#$' as UtilityType]: true,
                    ['<script>alert("xss")</script>' as UtilityType]: false,
                    ['water\u0000' as UtilityType]: true, // Null character
                    ['💧' as UtilityType]: true // Emoji
                };
                expect(utility['water!@#$']).toBe(true);
                expect(utility['<script>alert("xss")</script>']).toBe(false);
                expect(utility['💧']).toBe(true);
            });

            it('should handle SQL injection attempts in enum values', () => {
                const fee: Fee = {
                    type: "'; DROP TABLE fees; --" as FeeType,
                    amount: 100
                };
                expect(fee.type).toBe("'; DROP TABLE fees; --");
            });

            it('should handle very long enum string values', () => {
                const longString = _.repeat('a', 10000);
                const amenity: Amenity = {
                    name: 'Test',
                    category: longString as AmenityCategory
                };
                expect(amenity.category).toHaveLength(10000);
            });
        });

        describe('Enum Type Coercion', () => {
            it('should show what happens with enum concatenation', () => {
                const combined = (PropertyType.APARTMENT as string) + (PropertyType.CONDO as string);
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    propertyType: combined as PropertyType
                };
                expect(building.propertyType).toBe('apartmentcondo');
            });

            it('should handle enum values that look like other types', () => {
                const parking: ParkingOption = {
                    type: 'true' as ParkingType, // String that looks like boolean
                    included: true
                };
                expect(parking.type).toBe('true');

                const parking2: ParkingOption = {
                    type: '123' as ParkingType, // String that looks like number
                    included: false
                };
                expect(parking2.type).toBe('123');

                const parking3: ParkingOption = {
                    type: 'null' as ParkingType, // String that looks like null
                    included: true
                };
                expect(parking3.type).toBe('null');
            });
        });
    });

    describe('Date and Time Edge Cases', () => {
        describe('Malformed ISO Dates', () => {
            it('should accept completely invalid date strings', () => {
                const special: RentSpecial = {
                    title: 'Invalid Dates',
                    startDate: 'not-a-date',
                    endDate: 'definitely not a date either'
                };
                expect(special.startDate).toBe('not-a-date');
                expect(special.endDate).toBe('definitely not a date either');
            });

            it('should accept dates with invalid months and days', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    availableDate: '2024-13-32' // Month 13, Day 32
                };
                expect(unit.availableDate).toBe('2024-13-32');

                const unit2: UnitData = {
                    buildingID: 'bldg-456',
                    unitID: 'unit-456',
                    availableDate: '2024-00-00' // Month 0, Day 0
                };
                expect(unit2.availableDate).toBe('2024-00-00');
            });

            it('should accept dates with wrong separators', () => {
                const special: RentSpecial = {
                    title: 'Wrong Separators',
                    startDate: '2024/12/31', // Slashes instead of hyphens
                    endDate: '2024.12.31' // Dots instead of hyphens
                };
                expect(special.startDate).toBe('2024/12/31');
                expect(special.endDate).toBe('2024.12.31');
            });

            it('should accept dates with missing components', () => {
                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-1',
                    modelName: 'Test',
                    beds: 1,
                    baths: 1,
                    dateAvailable: '2024-12' // Missing day
                };
                expect(unitType.dateAvailable).toBe('2024-12');

                const unitType2: UnitTypeData = {
                    buildingID: 'bldg-456',
                    modelID: 'model-2',
                    modelName: 'Test2',
                    beds: 2,
                    baths: 1,
                    dateAvailable: '2024' // Only year
                };
                expect(unitType2.dateAvailable).toBe('2024');
            });

            it('should accept dates with extra components', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    availableDate: '2024-12-31-01' // Extra component
                };
                expect(unit.availableDate).toBe('2024-12-31-01');
            });
        });

        describe('Timezone Handling in Dates', () => {
            it('should accept dates with various timezone formats', () => {
                const unit1: UnitData = {
                    buildingID: 'bldg-1',
                    unitID: 'unit-1',
                    availableDate: '2024-12-31T23:59:59Z' // UTC
                };
                expect(unit1.availableDate).toBe('2024-12-31T23:59:59Z');

                const unit2: UnitData = {
                    buildingID: 'bldg-2',
                    unitID: 'unit-2',
                    availableDate: '2024-12-31T23:59:59+00:00' // UTC with offset
                };
                expect(unit2.availableDate).toBe('2024-12-31T23:59:59+00:00');

                const unit3: UnitData = {
                    buildingID: 'bldg-3',
                    unitID: 'unit-3',
                    availableDate: '2024-12-31T23:59:59-08:00' // PST
                };
                expect(unit3.availableDate).toBe('2024-12-31T23:59:59-08:00');

                const unit4: UnitData = {
                    buildingID: 'bldg-4',
                    unitID: 'unit-4',
                    availableDate: '2024-12-31T23:59:59.999Z' // With milliseconds
                };
                expect(unit4.availableDate).toBe('2024-12-31T23:59:59.999Z');
            });

            it('should accept invalid timezone offsets', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    availableDate: '2024-12-31T23:59:59+25:00' // Invalid offset
                };
                expect(unit.availableDate).toBe('2024-12-31T23:59:59+25:00');

                const unit2: UnitData = {
                    buildingID: 'bldg-456',
                    unitID: 'unit-456',
                    availableDate: '2024-12-31T23:59:59-99:99' // Invalid offset
                };
                expect(unit2.availableDate).toBe('2024-12-31T23:59:59-99:99');
            });
        });

        describe('Invalid Time Formats in Office Hours', () => {
            it('should accept hours outside 0-23 range', () => {
                const contact: ContactInfo = {
                    officeHours: {
                        [DayOfWeek.MONDAY]: { open: '25:00', close: '30:00' },
                        [DayOfWeek.TUESDAY]: { open: '-5:00', close: '99:00' }
                    }
                };
                expect(contact.officeHours![DayOfWeek.MONDAY].open).toBe('25:00');
                expect(contact.officeHours![DayOfWeek.TUESDAY].open).toBe('-5:00');
            });

            it('should accept minutes outside 0-59 range', () => {
                const tours: TourAvailability = {
                    tourHours: {
                        [DayOfWeek.WEDNESDAY]: { open: '12:70', close: '14:99' },
                        [DayOfWeek.THURSDAY]: { open: '09:-30', close: '17:150' }
                    }
                };
                expect(tours.tourHours![DayOfWeek.WEDNESDAY].open).toBe('12:70');
                expect(tours.tourHours![DayOfWeek.THURSDAY].close).toBe('17:150');
            });

            it('should accept non-numeric time values', () => {
                const contact: ContactInfo = {
                    officeHours: {
                        [DayOfWeek.FRIDAY]: { open: 'noon', close: 'midnight' },
                        [DayOfWeek.SATURDAY]: { open: 'morning', close: 'evening' }
                    }
                };
                expect(contact.officeHours![DayOfWeek.FRIDAY].open).toBe('noon');
                expect(contact.officeHours![DayOfWeek.SATURDAY].close).toBe('evening');
            });

            it('should accept time with wrong separators', () => {
                const tours: TourAvailability = {
                    tourHours: {
                        [DayOfWeek.SUNDAY]: { open: '09.00', close: '17.00' }, // Dots
                        [DayOfWeek.MONDAY]: { open: '09-00', close: '17-00' }, // Hyphens
                        [DayOfWeek.TUESDAY]: { open: '09 00', close: '17 00' } // Spaces
                    }
                };
                expect(tours.tourHours![DayOfWeek.SUNDAY].open).toBe('09.00');
                expect(tours.tourHours![DayOfWeek.MONDAY].open).toBe('09-00');
                expect(tours.tourHours![DayOfWeek.TUESDAY].open).toBe('09 00');
            });

            it('should accept 12-hour format with AM/PM', () => {
                const contact: ContactInfo = {
                    officeHours: {
                        [DayOfWeek.MONDAY]: { open: '9:00 AM', close: '5:00 PM' },
                        [DayOfWeek.TUESDAY]: { open: '9:00AM', close: '5:00PM' }, // No space
                        [DayOfWeek.WEDNESDAY]: { open: '9:00 am', close: '5:00 pm' } // Lowercase
                    }
                };
                expect(contact.officeHours![DayOfWeek.MONDAY].open).toBe('9:00 AM');
                expect(contact.officeHours![DayOfWeek.TUESDAY].open).toBe('9:00AM');
                expect(contact.officeHours![DayOfWeek.WEDNESDAY].close).toBe('5:00 pm');
            });

            it('should accept empty or missing time components', () => {
                const tours: TourAvailability = {
                    tourHours: {
                        [DayOfWeek.MONDAY]: { open: '', close: '' },
                        [DayOfWeek.TUESDAY]: { open: ':', close: ':' },
                        [DayOfWeek.WEDNESDAY]: { open: '9:', close: ':30' }
                    }
                };
                expect(tours.tourHours![DayOfWeek.MONDAY].open).toBe('');
                expect(tours.tourHours![DayOfWeek.TUESDAY].open).toBe(':');
                expect(tours.tourHours![DayOfWeek.WEDNESDAY].close).toBe(':30');
            });
        });

        describe('Tour Hours Edge Cases', () => {
            it('should accept tour hours crossing midnight', () => {
                const tours: TourAvailability = {
                    tourHours: {
                        [DayOfWeek.FRIDAY]: { open: '22:00', close: '02:00' }, // 10 PM to 2 AM
                        [DayOfWeek.SATURDAY]: { open: '23:30', close: '00:30' } // 11:30 PM to 12:30 AM
                    }
                };
                expect(tours.tourHours![DayOfWeek.FRIDAY].close).toBe('02:00');
                expect(tours.tourHours![DayOfWeek.SATURDAY].close).toBe('00:30');
            });

            it('should accept invalid day names as keys', () => {
                const tours: TourAvailability = {
                    tourHours: {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: invalid day name
                        ['INVALID_DAY' as any]: { open: '09:00', close: '17:00' },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: non-standard day name
                        ['everyday' as any]: { open: '10:00', close: '18:00' },
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: empty string as day
                        ['' as any]: { open: '11:00', close: '19:00' }
                    }
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing invalid day key
                expect(tours.tourHours!['INVALID_DAY' as any]).toBeDefined();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing empty string key
                expect(tours.tourHours!['' as any]).toBeDefined();
            });

            it('should accept numeric keys for days', () => {
                const contact: ContactInfo = {
                    officeHours: {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: numeric 0 as day key
                        [0 as any]: { open: '09:00', close: '17:00' }, // Numeric 0
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: string number as day key
                        ['1' as any]: { open: '10:00', close: '18:00' }, // String '1'
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing edge case: out-of-range numeric day
                        [7 as any]: { open: '11:00', close: '19:00' } // Out of range
                    }
                };
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing numeric day key
                expect(contact.officeHours![0 as any]).toBeDefined();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing string numeric day key
                expect(contact.officeHours!['1' as any]).toBeDefined();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Accessing out-of-range day key
                expect(contact.officeHours![7 as any]).toBeDefined();
            });
        });

        describe('Date Parsing Edge Cases', () => {
            it('should accept leap year edge cases', () => {
                const unit1: UnitData = {
                    buildingID: 'bldg-1',
                    unitID: 'unit-1',
                    availableDate: '2024-02-29' // Valid leap year
                };
                expect(unit1.availableDate).toBe('2024-02-29');

                const unit2: UnitData = {
                    buildingID: 'bldg-2',
                    unitID: 'unit-2',
                    availableDate: '2023-02-29' // Invalid - not a leap year
                };
                expect(unit2.availableDate).toBe('2023-02-29');

                const unit3: UnitData = {
                    buildingID: 'bldg-3',
                    unitID: 'unit-3',
                    availableDate: '2100-02-29' // Invalid - 2100 is not a leap year
                };
                expect(unit3.availableDate).toBe('2100-02-29');
            });

            it('should accept DST transition dates', () => {
                const special: RentSpecial = {
                    title: 'DST Special',
                    startDate: '2024-03-10T02:30:00', // During spring forward (might not exist)
                    endDate: '2024-11-03T01:30:00' // During fall back (happens twice)
                };
                expect(special.startDate).toBe('2024-03-10T02:30:00');
                expect(special.endDate).toBe('2024-11-03T01:30:00');
            });

            it('should accept extreme years', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    yearBuilt: 0
                };
                expect(building.yearBuilt).toBe(0);

                const building2: BuildingData = {
                    buildingID: 'bldg-456',
                    yearBuilt: 9999
                };
                expect(building2.yearBuilt).toBe(9999);

                const building3: BuildingData = {
                    buildingID: 'bldg-789',
                    yearBuilt: -1000 // BC dates
                };
                expect(building3.yearBuilt).toBe(-1000);
            });

            it('should accept various date string formats', () => {
                const units: UnitData[] = [
                    {
                        buildingID: 'bldg-1',
                        unitID: 'unit-1',
                        availableDate: 'December 31, 2024' // Full month name
                    },
                    {
                        buildingID: 'bldg-2',
                        unitID: 'unit-2',
                        availableDate: 'Dec 31, 2024' // Abbreviated month
                    },
                    {
                        buildingID: 'bldg-3',
                        unitID: 'unit-3',
                        availableDate: '31/12/2024' // DD/MM/YYYY
                    },
                    {
                        buildingID: 'bldg-4',
                        unitID: 'unit-4',
                        availableDate: '12/31/2024' // MM/DD/YYYY
                    },
                    {
                        buildingID: 'bldg-5',
                        unitID: 'unit-5',
                        availableDate: '2024-W52-7' // ISO week date
                    },
                    {
                        buildingID: 'bldg-6',
                        unitID: 'unit-6',
                        availableDate: '2024-365' // Ordinal date
                    }
                ];

                _.forEach(units, (unit) => {
                    expect(unit.availableDate).toBeDefined();
                    expect(typeof unit.availableDate).toBe('string');
                });
            });

            it('should accept special date values', () => {
                const unit1: UnitData = {
                    buildingID: 'bldg-1',
                    unitID: 'unit-1',
                    availableDate: 'now'
                };
                expect(unit1.availableDate).toBe('now');

                const unit2: UnitData = {
                    buildingID: 'bldg-2',
                    unitID: 'unit-2',
                    availableDate: 'today'
                };
                expect(unit2.availableDate).toBe('today');

                const unit3: UnitData = {
                    buildingID: 'bldg-3',
                    unitID: 'unit-3',
                    availableDate: 'tomorrow'
                };
                expect(unit3.availableDate).toBe('tomorrow');

                const unit4: UnitData = {
                    buildingID: 'bldg-4',
                    unitID: 'unit-4',
                    availableDate: 'ASAP'
                };
                expect(unit4.availableDate).toBe('ASAP');
            });
        });

        describe('Runtime Validation Documentation for Dates and Times', () => {
            it('should document date/time validations needed at runtime', () => {
                const dateTimeValidations = [
                    'ISO 8601 date format validation (YYYY-MM-DD)',
                    'Valid month range (01-12)',
                    'Valid day range based on month and year',
                    'Leap year validation for February 29th',
                    '24-hour time format (HH:MM)',
                    'Valid hour range (00-23)',
                    'Valid minute range (00-59)',
                    'Office hours logical consistency (open before close)',
                    'Tour hours not crossing into next day unexpectedly',
                    'Available date not before building construction year',
                    'Rent special date ranges (start <= end)',
                    'Timezone offset validation if included',
                    'Reject non-standard date formats in API inputs',
                    'Validate dates are not too far in past or future',
                    'Handle DST transitions appropriately'
                ];

                expect(dateTimeValidations).toHaveLength(15);
                // These validations would prevent the invalid dates accepted by the type system
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
            const manyAmenities: Amenity[] = _(Array(1000)).fill(null).map((_, i) => ({
                name: `Amenity ${i}`,
                category: AmenityCategory.UNIT
            })).value();

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

    describe('Business Logic Validation Tests (Type System Acceptance)', () => {
        describe('Rent Range Validation', () => {
            it('should accept minRent > maxRent (runtime validation needed)', () => {
                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-1',
                    modelName: 'Invalid Rent Range',
                    beds: 2,
                    baths: 2,
                    minRent: 2000, // Higher than max
                    maxRent: 1500
                };
                expect(unitType.minRent).toBe(2000);
                expect(unitType.maxRent).toBe(1500);
                // Note: Type system allows this, runtime validation would catch it
            });

            it('should accept negative rent values', () => {
                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-2',
                    modelName: 'Negative Rent',
                    beds: 1,
                    baths: 1,
                    minRent: -500,
                    maxRent: -100
                };
                expect(unitType.minRent).toBe(-500);
                expect(unitType.maxRent).toBe(-100);
            });
        });

        describe('Square Footage Validation', () => {
            it('should accept minSqft > maxSqft (runtime validation needed)', () => {
                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-1',
                    modelName: 'Invalid Sqft Range',
                    beds: 1,
                    baths: 1,
                    minSqft: 1200, // Larger than max
                    maxSqft: 800
                };
                expect(unitType.minSqft).toBe(1200);
                expect(unitType.maxSqft).toBe(800);
            });

            it('should accept zero or negative square footage', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    sqft: -100 // Invalid but type system allows it
                };
                expect(unit.sqft).toBe(-100);
            });
        });

        describe('Lease Term Validation', () => {
            it('should accept minLeaseTerm > maxLeaseTerm (runtime validation needed)', () => {
                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-1',
                    modelName: 'Invalid Lease Terms',
                    beds: 2,
                    baths: 1,
                    minLeaseTerm: 24, // Longer than max
                    maxLeaseTerm: 6
                };
                expect(unitType.minLeaseTerm).toBe(24);
                expect(unitType.maxLeaseTerm).toBe(6);
            });

            it('should accept zero or negative lease terms', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    leaseLength: -12 // Invalid but allowed by types
                };
                expect(building.leaseLength).toBe(-12);
            });
        });

        describe('Occupancy Validation', () => {
            it('should accept maxOccupants < beds (runtime validation needed)', () => {
                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-1',
                    modelName: 'Low Occupancy',
                    beds: 3,
                    baths: 2,
                    maxOccupants: 1 // Less than number of beds
                };
                expect(unitType.beds).toBe(3);
                expect(unitType.maxOccupants).toBe(1);
            });

            it('should accept zero or negative occupants', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    maxOccupants: -5
                };
                expect(unit.maxOccupants).toBe(-5);
            });
        });

        describe('Fee Conflicts', () => {
            it('should accept conflicting security deposit fee types', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    oneTimeFees: [
                        {
                            type: FeeType.SECURITY_DEPOSIT,
                            amount: 1000,
                            refundable: true,
                            description: 'Refundable security deposit'
                        },
                        {
                            type: FeeType.SECURITY_DEPOSIT,
                            amount: 500,
                            refundable: false,
                            description: 'Non-refundable security deposit'
                        }
                    ]
                };
                expect(building.oneTimeFees).toHaveLength(2);
                expect(building.oneTimeFees![0].refundable).toBe(true);
                expect(building.oneTimeFees![1].refundable).toBe(false);
                // Note: Having both refundable and non-refundable security deposits is illogical
            });

            it('should accept duplicate fee types with different amounts', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    monthlyFees: [
                        { type: FeeType.PARKING, amount: 100 },
                        { type: FeeType.PARKING, amount: 150 },
                        { type: FeeType.PARKING, amount: 200 }
                    ]
                };
                expect(building.monthlyFees).toHaveLength(3);
            });
        });

        describe('Date Range Validation', () => {
            it('should accept startDate > endDate in RentSpecial', () => {
                const special: RentSpecial = {
                    title: 'Backwards Special',
                    startDate: '2024-12-31',
                    endDate: '2024-01-01', // Earlier than start
                    description: 'Invalid date range'
                };
                expect(special.startDate).toBe('2024-12-31');
                expect(special.endDate).toBe('2024-01-01');
            });

            it('should accept invalid date formats', () => {
                const special: RentSpecial = {
                    title: 'Bad Dates',
                    startDate: 'not-a-date',
                    endDate: '2024-13-45', // Invalid month and day
                    description: 'Invalid dates'
                };
                expect(special.startDate).toBe('not-a-date');
                expect(special.endDate).toBe('2024-13-45');
            });

            it('should accept unit available date before building was built', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    yearBuilt: 2020
                };
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    availableDate: '2010-01-01' // Before building existed
                };
                expect(building.yearBuilt).toBe(2020);
                expect(unit.availableDate).toBe('2010-01-01');
            });
        });

        describe('Office Hours Validation', () => {
            it('should accept invalid time formats', () => {
                const contact: ContactInfo = {
                    officeHours: {
                        [DayOfWeek.MONDAY]: { open: '25:00', close: '12:70' }, // Invalid hours
                        [DayOfWeek.TUESDAY]: { open: 'not-a-time', close: '17:00' },
                        [DayOfWeek.WEDNESDAY]: { open: '12:00 PM', close: '5:00 PM' } // Wrong format
                    }
                };
                expect(contact.officeHours![DayOfWeek.MONDAY].open).toBe('25:00');
                expect(contact.officeHours![DayOfWeek.MONDAY].close).toBe('12:70');
            });

            it('should accept office hours crossing midnight', () => {
                const contact: ContactInfo = {
                    officeHours: {
                        [DayOfWeek.FRIDAY]: { open: '22:00', close: '02:00' } // Closes after midnight
                    }
                };
                expect(contact.officeHours![DayOfWeek.FRIDAY].open).toBe('22:00');
                expect(contact.officeHours![DayOfWeek.FRIDAY].close).toBe('02:00');
                // Note: This might be valid for 24-hour properties, but needs business logic
            });

            it('should accept close time before open time', () => {
                const tours: TourAvailability = {
                    tourHours: {
                        [DayOfWeek.SATURDAY]: { open: '14:00', close: '09:00' } // Closes before opening
                    }
                };
                expect(tours.tourHours![DayOfWeek.SATURDAY].close).toBe('09:00');
            });
        });

        describe('Percentage and Ratio Limits', () => {
            it('should accept AMI limits outside 0-100 range', () => {
                const restriction: IncomeRestriction = {
                    amiLimit: -50, // Negative percentage
                    maxIncomeByHouseholdSize: { '1': 40000 }
                };
                expect(restriction.amiLimit).toBe(-50);

                const restriction2: IncomeRestriction = {
                    amiLimit: 250, // Over 100%
                    maxIncomeByHouseholdSize: { '1': 100000 }
                };
                expect(restriction2.amiLimit).toBe(250);
            });

            it('should accept invalid income ratios', () => {
                const screening: ScreeningCriteria = {
                    incomeRatio: 0, // No income required?
                    minCreditScore: 700
                };
                expect(screening.incomeRatio).toBe(0);

                const screening2: ScreeningCriteria = {
                    incomeRatio: -2.5, // Negative ratio
                    minCreditScore: 600
                };
                expect(screening2.incomeRatio).toBe(-2.5);

                const screening3: ScreeningCriteria = {
                    incomeRatio: 100, // 100x rent required
                    minCreditScore: 850
                };
                expect(screening3.incomeRatio).toBe(100);
            });
        });

        describe('Weight Limits', () => {
            it('should accept negative and extreme pet weight limits', () => {
                const policy: PetPolicy = {
                    allowed: true,
                    types: [PetType.DOG],
                    weightLimit: -25 // Negative weight
                };
                expect(policy.weightLimit).toBe(-25);

                const policy2: PetPolicy = {
                    allowed: true,
                    types: [PetType.DOG],
                    weightLimit: 10000 // 10,000 lbs
                };
                expect(policy2.weightLimit).toBe(10000);
            });
        });

        describe('Storage Dimension Format Validation', () => {
            it('should accept invalid storage dimension formats', () => {
                const storage: StorageOption = {
                    type: StorageType.EXTERNAL_UNIT,
                    dimensions: '5x' // Missing second dimension
                };
                expect(storage.dimensions).toBe('5x');

                const storage2: StorageOption = {
                    type: StorageType.EXTERNAL_UNIT,
                    dimensions: 'x10' // Missing first dimension
                };
                expect(storage2.dimensions).toBe('x10');

                const storage3: StorageOption = {
                    type: StorageType.EXTERNAL_UNIT,
                    dimensions: 'large' // Not a dimension format
                };
                expect(storage3.dimensions).toBe('large');

                const storage4: StorageOption = {
                    type: StorageType.EXTERNAL_UNIT,
                    dimensions: '5.5x10.5x8' // Three dimensions (might be valid for height)
                };
                expect(storage4.dimensions).toBe('5.5x10.5x8');
            });
        });

        describe('Pet Policy Conflicts', () => {
            it('should accept pets not allowed but types populated', () => {
                const policy: PetPolicy = {
                    allowed: false,
                    types: [PetType.DOG, PetType.CAT], // Shouldn't have types if not allowed
                    maxCount: 2,
                    weightLimit: 50,
                    deposit: 500,
                    monthlyFee: 50
                };
                expect(policy.allowed).toBe(false);
                expect(policy.types).toHaveLength(2);
                expect(policy.deposit).toBe(500);
            });

            it('should accept NO_PETS in allowed pet types', () => {
                const policy: PetPolicy = {
                    allowed: true,
                    types: [PetType.DOG, PetType.NO_PETS] // Contradictory
                };
                expect(policy.allowed).toBe(true);
                expect(policy.types).toContain(PetType.NO_PETS);
            });
        });

        describe('Price Consistency', () => {
            it('should accept deposit greater than annual rent', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    rent: 1000, // $1000/month = $12,000/year
                    deposit: 50000 // $50,000 deposit
                };
                expect(unit.rent).toBe(1000);
                expect(unit.deposit).toBe(50000);
            });

            it('should accept per-person rent exceeding total rent', () => {
                const unit: UnitData = {
                    buildingID: 'bldg-123',
                    unitID: 'unit-123',
                    rent: 1000,
                    perPersonRent: 800, // $800 per person could exceed total
                    maxOccupants: 4 // $3200 if fully occupied
                };
                expect(unit.rent).toBe(1000);
                expect(unit.perPersonRent).toBe(800);
            });
        });

        describe('Compound Validation Scenarios', () => {
            it('should accept multiple conflicting business rules simultaneously', () => {
                const building: BuildingData = {
                    buildingID: 'bldg-123',
                    yearBuilt: 2025, // Future year
                    totalUnits: 10,
                    propertyType: PropertyType.APARTMENT,
                    leaseLength: 0, // No lease?
                    petPolicies: {
                        allowed: false,
                        types: [PetType.DOG, PetType.CAT],
                        deposit: 1000, // Deposit for pets that aren't allowed
                        weightLimit: -10 // Negative weight
                    },
                    screeningCriteria: {
                        incomeRatio: 0.5, // Less than 1x rent
                        minCreditScore: 1000, // Above max possible score
                        maxOccupantsPerBedroom: 0 // No occupants allowed?
                    },
                    applicationFee: -50 // They pay you to apply?
                };

                const unitType: UnitTypeData = {
                    buildingID: 'bldg-123',
                    modelID: 'model-chaos',
                    modelName: 'Chaos Model',
                    beds: 2,
                    baths: 3, // More baths than beds
                    maxOccupants: 1, // Less than beds
                    minRent: 5000,
                    maxRent: 1000, // Max less than min
                    minSqft: 2000,
                    maxSqft: 500, // Max less than min
                    deposit: -1000, // Negative deposit
                    minLeaseTerm: 36,
                    maxLeaseTerm: 1 // Max less than min
                };

                // All these invalid values are accepted by the type system
                expect(building.yearBuilt).toBe(2025);
                expect(building.petPolicies!.allowed).toBe(false);
                expect(building.petPolicies!.deposit).toBe(1000);
                expect(unitType.minRent).toBe(5000);
                expect(unitType.maxRent).toBe(1000);
            });

            it('should document runtime validations needed for data integrity', () => {
                // This test documents all the runtime validations that would be needed:
                const validationRules = [
                    'minRent must be <= maxRent',
                    'minSqft must be <= maxSqft',
                    'minLeaseTerm must be <= maxLeaseTerm',
                    'maxOccupants should typically be >= beds',
                    'Only one security deposit type (refundable OR non-refundable)',
                    'startDate must be <= endDate for rent specials',
                    'Office hours must be valid 24-hour format (HH:MM)',
                    'AMI limit should be between 0 and 100',
                    'Income ratio should be positive (typically 2-4)',
                    'Pet weight limits should be positive',
                    'Storage dimensions should match format like "5x10"',
                    'If pets not allowed, pet-related fields should be empty',
                    'Deposit should be reasonable relative to rent',
                    'Available dates should be after building construction',
                    'Credit scores should be in valid range (300-850)',
                    'Year built should not be in the future',
                    'Number of units, stories, etc. should be positive'
                ];

                expect(validationRules).toHaveLength(17);
                // These would all need to be implemented in runtime validation logic
            });
        });
    });
});
