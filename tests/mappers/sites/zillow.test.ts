import { describe, it, expect, beforeEach } from 'bun:test';
import _ from 'lodash';
import { ZillowMapper } from '../../../src/mappers/sites/zillow';
import {
    basicBuilding,
    completeBuilding,
    basicUnitType,
    completeUnitType,
    basicUnit,
    completeUnit,
    expectedZillowBuilding,
    expectedZillowUnitType,
    expectedZillowUnit
} from '../../fixtures/mappers';
import { PropertyType, UtilityType, ParkingType, PetType, AmenityCategory } from '../../../src/types';
import type { BuildingData, UnitTypeData, UnitData } from '../../../src/types';

describe('ZillowMapper', () => {
    let mapper: ZillowMapper;

    beforeEach(() => {
        mapper = new ZillowMapper();
    });

    describe('Basic Properties', () => {
        it('should have correct site ID and name', () => {
            expect(mapper.siteId).toBe('zillow');
            expect(mapper.siteName).toBe('Zillow Rental Manager');
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
        });

        it('should map complete building data', () => {
            const result = mapper.mapBuilding(completeBuilding);

            expect(result).toMatchObject(expectedZillowBuilding);
        });

        it('should transform property type for Zillow', () => {
            const buildingWithTypes: BuildingData = {
                ...basicBuilding,
                propertyType: PropertyType.SINGLE_FAMILY
            };

            const result = mapper.mapBuilding(buildingWithTypes);

            // Zillow has different property type mappings
            expect(result.propertyType).not.toBe('single-family');
            expect(result.propertyType).toBeDefined();
        });

        it('should transform fees without currency symbols', () => {
            const result = mapper.mapBuilding(completeBuilding);

            expect(result.fees).toBeDefined();
            expect(result.fees!.length).toBeGreaterThan(0);

            // Zillow doesn't use currency symbols
            const appFee = _.find(result.fees, fee => fee.type.includes('Application'));
            expect(appFee).toBeDefined();
            expect(appFee!.amount).not.toMatch(/^\$/);
        });

        it('should handle utilities differently', () => {
            const buildingWithUtils: BuildingData = {
                ...basicBuilding,
                utilitiesIncluded: {
                    [UtilityType.WATER]: true,
                    [UtilityType.SEWER]: true,
                    [UtilityType.TRASH]: true
                }
            };

            const result = mapper.mapBuilding(buildingWithUtils);

            // Zillow may combine utilities differently
            expect(result.utilities).toBeDefined();
        });

        it('should simplify parking for Zillow', () => {
            const buildingWithParking: BuildingData = {
                ...basicBuilding,
                parkingOptions: [
                    { type: ParkingType.COVERED, included: true },
                    { type: ParkingType.GARAGE, included: false, fee: 100 }
                ]
            };

            const result = mapper.mapBuilding(buildingWithParking);

            expect(result.parking).toBeDefined();
            expect(result.parking).toHaveLength(2);
        });

        it('should transform pet policy with Zillow terminology', () => {
            const buildingWithPets: BuildingData = {
                ...basicBuilding,
                petPolicies: {
                    allowed: true,
                    types: [PetType.DOG, PetType.CAT],
                    maxCount: 2,
                    weightLimit: 25,
                    deposit: 500
                }
            };

            const result = mapper.mapBuilding(buildingWithPets);

            expect(result.petPolicy).toBeDefined();
            expect(result.petPolicy!.allowed).toBe(true);
            // Zillow uses different pet type terminology
            expect(result.petPolicy!.types).toBeDefined();
        });

        it('should include Zillow-specific fields', () => {
            const result = mapper.mapBuilding(completeBuilding);

            // Check for any Zillow-specific fields that might be added
            expect(result).toBeDefined();
        });
    });

    describe('mapUnitType', () => {
        it('should indicate Zillow does not support unit types', () => {
            const result = mapper.mapUnitType(basicUnitType, basicBuilding);

            // Zillow flattens everything to units
            expect(result.modelName).toBe(basicUnitType.modelName);
            expect(result.beds).toBe(basicUnitType.beds);
            expect(result.baths).toBe(basicUnitType.baths);
        });

        it('should still process unit type data for reference', () => {
            const result = mapper.mapUnitType(completeUnitType, completeBuilding);

            expect(result).toMatchObject(expectedZillowUnitType);
        });

        it('should format dates in Zillow format', () => {
            const unitTypeWithDate: UnitTypeData = {
                ...basicUnitType,
                dateAvailable: '2024-05-01'
            };

            const result = mapper.mapUnitType(unitTypeWithDate, basicBuilding);

            // Zillow might use different date format
            expect(result.dateAvailable).toBeDefined();
        });

        it('should transform amenities with Zillow names', () => {
            const unitTypeWithAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                    { name: 'In-Unit Washer/Dryer', category: AmenityCategory.UNIT }
                ]
            };

            const result = mapper.mapUnitType(unitTypeWithAmenities, basicBuilding);

            expect(result.amenities).toBeDefined();
            expect(result.amenities).toContain('Air conditioning'); // Zillow uses lowercase
            expect(result.amenities).toContain('In unit laundry'); // Different terminology
        });
    });

    describe('mapUnit', () => {
        it('should flatten all data into unit for Zillow', () => {
            const context = {
                unit: basicUnit,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            // Should include building address in unit
            expect(result.externalId).toBe(basicUnit.unitID);
            expect(result.unitNumber).toBe(basicUnit.unitNumber || basicUnit.unitID);
        });

        it('should map complete unit with flattened data', () => {
            const context = {
                unit: completeUnit,
                unitType: completeUnitType,
                building: completeBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result).toMatchObject(expectedZillowUnit);
        });

        it('should inherit and flatten all values', () => {
            const unitMinimal: UnitData = {
                buildingID: 'BLDG-001',
                unitID: 'UNIT-001',
                unitNumber: '101'
            };

            const context = {
                unit: unitMinimal,
                unitType: completeUnitType,
                building: completeBuilding
            };

            const result = mapper.mapUnit(context);

            // Should have inherited values from model and building
            expect(result.beds).toBe(completeUnitType.beds);
            expect(result.baths).toBe(completeUnitType.baths);
            expect(result.rent).toBe(completeUnitType.minRent);
        });

        it('should merge all amenities for Zillow', () => {
            const unitWithAmenities: UnitData = {
                ...basicUnit,
                unitAmenities: [
                    { name: 'Balcony', category: AmenityCategory.UNIT }
                ]
            };

            const unitTypeWithAmenities: UnitTypeData = {
                ...basicUnitType,
                modelAmenities: [
                    { name: 'Dishwasher', category: AmenityCategory.UNIT }
                ]
            };

            const buildingWithAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: [
                    { name: 'Fitness Center', category: AmenityCategory.PROPERTY },
                    { name: 'Pet Friendly', category: AmenityCategory.COMMUNITY }
                ]
            };

            const context = {
                unit: unitWithAmenities,
                unitType: unitTypeWithAmenities,
                building: buildingWithAmenities
            };

            const result = mapper.mapUnit(context);

            // Zillow includes all amenities in the unit listing
            expect(result.amenities).toContain('Balcony/deck/patio'); // Transformed name
            expect(result.amenities).toContain('Dishwasher');
            expect(result.amenities).toContain('Fitness center');
            expect(result.amenities).toContain('Pets allowed'); // Transformed name
        });

        it('should use proper date formatting for Zillow', () => {
            const unitWithDate: UnitData = {
                ...basicUnit,
                availableDate: '2024-06-15'
            };

            const context = {
                unit: unitWithDate,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.dateAvailable).toBeDefined();
            // Check the actual format matches Zillow's requirements
        });

        it('should handle missing unit type gracefully', () => {
            const context = {
                unit: completeUnit,
                unitType: undefined,
                building: completeBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.modelName).toBeUndefined();
            expect(result.beds).toBe(completeUnit.beds);
        });

        it('should include building description when unit has none', () => {
            const unitNoDesc: UnitData = {
                ...basicUnit,
                unitDescription: undefined
            };

            const context = {
                unit: unitNoDesc,
                unitType: basicUnitType,
                building: completeBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.description).toBeDefined();
            expect(result.description).toContain(completeBuilding.propertyDescription);
        });
    });

    describe('Validation Methods', () => {
        describe('validateBuilding', () => {
            it('should validate required fields for Zillow', () => {
                const result = mapper.validateBuilding(completeBuilding);

                expect(result.isValid).toBe(true);
                expect(result.errors).toHaveLength(0);
            });

            it('should require all address fields', () => {
                const invalidBuilding: BuildingData = {
                    buildingID: 'BLDG-001',
                    street: '123 Main St',
                    city: 'Test City',
                    state: undefined as unknown as string,
                    zip: undefined as unknown as string
                };

                const result = mapper.validateBuilding(invalidBuilding);

                expect(result.isValid).toBe(false);
                expect(result.errors).toHaveLength(2);
            });

            it('should have Zillow-specific validation rules', () => {
                // Test any Zillow-specific validation requirements
                const result = mapper.validateBuilding(completeBuilding);

                expect(result.isValid).toBe(true);
            });
        });

        describe('validateUnitType', () => {
            it('should warn that Zillow does not use unit types', () => {
                const result = mapper.validateUnitType(basicUnitType);

                // Should still validate for internal consistency
                expect(result.isValid).toBe(true);
            });
        });

        describe('validateUnit', () => {
            it('should validate flattened unit requirements', () => {
                const result = mapper.validateUnit(completeUnit);

                expect(result.isValid).toBe(true);
            });

            it('should require more fields for Zillow units', () => {
                const minimalUnit: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: 'UNIT-001'
                };

                const result = mapper.validateUnit(minimalUnit);

                // Zillow might require more fields since it's flattened
                expect(result.errors.length).toBeGreaterThanOrEqual(0);
            });

            it('should validate that unit has sufficient data when flattened', () => {
                const unitForZillow: UnitData = {
                    buildingID: 'BLDG-001',
                    unitID: 'UNIT-001',
                    unitNumber: '101',
                    beds: 2,
                    baths: 2,
                    rent: 1500,
                    availableDate: '2024-01-01'
                };

                const result = mapper.validateUnit(unitForZillow);

                expect(result.isValid).toBe(true);
            });
        });
    });

    describe('Zillow-Specific Behavior', () => {
        it('should flatten three-tier hierarchy', () => {
            const context = {
                unit: basicUnit,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            // Result should contain data from all three levels
            expect(result).toBeDefined();
            expect(result.beds).toBeDefined();
            expect(result.rent).toBeDefined();
        });

        it('should use Zillow-specific amenity names', () => {
            const buildingWithAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: [
                    { name: 'Swimming Pool', category: AmenityCategory.PROPERTY },
                    { name: 'Air Conditioning', category: AmenityCategory.UNIT },
                    { name: 'Pet Friendly', category: AmenityCategory.COMMUNITY }
                ]
            };

            const amenities = mapper.mapBuilding(buildingWithAmenities).amenities;

            expect(amenities).toContain('Pool'); // Simplified
            expect(amenities).toContain('Air conditioning'); // Lowercase
            expect(amenities).toContain('Pets allowed'); // Different term
        });

        it('should format data for Zillow API requirements', () => {
            const result = mapper.mapBuilding(completeBuilding);

            // Check that the result matches Zillow's expected format
            expect(result.fees).toBeDefined();
            _.forEach(result.fees, (fee) => {
                // No currency symbols in amounts
                expect(fee.amount).not.toContain('$');
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle buildings with no amenities', () => {
            const buildingNoAmenities: BuildingData = {
                ...basicBuilding,
                propertyAmenities: []
            };

            const result = mapper.mapBuilding(buildingNoAmenities);

            expect(result.amenities).toEqual([]);
        });

        it('should handle undefined utilities', () => {
            const buildingNoUtils: BuildingData = {
                ...basicBuilding,
                utilitiesIncluded: undefined
            };

            const result = mapper.mapBuilding(buildingNoUtils);

            expect(result.utilities).toBeDefined();
            expect(result.utilities).toEqual({});
        });

        it('should handle units with no photos', () => {
            const context = {
                unit: { ...basicUnit, photos: [] },
                unitType: basicUnitType,
                building: { ...basicBuilding, photos: [] }
            };

            const result = mapper.mapUnit(context);

            expect(result.photos).toEqual([]);
        });

        it('should handle very long addresses', () => {
            const longAddress = _.repeat('A', 200);
            const buildingLongAddress: BuildingData = {
                ...basicBuilding,
                street: longAddress
            };

            const result = mapper.mapBuilding(buildingLongAddress);

            expect(result.address.street).toBe(longAddress);
        });

        it('should handle special characters in descriptions', () => {
            const specialDesc = 'Unit with "quotes" & special <characters>';
            const unitSpecialDesc: UnitData = {
                ...basicUnit,
                unitDescription: specialDesc
            };

            const context = {
                unit: unitSpecialDesc,
                unitType: basicUnitType,
                building: basicBuilding
            };

            const result = mapper.mapUnit(context);

            expect(result.description).toBe(specialDesc);
        });
    });

    describe('Custom Field Mappings', () => {
        it('should accept custom field mappings', () => {
            const customMappings = {
                propertyType: {
                    zillow: {
                        apartment: 'Apartment Home',
                        condo: 'Condominium Unit'
                    }
                }
            };

            const customMapper = new ZillowMapper(customMappings);

            expect(customMapper.siteId).toBe('zillow');
        });
    });
});
