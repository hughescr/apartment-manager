import { Building, Unit, UnitType, ApartmentTable } from '../../../data/model';
import { PutItemCommand } from 'dynamodb-toolbox/entity/actions/put';
import { BatchPutRequest } from 'dynamodb-toolbox/entity/actions/batchPut';
import { BatchWriteCommand, execute } from 'dynamodb-toolbox/table/actions/batchWrite';
import { Resource } from 'sst';
import { testDataFactory } from './test-data-factory';
import type { BuildingData, UnitData, UnitTypeData } from '../../../src/types';
import _, { isArray, some, filter, forEach, isObject, keys } from 'lodash';

// Helper function to format response headers for error messages
function formatHeaders(headers: Headers): string {
    const headersList: string[] = [];
    // Using native forEach as lodash doesn't have a direct equivalent for Headers
    // eslint-disable-next-line lodash/prefer-lodash-method -- Headers object doesn't support lodash methods
    headers.forEach((value, key) => {
        headersList.push(`${key}: ${value}`);
    });
    return headersList.join(', ');
}

// Helper function to properly join URL paths without double slashes
function joinUrlPaths(base: string, ...paths: string[]): string {
    // Remove trailing slash from base if present
    const normalizedBase = _.endsWith(base, '/') ? base.slice(0, -1) : base;

    // Join paths, ensuring each starts with / but removing any double slashes
    const joinedPath = _.replace(
        _.map(paths, path => (_.startsWith(path, '/') ? path : `/${path}`))
            .join(''),
        /\/+/g,
        '/'
    );

    return `${normalizedBase}${joinedPath}`;
}

