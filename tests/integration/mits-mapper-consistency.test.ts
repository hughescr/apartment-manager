import { describe, it, expect } from 'bun:test';
import { generateMITSFeed } from '../../src/mits/generator';
import { inheritanceResolver } from '../../src/mappers/inheritance-resolver';
import { map } from 'lodash';
import type { BuildingData, UnitData, UnitTypeData } from '../../src/types';

describe('MITS Generator and Site Mapper Consistency', () => {
    const mockBuilding: BuildingData = {
        buildingID: 'consistency-test-building',
        buildingName: 'Consistency Test Apartments',
        street: '123 Test St',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        latitude: 34.0522,
        longitude: -118.2437,
        description: 'Test building for consistency verification',
        yearBuilt: 2020,
        numberStories: 3,
        totalUnits: 2,
        leaseLength: 12, // Building-level default
        contactInfo: {
            name: 'Test Manager',
            phone: '(555) 123-4567',
            email: 'test@example.com'
        }
    };

    const mockUnitTypes: UnitTypeData[] = [
        {
            buildingID: 'consistency-test-building',
            modelID: 'test-model',
            modelName: 'Test Unit Type',
            beds: 1,
            baths: 1,
            minRent: 1500,
            maxRent: 1700,
            minSqft: 750,
            maxSqft: 850,
            deposit: 1500,
            minLeaseTerm: 6,
            maxLeaseTerm: 18
        }
    ];

    const mockUnitsWithMissingFields: UnitData[] = [
        {
            buildingID: 'consistency-test-building',
            unitID: 'consistency-unit-1',
            unitNumber: '101',
            modelID: 'test-model',
            // Missing: beds, baths, sqft, rent, minLeaseTerm, maxLeaseTerm
            occupied: false,
            availableDate: '2025-02-01',
            feedInclusion: {
                apartments_com: true,
                zillow: true
            }
        }
    ];

    it('should produce identical inheritance resolution results between MITS and site mappers', async () => {
        const testUnit = mockUnitsWithMissingFields[0];
        const testUnitType = mockUnitTypes[0];

        // 1. Resolve using inheritance resolver directly (like site mappers do)
        const directlyResolved = inheritanceResolver.resolveUnitValues(
            testUnit,
            testUnitType,
            mockBuilding
        );

        // 2. Generate MITS XML and extract the resolved values
        const mitsXML = await generateMITSFeed({
            building: mockBuilding,
            unitTypes: mockUnitTypes,
            units: [testUnit],
            siteName: 'apartments_com'
        });

        // 3. Extract values from the MITS XML
        const unitStart = mitsXML.indexOf('<UnitID>consistency-unit-1</UnitID>');
        const unitEnd = mitsXML.indexOf('</Unit>', unitStart);
        const unitSection = mitsXML.substring(unitStart, unitEnd);

        // 4. Verify that MITS XML contains the same resolved values
        expect(unitSection).toContain(`<UnitBedrooms>${directlyResolved.beds}</UnitBedrooms>`);
        expect(unitSection).toContain(`<UnitBathrooms>${directlyResolved.baths}</UnitBathrooms>`);
        expect(unitSection).toContain(`<MinSquareFeet>${directlyResolved.sqft}</MinSquareFeet>`);
        expect(unitSection).toContain(`<MaxSquareFeet>${directlyResolved.sqft}</MaxSquareFeet>`);
        expect(unitSection).toContain(`<MarketRent>${directlyResolved.rent}</MarketRent>`);

        // 5. Verify specific expected values from inheritance
        expect(directlyResolved.beds).toBe(1); // From unit type
        expect(directlyResolved.baths).toBe(1); // From unit type
        expect(directlyResolved.sqft).toBe(750); // From unit type minSqft
        expect(directlyResolved.rent).toBe(1500); // From unit type minRent
        expect(directlyResolved.minLeaseTerm).toBe(6); // From unit type
        expect(directlyResolved.maxLeaseTerm).toBe(18); // From unit type
    });

    it('should handle inheritance chain consistently: Unit → UnitType → Building', async () => {
        // Create a unit that references a non-existent unit type
        const unitWithMissingType: UnitData = {
            buildingID: 'consistency-test-building',
            unitID: 'orphan-unit',
            unitNumber: '999',
            modelID: 'non-existent-model',
            beds: 2,
            baths: 2,
            sqft: 1000,
            rent: 2000,
            // Missing: lease terms should inherit from building
            occupied: false,
            availableDate: '2025-03-01',
            feedInclusion: {
                apartments_com: true,
                zillow: true
            }
        };

        // 1. Resolve directly
        const directlyResolved = inheritanceResolver.resolveUnitValues(
            unitWithMissingType,
            undefined, // No matching unit type
            mockBuilding
        );

        // 2. Generate MITS XML
        const mitsXML = await generateMITSFeed({
            building: mockBuilding,
            unitTypes: mockUnitTypes,
            units: [unitWithMissingType],
            siteName: 'apartments_com'
        });

        // 3. Verify that both methods produce the same results
        expect(directlyResolved.beds).toBe(2); // Explicit unit value
        expect(directlyResolved.baths).toBe(2); // Explicit unit value
        expect(directlyResolved.sqft).toBe(1000); // Explicit unit value
        expect(directlyResolved.rent).toBe(2000); // Explicit unit value
        expect(directlyResolved.minLeaseTerm).toBe(12); // From building.leaseLength
        expect(directlyResolved.maxLeaseTerm).toBe(12); // From building.leaseLength

        // 4. Verify MITS XML contains the unit data
        expect(mitsXML).toContain('<UnitID>orphan-unit</UnitID>');
        expect(mitsXML).toContain('<UnitBedrooms>2</UnitBedrooms>');
        expect(mitsXML).toContain('<UnitBathrooms>2</UnitBathrooms>');
        expect(mitsXML).toContain('<MinSquareFeet>1000</MinSquareFeet>');
        expect(mitsXML).toContain('<MarketRent>2000</MarketRent>');
    });

    it('should maintain data consistency for mixed complete and incomplete units', async () => {
        const mixedUnits: UnitData[] = [
            // Complete unit with all fields
            {
                buildingID: 'consistency-test-building',
                unitID: 'complete-unit',
                unitNumber: '201',
                modelID: 'test-model',
                beds: 2,
                baths: 2,
                sqft: 900,
                rent: 1800,
                minLeaseTerm: 12,
                maxLeaseTerm: 24,
                occupied: false,
                availableDate: '2025-02-01',
                feedInclusion: { apartments_com: true, zillow: true }
            },
            // Incomplete unit missing several fields
            {
                buildingID: 'consistency-test-building',
                unitID: 'incomplete-unit',
                unitNumber: '202',
                modelID: 'test-model',
                // Missing: beds, baths, sqft, rent, lease terms
                occupied: false,
                availableDate: '2025-02-15',
                feedInclusion: { apartments_com: true, zillow: true }
            }
        ];

        // Resolve both units using the inheritance resolver
        const resolvedUnits = map(mixedUnits, unit =>
            inheritanceResolver.resolveUnitValues(unit, mockUnitTypes[0], mockBuilding)
        );

        // Generate MITS XML
        const mitsXML = await generateMITSFeed({
            building: mockBuilding,
            unitTypes: mockUnitTypes,
            units: mixedUnits,
            siteName: 'apartments_com'
        });

        // Verify complete unit maintains its explicit values
        const completeUnitSection = mitsXML.substring(
            mitsXML.indexOf('<UnitID>complete-unit</UnitID>'),
            mitsXML.indexOf('</Unit>', mitsXML.indexOf('<UnitID>complete-unit</UnitID>'))
        );
        expect(completeUnitSection).toContain('<UnitBedrooms>2</UnitBedrooms>');
        expect(completeUnitSection).toContain('<UnitBathrooms>2</UnitBathrooms>');
        expect(completeUnitSection).toContain('<MinSquareFeet>900</MinSquareFeet>');
        expect(completeUnitSection).toContain('<MarketRent>1800</MarketRent>');

        // Verify incomplete unit gets inherited values
        const incompleteUnitSection = mitsXML.substring(
            mitsXML.indexOf('<UnitID>incomplete-unit</UnitID>'),
            mitsXML.indexOf('</Unit>', mitsXML.indexOf('<UnitID>incomplete-unit</UnitID>'))
        );
        expect(incompleteUnitSection).toContain('<UnitBedrooms>1</UnitBedrooms>'); // From unit type
        expect(incompleteUnitSection).toContain('<UnitBathrooms>1</UnitBathrooms>'); // From unit type
        expect(incompleteUnitSection).toContain('<MinSquareFeet>750</MinSquareFeet>'); // From unit type minSqft
        expect(incompleteUnitSection).toContain('<MarketRent>1500</MarketRent>'); // From unit type minRent

        // Verify resolved units match what's in the XML
        expect(resolvedUnits[0].beds).toBe(2); // Complete unit keeps explicit value
        expect(resolvedUnits[1].beds).toBe(1); // Incomplete unit inherits from type
        expect(resolvedUnits[0].rent).toBe(1800); // Complete unit keeps explicit value
        expect(resolvedUnits[1].rent).toBe(1500); // Incomplete unit inherits from type
    });
});
