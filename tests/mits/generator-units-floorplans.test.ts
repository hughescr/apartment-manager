import { describe, it, expect, beforeEach } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import {
    createMockBuilding,
    createMockUnitTypes,
    createMockUnits
} from './generator-fixtures';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Units and Floorplans Generator', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];

    beforeEach(() => {
        mockBuilding = createMockBuilding();
        mockUnitTypes = createMockUnitTypes();
        mockUnits = createMockUnits();
    });

    describe('Floorplan (Model) Generation', () => {
        it('should generate floorplan entries for each unit type', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Floorplan>');
            expect(xml).toContain(`<Name>${mockUnitTypes[0].modelName}</Name>`);
            expect(xml).toContain(`<Name>${mockUnitTypes[1].modelName}</Name>`);
        });

        it('should include room configuration', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<Room>');
            // Studio (0 beds) should not have bedroom entry per MITS spec
            // One bedroom unit should have bedroom entry
            expect(xml).toContain('<RoomType>bedroom</RoomType>');
            expect(xml).toContain('<RoomType>bathroom</RoomType>');
            expect(xml).toContain(`<Count>${mockUnitTypes[1].beds}</Count>`); // Check 1-bedroom count instead
        });

        it('should include square footage range', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<SquareFeet>');
            expect(xml).toContain(`<Min>${mockUnitTypes[0].minSqft}</Min>`);
            expect(xml).toContain(`<Max>${mockUnitTypes[0].maxSqft}</Max>`);
        });

        it('should include rent range', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<MarketRent>');
            expect(xml).toContain(`<Min>${mockUnitTypes[0].minRent}</Min>`);
            expect(xml).toContain(`<Max>${mockUnitTypes[0].maxRent}</Max>`);
        });
    });

    describe('Unit Generation', () => {
        it('should only include units marked for the specified site', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'zillow'
            });

            // Unit 101 should be included (zillow: true)
            expect(xml).toContain('<UnitID>unit-101</UnitID>');

            // Unit 201 should NOT be included (zillow: false)
            expect(xml).not.toContain('<UnitID>unit-201</UnitID>');
        });

        it('should include unit availability information', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain('<ILSUnit>');
            expect(xml).toContain('<Units>');
            expect(xml).toContain(`<UnitNumber>${mockUnits[0].unitNumber}</UnitNumber>`);
            expect(xml).toContain('<UnitBedrooms>0</UnitBedrooms>');
            expect(xml).toContain('<UnitBathrooms>1</UnitBathrooms>');
        });

        it('should include unit rent and availability date', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain(`<MarketRent>${mockUnits[0].rent}</MarketRent>`);
            expect(xml).toContain(`<AvailableDate>${mockUnits[0].availableDate}</AvailableDate>`);
        });

        it('should link units to their floorplan', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnits,
                siteName:  'apartments_com'
            });

            expect(xml).toContain(`<FloorplanID>${mockUnits[0].modelID}</FloorplanID>`);
        });
    });
});