// Helper function to retry DynamoDB operations with exponential backoff
async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 5,
    initialDelay = 100
): Promise<T> {
    let lastError: unknown;

    for(let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch(error: unknown) {
            lastError = error;

            // Check if it's a retryable error
            const errorName = (error as Error & { name?: string })?.name;
            if(errorName === 'ProvisionedThroughputExceededException' ||
              errorName === 'ThrottlingException' ||
              errorName === 'RequestLimitExceeded') {
                if(attempt < maxRetries) {
                    // Calculate exponential backoff with jitter
                    const delay = initialDelay * Math.pow(2, attempt) + Math.random() * 100;
                    // eslint-disable-next-line no-console -- Logging retry attempts for debugging
                    console.log(`DynamoDB throttled, retrying after ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }

            // Non-retryable error or max retries exceeded
            throw error;
        }
    }

    throw lastError;
}

export interface TestDataSet {
    buildings: BuildingData[]
    unitTypes: UnitTypeData[]
    units: UnitData[]
}

export interface SeedOptions {
    verify?: boolean
    verifyTimeout?: number // Total timeout for verification in ms
    verifyRetryDelay?: number // Initial delay between verification attempts in ms
}

// Helper function to wait for data to be available via API
export async function waitForDataAvailability(
    testDataSet: TestDataSet,
    timeout = 30000, // 30 seconds default
    retryDelay = 500 // 500ms initial delay
): Promise<boolean> {
    const startTime = Date.now();
    const apiUrl = Resource.API.url;
    let attempt = 0;

    // eslint-disable-next-line no-console -- Logging for debugging data propagation
    console.log(`Waiting for data to be available via API at ${apiUrl}`);

    while(Date.now() - startTime < timeout) {
        attempt++;
        const allAvailable = await verifySeededData(testDataSet, false); // No logging for individual attempts

        if(allAvailable) {
            // eslint-disable-next-line no-console -- Success logging
            console.log(`✓ All data available after ${attempt} attempts (${Date.now() - startTime}ms)`);
            return true;
        }

        // Log detailed verification status every 5 attempts for debugging
        if(attempt % 5 === 0) {
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Still waiting... (attempt ${attempt}, ${Date.now() - startTime}ms elapsed)`);
            // Do a verbose check to capture errors
            const errors: string[] = [];
            await verifyBuildings(apiUrl, testDataSet.buildings, errors, true); // Enable verbose for periodic checks
            for(const building of testDataSet.buildings) {
                await verifyUnitTypesForBuilding(apiUrl, building, testDataSet.unitTypes, errors, true);
                await verifyUnitsForBuilding(apiUrl, building, testDataSet.units, errors, true);
            }
            if(errors.length > 0) {
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Current issues (${errors.length} total):`);
                forEach(errors.slice(0, 5), (err) => {
                    // eslint-disable-next-line no-console -- Debug logging
                    console.log(`    - ${err}`);
                });
                if(errors.length > 5) {
                    // eslint-disable-next-line no-console -- Debug logging
                    console.log(`    ... and ${errors.length - 5} more`);
                }
            }
        }

        // Exponential backoff with jitter
        const delay = Math.min(retryDelay * Math.pow(1.5, attempt - 1), 5000) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // eslint-disable-next-line no-console -- Timeout warning
    console.warn(`⚠ Data availability check timed out after ${timeout}ms`);

    // Do one final verbose check to show what's missing
    // eslint-disable-next-line no-console -- Debug logging
    console.log('Final verification status:');
    await verifySeededData(testDataSet, true);

    return false;
}

// Helper function to verify buildings via API
async function verifyBuildings(
    apiUrl: string,
    expectedBuildings: BuildingData[],
    errors: string[],
    verbose: boolean
): Promise<boolean> {
    try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const buildingsUrl = joinUrlPaths(apiUrl, 'buildings');
        const buildingsResponse = await fetch(buildingsUrl, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        if(!buildingsResponse.ok) {
            const responseBody = await buildingsResponse.text();
            const headersStr = formatHeaders(buildingsResponse.headers);
            throw new Error(`Buildings API at ${buildingsUrl} returned ${buildingsResponse.status}: ${buildingsResponse.statusText}. Headers: [${headersStr}]. Body: ${responseBody}`);
        }

        const buildingsData = await buildingsResponse.json();

        // Debug logging to understand API response structure
        if(verbose) {
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Debug: Buildings API response type: ${typeof buildingsData}`);
            if(isObject(buildingsData) && !isArray(buildingsData)) {
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response keys: ${keys(buildingsData).join(', ')}`);
                // Log a sample of the actual data structure
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response preview: ${JSON.stringify(buildingsData, null, 2).substring(0, 200)}...`);
            }
            if(isArray(buildingsData)) {
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response is array with ${buildingsData.length} items`);
            }
        }

        const apiBuildings = isArray(buildingsData) ? buildingsData : buildingsData.buildings || [];
        let allFound = true;

        // Extract buildingIDs from API response and expected data
        const apiBuildingIDs = _.map(apiBuildings, 'buildingID');
        const expectedBuildingIDs = _.map(expectedBuildings, 'buildingID');

        if(verbose) {
            // Find which test buildings are actually in the API response
            const foundTestBuildings = filter(expectedBuildings, expectedBuilding =>
                some(apiBuildings, ['buildingID', expectedBuilding.buildingID])
            );
            const foundTestBuildingIDs = _.map(foundTestBuildings, 'buildingID');
            const missingBuildingIDs = _.difference(expectedBuildingIDs, foundTestBuildingIDs);

            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Debug: Looking for test building IDs: [${expectedBuildingIDs.join(', ')}]`);
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Debug: Found these test buildings in API: [${foundTestBuildingIDs.join(', ') || 'NONE'}]`);
            if(missingBuildingIDs.length > 0) {
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: ❌ Missing test buildings: [${missingBuildingIDs.join(', ')}]`);
            }
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Debug: API returned ${apiBuildings.length} total buildings`);
            // Show a sample of what's actually in the API response for context
            if(apiBuildings.length > 0 && missingBuildingIDs.length > 0) {
                const sampleIDs = apiBuildingIDs.slice(0, 3).join(', ');
                const more = apiBuildingIDs.length > 3 ? ` and ${apiBuildingIDs.length - 3} more` : '';
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: API contains these buildings: [${sampleIDs}${more}]`);
            }
        }

        for(const expectedBuilding of expectedBuildings) {
            const found = some(apiBuildings, ['buildingID', expectedBuilding.buildingID]);
            if(!found) {
                allFound = false;
                errors.push(`Building ${expectedBuilding.buildingID} not found via API`);
            }
        }

        if(verbose && expectedBuildings.length > 0) {
            const foundCount = filter(expectedBuildings, expectedBuilding =>
                some(apiBuildings, ['buildingID', expectedBuilding.buildingID])
            ).length;
            // eslint-disable-next-line no-console -- Verification result
            console.log(`  ✓ Buildings: ${foundCount}/${expectedBuildings.length} test buildings found (${apiBuildings.length} total in database)`);
        }

        return allFound;
    } catch(error) {
        const errorMessage = _.isError(error) ? error.message : String(error);
        if(_.isError(error) && error.name === 'AbortError') {
            errors.push(`Failed to verify buildings: Request timeout after 5 seconds`);
        } else {
            errors.push(`Failed to verify buildings: ${errorMessage}`);
        }
        return false;
    }
}

