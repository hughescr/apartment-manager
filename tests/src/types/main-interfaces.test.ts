import { describe, it, expect } from 'bun:test';
import _ from 'lodash';
import {
    BuildingData,
    UnitTypeData,
    UnitData,
    Unit,
    Building,
    UnitType,
    PropertyType,
    UtilityType,
    FeeType,
    PetType,
    ParkingType,
    StorageType,
    AmenityCategory
} from '../../../src/types';

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
                acceptsOnlineApplications: true,
                // MITS compliance fields
                latitude: 47.6062,
                longitude: -122.3321,
                coordinatesVerified: true
            };
            expect(building.buildingID).toBe('bldg-123');
            expect(building.propertyType as string).toBe(PropertyType.APARTMENT);
            expect(building.rentSpecials).toHaveLength(1);
            expect(building.latitude).toBe(47.6062);
            expect(building.longitude).toBe(-122.3321);
            expect(building.coordinatesVerified).toBe(true);
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
                deposit: {
                    amount: 1500,
                    refundable: true,
                    partialRefundPercentage: 90
                },
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

        it('should accept both legacy number deposit and enhanced Deposit object', () => {
            const unitTypeWithNumberDeposit: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-legacy',
                modelName: 'Legacy Deposit',
                beds: 2,
                baths: 1,
                deposit: 1200 // Legacy number format
            };
            expect(unitTypeWithNumberDeposit.deposit).toBe(1200);

            const unitTypeWithDepositObject: UnitTypeData = {
                buildingID: 'bldg-123',
                modelID: 'model-enhanced',
                modelName: 'Enhanced Deposit',
                beds: 2,
                baths: 2,
                deposit: {
                    amount: 1200,
                    refundable: false,
                    partialRefundPercentage: 50
                }
            };
            expect(_.isObject(unitTypeWithDepositObject.deposit)).toBe(true);
            if(_.isObject(unitTypeWithDepositObject.deposit)) {
                expect(unitTypeWithDepositObject.deposit.amount).toBe(1200);
                expect(unitTypeWithDepositObject.deposit.refundable).toBe(false);
                expect(unitTypeWithDepositObject.deposit.partialRefundPercentage).toBe(50);
            }
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
                deposit: {
                    amount: 1650,
                    refundable: true,
                    partialRefundPercentage: 85
                },
                minLeaseTerm: 12,
                maxLeaseTerm: 24,
                unitDescription: 'Beautiful corner unit',
                // MITS compliance fields
                vacancyClass: 'Unoccupied',
                vacateDate: '2024-03-01',
                madeReadyDate: '2024-03-15',
                unitRentSpecial: {
                    title: 'Unit Special',
                    description: 'Free parking'
                },
                unitAmenities: [{
                    name: 'City View',
                    category: AmenityCategory.UNIT
                }],
                photos: ['https://s3.example.com/unit456.jpg'],
                feedInclusion: {
                    'apartments.com': true,
                    zillow: true
                },
                manualReferences: {
                    'apartments.com': 'APT-123456',
                    zillow: 'ZIL-789012'
                },
                feedLastPulled: {
                    'apartments.com': { timestamp: new Date('2024-03-15T10:30:00Z'), ipAddress: '192.168.1.100' },
                    zillow: { timestamp: new Date('2024-03-15T11:00:00Z') }
                },
                feedLastModified: new Date('2024-03-14T14:22:00Z')
            };
            expect(unit.unitID).toBe('unit-456');
            expect(unit.feedInclusion?.['apartments.com']).toBe(true);
            expect(unit.manualReferences?.zillow).toBe('ZIL-789012');
            expect(unit.feedLastPulled?.['apartments.com']?.timestamp).toEqual(new Date('2024-03-15T10:30:00Z'));
            expect(unit.feedLastPulled?.['apartments.com']?.ipAddress).toBe('192.168.1.100');
            expect(unit.feedLastModified).toEqual(new Date('2024-03-14T14:22:00Z'));
            expect(unit.vacancyClass).toBe('Unoccupied');
            expect(unit.vacateDate).toBe('2024-03-01');
            expect(unit.madeReadyDate).toBe('2024-03-15');
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

        it('should handle partial feedInclusion, manualReferences, and feed timestamp fields', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-999',
                feedInclusion: {},
                manualReferences: {},
                feedLastPulled: {},
                feedLastModified: undefined
            };
            expect(unit.feedInclusion).toEqual({});
            expect(unit.manualReferences).toEqual({});
            expect(unit.feedLastPulled).toEqual({});
            expect(unit.feedLastModified).toBeUndefined();
        });

        it('should accept various timestamp formats in feed tracking fields', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-timestamps',
                feedLastPulled: {
                    'apartments.com': { timestamp: new Date('2024-03-15T10:30:00Z') }, // ISO 8601 UTC
                    zillow: { timestamp: new Date('2024-03-15T10:30:00-08:00'), ipAddress: '10.0.0.1' }, // ISO 8601 with timezone
                    'test-site': { timestamp: new Date('2024-02-29T12:00:00Z'), ipAddress: '192.168.1.1' } // Leap year date
                },
                feedLastModified: new Date('2024-03-14T14:22:00.123Z') // With milliseconds
            };
            expect(unit.feedLastPulled?.['apartments.com']?.timestamp).toEqual(new Date('2024-03-15T10:30:00Z'));
            expect(unit.feedLastPulled?.zillow?.ipAddress).toBe('10.0.0.1');
            expect(unit.feedLastModified).toEqual(new Date('2024-03-14T14:22:00.123Z'));
        });

        it('should accept both legacy number deposit and enhanced Deposit object', () => {
            const unitWithNumberDeposit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-legacy',
                deposit: 1500 // Legacy number format
            };
            expect(unitWithNumberDeposit.deposit).toBe(1500);

            const unitWithDepositObject: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-enhanced',
                deposit: {
                    amount: 1500,
                    refundable: true,
                    partialRefundPercentage: 75
                }
            };
            expect(_.isObject(unitWithDepositObject.deposit)).toBe(true);
            if(_.isObject(unitWithDepositObject.deposit)) {
                expect(unitWithDepositObject.deposit.amount).toBe(1500);
                expect(unitWithDepositObject.deposit.refundable).toBe(true);
            }
        });

        it('should accept all VacancyClass values', () => {
            const units: UnitData[] = [
                {
                    buildingID: 'bldg-1',
                    unitID: 'unit-1',
                    vacancyClass: 'Occupied'
                },
                {
                    buildingID: 'bldg-2',
                    unitID: 'unit-2',
                    vacancyClass: 'Unoccupied'
                },
                {
                    buildingID: 'bldg-3',
                    unitID: 'unit-3',
                    vacancyClass: 'Notice'
                },
                {
                    buildingID: 'bldg-4',
                    unitID: 'unit-4',
                    vacancyClass: 'Down'
                }
            ];

            expect(units[0].vacancyClass).toBe('Occupied');
            expect(units[1].vacancyClass).toBe('Unoccupied');
            expect(units[2].vacancyClass).toBe('Notice');
            expect(units[3].vacancyClass).toBe('Down');
        });

        it('should accept MITS date fields', () => {
            const unit: UnitData = {
                buildingID: 'bldg-123',
                unitID: 'unit-mits',
                vacancyClass: 'Notice',
                vacateDate: '2024-04-30',
                madeReadyDate: '2024-05-15'
            };
            expect(unit.vacateDate).toBe('2024-04-30');
            expect(unit.madeReadyDate).toBe('2024-05-15');
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
