import { describe, it, expect, beforeEach } from 'bun:test';
import { filter } from 'lodash';
import { generateMultiBuildingMITSFeed } from '../../src/mits/generator';
import {
    createMockBuilding,
    createMockUnitTypes,
    createMockUnits,
    createSecondMockBuilding,
    createSecondMockUnitTypes,
    createSecondMockUnits
} from './generator-fixtures';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Multi-Building Generator', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];
    let building2: BuildingData;
    let unitTypes2: UnitTypeData[];
    let units2: UnitData[];

    beforeEach(() => {
        mockBuilding = createMockBuilding();
        mockUnitTypes = createMockUnitTypes();
        mockUnits = createMockUnits();
        building2 = createSecondMockBuilding();
        unitTypes2 = createSecondMockUnitTypes();
        units2 = createSecondMockUnits();
    });

    describe('Multi-Building Feed Generation', () => {
        it('should generate feed for multiple buildings', async () => {
            const xml = await generateMultiBuildingMITSFeed({
                buildings: [mockBuilding, building2],
                unitTypesByBuilding: {
                    'test-building-1': mockUnitTypes,
                    'test-building-2': unitTypes2
                },
                unitsByBuilding: {
                    'test-building-1': filter(mockUnits, u => u.feedInclusion?.apartments_com) as UnitData[],
                    'test-building-2': units2
                },
                siteName: 'apartments_com'
            });

            // Should have wrapper for multiple properties
            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('<PhysicalProperties');
            expect(xml).toContain('</PhysicalProperties>');

            // Should contain both buildings
            expect(xml).toContain('test-building-1');
            expect(xml).toContain('Sunset Apartments');
            expect(xml).toContain('test-building-2');
            expect(xml).toContain('Sunrise Apartments');

            // Should have multiple PhysicalProperty elements
            const propertyMatches = xml.match(/<PhysicalProperty>/g);
            expect(propertyMatches?.length).toBe(2);
        });

        it('should handle empty buildings array', async () => {
            const xml = await generateMultiBuildingMITSFeed({
                buildings: [],
                unitTypesByBuilding: {},
                unitsByBuilding: {},
                siteName: 'zillow'
            });

            expect(xml).toContain('<PhysicalProperties');
            expect(xml).toContain('</PhysicalProperties>');
            expect(xml).toContain('<LastUpdate>');
        });

        it('should filter units by site correctly in multi-building feed', async () => {
            const xml = await generateMultiBuildingMITSFeed({
                buildings: [mockBuilding],
                unitTypesByBuilding: {
                    'test-building-1': mockUnitTypes
                },
                unitsByBuilding: {
                    'test-building-1': mockUnits // Has mixed feedInclusion settings
                },
                siteName: 'zillow'
            });

            // Should only include unit-101 (has zillow: true)
            expect(xml).toContain('unit-101');
            // Should NOT include unit-201 (has zillow: false)
            expect(xml).not.toContain('unit-201');
        });
    });
});