// Helper function to verify unit types for a building via API
async function verifyUnitTypesForBuilding(
    apiUrl: string,
    building: BuildingData,
    allUnitTypes: UnitTypeData[],
    errors: string[],
    verbose: boolean
): Promise<boolean> {
    try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const unitTypesUrl = joinUrlPaths(apiUrl, 'buildings', building.buildingID, 'unit-types');
        const unitTypesResponse = await fetch(unitTypesUrl, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        if(!unitTypesResponse.ok) {
            const responseBody = await unitTypesResponse.text();
            const headersStr = formatHeaders(unitTypesResponse.headers);
            throw new Error(`Unit types API at ${unitTypesUrl} returned ${unitTypesResponse.status}: ${unitTypesResponse.statusText}. Headers: [${headersStr}]. Body: ${responseBody}`);
        }

        const unitTypesData = await unitTypesResponse.json();

        // Debug logging to understand API response structure
        if(verbose) {
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Debug: Unit types API response type: ${typeof unitTypesData}`);
            if(isObject(unitTypesData) && !isArray(unitTypesData)) {
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response keys: ${keys(unitTypesData).join(', ')}`);
                // Log a sample of the actual data structure
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response preview: ${JSON.stringify(unitTypesData, null, 2).substring(0, 200)}...`);
            }
            if(isArray(unitTypesData)) {
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response is array with ${unitTypesData.length} items`);
            }
        }

        const apiUnitTypes = isArray(unitTypesData) ? unitTypesData : unitTypesData.unitTypes || [];
        const expectedUnitTypes = filter(allUnitTypes, ['buildingID', building.buildingID]);
        let allFound = true;

        // Extract modelIDs from API response and expected data
        const apiModelIDs = _.map(apiUnitTypes, 'modelID');
        const expectedModelIDs = _.map(expectedUnitTypes, 'modelID');

        if(verbose) {
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Debug: Unit types for building ${building.buildingID}:`);
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`    Looking for test model IDs: [${expectedModelIDs.join(', ')}]`);
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`    Total model IDs in database: [${apiModelIDs.join(', ')}]`);
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`    Database contains ${apiUnitTypes.length} total unit types for this building`);
        }

        for(const expectedUnitType of expectedUnitTypes) {
            const found = some(apiUnitTypes, ['modelID', expectedUnitType.modelID]);
            if(!found) {
                allFound = false;
                errors.push(`Unit type ${expectedUnitType.modelID} not found for building ${building.buildingID}`);
            }
        }

        if(verbose && expectedUnitTypes.length > 0) {
            const foundCount = filter(expectedUnitTypes, expectedUnitType =>
                some(apiUnitTypes, ['modelID', expectedUnitType.modelID])
            ).length;
            // eslint-disable-next-line no-console -- Verification result
            console.log(`  ✓ Unit types for ${building.buildingID}: ${foundCount}/${expectedUnitTypes.length} test unit types found (${apiUnitTypes.length} total in database)`);
        }

        return allFound;
    } catch(error) {
        const errorMessage = _.isError(error) ? error.message : String(error);
        if(_.isError(error) && error.name === 'AbortError') {
            errors.push(`Failed to verify unit types for building ${building.buildingID}: Request timeout after 5 seconds`);
        } else {
            errors.push(`Failed to verify unit types for building ${building.buildingID}: ${errorMessage}`);
        }
        return false;
    }
}

// Helper function to verify units for a building via API
async function verifyUnitsForBuilding(
    apiUrl: string,
    building: BuildingData,
    allUnits: UnitData[],
    errors: string[],
    verbose: boolean
): Promise<boolean> {
    try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const unitsUrl = joinUrlPaths(apiUrl, 'buildings', building.buildingID, 'units');
        const unitsResponse = await fetch(unitsUrl, {
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        });

        clearTimeout(timeoutId);

        if(!unitsResponse.ok) {
            const responseBody = await unitsResponse.text();
            const headersStr = formatHeaders(unitsResponse.headers);
            throw new Error(`Units API at ${unitsUrl} returned ${unitsResponse.status}: ${unitsResponse.statusText}. Headers: [${headersStr}]. Body: ${responseBody}`);
        }

        const unitsData = await unitsResponse.json();

        // Debug logging to understand API response structure
        if(verbose) {
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Debug: Units API response type: ${typeof unitsData}`);
            if(isObject(unitsData) && !isArray(unitsData)) {
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response keys: ${keys(unitsData).join(', ')}`);
                // Log a sample of the actual data structure
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response preview: ${JSON.stringify(unitsData, null, 2).substring(0, 200)}...`);
            }
            if(isArray(unitsData)) {
                // eslint-disable-next-line no-console -- Debug logging
                console.log(`  Debug: Response is array with ${unitsData.length} items`);
            }
        }

        const apiUnits = isArray(unitsData) ? unitsData : unitsData.units || [];
        const expectedUnits = filter(allUnits, ['buildingID', building.buildingID]);
        let allFound = true;

        // Extract unitIDs from API response and expected data
        const apiUnitIDs = _.map(apiUnits, 'unitID');
        const expectedUnitIDs = _.map(expectedUnits, 'unitID');

        if(verbose) {
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`  Debug: Units for building ${building.buildingID}:`);
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`    Looking for test unit IDs: [${expectedUnitIDs.join(', ')}]`);
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`    Total unit IDs in database: [${apiUnitIDs.join(', ')}]`);
            // eslint-disable-next-line no-console -- Debug logging
            console.log(`    Database contains ${apiUnits.length} total units for this building`);
        }

        for(const expectedUnit of expectedUnits) {
            const found = some(apiUnits, ['unitID', expectedUnit.unitID]);
            if(!found) {
                allFound = false;
                errors.push(`Unit ${expectedUnit.unitID} not found for building ${building.buildingID}`);
            }
        }

        if(verbose && expectedUnits.length > 0) {
            const foundCount = filter(expectedUnits, expectedUnit =>
                some(apiUnits, ['unitID', expectedUnit.unitID])
            ).length;
            // eslint-disable-next-line no-console -- Verification result
            console.log(`  ✓ Units for ${building.buildingID}: ${foundCount}/${expectedUnits.length} test units found (${apiUnits.length} total in database)`);
        }

        return allFound;
    } catch(error) {
        const errorMessage = _.isError(error) ? error.message : String(error);
        if(_.isError(error) && error.name === 'AbortError') {
            errors.push(`Failed to verify units for building ${building.buildingID}: Request timeout after 5 seconds`);
        } else {
            errors.push(`Failed to verify units for building ${building.buildingID}: ${errorMessage}`);
        }
        return false;
    }
}

