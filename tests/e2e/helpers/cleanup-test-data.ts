import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, BatchWriteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';
import type { TestDataSet } from './seed-test-data';
import _ from 'lodash';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function cleanupTestData(testDataSet: TestDataSet): Promise<void> {
    const tableName = Resource.BuildingsUnits.name;

    // Clean up units
    for(const unit of testDataSet.units) {
        await docClient.send(new DeleteCommand({
            TableName: tableName,
            Key: {
                buildingID: unit.buildingID,
                unitID: `UNIT#${unit.unitID}`
            }
        }));
    }

    // Clean up unit types
    for(const unitType of testDataSet.unitTypes) {
        await docClient.send(new DeleteCommand({
            TableName: tableName,
            Key: {
                buildingID: unitType.buildingID,
                unitID: `MODEL#${unitType.modelID}`
            }
        }));
    }

    // Clean up buildings
    for(const building of testDataSet.buildings) {
        await docClient.send(new DeleteCommand({
            TableName: tableName,
            Key: {
                buildingID: building.buildingID,
                unitID: 'BUILDING'
            }
        }));
    }
}

// Batch cleanup for performance with larger datasets
export async function batchCleanupTestData(testDataSet: TestDataSet): Promise<void> {
    const tableName = Resource.BuildingsUnits.name;
    const MAX_BATCH_SIZE = 25; // DynamoDB batch write limit

    // Helper to batch items
    const batchItems = <T>(items: T[], batchSize: number): T[][] => {
        const batches: T[][] = [];
        for(let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    };

    // Combine all delete requests
    const deleteRequests = [
        ..._.map(testDataSet.units, unit => ({
            DeleteRequest: {
                Key: {
                    buildingID: unit.buildingID,
                    unitID: `UNIT#${unit.unitID}`
                }
            }
        })),
        ..._.map(testDataSet.unitTypes, unitType => ({
            DeleteRequest: {
                Key: {
                    buildingID: unitType.buildingID,
                    unitID: `MODEL#${unitType.modelID}`
                }
            }
        })),
        ..._.map(testDataSet.buildings, building => ({
            DeleteRequest: {
                Key: {
                    buildingID: building.buildingID,
                    unitID: 'BUILDING'
                }
            }
        }))
    ];

    // Batch delete
    const batches = batchItems(deleteRequests, MAX_BATCH_SIZE);
    for(const batch of batches) {
        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                [tableName]: batch
            }
        }));
    }
}

// Clean up all test data by prefix
export async function cleanupTestDataByPrefix(prefix: string): Promise<void> {
    const tableName = Resource.BuildingsUnits.name;

    // Scan for all items with buildingID starting with prefix
    const scanParams = {
        TableName: tableName,
        FilterExpression: 'begins_with(buildingID, :prefix)',
        ExpressionAttributeValues: {
            ':prefix': prefix
        }
    };

    let lastEvaluatedKey: Record<string, unknown> | undefined;
    const itemsToDelete: { buildingID: string, unitID: string }[] = [];

    do {
        const result = await docClient.send(new ScanCommand({
            ...scanParams,
            ExclusiveStartKey: lastEvaluatedKey
        }));

        if(result.Items) {
            itemsToDelete.push(..._.map(result.Items, item => ({
                buildingID: item.buildingID,
                unitID: item.unitID
            })));
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
    } while(lastEvaluatedKey);

    // Batch delete all found items
    const MAX_BATCH_SIZE = 25;
    const batches = [];
    for(let i = 0; i < itemsToDelete.length; i += MAX_BATCH_SIZE) {
        batches.push(itemsToDelete.slice(i, i + MAX_BATCH_SIZE));
    }

    for(const batch of batches) {
        const deleteRequests = _.map(batch, item => ({
            DeleteRequest: {
                Key: {
                    buildingID: item.buildingID,
                    unitID: item.unitID
                }
            }
        }));

        await docClient.send(new BatchWriteCommand({
            RequestItems: {
                [tableName]: deleteRequests
            }
        }));
    }
}

// Clean up all test data created within a time range
export async function cleanupTestDataByTimeRange(startTimestamp: number, endTimestamp: number): Promise<void> {
    const prefixes = [];

    // Generate all possible test prefixes within the time range
    for(let ts = startTimestamp; ts <= endTimestamp; ts++) {
        prefixes.push(`test-${ts}-`);
        prefixes.push(`building-test-${ts}-`);
        prefixes.push(`model-test-${ts}-`);
        prefixes.push(`unit-test-${ts}-`);
    }

    // Clean up data for each prefix
    for(const prefix of prefixes) {
        await cleanupTestDataByPrefix(prefix);
    }
}
