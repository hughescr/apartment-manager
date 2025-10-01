import { describe, it, expect } from 'bun:test';
import {
    DynamoDBItem,
    BuildingDynamoDBItem,
    UnitDynamoDBItem,
    UnitTypeDynamoDBItem
} from '../../../src/types';

describe('DynamoDB Entity Types', () => {
    describe('DynamoDBItem', () => {
        it('should accept valid DynamoDBItem', () => {
            const item: DynamoDBItem = {
                partitionKey: 'bldg-123',
                sortKey:      'BUILDING',
                entityType:   'building',
                gsi1pk:       'MODEL#model-1',
                gsi1sk:       'bldg-123'
            };
            expect(item.entityType).toBe('building');
            expect(item.gsi1pk).toBe('MODEL#model-1');
        });

        it('should accept DynamoDBItem without GSI keys', () => {
            const item: DynamoDBItem = {
                partitionKey: 'bldg-123',
                sortKey:      'BUILDING',
                entityType:   'unit'
            };
            expect(item.gsi1pk).toBeUndefined();
            expect(item.gsi1sk).toBeUndefined();
        });
    });

    describe('BuildingDynamoDBItem', () => {
        it('should have proper structure for building entity', () => {
            const buildingItem: BuildingDynamoDBItem = {
                buildingID:   'bldg-123',
                street:       '123 Main St',
                entityType:   'building',
                partitionKey: 'bldg-123',
                sortKey:      'BUILDING'
            };
            expect(buildingItem.entityType).toBe('building');
            expect(buildingItem.partitionKey).toBe(buildingItem.buildingID);
            expect(buildingItem.sortKey).toBe('BUILDING');
        });
    });

    describe('UnitDynamoDBItem', () => {
        it('should have proper structure for unit entity', () => {
            const unitItem: UnitDynamoDBItem = {
                buildingID:   'bldg-123',
                unitID:       'unit-456',
                beds:         2,
                entityType:   'unit',
                partitionKey: 'bldg-123',
                sortKey:      'UNIT#unit-456'
            };
            expect(unitItem.entityType).toBe('unit');
            expect(unitItem.partitionKey).toBe(unitItem.buildingID);
            expect(unitItem.sortKey).toBe('UNIT#unit-456');
        });
    });

    describe('UnitTypeDynamoDBItem', () => {
        it('should have proper structure for unitType entity with GSI', () => {
            const unitTypeItem: UnitTypeDynamoDBItem = {
                buildingID:   'bldg-123',
                modelID:      'model-1',
                modelName:    '2BR',
                beds:         2,
                baths:        2,
                entityType:   'unitType',
                partitionKey: 'bldg-123',
                sortKey:      'MODEL#model-1',
                gsi1pk:       'MODEL#model-1',
                gsi1sk:       'bldg-123'
            };
            expect(unitTypeItem.entityType).toBe('unitType');
            expect(unitTypeItem.sortKey).toBe('MODEL#model-1');
            expect(unitTypeItem.gsi1pk).toBe('MODEL#model-1');
            expect(unitTypeItem.gsi1sk).toBe(unitTypeItem.buildingID);
        });
    });
});
