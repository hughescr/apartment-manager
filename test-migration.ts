/**
 * Test the migration logic without requiring AWS resources
 */
import { generateBuildingName } from './src/utils/index.js';
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
    console.log('🧪 Testing building name generation logic...\n');

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

    console.log('📋 Test Results:');
    console.log('================\n');

    testBuildings.forEach((building) => {
        processed++;

        // Check if building already has a name
        if(building.buildingName) {
            withExistingNames++;
            console.log(`✅ ${building.buildingID}: Already has name "${building.buildingName}"`);
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

        console.log(`🏷️  ${building.buildingID}:`);
        console.log(`    Street: "${building.street || 'N/A'}"`);
        console.log(`    Generated: "${generatedName}"`);
        console.log('');
    });

    console.log('\n📊 Summary:');
    console.log(`   Total buildings processed: ${processed}`);
    console.log(`   Already had names: ${withExistingNames}`);
    console.log(`   Successful generation from street: ${successfulGeneration}`);
    console.log(`   Used fallback (building ID): ${fallbackUsed}`);

    // Test edge cases
    console.log('\n🔍 Testing edge cases:');
    console.log('=====================\n');

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

    edgeCases.forEach(({ street, expected }) => {
        const result = generateBuildingName(street);
        const passed = result === expected;

        if(passed) {
            edgeCasesPassed++;
            console.log(`✅ "${street}" → "${result}"`);
        } else {
            edgeCasesFailed++;
            console.log(`❌ "${street}" → "${result}" (expected "${expected}")`);
        }
    });

    console.log(`\n🧪 Edge cases: ${edgeCasesPassed} passed, ${edgeCasesFailed} failed`);

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
    console.log('\n🎉 All tests passed! Migration logic is working correctly.');
} else {
    console.log('\n⚠️  Some edge cases failed. Review the building name generation logic.');
}
