import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';
import { testDataFactory } from './test-data-factory';
import type { BuildingData, UnitData, UnitTypeData } from '../../../src/types';
import _ from 'lodash';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

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

export async function seedTestData(testDataSet: TestDataSet): Promise<void> {
    const tableName = Resource.BuildingsUnits.name;

    // Seed buildings - they use unitID='BUILDING' as sort key
    for(const building of testDataSet.buildings) {
        await retryWithBackoff(async () => {
            await docClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    ...building,
                    unitID: 'BUILDING'
                }
            }));
        });
    }

    // Seed unit types - they use unitID='MODEL#' + modelID as sort key
    for(const unitType of testDataSet.unitTypes) {
        await retryWithBackoff(async () => {
            await docClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    ...unitType,
                    unitID: `MODEL#${unitType.modelID}`
                }
            }));
        });
    }

    // Seed units - they use unitID='UNIT#' + unitID as sort key
    for(const unit of testDataSet.units) {
        await retryWithBackoff(async () => {
            await docClient.send(new PutCommand({
                TableName: tableName,
                Item: {
                    ...unit,
                    unitID: `UNIT#${unit.unitID}`
                }
            }));
        });
    }
}

export async function seedDefaultTestData(): Promise<TestDataSet> {
    const testData = testDataFactory.generateFullTestDataSet();
    await seedTestData(testData);
    return testData;
}

// Batch seed for performance with larger datasets
export async function batchSeedTestData(testDataSet: TestDataSet): Promise<void> {
    const MAX_BATCH_SIZE = 25; // DynamoDB batch write limit

    // Helper to batch items
    const batchItems = <T>(items: T[], batchSize: number): T[][] => {
        const batches: T[][] = [];
        for(let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    };

    const tableName = Resource.BuildingsUnits.name;

    // Batch seed buildings
    const buildingBatches = batchItems(testDataSet.buildings, MAX_BATCH_SIZE);
    for(const batch of buildingBatches) {
        const requests = _.map(batch, building => ({
            PutRequest: {
                Item: {
                    ...building,
                    unitID: 'BUILDING'
                }
            }
        }));
        await retryWithBackoff(async () => {
            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [tableName]: requests
                }
            }));
        });
    }

    // Batch seed unit types
    const unitTypeBatches = batchItems(testDataSet.unitTypes, MAX_BATCH_SIZE);
    for(const batch of unitTypeBatches) {
        const requests = _.map(batch, unitType => ({
            PutRequest: {
                Item: {
                    ...unitType,
                    unitID: `MODEL#${unitType.modelID}`
                }
            }
        }));
        await retryWithBackoff(async () => {
            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [tableName]: requests
                }
            }));
        });
    }

    // Batch seed units
    const unitBatches = batchItems(testDataSet.units, MAX_BATCH_SIZE);
    for(const batch of unitBatches) {
        const requests = _.map(batch, unit => ({
            PutRequest: {
                Item: {
                    ...unit,
                    unitID: `UNIT#${unit.unitID}`
                }
            }
        }));
        await retryWithBackoff(async () => {
            await docClient.send(new BatchWriteCommand({
                RequestItems: {
                    [tableName]: requests
                }
            }));
        });
    }
}
