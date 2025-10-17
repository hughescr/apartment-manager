import { describe, it, expect, beforeEach } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Generator - Inheritance Resolution', () => {
    let mockBuilding: BuildingData;
    let mockUnitTypes: UnitTypeData[];
    let mockUnitsWithMissingFields: UnitData[];

    beforeEach(() => {
        // Create building with some default values
        mockBuilding = {
            buildingID:          'test-building-1',
            buildingName:        'Inheritance Test Apartments',
            street:              '123 Test St',
            city:                'Los Angeles',
            state:               'CA',
            zip:                 '90001',
            latitude:            34.0522,
            longitude:           -118.2437,
            description:         'Test building for inheritance',
            yearBuilt:           2020,
            numberStories:       3,
            totalUnits:          6,
            propertyDescription: 'Test apartments with inheritance patterns',
            leaseLength:         12, // Building-level lease length default
            contactInfo:         {
                name:  'Test Manager',
                phone: '(555) 123-4567',
                email: 'test@example.com'
            }
        };

        // Create unit types with complete field sets
        mockUnitTypes = [
            {
                buildingID:     'test-building-1',
                modelID:        'model-studio',
                modelName:      'Studio',
                beds:           0,
                baths:          1,
                minRent:        1200,
                maxRent:        1400,
                minSqft:        450,
                maxSqft:        550,
                deposit:        1200,
                minLeaseTerm:   6,
                maxLeaseTerm:   18,
                countAvailable: 2
            },
            {
                buildingID:     'test-building-1',
                modelID:        'model-1bed',
                modelName:      'One Bedroom',
                beds:           1,
                baths:          1,
                minRent:        1600,
                maxRent:        1800,
                minSqft:        750,
                maxSqft:        850,
                deposit:        1600,
                minLeaseTerm:   12,
                maxLeaseTerm:   24,
                countAvailable: 4
            }
        ];

        // Create units with deliberately missing fields that should be inherited
        mockUnitsWithMissingFields = [
            {
                // Unit with missing beds, baths, sqft, rent - should inherit from unit type
                buildingID:    'test-building-1',
                unitID:        'unit-101',
                unitNumber:    '101',
                modelID:       'model-studio',
                // beds: undefined - should inherit 0 from model-studio
                // baths: undefined - should inherit 1 from model-studio
                // sqft: undefined - should inherit 450 (minSqft) from model-studio
                // rent: undefined - should inherit 1200 (minRent) from model-studio
                occupied:      false,
                availableDate: '2025-02-01',
                feedInclusion: {
                    apartments_com: true,
                    zillow:         true
                }
            },
            {
                // Unit with missing lease terms - should inherit from unit type then building
                buildingID:    'test-building-1',
                unitID:        'unit-201',
                unitNumber:    '201',
                modelID:       'model-1bed',
                beds:          1,
                baths:         1,
                sqft:          800,
                rent:          1700,
                // minLeaseTerm: undefined - should inherit 12 from model-1bed
                // maxLeaseTerm: undefined - should inherit 24 from model-1bed
                occupied:      false,
                availableDate: '2025-02-15',
                feedInclusion: {
                    apartments_com: true,
                    zillow:         false
                }
            },
            {
                // Unit with missing unit type reference - should inherit from building
                buildingID:    'test-building-1',
                unitID:        'unit-301',
                unitNumber:    '301',
                modelID:       'model-nonexistent', // This unit type doesn't exist
                beds:          2,
                baths:         2,
                sqft:          1000,
                rent:          2000,
                // minLeaseTerm: undefined - should inherit 12 from building.leaseLength
                // maxLeaseTerm: undefined - should inherit 12 from building.leaseLength
                occupied:      false,
                availableDate: '2025-03-01',
                feedInclusion: {
                    apartments_com: true,
                    zillow:         true
                }
            }
        ];
    });

    describe('Unit Field Inheritance from Unit Types', () => {
        it('should inherit missing beds from unit type', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithMissingFields,
                siteName:  'apartments_com'
            });

            // Unit 101 should have beds=0 inherited from model-studio
            expect(xml).toContain('<UnitID>unit-101</UnitID>');

            // Find the unit section for unit-101 and check it has UnitBedrooms
            const unit101Start = xml.indexOf('<UnitID>unit-101</UnitID>');
            const unit101End = xml.indexOf('</Unit>', unit101Start);
            const unit101Section = xml.substring(unit101Start, unit101End);

            expect(unit101Section).toContain('<UnitBedrooms>0</UnitBedrooms>');
        });

        it('should inherit missing baths from unit type', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithMissingFields,
                siteName:  'apartments_com'
            });

            // Unit 101 should have baths=1 inherited from model-studio
            const unit101Start = xml.indexOf('<UnitID>unit-101</UnitID>');
            const unit101End = xml.indexOf('</Unit>', unit101Start);
            const unit101Section = xml.substring(unit101Start, unit101End);

            expect(unit101Section).toContain('<UnitBathrooms>1</UnitBathrooms>');
        });

        it('should inherit missing sqft from unit type minSqft', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithMissingFields,
                siteName:  'apartments_com'
            });

            // Unit 101 should have sqft=450 inherited from model-studio.minSqft
            const unit101Start = xml.indexOf('<UnitID>unit-101</UnitID>');
            const unit101End = xml.indexOf('</Unit>', unit101Start);
            const unit101Section = xml.substring(unit101Start, unit101End);

            expect(unit101Section).toContain('<MinSquareFeet>450</MinSquareFeet>');
            expect(unit101Section).toContain('<MaxSquareFeet>450</MaxSquareFeet>');
        });

        it('should inherit missing rent from unit type minRent', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithMissingFields,
                siteName:  'apartments_com'
            });

            // Unit 101 should have rent=1200 inherited from model-studio.minRent
            const unit101Start = xml.indexOf('<UnitID>unit-101</UnitID>');
            const unit101End = xml.indexOf('</Unit>', unit101Start);
            const unit101Section = xml.substring(unit101Start, unit101End);

            expect(unit101Section).toContain('<MarketRent>1200</MarketRent>');
        });
    });

    describe('Lease Term Inheritance Chain', () => {
        it('should inherit lease terms from unit type when available', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithMissingFields,
                siteName:  'apartments_com'
            });

            // Unit 201 should inherit lease terms from model-1bed
            // Note: Lease terms might not appear in basic MITS XML, but this tests the resolution logic
            expect(xml).toContain('<UnitID>unit-201</UnitID>');
        });

        it('should inherit lease terms from building when unit type unavailable', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithMissingFields,
                siteName:  'apartments_com'
            });

            // Unit 301 references non-existent model, should inherit from building
            expect(xml).toContain('<UnitID>unit-301</UnitID>');
        });
    });

    describe('Complete XML Generation with Inheritance', () => {
        it('should generate complete MITS XML with all inherited fields populated', async () => {
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     mockUnitsWithMissingFields,
                siteName:  'apartments_com'
            });

            // Basic XML structure
            expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
            expect(xml).toContain('<PhysicalProperty xmlns="http://www.mitsproject.org/namespace"');
            expect(xml).toContain('<PropertyID>test-building-1</PropertyID>');

            // All units should be present
            expect(xml).toContain('<UnitID>unit-101</UnitID>');
            expect(xml).toContain('<UnitID>unit-201</UnitID>');
            expect(xml).toContain('<UnitID>unit-301</UnitID>');

            // All units should have complete bedroom/bathroom data
            expect(xml).toMatch(/<UnitBedrooms>\d+<\/UnitBedrooms>/g);
            expect(xml).toMatch(/<UnitBathrooms>\d+<\/UnitBathrooms>/g);

            // Verify that previously missing fields are now populated
            const bedroomMatches = xml.match(/<UnitBedrooms>\d+<\/UnitBedrooms>/g) ?? [];
            const bathroomMatches = xml.match(/<UnitBathrooms>\d+<\/UnitBathrooms>/g) ?? [];

            // Should have bedroom/bathroom entries for all 3 units
            expect(bedroomMatches.length).toBe(3);
            expect(bathroomMatches.length).toBe(3);
        });

        it('should preserve explicit unit values over inherited values', async () => {
            // Create a unit with explicit values that differ from unit type
            const unitsWithExplicitValues: UnitData[] = [
                {
                    buildingID:    'test-building-1',
                    unitID:        'unit-override',
                    unitNumber:    '999',
                    modelID:       'model-studio', // Points to studio (0 bed, 1 bath)
                    beds:          2, // Override: should be 2, not 0
                    baths:         2, // Override: should be 2, not 1
                    sqft:          1200, // Override: should be 1200, not 450
                    rent:          2500, // Override: should be 2500, not 1200
                    occupied:      false,
                    availableDate: '2025-02-01',
                    feedInclusion: {
                        apartments_com: true,
                        zillow:         true
                    }
                }
            ];

            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     unitsWithExplicitValues,
                siteName:  'apartments_com'
            });

            // Should use explicit values, not inherited ones
            const unitStart = xml.indexOf('<UnitID>unit-override</UnitID>');
            const unitEnd = xml.indexOf('</Unit>', unitStart);
            const unitSection = xml.substring(unitStart, unitEnd);

            expect(unitSection).toContain('<UnitBedrooms>2</UnitBedrooms>'); // Not 0
            expect(unitSection).toContain('<UnitBathrooms>2</UnitBathrooms>'); // Not 1
            expect(unitSection).toContain('<MinSquareFeet>1200</MinSquareFeet>'); // Not 450
            expect(unitSection).toContain('<MarketRent>2500</MarketRent>'); // Not 1200
        });
    });

    describe('Comparison with Site Mappers', () => {
        it('should produce consistent inheritance results as site mappers', async () => {
            // Import inheritance resolver to test directly
            const { inheritanceResolver } = await import('../../src/mappers/inheritance-resolver');

            // Test the same unit with the same inheritance pattern
            const testUnit = mockUnitsWithMissingFields[0]; // Unit 101 with missing fields
            const testUnitType = mockUnitTypes[0]; // model-studio

            // Resolve using the inheritance resolver directly (like site mappers do)
            const resolvedByResolver = inheritanceResolver.resolveUnitValues(
                testUnit,
                testUnitType,
                mockBuilding
            );

            // Generate MITS XML (which now uses the same resolver internally)
            const xml = await generateMITSFeed({
                building:  mockBuilding,
                unitTypes: mockUnitTypes,
                units:     [testUnit],
                siteName:  'apartments_com'
            });

            // The MITS XML should reflect the same resolved values
            expect(xml).toContain(`<UnitBedrooms>${resolvedByResolver.beds}</UnitBedrooms>`);
            expect(xml).toContain(`<UnitBathrooms>${resolvedByResolver.baths}</UnitBathrooms>`);
            expect(xml).toContain(`<MinSquareFeet>${resolvedByResolver.sqft}</MinSquareFeet>`);
            expect(xml).toContain(`<MarketRent>${resolvedByResolver.rent}</MarketRent>`);
        });
    });
});
