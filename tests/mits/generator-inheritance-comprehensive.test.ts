import { describe, it, expect, beforeEach } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import { inheritanceResolver } from '../../src/mappers/inheritance-resolver';
import { parseStringPromise } from 'xml2js';
import { filter, forEach, padStart } from 'lodash';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Generator - Comprehensive Inheritance Integration', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnitsWithInheritance: UnitData[];

    beforeEach(() => {
        mockBuilding = {
            buildingID: 'test-building-1',
            buildingName: 'Inheritance Test Apartments',
            street: '123 Test St',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90001',
            latitude: 34.0522,
            longitude: -118.2437,
            description: 'Test building for comprehensive inheritance testing',
            yearBuilt: 2020,
            numberStories: 3,
            totalUnits: 8,
            propertyDescription: 'Test apartments with inheritance patterns',
            leaseLength: 12,
            contactInfo: {
                name: 'Test Manager',
                phone: '(555) 123-4567',
                email: 'test@example.com'
            }
        };

        mockUnitTypes = [
            {
                buildingID: 'test-building-1',
                modelID: 'model-studio',
                modelName: 'Studio',
                beds: 0,
                baths: 1,
                minRent: 1200,
                maxRent: 1400,
                minSqft: 450,
                maxSqft: 550,
                deposit: 1200,
                minLeaseTerm: 6,
                maxLeaseTerm: 18,
                maxOccupants: 2,
                perPersonRent: 1200,
                countAvailable: 2
            },
            {
                buildingID: 'test-building-1',
                modelID: 'model-1bed',
                modelName: 'One Bedroom',
                beds: 1,
                baths: 1,
                minRent: 1600,
                maxRent: 1800,
                minSqft: 750,
                maxSqft: 850,
                deposit: 1600,
                minLeaseTerm: 12,
                maxLeaseTerm: 24,
                maxOccupants: 3,
                perPersonRent: 800,
                countAvailable: 4
            },
            {
                buildingID: 'test-building-1',
                modelID: 'model-2bed',
                modelName: 'Two Bedroom',
                beds: 2,
                baths: 2,
                minRent: 2000,
                maxRent: 2000, // Same min/max for testing
                minSqft: 1000,
                maxSqft: 1000, // Same min/max for testing
                deposit: 2000,
                minLeaseTerm: 12,
                maxLeaseTerm: 36,
                maxOccupants: 4,
                perPersonRent: 1000,
                countAvailable: 2
            }
        ];

        mockUnitsWithInheritance = [
            {
                // Unit with complete inheritance from studio model
                buildingID: 'test-building-1',
                unitID: 'unit-101',
                unitNumber: '101',
                modelID: 'model-studio',
                beds: undefined,        // Inherit: 0
                baths: undefined,       // Inherit: 1
                sqft: undefined,        // Inherit: 450 (minSqft)
                rent: undefined,        // Inherit: 1200 (minRent)
                deposit: undefined,     // Inherit: 1200
                maxOccupants: undefined, // Inherit: 2
                occupied: false,
                availableDate: '2025-02-01',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            {
                // Unit with partial inheritance and overrides
                buildingID: 'test-building-1',
                unitID: 'unit-201',
                unitNumber: '201',
                modelID: 'model-1bed',
                beds: undefined,        // Inherit: 1
                baths: 1.5,        // Override unit type (1)
                sqft: 900,         // Override range (750-850)
                rent: undefined,        // Inherit: 1600-1800 range
                deposit: 1800,     // Override: 1800 vs 1600
                maxOccupants: undefined, // Inherit: 3
                occupied: false,
                availableDate: '2025-02-15',
                feedInclusion: { apartments_com: true, zillow: false }
            },
            {
                // Unit with same min/max values (single value inheritance)
                buildingID: 'test-building-1',
                unitID: 'unit-301',
                unitNumber: '301',
                modelID: 'model-2bed',
                beds: undefined,        // Inherit: 2
                baths: undefined,       // Inherit: 2
                sqft: undefined,        // Inherit: 1000 (same min/max)
                rent: undefined,        // Inherit: 2000 (same min/max)
                deposit: undefined,     // Inherit: 2000
                maxOccupants: 6,   // Override: 6 vs 4
                occupied: false,
                availableDate: '2025-03-01',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            {
                // Custom unit with no unit type
                buildingID: 'test-building-1',
                unitID: 'unit-401',
                unitNumber: '401',
                modelID: '',       // No unit type
                beds: 3,           // Explicit value
                baths: 2.5,        // Explicit value
                sqft: 1200,        // Explicit value
                rent: 2500,        // Explicit value
                deposit: 2500,     // Explicit value
                maxOccupants: 6,   // Explicit value
                occupied: false,
                availableDate: '2025-03-15',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            {
                // Unit with non-existent unit type (should fall back gracefully)
                buildingID: 'test-building-1',
                unitID: 'unit-501',
                unitNumber: '501',
                modelID: 'model-nonexistent',
                beds: 2,           // Explicit values since unit type doesn't exist
                baths: 2,
                sqft: 1000,
                rent: 2200,
                occupied: true,    // Occupied unit
                availableDate: undefined,
                feedInclusion: { apartments_com: false, zillow: true }
            }
        ];
    });

    describe('MITS XML Generation with Inheritance Resolution', () => {
        it('should generate complete XML with all inherited values resolved', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnitsWithInheritance,
                siteName: 'apartments_com'
            });

            // Basic XML structure validation
            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('<PhysicalProperty xmlns="http://www.mitsproject.org/namespace"');
            expect(xml).toContain('<PropertyID>test-building-1</PropertyID>');

            // All available units should be present (occupied unit should be excluded)
            // All available units should be present (occupied unit should be excluded)
            const availableUnits: UnitData[] = filter(mockUnitsWithInheritance, u => !u.occupied && u.feedInclusion?.apartments_com) as UnitData[];
            expect(availableUnits).toHaveLength(4);

            // Verify each available unit appears in XML
            forEach(availableUnits, (unit) => {
                expect(xml).toContain(`<UnitID>${unit.unitID}</UnitID>`);
            });
        });

        it('should resolve inheritance for unit 101 (complete inheritance from studio)', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [mockUnitsWithInheritance[0]], // unit-101
                siteName: 'apartments_com'
            });

            // Find unit section in XML
            const unitStart = xml.indexOf('<UnitID>unit-101</UnitID>');
            const unitEnd = xml.indexOf('</Unit>', unitStart);
            const unitSection = xml.substring(unitStart, unitEnd);

            // Verify inherited values are populated
            expect(unitSection).toContain('<UnitBedrooms>0</UnitBedrooms>'); // Studio
            expect(unitSection).toContain('<UnitBathrooms>1</UnitBathrooms>');
            expect(unitSection).toContain('<MinSquareFeet>450</MinSquareFeet>');
            expect(unitSection).toContain('<MaxSquareFeet>450</MaxSquareFeet>'); // Uses minSqft since no explicit sqft
            expect(unitSection).toContain('<MarketRent>1200</MarketRent>'); // Uses minRent since no explicit rent
        });

        it('should handle mixed inheritance and overrides for unit 201', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [mockUnitsWithInheritance[1]], // unit-201
                siteName: 'apartments_com'
            });

            const unitStart = xml.indexOf('<UnitID>unit-201</UnitID>');
            const unitEnd = xml.indexOf('</Unit>', unitStart);
            const unitSection = xml.substring(unitStart, unitEnd);

            // Verify mix of inherited and overridden values
            expect(unitSection).toContain('<UnitBedrooms>1</UnitBedrooms>');     // Inherited from 1bed model
            expect(unitSection).toContain('<UnitBathrooms>1.5</UnitBathrooms>'); // Override (not 1)
            expect(unitSection).toContain('<MinSquareFeet>900</MinSquareFeet>');  // Override (not 750-850 range)
            expect(unitSection).toContain('<MaxSquareFeet>900</MaxSquareFeet>');  // Override uses same value
            expect(unitSection).toContain('<MarketRent>1600</MarketRent>');      // Inherited minRent (no explicit rent)
        });

        it('should handle same min/max inheritance for unit 301', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [mockUnitsWithInheritance[2]], // unit-301
                siteName: 'apartments_com'
            });

            const unitStart = xml.indexOf('<UnitID>unit-301</UnitID>');
            const unitEnd = xml.indexOf('</Unit>', unitStart);
            const unitSection = xml.substring(unitStart, unitEnd);

            // When min/max are the same, should use that single value
            expect(unitSection).toContain('<UnitBedrooms>2</UnitBedrooms>');
            expect(unitSection).toContain('<UnitBathrooms>2</UnitBathrooms>');
            expect(unitSection).toContain('<MinSquareFeet>1000</MinSquareFeet>'); // Same min/max
            expect(unitSection).toContain('<MaxSquareFeet>1000</MaxSquareFeet>');
            expect(unitSection).toContain('<MarketRent>2000</MarketRent>'); // Same min/max rent
        });

        it('should handle custom units without unit types', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [mockUnitsWithInheritance[3]], // unit-401 (custom)
                siteName: 'apartments_com'
            });

            const unitStart = xml.indexOf('<UnitID>unit-401</UnitID>');
            const unitEnd = xml.indexOf('</Unit>', unitStart);
            const unitSection = xml.substring(unitStart, unitEnd);

            // All values should be explicit (no inheritance available)
            expect(unitSection).toContain('<UnitBedrooms>3</UnitBedrooms>');
            expect(unitSection).toContain('<UnitBathrooms>2.5</UnitBathrooms>');
            expect(unitSection).toContain('<MinSquareFeet>1200</MinSquareFeet>');
            expect(unitSection).toContain('<MaxSquareFeet>1200</MaxSquareFeet>');
            expect(unitSection).toContain('<MarketRent>2500</MarketRent>');
        });

        it('should exclude occupied units from feed', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnitsWithInheritance, // Includes occupied unit-501
                siteName: 'apartments_com'
            });

            // Occupied unit should not appear in XML
            expect(xml).not.toContain('<UnitID>unit-501</UnitID>');

            // But available units should appear
            expect(xml).toContain('<UnitID>unit-101</UnitID>');
            expect(xml).toContain('<UnitID>unit-201</UnitID>');
            expect(xml).toContain('<UnitID>unit-301</UnitID>');
            expect(xml).toContain('<UnitID>unit-401</UnitID>');
        });

        it('should respect site-specific feed inclusion settings', async () => {
            const xmlApartments = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnitsWithInheritance,
                siteName: 'apartments_com'
            });

            const xmlZillow = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: mockUnitsWithInheritance,
                siteName: 'zillow'
            });

            // unit-201 has apartments_com: true, zillow: false
            expect(xmlApartments).toContain('<UnitID>unit-201</UnitID>');
            expect(xmlZillow).not.toContain('<UnitID>unit-201</UnitID>');

            // unit-101 has both enabled
            expect(xmlApartments).toContain('<UnitID>unit-101</UnitID>');
            expect(xmlZillow).toContain('<UnitID>unit-101</UnitID>');
        });
    });

    describe('Inheritance Consistency with Site Mappers', () => {
        it('should produce identical inheritance resolution as site mappers', async () => {
            const testUnit = mockUnitsWithInheritance[0]; // unit-101 with complete inheritance
            const testUnitType = mockUnitTypes[0]; // model-studio

            // Resolve using inheritance resolver directly (like site mappers)
            const resolvedByResolver = inheritanceResolver.resolveUnitValues(
                testUnit,
                testUnitType,
                mockBuilding
            );

            // Generate MITS XML (uses same resolver internally)
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [testUnit],
                siteName: 'apartments_com'
            });

            // Extract values from XML and compare
            const unitStart = xml.indexOf('<UnitID>unit-101</UnitID>');
            const unitEnd = xml.indexOf('</Unit>', unitStart);
            const unitSection = xml.substring(unitStart, unitEnd);

            // Beds
            const bedsMatch = unitSection.match(/<UnitBedrooms>(\d+)<\/UnitBedrooms>/);
            expect(bedsMatch?.[1]).toBe(String(resolvedByResolver.beds));

            // Baths
            const bathsMatch = unitSection.match(/<UnitBathrooms>([\d.]+)<\/UnitBathrooms>/);
            expect(bathsMatch?.[1]).toBe(String(resolvedByResolver.baths));

            // Square feet
            const sqftMatch = unitSection.match(/<MinSquareFeet>(\d+)<\/MinSquareFeet>/);
            expect(sqftMatch?.[1]).toBe(String(resolvedByResolver.sqft));

            // Rent
            const rentMatch = unitSection.match(/<MarketRent>(\d+)<\/MarketRent>/);
            expect(rentMatch?.[1]).toBe(String(resolvedByResolver.rent));
        });

        it('should handle complex inheritance scenarios consistently', async () => {
            const testUnit = mockUnitsWithInheritance[1]; // unit-201 with mixed inheritance/overrides
            const testUnitType = mockUnitTypes[1]; // model-1bed

            const resolvedByResolver = inheritanceResolver.resolveUnitValues(
                testUnit,
                testUnitType,
                mockBuilding
            );

            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [testUnit],
                siteName: 'apartments_com'
            });

            const unitStart = xml.indexOf('<UnitID>unit-201</UnitID>');
            const unitEnd = xml.indexOf('</Unit>', unitStart);
            const unitSection = xml.substring(unitStart, unitEnd);

            // Check that overridden values match
            expect(resolvedByResolver.baths).toBe(1.5); // Override
            expect(resolvedByResolver.sqft).toBe(900);  // Override

            // Check that inherited values match
            expect(resolvedByResolver.beds).toBe(1); // Inherited from unit type

            // Verify XML matches resolved values
            expect(unitSection).toContain(`<UnitBedrooms>${resolvedByResolver.beds}</UnitBedrooms>`);
            expect(unitSection).toContain(`<UnitBathrooms>${resolvedByResolver.baths}</UnitBathrooms>`);
            expect(unitSection).toContain(`<MinSquareFeet>${resolvedByResolver.sqft}</MinSquareFeet>`);
        });

        it('should handle units with missing unit types consistently', async () => {
            const testUnit = {
                ...mockUnitsWithInheritance[4], // unit with non-existent unit type
                occupied: false // Make available for testing
            };

            const resolvedByResolver = inheritanceResolver.resolveUnitValues(
                testUnit,
                undefined, // No unit type found
                mockBuilding
            );

            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [testUnit],
                siteName: 'apartments_com'
            });

            // Should use explicit values when no inheritance available
            expect(resolvedByResolver.beds).toBe(2);
            expect(resolvedByResolver.baths).toBe(2);
            expect(resolvedByResolver.sqft).toBe(1000);
            expect(resolvedByResolver.rent).toBe(2200);

            // Verify XML contains the unit and uses explicit values
            expect(xml).toContain('<UnitID>unit-501</UnitID>');
            expect(xml).toContain('<UnitBedrooms>2</UnitBedrooms>');
            expect(xml).toContain('<UnitBathrooms>2</UnitBathrooms>');
            expect(xml).toContain('<MinSquareFeet>1000</MinSquareFeet>');
            expect(xml).toContain('<MarketRent>2200</MarketRent>');
        });
    });

    describe('XML Structure and Completeness', () => {
        it('should produce well-formed XML with inheritance data', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: filter(mockUnitsWithInheritance, u => !u.occupied),
                siteName: 'apartments_com'
            });

            // Parse XML to ensure it's well-formed
            const parsedXml = await parseStringPromise(xml);
            expect(parsedXml).toBeDefined();
            expect(parsedXml.PhysicalProperty).toBeDefined();
        });

        it('should include all required MITS elements for inherited units', async () => {
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [mockUnitsWithInheritance[0]], // Complete inheritance unit
                siteName: 'apartments_com'
            });

            // Check for presence of all critical elements that should be populated via inheritance
            expect(xml).toMatch(/<UnitBedrooms>\d+<\/UnitBedrooms>/);
            expect(xml).toMatch(/<UnitBathrooms>[\d.]+<\/UnitBathrooms>/);
            expect(xml).toMatch(/<MinSquareFeet>\d+<\/MinSquareFeet>/);
            expect(xml).toMatch(/<MaxSquareFeet>\d+<\/MaxSquareFeet>/);
            expect(xml).toMatch(/<MarketRent>\d+<\/MarketRent>/);
            expect(xml).toMatch(/<AvailableDate>\d{4}-\d{2}-\d{2}<\/AvailableDate>/);
        });

        it('should handle edge cases in inheritance gracefully', async () => {
            // Create unit with edge case data
            const edgeCaseUnit: UnitData = {
                buildingID: 'test-building-1',
                unitID: 'unit-edge',
                unitNumber: 'EDGE',
                modelID: 'model-studio',
                beds: 0,           // Studio (0 beds should not be treated as null)
                baths: undefined,       // Should inherit
                sqft: undefined,        // Should inherit
                rent: 0,           // $0 rent (edge case - should not be treated as null)
                occupied: false,
                availableDate: '2025-04-01',
                feedInclusion: { apartments_com: true, zillow: true }
            };

            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: [edgeCaseUnit],
                siteName: 'apartments_com'
            });

            const unitStart = xml.indexOf('<UnitID>unit-edge</UnitID>');
            const unitEnd = xml.indexOf('</Unit>', unitStart);
            const unitSection = xml.substring(unitStart, unitEnd);

            // 0 beds should be preserved (not inherited)
            expect(unitSection).toContain('<UnitBedrooms>0</UnitBedrooms>');

            // Baths should be inherited from unit type
            expect(unitSection).toContain('<UnitBathrooms>1</UnitBathrooms>');

            // $0 rent should be preserved (not inherited)
            expect(unitSection).toContain('<MarketRent>0</MarketRent>');
        });

        it('should maintain inheritance behavior across different MITS site configurations', async () => {
            const testUnits = [mockUnitsWithInheritance[0], mockUnitsWithInheritance[1]];

            // Generate for different sites
            const apartmentsXml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: testUnits,
                siteName: 'apartments_com'
            });

            const zillowXml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: testUnits,
                siteName: 'zillow'
            });

            // Inheritance resolution should be identical regardless of site
            const apartmentsUnit101 = apartmentsXml.substring(
                apartmentsXml.indexOf('<UnitID>unit-101</UnitID>'),
                apartmentsXml.indexOf('</Unit>', apartmentsXml.indexOf('<UnitID>unit-101</UnitID>'))
            );

            const zillowUnit101 = zillowXml.substring(
                zillowXml.indexOf('<UnitID>unit-101</UnitID>'),
                zillowXml.indexOf('</Unit>', zillowXml.indexOf('<UnitID>unit-101</UnitID>'))
            );

            // Core unit data should be identical
            expect(apartmentsUnit101).toContain('<UnitBedrooms>0</UnitBedrooms>');
            expect(zillowUnit101).toContain('<UnitBedrooms>0</UnitBedrooms>');
            expect(apartmentsUnit101).toContain('<MarketRent>1200</MarketRent>');
            expect(zillowUnit101).toContain('<MarketRent>1200</MarketRent>');
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle inheritance resolution efficiently for many units', async () => {
            // Create a larger dataset for performance testing
            const manyUnits: UnitData[] = [];
            for(let i = 1; i <= 100; i++) {
                manyUnits.push({
                    buildingID: 'test-building-1',
                    unitID: `unit-${padStart(i.toString(), 3, '0')}`,
                    unitNumber: `${padStart(i.toString(), 3, '0')}`,
                    modelID: i % 2 === 0 ? 'model-1bed' : 'model-studio',
                    beds: i % 3 === 0 ? 2 : undefined,     // Some overrides
                    baths: i % 4 === 0 ? 1.5 : undefined,  // Some overrides
                    sqft: i % 5 === 0 ? 800 : undefined,   // Some overrides
                    rent: i % 6 === 0 ? 1750 : undefined,  // Some overrides
                    occupied: i % 10 === 0,            // 10% occupied
                    availableDate: i % 10 === 0 ? undefined : '2025-04-01',
                    feedInclusion: { apartments_com: true, zillow: true }
                });
            }

            const startTime = Date.now();
            const xml = await generateMITSFeed({
                building: mockBuilding,
                unitTypes: mockUnitTypes,
                units: manyUnits,
                siteName: 'apartments_com'
            });
            const duration = Date.now() - startTime;

            // Should complete within reasonable time (adjust threshold as needed)
            expect(duration).toBeLessThan(5000); // 5 seconds

            // Should generate XML with expected unit count (90 available units)
            const unitMatches = xml.match(/<UnitID>unit-\d+<\/UnitID>/g) || [];
            expect(unitMatches.length).toBe(90); // 100 - 10 occupied
        });
    });
});
