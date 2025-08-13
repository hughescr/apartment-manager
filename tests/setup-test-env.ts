/**
 * Test environment setup that must run before ANY imports.
 * This file sets up environment variables needed for tests.
 */

// Set test environment variables BEFORE any imports
process.env.BUN_ENV = 'test';
process.env.SST_RESOURCE_App = JSON.stringify({
    name: 'test-app',
    stage: 'test'
});
process.env.SST_RESOURCE_BuildingsUnits = JSON.stringify({
    name: 'test-table-name',
    type: 'sst.aws.Dynamo'
});
process.env.SST_RESOURCE_ProfilesBucket = JSON.stringify({
    name: 'test-profile-bucket',
    type: 'sst.aws.Bucket'
});
process.env.SST_RESOURCE_ListingsBucket = JSON.stringify({
    name: 'test-listings-bucket',
    type: 'sst.aws.Bucket'
});
process.env.SST_RESOURCE_PhotosBucket = JSON.stringify({
    name: 'test-photos-bucket',
    type: 'sst.aws.Bucket'
});

// Import global test setup to handle mock isolation
import './setup-global';
