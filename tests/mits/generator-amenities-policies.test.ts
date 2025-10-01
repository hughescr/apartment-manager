import { describe, it, expect, beforeEach } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import {
    createMockBuilding,
    createMockUnitTypes,
    createMockUnits
} from './generator-fixtures';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Amenities and Policies Generator', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];

    beforeEach(() => {
        mockBuilding = createMockBuilding();
        mockUnitTypes = createMockUnitTypes();
        mockUnits = createMockUnits();
    });

    describe('Amenities', () => {
        it('should include property amenities', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Amenity>');
            expect(xml).toContain('<AmenityType>Pool</AmenityType>');
            expect(xml).toContain('<AmenityType>Gym</AmenityType>');
        });
    });

    describe('Pet Policy', () => {
        it('should include basic pet policy', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Pet>');
            expect(xml).toContain('<Allowed>true</Allowed>');
            expect(xml).toContain(`<Deposit>${mockBuilding.petPolicies?.deposit}</Deposit>`);
            expect(xml).toContain(`<Fee>${mockBuilding.petPolicies?.monthlyFee}</Fee>`);
        });

        it('should handle no pets allowed policy', async () => {
            const noPetBuilding: BuildingData = {
                ...mockBuilding,
                petPolicies: {
                    allowed: false,
                    notes:   'Sorry, no pets allowed'
                }
            };

            const xml = await generateMITSFeed({
                building:  noPetBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Pet>');
            expect(xml).toContain('<Allowed>false</Allowed>');
            expect(xml).toContain('<Comment>Sorry, no pets allowed</Comment>');

            // Should not include deposit/fee in the Pet policy section for no-pets policy
            // Check that the Pet section specifically doesn't contain deposit/fee
            const petMatch = /<Pet>[\s\S]*?<\/Pet>/.exec(xml);
            expect(petMatch?.[0]).not.toContain('<Deposit>');
            expect(petMatch?.[0]).not.toContain('<Fee>');
        });

        it('should handle missing pet policy gracefully', async () => {
            const noPolicyBuilding: BuildingData = {
                ...mockBuilding,
                petPolicies: undefined
            };

            const xml = await generateMITSFeed({
                building:  noPolicyBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Should not include Pet section if no policy defined
            expect(xml).not.toContain('<Pet>');
        });
    });
});
