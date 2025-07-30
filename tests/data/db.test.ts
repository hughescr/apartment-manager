/**
 * Tests for data/db.ts
 * Tests module exports within the existing test framework
 */
import './test-setup';
import { describe, it, expect } from 'bun:test';
import { db, getTableName, tableName } from '../../data/db';

describe('data/db', () => {
    describe('exports', () => {
        it('should export db as a DynamoDB client', () => {
            expect(db).toBeDefined();
            expect(db.send).toBeDefined();
            expect(typeof db.send).toBe('function');
        });

        it('should export getTableName as a function', () => {
            expect(getTableName).toBeDefined();
            expect(typeof getTableName).toBe('function');
        });

        it('should export tableName as a string', () => {
            expect(tableName).toBeDefined();
            expect(typeof tableName).toBe('string');
            expect(tableName).toBe('test-table-name');
        });
    });

    describe('getTableName', () => {
        it('should return the test table name', () => {
            const name = getTableName();
            expect(name).toBe('test-table-name');
        });

        it('should return the same value as tableName export', () => {
            const name = getTableName();
            expect(name).toBe(tableName);
        });
    });
});
