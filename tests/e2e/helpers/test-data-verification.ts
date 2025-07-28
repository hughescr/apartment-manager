/**
 * Standalone script to test data seeding and verification
 * Run with: bunx sst shell -- bun run tests/e2e/helpers/test-data-verification.ts
 */

import { testDataFactory } from './test-data-factory';
import { seedTestData, verifySeededData } from './seed-test-data';
import { cleanupTestData } from './cleanup-test-data';
import { Resource } from 'sst';
import _ from 'lodash';

async function testDataVerification(): Promise<void> {
    // eslint-disable-next-line no-console -- Main script output
    console.log('🧪 Testing data seeding and verification...\n');

    // Generate small test dataset
    const testData = {
        buildings: [testDataFactory.generateBuilding()],
        unitTypes: [],
        units: [],
    };

    // Log what we're seeding
    // eslint-disable-next-line no-console -- Debug output
    console.log('📝 Test data to seed:');
    // eslint-disable-next-line no-console -- Debug output
    console.log(`  Building ID: ${testData.buildings[0].buildingID}`);
    // eslint-disable-next-line no-console -- Debug output
    console.log(`  Building Street: ${testData.buildings[0].street || 'N/A'}`);
    // eslint-disable-next-line no-console -- Debug output
    console.log(`  API URL: ${Resource.API.url}\n`);

    try {
        // Seed the data
        // eslint-disable-next-line no-console -- Progress output
        console.log('🌱 Seeding test data...');
        await seedTestData(testData);
        // eslint-disable-next-line no-console -- Success output
        console.log('✅ Data seeded successfully\n');

        // Wait a bit for DynamoDB propagation
        // eslint-disable-next-line no-console -- Progress output
        console.log('⏳ Waiting 2 seconds for DynamoDB propagation...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to verify the data
        // eslint-disable-next-line no-console -- Progress output
        console.log('\n🔍 Attempting to verify seeded data...\n');
        const isAvailable = await verifySeededData(testData, true);

        if(isAvailable) {
            // eslint-disable-next-line no-console -- Success output
            console.log('\n✅ Success! Data is available via API');
        } else {
            // eslint-disable-next-line no-console -- Error output
            console.error('\n❌ Failed! Data is not available via API');

            // Try direct API call for more info
            // eslint-disable-next-line no-console -- Debug output
            console.log('\n🔧 Attempting direct API call for debugging...');
            const apiUrl = Resource.API.url;
            const buildingsUrl = _.endsWith(apiUrl, '/') ? `${apiUrl}buildings` : `${apiUrl}/buildings`;

            try {
                const response = await fetch(buildingsUrl, {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    }
                });

                // eslint-disable-next-line no-console -- Debug output
                console.log(`  Status: ${response.status} ${response.statusText}`);

                // Convert Headers to object for logging
                const headersObj: Record<string, string> = {};

                // eslint-disable-next-line lodash/prefer-lodash-method -- Headers object doesn't have lodash equivalent
                response.headers.forEach((value, key) => {
                    headersObj[key] = value;
                });
                // eslint-disable-next-line no-console -- Debug output
                console.log(`  Headers: ${JSON.stringify(headersObj)}`);

                const text = await response.text();
                // eslint-disable-next-line no-console -- Debug output
                console.log(`  Response body: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);

                if(response.ok) {
                    try {
                        const data = JSON.parse(text);
                        // eslint-disable-next-line no-console -- Debug output
                        console.log(`  Parsed data type: ${_.isArray(data) ? 'array' : typeof data}`);
                        if(_.isArray(data)) {
                            // eslint-disable-next-line no-console -- Debug output
                            console.log(`  Array length: ${data.length}`);
                            if(data.length > 0) {
                                // eslint-disable-next-line no-console -- Debug output
                                console.log(`  First item: ${JSON.stringify(data[0], null, 2)}`);
                            }
                        }
                    } catch{
                        // eslint-disable-next-line no-console -- Error output
                        console.error('  Failed to parse response as JSON');
                    }
                }
            } catch(error) {
                // eslint-disable-next-line no-console -- Error output
                console.error(`  Direct API call failed: ${error}`);
            }
        }

        // Cleanup
        // eslint-disable-next-line no-console -- Progress output
        console.log('\n🧹 Cleaning up test data...');
        await cleanupTestData(testData);
        // eslint-disable-next-line no-console -- Success output
        console.log('✅ Cleanup complete');
    } catch(error) {
        // eslint-disable-next-line no-console -- Error output
        console.error('\n💥 Error during test:', error);

        // Try cleanup anyway
        try {
            await cleanupTestData(testData);
        } catch{
            // Ignore cleanup errors
        }

        throw error;
    }
}

// Run the test
testDataVerification().catch((error) => {
    // eslint-disable-next-line no-console -- Error output
    console.error('Unhandled error:', error);
    throw error;
});
