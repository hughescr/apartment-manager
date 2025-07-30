/**
 * Tests for data/clients.ts
 * Tests the dependency injection functionality
 */
import './test-setup';
import { describe, it, expect } from 'bun:test';
import { createMockDynamoClient, createMockS3Client } from '../test-utils/mock-clients';
import { getDynamoClient, getS3Client } from '../../data/clients';

describe('data/clients dependency injection', () => {
    describe('getDynamoClient', () => {
        it('should return injected client when provided', () => {
            const mockClient = createMockDynamoClient();

            const client = getDynamoClient(mockClient);

            expect(client).toBe(mockClient);
        });

        it('should return different injected clients each time', () => {
            const mockClient1 = createMockDynamoClient();
            const mockClient2 = createMockDynamoClient();

            const client1 = getDynamoClient(mockClient1);
            const client2 = getDynamoClient(mockClient2);

            expect(client1).toBe(mockClient1);
            expect(client2).toBe(mockClient2);
            expect(client1).not.toBe(client2);
        });
    });

    describe('getS3Client', () => {
        it('should return injected client when provided', () => {
            const mockClient = createMockS3Client();

            const client = getS3Client(mockClient);

            expect(client).toBe(mockClient);
        });

        it('should return different injected clients each time', () => {
            const mockClient1 = createMockS3Client();
            const mockClient2 = createMockS3Client();

            const client1 = getS3Client(mockClient1);
            const client2 = getS3Client(mockClient2);

            expect(client1).toBe(mockClient1);
            expect(client2).toBe(mockClient2);
            expect(client1).not.toBe(client2);
        });
    });
});
