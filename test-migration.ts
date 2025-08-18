/**
 * Test the migration logic without requiring AWS resources
 */
import { generateBuildingName } from './src/utils/index.js';
import { forEach } from 'lodash';
import {
    completeBuilding,
    minimalBuilding,
    complexAmenitiesBuilding,
    petFriendlyBuilding,
    sparseBuilding,
    studentHousingBuilding,
    seniorLivingBuilding,
    affordableHousingBuilding,
    townhomeBuilding,
    noPetsBuilding
} from './tests/fixtures/mappers/building-fixtures.js';

interface TestBuilding {
    buildingID: string
    street?: string
    buildingName?: string
}

function testBuildingNameGeneration() {
    // Testing building name generation logic

    const testBuildings: TestBuilding[] = [
        completeBuilding,
        minimalBuilding,
        complexAmenitiesBuilding,
        petFriendlyBuilding,
        sparseBuilding,
        studentHousingBuilding,
        seniorLivingBuilding,
        affordableHousingBuilding,
        townhomeBuilding,
        noPetsBuilding
    ];

    let processed = 0;
    let withExistingNames = 0;
    let successfulGeneration = 0;
    let fallbackUsed = 0;

    forEach(testBuildings, (building) => {
        processed++;

        // Check if building already has a name
        if(building.buildingName) {
            withExistingNames++;
            return;
        }

        // Generate name from street address
        let generatedName = '';
        if(building.street) {
            generatedName = generateBuildingName(building.street);
        }

        // Fallback to building ID if no street address or generation failed
        if(!generatedName) {
            generatedName = building.buildingID;
            fallbackUsed++;
        } else {
            successfulGeneration++;
        }
    });

    // Test edge cases
    const edgeCases = [
        { street: '1260 NW Naito Pkwy', expected: '1260 Naito' },
        { street: '1399 California St', expected: '1399 California' },
        { street: '2811 Sand Hill Rd', expected: '2811 Sand Hill' },
        { street: '123 Main Street', expected: '123 Main' },
        { street: '456 Oak Ave', expected: '456 Oak' },
        { street: '789 SW Portland Blvd', expected: '789 Portland' },
        { street: '', expected: '' },
        { street: '   ', expected: '' },
        { street: '123', expected: '123' },
        { street: 'No Number Street', expected: 'No Number Street' }
    ];

    let edgeCasesPassed = 0;
    let edgeCasesFailed = 0;

    forEach(edgeCases, ({ street, expected }) => {
        const result = generateBuildingName(street);
        const passed = result === expected;

        if(passed) {
            edgeCasesPassed++;
        } else {
            edgeCasesFailed++;
        }
    });

    return {
        processed,
        withExistingNames,
        successfulGeneration,
        fallbackUsed,
        edgeCasesPassed,
        edgeCasesFailed
    };
}

// Run the test
const results = testBuildingNameGeneration();

if(results.edgeCasesFailed === 0) {
    // All tests passed - migration logic working correctly
} else {
    // Some edge cases failed - review needed
}
