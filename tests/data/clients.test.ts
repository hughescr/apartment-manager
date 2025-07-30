import { describe, it, expect } from 'bun:test';
import { getDynamoClient, getS3Client } from '../../data/clients';

describe('AWS Clients', () => {
    describe('getDynamoClient', () => {
        it('should return a DynamoDB client', () => {
            expect.assertions(2);
            const client = getDynamoClient();
            expect(client).toBeDefined();
            expect(typeof client.send).toBe('function');
        });

        it('should return the same client instance on subsequent calls', () => {
            expect.assertions(1);
            const client1 = getDynamoClient();
            const client2 = getDynamoClient();
            expect(client1).toBe(client2);
        });
    });

    describe('getS3Client', () => {
        it('should return an S3 client', () => {
            expect.assertions(2);
            const client = getS3Client();
            expect(client).toBeDefined();
            expect(typeof client.send).toBe('function');
        });

        it('should return the same client instance on subsequent calls', () => {
            expect.assertions(1);
            const client1 = getS3Client();
            const client2 = getS3Client();
            expect(client1).toBe(client2);
        });
    });

    describe('Client Isolation', () => {
        it('should maintain separate instances for DynamoDB and S3 clients', () => {
            expect.assertions(3);
            const dynamoClient = getDynamoClient();
            const s3Client = getS3Client();

            expect(dynamoClient).toBeDefined();
            expect(s3Client).toBeDefined();
            expect(dynamoClient).not.toBe(s3Client);
        });
    });
});
