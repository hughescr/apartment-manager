import { describe, it, expect } from 'bun:test';
import { db, getTableName, tableName } from '../../data/db';

describe('Database Module', () => {
    describe('getTableName', () => {
        it('should return test table name in test environment', () => {
            expect.assertions(1);
            // In test environment, it should always return test-table-name
            expect(getTableName()).toBe('test-table-name');
        });

        it('should be a function', () => {
            expect.assertions(1);
            expect(typeof getTableName).toBe('function');
        });
    });

    describe('db export', () => {
        it('should export a DynamoDB client', () => {
            expect.assertions(2);
            expect(db).toBeDefined();
            expect(typeof db.send).toBe('function');
        });
    });

    describe('tableName export', () => {
        it('should export tableName for backward compatibility', () => {
            expect.assertions(1);
            expect(tableName).toBe('test-table-name');
        });
    });

    describe('module exports', () => {
        it('should export all expected properties', () => {
            expect.assertions(3);
            expect(db).toBeDefined();
            expect(getTableName).toBeDefined();
            expect(tableName).toBeDefined();
        });
    });
});
