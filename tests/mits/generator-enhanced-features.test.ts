import { describe, it, expect, beforeEach } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import {
    createMockBuilding,
    createMockUnitTypes,
    createMockUnits,
    createEnhancedDeposit,
    createNonRefundableDeposit,
    createPartialRefundDeposit,
    createComplexDeposit,
    createBasicPetTypes,
    createComplexPetTypes,
    createBuildingWithWebsites,
    createLegacyBuildingWithWebsite
} from './generator-fixtures';
import type { BuildingData, UnitData, UnitTypeData, UnitTypeData as UnitTypeDataType, ContactInfo } from '../../src/types';

describe('MITS Enhanced Features', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];

    beforeEach(() => {
        mockBuilding = createMockBuilding();
        mockUnitTypes = createMockUnitTypes();
        mockUnits = createMockUnits();
    });

    describe('Website Differentiation', () => {
        it('should use propertyWebsite in Property_ID section', async () => {
            const buildingWithWebsites = createBuildingWithWebsites();

            const xml = await generateMITSFeed({
                building:  buildingWithWebsites,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Property_ID section should use propertyWebsite
            const propertyIdMatch = /<Property_ID>[\s\S]*?<\/Property_ID>/.exec(xml);
            expect(propertyIdMatch?.[0]).toContain('https://property-specific.com');
        });

        it('should use propertyWebsite in Information section', async () => {
            const buildingWithWebsites: BuildingData = {
                ...mockBuilding,
                contactInfo: {
                    ...mockBuilding.contactInfo,
                    propertyWebsite:   'https://property-info.com',
                    managementWebsite: 'https://mgmt-info.com'
                }
            };

            const xml = await generateMITSFeed({
                building:  buildingWithWebsites,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Information section should use propertyWebsite
            const informationMatch = /<Information>[\s\S]*?<\/Information>/.exec(xml);
            expect(informationMatch?.[0]).toContain('https://property-info.com');
        });

        it('should use managementWebsite in Management section', async () => {
            const buildingWithWebsites: BuildingData = {
                ...mockBuilding,
                contactInfo: {
                    ...mockBuilding.contactInfo,
                    propertyWebsite:   'https://property-mgmt-test.com',
                    managementWebsite: 'https://management-only.com'
                }
            };

            const xml = await generateMITSFeed({
                building:  buildingWithWebsites,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Management section should use managementWebsite
            const managementMatch = /<Management>[\s\S]*?<\/Management>/.exec(xml);
            expect(managementMatch?.[0]).toContain('https://management-only.com');
        });

        it('should fallback to old website field for backward compatibility', async () => {
            const legacyBuilding = createLegacyBuildingWithWebsite();

            const xml = await generateMITSFeed({
                building:  legacyBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Should use legacy website in both Property_ID and Information
            const propertyIdMatch = /<Property_ID>[\s\S]*?<\/Property_ID>/.exec(xml);
            const informationMatch = /<Information>[\s\S]*?<\/Information>/.exec(xml);
            expect(propertyIdMatch?.[0]).toContain('https://legacy-website.com');
            expect(informationMatch?.[0]).toContain('https://legacy-website.com');
        });

        it('should prioritize propertyWebsite over legacy website', async () => {
            const buildingWithBoth: BuildingData = {
                ...mockBuilding,
                contactInfo: {
                    ...mockBuilding.contactInfo,
                    website:         'https://old-legacy.com',
                    propertyWebsite: 'https://new-property.com'
                } as ContactInfo & { website?: string }
            };

            const xml = await generateMITSFeed({
                building:  buildingWithBoth,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Should use propertyWebsite, not legacy website
            expect(xml).toContain('https://new-property.com');
            expect(xml).not.toContain('https://old-legacy.com');
        });
    });

    describe('Deposit Details', () => {
        it('should handle deposit as number (backward compatibility)', async () => {
            const unitTypesWithNumberDeposit: UnitTypeDataType[] = [
                {
                    ...mockUnitTypes[0],
                    deposit: 1500
                }
            ];

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: unitTypesWithNumberDeposit,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Value>1500</Value>');
            // Should not include refundable info for simple number deposits
            expect(xml).not.toContain('<Refundable>');
            expect(xml).not.toContain('<PartialRefund>');
        });

        it('should handle deposit as enhanced object with refundable flag', async () => {
            const enhancedDeposit = createEnhancedDeposit();

            const unitTypesWithEnhancedDeposit: UnitTypeDataType[] = [
                {
                    ...mockUnitTypes[0],
                    deposit: enhancedDeposit
                }
            ];

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: unitTypesWithEnhancedDeposit,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Value>2000</Value>');
            expect(xml).toContain('<Refundable>true</Refundable>');
        });

        it('should handle deposit as non-refundable enhanced object', async () => {
            const nonRefundableDeposit = createNonRefundableDeposit();

            const unitTypesWithNonRefundable: UnitTypeDataType[] = [
                {
                    ...mockUnitTypes[0],
                    deposit: nonRefundableDeposit
                }
            ];

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: unitTypesWithNonRefundable,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Value>1800</Value>');
            expect(xml).toContain('<Refundable>false</Refundable>');
        });

        it('should handle deposit with partialRefundPercentage', async () => {
            const partialRefundDeposit = createPartialRefundDeposit();

            const unitTypesWithPartialRefund: UnitTypeDataType[] = [
                {
                    ...mockUnitTypes[0],
                    deposit: partialRefundDeposit
                }
            ];

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: unitTypesWithPartialRefund,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Value>2500</Value>');
            expect(xml).toContain('<Refundable>false</Refundable>');
            // PartialRefund is not part of MITS spec - removed
        });

        it('should extract amount from enhanced deposit object', async () => {
            const complexDeposit = createComplexDeposit();

            const unitTypesWithComplexDeposit: UnitTypeDataType[] = [
                {
                    ...mockUnitTypes[0],
                    deposit: complexDeposit
                }
            ];

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: unitTypesWithComplexDeposit,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Value>3200</Value>');
            expect(xml).toContain('<Refundable>true</Refundable>');
            // PartialRefund is not part of MITS spec - removed
        });

        it('should handle missing deposit gracefully', async () => {
            const unitTypesWithoutDeposit: UnitTypeDataType[] = [
                {
                    ...mockUnitTypes[0],
                    deposit: undefined
                },
                {
                    ...mockUnitTypes[1],
                    deposit: undefined
                }
            ];

            const buildingWithoutPetDeposit: BuildingData = {
                ...mockBuilding,
                petPolicies: {
                    allowed: false  // No pet deposit/fees
                }
            };

            const xml = await generateMITSFeed({
                building:  buildingWithoutPetDeposit,
                unitTypes: unitTypesWithoutDeposit,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Should not include any deposit section when unit type deposits are undefined
            // and pet policies don't have deposits
            expect(xml).not.toContain('<Deposit>');
            expect(xml).not.toContain('<Value>');
            expect(xml).not.toContain('<Refundable>');
        });
    });

    describe('Pet Policy Enhancement', () => {
        it('should handle basic pet policy without per-type details', async () => {
            const basicPetBuilding: BuildingData = {
                ...mockBuilding,
                petPolicies: {
                    allowed:    true,
                    deposit:    300,
                    monthlyFee: 25
                }
            };

            const xml = await generateMITSFeed({
                building:  basicPetBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Pet>');
            expect(xml).toContain('<Allowed>true</Allowed>');
            expect(xml).toContain('<Deposit>300</Deposit>');
            expect(xml).toContain('<Fee>25</Fee>');
        });

        it('should handle per-pet-type policies in MITS format', async () => {
            const petTypes = createBasicPetTypes();

            const enhancedPetBuilding: BuildingData = {
                ...mockBuilding,
                petPolicies: {
                    allowed:  true,
                    petTypes: petTypes,
                    notes:    'Detailed per-type policies apply'
                }
            };

            const xml = await generateMITSFeed({
                building:  enhancedPetBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Basic pet policy structure should still be present
            expect(xml).toContain('<Pet>');
            expect(xml).toContain('<Allowed>true</Allowed>');
            expect(xml).toContain('<Comment>Detailed per-type policies apply</Comment>');

            // Note: MITS 4.1 doesn't have per-pet-type fields natively,
            // so we test that the basic structure works for now
            // Future enhancement could add custom extensions
        });

        it('should handle pet policy with breed restrictions', async () => {
            const restrictivePetBuilding: BuildingData = {
                ...mockBuilding,
                petPolicies: {
                    allowed:           true,
                    weightLimit:       30,
                    breedRestrictions: ['Pit Bull', 'German Shepherd', 'Rottweiler'],
                    deposit:           500,
                    monthlyFee:        40,
                    notes:             'Weight and breed restrictions apply. Contact office for full list.'
                }
            };

            const xml = await generateMITSFeed({
                building:  restrictivePetBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Pet>');
            expect(xml).toContain('<Allowed>true</Allowed>');
            expect(xml).toContain('<Deposit>500</Deposit>');
            expect(xml).toContain('<Fee>40</Fee>');
            expect(xml).toContain('<Comment>Weight and breed restrictions apply. Contact office for full list.</Comment>');
        });

        it('should handle complex per-pet-type fee structures', async () => {
            const complexPetTypes = createComplexPetTypes();

            const complexPetBuilding: BuildingData = {
                ...mockBuilding,
                petPolicies: {
                    allowed:  true,
                    petTypes: complexPetTypes,
                    notes:    'Different policies apply per pet type. Contact office for details.'
                }
            };

            const xml = await generateMITSFeed({
                building:  complexPetBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Pet>');
            expect(xml).toContain('<Allowed>true</Allowed>');
            expect(xml).toContain('<Comment>Different policies apply per pet type. Contact office for details.</Comment>');

            // Test validates basic structure - per-type details would need MITS extension
            // or custom XML extensions for full support
        });
    });
});
