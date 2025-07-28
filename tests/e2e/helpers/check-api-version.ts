/**
 * Check API version to verify deployment status
 * Run with: bunx sst shell -- bun run tests/e2e/helpers/check-api-version.ts
 */

import { Resource } from 'sst';
import _ from 'lodash';

async function checkApiVersion(): Promise<void> {
    const apiUrl = Resource.API.url;
    const versionUrl = _.endsWith(apiUrl, '/') ? `${apiUrl}version` : `${apiUrl}/version`;

    // eslint-disable-next-line no-console -- Status output
    console.log('🔍 Checking API version...');
    // eslint-disable-next-line no-console -- URL output
    console.log(`   URL: ${versionUrl}\n`);

    try {
        const response = await fetch(versionUrl, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if(response.ok) {
            const versionInfo = await response.json();
            // eslint-disable-next-line no-console -- Version output
            console.log('✅ API Version Info:');
            // eslint-disable-next-line no-console -- Version details
            console.log(`   Version: ${versionInfo.version}`);
            // eslint-disable-next-line no-console -- Deploy time
            console.log(`   Deployed At: ${versionInfo.deployedAt}`);
            // eslint-disable-next-line no-console -- Features
            console.log(`   Features:`);
            // eslint-disable-next-line no-console -- Consistent reads
            console.log(`     - Consistent Reads: ${versionInfo.features?.consistentReads || false}`);
            // eslint-disable-next-line no-console -- Description
            console.log(`     - Description: ${versionInfo.features?.description || 'N/A'}`);

            if(!versionInfo.features?.consistentReads) {
                // eslint-disable-next-line no-console -- Warning
                console.log('\n⚠️  WARNING: API does not have consistent reads enabled!');
                // eslint-disable-next-line no-console -- Action needed
                console.log('   The Lambda needs to be redeployed with the latest code changes.');
            }
        } else {
            // eslint-disable-next-line no-console -- Error output
            console.error(`❌ Failed to get version: ${response.status} ${response.statusText}`);
            const text = await response.text();
            // eslint-disable-next-line no-console -- Response body
            console.error(`   Response: ${text}`);
        }
    } catch(error) {
        // eslint-disable-next-line no-console -- Error output
        console.error(`❌ Error checking version: ${error}`);
    }
}

// Run the check
checkApiVersion().catch((error) => {
    // eslint-disable-next-line no-console -- Error output
    console.error('Unhandled error:', error);
    throw error;
});