// Function to verify seeded data is accessible via API
export async function verifySeededData(
    testDataSet: TestDataSet,
    verbose = true
): Promise<boolean> {
    const apiUrl = Resource.API.url;
    const errors: string[] = [];

    if(verbose) {
        // eslint-disable-next-line no-console -- Verification status
        console.log('Verifying seeded data via API endpoints...');
    }

    // Verify buildings
    const buildingsOk = await verifyBuildings(apiUrl, testDataSet.buildings, errors, verbose);

    // Verify unit types and units for each building
    let allUnitTypesOk = true;
    let allUnitsOk = true;

    for(const building of testDataSet.buildings) {
        const unitTypesOk = await verifyUnitTypesForBuilding(apiUrl, building, testDataSet.unitTypes, errors, verbose);
        const unitsOk = await verifyUnitsForBuilding(apiUrl, building, testDataSet.units, errors, verbose);

        allUnitTypesOk = allUnitTypesOk && unitTypesOk;
        allUnitsOk = allUnitsOk && unitsOk;
    }

    const allDataAvailable = buildingsOk && allUnitTypesOk && allUnitsOk;

    if(verbose) {
        if(allDataAvailable) {
            // eslint-disable-next-line no-console -- Success message
            console.log('✅ All seeded data verified successfully!');
        } else {
            // eslint-disable-next-line no-console -- Error summary
            console.error('❌ Data verification failed:');
            forEach(errors, (err) => {
                // eslint-disable-next-line no-console -- Individual errors
                console.error(`   - ${err}`);
            });
        }
    }

    return allDataAvailable;
}

