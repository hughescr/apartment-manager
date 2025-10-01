import { describe, it, expect, beforeEach } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import {
    createMockBuilding,
    createMockUnitTypes,
    createMockUnits,
    createLargeUnits
} from './generator-fixtures';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Site Adaptations, Defaults and Performance', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];

    beforeEach(() => {
        mockBuilding = createMockBuilding();
        mockUnitTypes = createMockUnitTypes();
        mockUnits = createMockUnits();
    });

    describe('Site-Specific Adaptations', () => {
        it('should generate Apartments.com specific format', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Apartments.com uses floorplan/model structure
            expect(xml).toContain('<Floorplan>');
            expect(xml).toContain('<FloorplanID>');
        });

        it('should generate Zillow specific format', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'zillow'
            });

            // Zillow might have different requirements
            expect(xml).toContain('<PhysicalProperty xmlns=');
            // Add Zillow-specific assertions as needed
        });
    });

    describe('Default Values', () => {
        it('should provide sensible defaults for missing MITS required fields', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            // Defaults for missing required MITS fields
            expect(xml).toContain('<ILS_Identification>');
            expect(xml).toContain('<RentalType>Market Rate</RentalType>'); // Default
            expect(xml).toContain('<LastUpdate>'); // Should include current timestamp
        });

        it('should generate valid management company defaults', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Management>');
            expect(xml).toContain('<CompanyName>'); // Use building name as default
        });
    });

    describe('Performance', () => {
        it('should handle large datasets efficiently', async () => {
            // Generate 100 units
            const largeUnits = createLargeUnits(100);

            const startTime = Date.now();
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     largeUnits,
                siteName:  'apartments_com'
            });
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
            expect(xml).toContain('<ILSUnit>');
        });
    });
});
