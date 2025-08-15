import { describe, it, expect, beforeEach } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import { validateMITSXML } from '../../src/mits/validator';
import {
    createMockBuilding,
    createMockUnitTypes,
    createMockUnits,
    createMinimalBuilding,
    createBuildingWithSpecialChars,
    createBuildingWithoutAddress
} from './generator-fixtures';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Core Generator', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnits: UnitData[];

    beforeEach(() => {
        mockBuilding = createMockBuilding();
        mockUnitTypes = createMockUnitTypes();
        mockUnits = createMockUnits();
    });

    describe('Basic XML Generation', () => {
        it('should generate valid MITS 4.1 XML structure', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('<PhysicalProperty xmlns=');
            expect(xml).toContain('</PhysicalProperty>');
        });

        it('should include property identification', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Property_ID>');
            expect(xml).toContain('<Identification>');
            expect(xml).toContain(`<PropertyID>${mockBuilding.buildingID}</PropertyID>`);
            expect(xml).toContain(`<MarketingName>${mockBuilding.buildingName}</MarketingName>`);
        });

        it('should include property address', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Property_ID>');
            expect(xml).toContain('<Address>');
            expect(xml).toContain(`<Address>${mockBuilding.street}</Address>`);
            expect(xml).toContain(`<City>${mockBuilding.city}</City>`);
            expect(xml).toContain(`<State>${mockBuilding.state}</State>`);
            expect(xml).toContain(`<PostalCode>${mockBuilding.zip}</PostalCode>`);
        });

        it('should include contact information', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('<Information>');
            expect(xml).toContain(`<PhoneNumber>${mockBuilding.contactInfo?.phone}</PhoneNumber>`);
            expect(xml).toContain(`<Email>${mockBuilding.contactInfo?.email}</Email>`);
        });

        it('should include UnitCount in Information section', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            // Should include count of units included in the feed
            expect(xml).toContain('<UnitCount>2</UnitCount>');
        });

        it('should always include Address even when missing', async () => {
            const buildingWithoutAddress = createBuildingWithoutAddress();

            const xml = await generateMITSFeed({
                building: buildingWithoutAddress,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            // Address is required by MITS spec, should have fallback values
            expect(xml).toContain('<Address>');
            expect(xml).toContain('<Address>Address Not Provided</Address>');
            expect(xml).toContain('<City>City Not Provided</City>');
            expect(xml).toContain('<State>CA</State>');
            expect(xml).toContain('<PostalCode>00000</PostalCode>');
        });
    });

    describe('XML Special Characters', () => {
        it('should properly escape XML special characters', async () => {
            const buildingWithSpecialChars = createBuildingWithSpecialChars();

            const xml = await generateMITSFeed({
                building: buildingWithSpecialChars,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            expect(xml).toContain('Smith &amp; Jones Apartments');
            expect(xml).toContain('Units &lt; 1000 sqft');
            expect(xml).toContain('&quot;great&quot; views &amp; more');
        });

        it('should handle missing optional fields gracefully', async () => {
            const minimalBuilding = createMinimalBuilding();

            const xml = await generateMITSFeed({
                building: minimalBuilding,
                unitTypes: [],
                units: [],
                siteName: 'apartments_com'
            });

            // Should still generate valid XML structure
            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('<PhysicalProperty xmlns=');
            expect(validateMITSXML(xml)).toBe(true);
        });
    });

    describe('Validation', () => {
        it('should generate XML that passes MITS validation', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnits,
                siteName: 'apartments_com'
            });

            const isValid = validateMITSXML(xml);
            expect(isValid).toBe(true);
        });

        it('should reject invalid building data', async () => {
            expect(async () => {
                await generateMITSFeed({
                    building: { buildingID: '' }, // Invalid: empty ID
                    unitTypes: [],
                    units: [],
                    siteName: 'apartments_com'
                });
            }).toThrow('Building ID is required');
        });
    });
});
