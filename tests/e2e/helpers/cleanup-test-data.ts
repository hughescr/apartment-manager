import { Building, Unit, UnitType, ApartmentTable } from '../../../data/model';
import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';
import { BatchDeleteRequest } from 'dynamodb-toolbox/entity/actions/batchDelete';
import { BatchWriteCommand, execute } from 'dynamodb-toolbox/table/actions/batchWrite';
import { ScanCommand } from 'dynamodb-toolbox/table/actions/scan';
import type { TestDataSet } from './seed-test-data';
import _ from 'lodash';

export async function cleanupTestData(testDataSet: TestDataSet): Promise<void> {
    // Clean up units using DynamoDB Toolbox
    for(const unit of testDataSet.units) {
        await Unit.build(DeleteItemCommand)
            .key({
                buildingID: unit.buildingID,
                unitID: `UNIT#${unit.unitID}`
            })
            .send();
    }

    // Clean up unit types using DynamoDB Toolbox
    for(const unitType of testDataSet.unitTypes) {
        await UnitType.build(DeleteItemCommand)
            .key({
                buildingID: unitType.buildingID,
                unitID: `MODEL#${unitType.modelID}`
            })
            .send();
    }

    // Clean up buildings using DynamoDB Toolbox
    for(const building of testDataSet.buildings) {
        await Building.build(DeleteItemCommand)
            .key({
                buildingID: building.buildingID,
                unitID: 'BUILDING'
            })
            .send();
    }
}

// Batch cleanup for performance with larger datasets
export async function batchCleanupTestData(testDataSet: TestDataSet): Promise<void> {
    const MAX_BATCH_SIZE = 25; // DynamoDB batch write limit

    // Helper to batch items
    const batchItems = <T>(items: T[], batchSize: number): T[][] => {
        const batches: T[][] = [];
        for(let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    };

    // Create batch delete requests using DynamoDB Toolbox
    const deleteRequests = [
        ..._.map(testDataSet.units, unit =>
            Unit.build(BatchDeleteRequest).key({
                buildingID: unit.buildingID,
                unitID: `UNIT#${unit.unitID}`
            })
        ),
        ..._.map(testDataSet.unitTypes, unitType =>
            UnitType.build(BatchDeleteRequest).key({
                buildingID: unitType.buildingID,
                unitID: `MODEL#${unitType.modelID}`
            })
        ),
        ..._.map(testDataSet.buildings, building =>
            Building.build(BatchDeleteRequest).key({
                buildingID: building.buildingID,
                unitID: 'BUILDING'
            })
        )
    ];

    // Batch delete using DynamoDB Toolbox
    const batches = batchItems(deleteRequests, MAX_BATCH_SIZE);
    for(const batch of batches) {
        const command = ApartmentTable.build(BatchWriteCommand).requests(...batch);
        await execute(command);
    }
}

// Clean up all test data by prefix
export async function cleanupTestDataByPrefix(prefix: string): Promise<void> {
    // Scan for all items with buildingID starting with prefix using DynamoDB Toolbox
    let lastEvaluatedKey: Record<string, unknown> | undefined;
    const itemsToDelete: { buildingID: string, unitID: string, _et?: string }[] = [];

    do {
        const scanCommand = ApartmentTable.build(ScanCommand)
            .options({
                filter: {
                    attr: 'buildingID',
                    beginsWith: prefix
                },
                ...(lastEvaluatedKey && { exclusiveStartKey: lastEvaluatedKey })
            });

        const result = await scanCommand.send();

        if(result.Items) {
            itemsToDelete.push(...result.Items as { buildingID: string, unitID: string, _et?: string }[]);
        }

        lastEvaluatedKey = result.LastEvaluatedKey;
    } while(lastEvaluatedKey);

    // Group items by entity type and batch delete
    const MAX_BATCH_SIZE = 25;
    const buildingItems = _.filter(itemsToDelete, { unitID: 'BUILDING' });
    const unitTypeItems = _.filter(itemsToDelete, item => _.startsWith(item.unitID, 'MODEL#'));
    const unitItems = _.filter(itemsToDelete, item => _.startsWith(item.unitID, 'UNIT#'));

    // Helper to batch items
    const batchItems = <T>(items: T[], batchSize: number): T[][] => {
        const batches: T[][] = [];
        for(let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    };

    // Delete buildings
    const buildingBatches = batchItems(buildingItems, MAX_BATCH_SIZE);
    for(const batch of buildingBatches) {
        const deleteRequests = _.map(batch, item =>
            Building.build(BatchDeleteRequest).key({
                buildingID: item.buildingID,
                unitID: item.unitID
            })
        );
        if(deleteRequests.length > 0) {
            const command = ApartmentTable.build(BatchWriteCommand).requests(...deleteRequests);
            await execute(command);
        }
    }

    // Delete unit types
    const unitTypeBatches = batchItems(unitTypeItems, MAX_BATCH_SIZE);
    for(const batch of unitTypeBatches) {
        const deleteRequests = _.map(batch, item =>
            UnitType.build(BatchDeleteRequest).key({
                buildingID: item.buildingID,
                unitID: item.unitID
            })
        );
        if(deleteRequests.length > 0) {
            const command = ApartmentTable.build(BatchWriteCommand).requests(...deleteRequests);
            await execute(command);
        }
    }

    // Delete units
    const unitBatches = batchItems(unitItems, MAX_BATCH_SIZE);
    for(const batch of unitBatches) {
        const deleteRequests = _.map(batch, item =>
            Unit.build(BatchDeleteRequest).key({
                buildingID: item.buildingID,
                unitID: item.unitID
            })
        );
        if(deleteRequests.length > 0) {
            const command = ApartmentTable.build(BatchWriteCommand).requests(...deleteRequests);
            await execute(command);
        }
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
