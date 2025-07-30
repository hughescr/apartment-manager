import { describe, it, expect, beforeEach } from 'bun:test';
import _ from 'lodash';
import { ApartmentsComMapper } from '../../../src/mappers/sites/apartments-com';
import {
    basicBuilding,
    completeBuilding,
    basicUnitType,
    completeUnitType,
    basicUnit,
    completeUnit,
    expectedApartmentsComBuilding,
    expectedApartmentsComUnitType,
    expectedApartmentsComUnit
} from '../../fixtures/mappers';
import { PropertyType, UtilityType, ParkingType, PetType, AmenityCategory } from '../../../src/types';
import type { BuildingData, UnitTypeData, UnitData } from '../../../src/types';

describe('ApartmentsComMapper', () => {
    let mapper: ApartmentsComMapper;

    beforeEach(() => {
        mapper = new ApartmentsComMapper();
    });

    describe('Basic Properties', () => {
        it('should have correct site ID and name', () => {
            expect(mapper.siteId).toBe('apartments_com');
            expect(mapper.siteName).toBe('Apartments.com');
        });
    });

    describe('mapBuilding', () => {
        it('should map basic building data', () => {
            const result = mapper.mapBuilding(basicBuilding);

            expect(result.externalId).toBe(basicBuilding.buildingID);
            expect(result.name).toBe(basicBuilding.buildingID);
            expect(result.address).toEqual({
                street: '',
                city: '',
                state: '',
                zip: ''
            });
            expect(result.propertyType).toBe('Apartment'); // Default value
        });

        it('should map complete building data', () => {
            const result = mapper.mapBuilding(completeBuilding);

            expect(result).toMatchObject(expectedApartmentsComBuilding);
        });

        it('should transform property type enum values', () => {
            const buildingWithCondo: BuildingData = {
                ...basicBuilding,
                propertyType: PropertyType.CONDO
            };

            const result = mapper.mapBuilding(buildingWithCondo);

            expect(result.propertyType).not.toBe('condo');
            expect(result.propertyType).toBeDefined();
        });

        it('should categorize fees correctly', () => {
            const result = mapper.mapBuilding(completeBuilding);

            expect(result.fees).toBeDefined();
            expect(result.fees!.length).toBeGreaterThan(0);

            // Check that fees are transformed with currency symbols
            const appFee = _.find(result.fees, fee => fee.type.includes('Application'));
            expect(appFee).toBeDefined();
            expect(appFee!.amount).toMatch(/^\$/);
        });

        it('should transform utilities correctly', () => {
            const buildingWithUtils: BuildingData = {
                ...basicBuilding,
                utilitiesIncluded: {
                    [UtilityType.WATER]: true,
                    [UtilityType.ELECTRIC]: false,
                    [UtilityType.GAS]: true
                }
            };

            const result = mapper.mapBuilding(buildingWithUtils);

            expect(result.utilities).toBeDefined();
            expect(_.keys(result.utilities!)).toHaveLength(3);
        });

        it('should transform parking options', () => {
            const buildingWithParking: BuildingData = {
                ...basicBuilding,
                parkingOptions: [
                    { type: ParkingType.GARAGE, included: true },
                    { type: ParkingType.STREET, included: false, fee: 50 }
                ]
            };

            const result = mapper.mapBuilding(buildingWithParking);

            expect(result.parking).toBeDefined();
            expect(result.parking).toHaveLength(2);
            expect(result.parking![0].type).not.toBe('garage'); // Should be transformed
        });

        it('should transform pet policy', () => {
            const buildingWithPets: BuildingData = {
                ...basicBuilding,
                petPolicies: {
                    allowed: true,
                    types: [PetType.DOG, PetType.CAT],
                    maxCount: 2,
                    weightLimit: 50,
                    deposit: 300,
                    monthlyFee: 25,
                    notes: 'Breed restrictions apply'
                }
            };

            const result = mapper.mapBuilding(buildingWithPets);

            expect(result.petPolicy).toBeDefined();
            expect(result.petPolicy!.allowed).toBe(true);
            expect(result.petPolicy!.types).toHaveLength(2);
            expect(result.petPolicy!.restrictions).toBe('Breed restrictions apply');
        });

        it('should handle no pets allowed', () => {
            const buildingNoPets: BuildingData = {
                ...basicBuilding,
                petPolicies: {
                    allowed: false
                }
            };

            const result = mapper.mapBuilding(buildingNoPets);

            expect(result.petPolicy).toBeDefined();
            expect(result.petPolicy!.allowed).toBe(false);
            expect(result.petPolicy!.restrictions).toBe('No pets allowed');
        });

        it('should handle missing optional fields', () => {
            const minimalBuilding: BuildingData = {
                buildingID: 'BLDG-001',
                street: '123 Main St',
                city: 'Test City',
                state: 'TS',
                zip: '12345'
            };

            const result = mapper.mapBuilding(minimalBuilding);

            expect(result.yearBuilt).toBeUndefined();
            expect(result.totalUnits).toBeUndefined();
            expect(result.description).toBeUndefined();
            expect(result.photos).toEqual([]);
        });
    });

    describe('mapUnitType', () => {
        it('should map basic unit type data', () => {
            const result = mapper.mapUnitType(basicUnitType, basicBuilding);

            expect(result.externalId).toBe(basicUnitType.modelID);
            expect(result.modelName).toBe(basicUnitType.modelName);
            expect(result.beds).toBe(basicUnitType.beds);
            expect(result.baths).toBe(basicUnitType.baths);
        });

        it('should map complete unit type data', () => {
            const result = mapper.mapUnitType(completeUnitType, completeBuilding);

            expect(result).toMatchObject(expectedApartmentsComUnitType);
        });

        it('should format dates correctly', () => {
            const unitTypeWithDate: UnitTypeData = {
                ...basicUnitType,
                dateAvailable: '2024-03-15'
            };

            const result = mapper.mapUnitType(unitTypeWithDate, basicBuilding);

            expect(result.dateAvailable).toBe('03/15/2024');
        });

        it('should handle sqft ranges', () => {
            const result = mapper.mapUnitType(completeUnitType, basicBuilding);

            expect(result.sqft).toBeDefined();
            expect(result.sqft!.min).toBe(completeUnitType.minSqft);
            expect(result.sqft!.max).toBe(completeUnitType.maxSqft);
        });

        it('should handle rent ranges', () => {
            const result = mapper.mapUnitType(completeUnitType, basicBuilding);

            expect(result.rent).toBeDefined();
            expect(result.rent!.min).toBe(completeUnitType.minRent);
            expect(result.rent!.max).toBe(completeUnitType.maxRent);
        });

        it('should transform amenities', () => {
            const unitTypeWithAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                    { name: 'Dishwasher', category: AmenityCategory.UNIT }
                ]
            };

            const result = mapper.mapUnitType(unitTypeWithAmenities, basicBuilding);

            expect(result.amenities).toBeDefined();
            expect(result.amenities).toContain('A/C');
            expect(result.amenities).toContain('Dishwasher');
        });

        it('should default photos to empty array', () => {
            const result = mapper.mapUnitType(basicUnitType, basicBuilding);

            expect(result.photos).toEqual([]);
        });
    });

    describe('mapUnit', () => {
        it('should map basic unit data', () => {
            const context = {
                unit: basicUnit,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.externalId).toBe(basicUnit.unitID);
            expect(result.unitNumber).toBe(basicUnit.unitNumber || basicUnit.unitID);
            expect(result.modelName).toBe(basicUnitType.modelName);
        });

        it('should map complete unit data', () => {
            const context = {
                unit: completeUnit,
                unitType: completeUnitType,
                building: completeBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result).toMatchObject(expectedApartmentsComUnit);
        });

        it('should apply inheritance correctly', () => {
            const unitWithoutBeds: UnitData = {
                ...basicUnit,
                beds: undefined,
                baths: undefined
            };

            const context = {
                unit: unitWithoutBeds,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.beds).toBe(basicUnitType.beds);
            expect(result.baths).toBe(basicUnitType.baths);
        });

        it('should merge amenities from all sources', () => {
            const unitWithAmenities: UnitData = {
                ...basicUnit,
                unitAmenities: [
                    { name: 'Hardwood Floors', category: AmenityCategory.UNIT }
                ]
            };

            const unitTypeWithAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Air Conditioning', category: AmenityCategory.UNIT }
                ]
            };

            const buildingWithAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: [
                    { name: 'Swimming Pool', category: AmenityCategory.PROPERTY }
                ]
            };

            const context = {
                unit: unitWithAmenities,
                unitType: unitTypeWithAmenities,
                building: buildingWithAmenities
            };

            const result = mapper.mapUnit(context);

            // Should only include unit-category amenities for units
            expect(result.amenities).toContain('Wood Floors');
            expect(result.amenities).toContain('A/C');
            expect(result.amenities).not.toContain('Pool'); // Property amenity filtered out
        });

        it('should format available date', () => {
            const unitWithDate: UnitData = {
                ...basicUnit,
                availableDate: '2024-04-01'
            };

            const context = {
                unit: unitWithDate,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.dateAvailable).toBe('04/01/2024');
        });

        it('should handle missing unit type', () => {
            const context = {
                unit: basicUnit,
                unitType: undefined,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.modelName).toBeUndefined();
            expect(result.beds).toBe(basicUnit.beds || 0);
        });

        it('should default numeric values to 0', () => {
            const unitWithMissing: UnitData = {
                ...basicUnit,
                beds: undefined,
                baths: undefined,
                rent: undefined
            };

            const context = {
                unit: unitWithMissing,
                unitType: undefined,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.beds).toBe(0);
            expect(result.baths).toBe(0);
            expect(result.rent).toBe(0);
        });
    });

    describe('Validation Methods', () => {
        describe('validateBuilding', () => {
            it('should validate required fields', () => {
                const result = mapper.validateBuilding(completeBuilding);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should catch missing address fields', () => {
                const invalidBuilding: BuildingData = {
                    buildingID: 'BLDG-001',
                    street: undefined as unknown as string,
                    city: undefined as unknown as string,
                    state: undefined as unknown as string,
                    zip: undefined as unknown as string
                };

                const result = mapper.validateBuilding(invalidBuilding);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(4);
                expect(_.map(result.errors, 'field')).toContain('street');
                expect(_.map(result.errors, 'field')).toContain('city');
                expect(_.map(result.errors, 'field')).toContain('state');
                expect(_.map(result.errors, 'field')).toContain('zip');
            });

            it('should validate partial missing fields', () => {
                const partialBuilding: BuildingData = {
                    buildingID: 'BLDG-001',
                    street: '123 Main St',
                    city: 'Test City',
                    state: undefined as unknown as string,
                    zip: undefined as unknown as string
                };

                const result = mapper.validateBuilding(partialBuilding);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(2);
            });
        });

        describe('validateUnitType', () => {
            it('should validate required fields', () => {
                const result = mapper.validateUnitType(basicUnitType);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should catch missing fields', () => {
                const invalidUnitType: UnitTypeData = {
                    buildingID: 'BLDG-001',
                    modelID: 'MODEL-001',
                    modelName: undefined as unknown as string,
                    beds: undefined as unknown as number,
                    baths: undefined as unknown as number
                };

                const result = mapper.validateUnitType(invalidUnitType);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(3);
                expect(_.map(result.errors, 'field')).toContain('modelName');
                expect(_.map(result.errors, 'field')).toContain('beds');
                expect(_.map(result.errors, 'field')).toContain('baths');
            });

            it('should accept zero values for beds/baths', () => {
                const studioUnitType: UnitTypeData = {
                    ...basicUnitType,
                    beds: 0,
                    baths: 1
                };

                const result = mapper.validateUnitType(studioUnitType);

                expect(result.isValid).toBe(true);
            });
        });

        describe('validateUnit', () => {
            it('should validate required fields', () => {
                const result = mapper.validateUnit(basicUnit);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should require unit number or ID', () => {
                const invalidUnit: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: undefined as unknown as string,
                    unitNumber: undefined
                };

                const result = mapper.validateUnit(invalidUnit);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(1);
                expect(result.errors[0].field).toBe('unitNumber');
            });

            it('should accept unit with only unitID', () => {
                const unitWithOnlyId: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: 'UNIT-001',
                    unitNumber: undefined
                };

                const result = mapper.validateUnit(unitWithOnlyId);

                expect(result.isValid).toBe(true);
            });

            it('should accept unit with only unitNumber', () => {
                const unitWithOnlyNumber: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: 'UNIT-001',
                    unitNumber: '101'
                };

                const result = mapper.validateUnit(unitWithOnlyNumber);

                expect(result.isValid).toBe(true);
            });
        });
    });

    describe('Custom Field Mappings', () => {
        it('should accept custom field mappings in constructor', () => {
            const customMappings = {
                propertyType: {
                    apartments_com: {
                        apartment: 'Apt',
                        condo: 'Condominium'
                    }
                }
            };

            const customMapper = new ApartmentsComMapper(customMappings);

            expect(customMapper.siteId).toBe('apartments_com');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty fees arrays', () => {
            const buildingNoFees: BuildingData = {
                ...basicBuilding,
                oneTimeFees: [],
                monthlyFees: []
            };

            const result = mapper.mapBuilding(buildingNoFees);

            expect(result.fees).toEqual([]);
        });

        it('should handle undefined pet policies', () => {
            const buildingNoPetInfo: BuildingData = {
                ...basicBuilding,
                petPolicies: undefined
            };

            const result = mapper.mapBuilding(buildingNoPetInfo);

            expect(result.petPolicy).toBeUndefined();
        });

        it('should handle empty parking options', () => {
            const buildingNoParking: BuildingData = {
                ...basicBuilding,
                parkingOptions: []
            };

            const result = mapper.mapBuilding(buildingNoParking);

            expect(result.parking).toEqual([]);
        });

        it('should handle very long descriptions', () => {
            const longDescription = _.repeat('A', 5000);
            const buildingLongDesc: BuildingData = {
                ...basicBuilding,
                propertyDescription: longDescription
            };

            const result = mapper.mapBuilding(buildingLongDesc);

            expect(result.description).toBe(longDescription);
        });
    });
});
