/**
 * Tests for data/db.ts
 * Tests module exports within the existing test framework
 */
import './test-setup';
import { describe, it, expect } from 'bun:test';
import { db, getTableName } from '../../data/db';

describe('data/db', () => {
    describe('exports', () => {
        it('should export db as a DynamoDB client', () => {
            expect(db).toBeDefined();
            // eslint-disable-next-line @typescript-eslint/unbound-method -- checking method existence
            expect(db.send).toBeDefined();
            expect(typeof db.send).toBe('function');
        });

        it('should export getTableName as a function', () => {
            expect(getTableName).toBeDefined();
            expect(typeof getTableName).toBe('function');
        });

        // tableName export removed to avoid module load time SST Resource access
    });

    describe('getTableName', () => {
        it('should return the test table name', () => {
            const name = getTableName();
            expect(name).toBe('test-table-name');
        });

        it('should return the same value when called multiple times', () => {
            const name1 = getTableName();
            const name2 = getTableName();
            expect(name1).toBe(name2);
        });
    });
});