export async function seedTestData(testDataSet: TestDataSet, options: SeedOptions = {}): Promise<void> {
    // Seed buildings using DynamoDB Toolbox entity
    for(const building of testDataSet.buildings) {
        await retryWithBackoff(async () => {
            await Building.build(PutItemCommand)
                .item({ ...building, unitID: 'BUILDING' })
                .send();
        });
    }

    // Seed unit types using DynamoDB Toolbox entity
    for(const unitType of testDataSet.unitTypes) {
        await retryWithBackoff(async () => {
            await UnitType.build(PutItemCommand)
                .item({ ...unitType, unitID: `MODEL#${unitType.modelID}` })
                .send();
        });
    }

    // Seed units using DynamoDB Toolbox entity
    for(const unit of testDataSet.units) {
        await retryWithBackoff(async () => {
            // Convert websiteStatus enum values to strings for DynamoDB
            const unitData = {
                ...unit,
                unitID: `UNIT#${unit.unitID}`,
                // Ensure websiteStatus values are strings (not enum objects)
                websiteStatus: unit.websiteStatus ?
                    _(unit.websiteStatus).mapValues(status => String(status)).pickBy(v => v !== undefined).value() as Record<string, string> :
                    undefined,
                // Ensure listingIds values are strings (filter out undefined)
                listingIds: unit.listingIds ?
                    _.pickBy(unit.listingIds, v => v !== undefined) as Record<string, string> :
                    undefined
            };
            await Unit.build(PutItemCommand)
                .item(unitData)
                .send();
        });
    }

    // Verify data if requested
    if(options.verify) {
        // eslint-disable-next-line no-console -- Status update
        console.log('Verifying seeded data availability...');

        const isAvailable = await waitForDataAvailability(
            testDataSet,
            options.verifyTimeout,
            options.verifyRetryDelay
        );

        if(!isAvailable) {
            throw new Error('Data verification failed: Seeded data not available via API within timeout period');
        }
    }
}

export async function seedDefaultTestData(options: SeedOptions = {}): Promise<TestDataSet> {
    const testData = testDataFactory.generateFullTestDataSet();
    await seedTestData(testData, options);
    return testData;
}

// Batch seed for performance with larger datasets
export async function batchSeedTestData(testDataSet: TestDataSet, options: SeedOptions = {}): Promise<void> {
    const MAX_BATCH_SIZE = 25; // DynamoDB batch write limit

    // Helper to batch items
    const batchItems = <T>(items: T[], batchSize: number): T[][] => {
        const batches: T[][] = [];
        for(let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    };

    // Batch seed buildings using DynamoDB Toolbox
    const buildingBatches = batchItems(testDataSet.buildings, MAX_BATCH_SIZE);
    for(const batch of buildingBatches) {
        const requests = _.map(batch, building =>
            Building.build(BatchPutRequest).item({
                ...building,
                unitID: 'BUILDING'
            })
        );
        await retryWithBackoff(async () => {
            const command = ApartmentTable.build(BatchWriteCommand).requests(...requests);
            await execute(command);
        });
    }

    // Batch seed unit types using DynamoDB Toolbox
    const unitTypeBatches = batchItems(testDataSet.unitTypes, MAX_BATCH_SIZE);
    for(const batch of unitTypeBatches) {
        const requests = _.map(batch, unitType =>
            UnitType.build(BatchPutRequest).item({
                ...unitType,
                unitID: `MODEL#${unitType.modelID}`
            })
        );
        await retryWithBackoff(async () => {
            const command = ApartmentTable.build(BatchWriteCommand).requests(...requests);
            await execute(command);
        });
    }

    // Batch seed units using DynamoDB Toolbox
    const unitBatches = batchItems(testDataSet.units, MAX_BATCH_SIZE);
    for(const batch of unitBatches) {
        const requests = _.map(batch, (unit) => {
            // Convert websiteStatus enum values to strings and filter out undefined values
            const unitData = {
                ...unit,
                unitID: `UNIT#${unit.unitID}`,
                // Ensure websiteStatus values are strings (not enum objects)
                websiteStatus: unit.websiteStatus ?
                    _(unit.websiteStatus).mapValues(status => String(status)).pickBy(v => v !== undefined).value() as Record<string, string> :
                    undefined,
                // Ensure listingIds values are strings (filter out undefined)
                listingIds: unit.listingIds ?
                    _.pickBy(unit.listingIds, v => v !== undefined) as Record<string, string> :
                    undefined
            };
            return Unit.build(BatchPutRequest).item(unitData);
        });
        await retryWithBackoff(async () => {
            const command = ApartmentTable.build(BatchWriteCommand).requests(...requests);
            await execute(command);
        });
    }

    // Verify data if requested
    if(options.verify) {
        // eslint-disable-next-line no-console -- Status update
        console.log('Verifying batch-seeded data availability...');

        const isAvailable = await waitForDataAvailability(
            testDataSet,
            options.verifyTimeout,
            options.verifyRetryDelay
        );

        if(!isAvailable) {
            throw new Error('Data verification failed: Batch-seeded data not available via API within timeout period');
        }
    }
}
