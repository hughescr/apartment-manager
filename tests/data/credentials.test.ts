import { describe, test, expect, beforeEach } from 'bun:test';
import { ssmMock } from './test-setup';

// Type for AWS service errors that have a name property
interface AWSServiceError extends Error {
    name: string
}
import {
    storeCredential,
    getCredential,
    deleteCredential,
    listCredentials,
    hasCredential,
    type SiteCredentials
} from '../../data/credentials';

describe('Credentials Data Layer', () => {
    beforeEach(() => {
        // Clear all mock calls between tests
        ssmMock.mockClear();
    });

    describe('storeCredential', () => {
        test('should store credentials successfully', async () => {
            const credentials: SiteCredentials = {
                apiKey: 'test-api-key',
                apiSecret: 'test-api-secret',
                feedUrl: 'https://example.com/feed'
            };

            const result = await storeCredential('apartments-com', credentials);

            expect(result).toBe(true);
            expect(ssmMock).toHaveBeenCalledTimes(1);

            const call = ssmMock.mock.calls[0][0];
            expect(call.constructor.name).toBe('PutParameterCommand');
            expect(call.input.Name).toBe('/apartment-manager/test/credentials/apartments-com');
            expect(call.input.Type).toBe('SecureString');
            expect(call.input.Overwrite).toBe(true);
            expect(JSON.parse(call.input.Value)).toEqual(credentials);
        });

        test('should handle storage errors', async () => {
            ssmMock.mockRejectedValueOnce(new Error('AWS Error'));

            expect(
                storeCredential('test-site', { apiKey: 'key' })
            ).rejects.toThrow('Failed to store credentials: AWS Error');
        });
    });

    describe('getCredential', () => {
        test('should retrieve credentials successfully', async () => {
            const storedCredentials = {
                apiKey: 'retrieved-key',
                apiSecret: 'retrieved-secret'
            };

            ssmMock.mockResolvedValueOnce({
                Parameter: {
                    Name: '/apartment-manager/test/credentials/zillow',
                    Value: JSON.stringify(storedCredentials),
                    Type: 'SecureString'
                }
            });

            const result = await getCredential('zillow');

            expect(result).toEqual(storedCredentials);
            expect(ssmMock).toHaveBeenCalledTimes(1);

            const call = ssmMock.mock.calls[0][0];
            expect(call.constructor.name).toBe('GetParameterCommand');
            expect(call.input.Name).toBe('/apartment-manager/test/credentials/zillow');
            expect(call.input.WithDecryption).toBe(true);
        });

        test('should return null for non-existent credentials', async () => {
            const error = new Error('Parameter not found') as AWSServiceError;
            error.name = 'ParameterNotFound';
            ssmMock.mockRejectedValueOnce(error);

            const result = await getCredential('nonexistent');

            expect(result).toBeNull();
        });

        test('should handle retrieval errors', async () => {
            ssmMock.mockRejectedValueOnce(new Error('AWS Error'));

            expect(
                getCredential('test-site')
            ).rejects.toThrow('Failed to retrieve credentials: AWS Error');
        });
    });

    describe('deleteCredential', () => {
        test('should delete credentials successfully', async () => {
            const result = await deleteCredential('apartments-com');

            expect(result).toBe(true);
            expect(ssmMock).toHaveBeenCalledTimes(1);

            const call = ssmMock.mock.calls[0][0];
            expect(call.constructor.name).toBe('DeleteParameterCommand');
            expect(call.input.Name).toBe('/apartment-manager/test/credentials/apartments-com');
        });

        test('should handle deletion of non-existent credentials gracefully', async () => {
            const error = new Error('Parameter not found') as AWSServiceError;
            error.name = 'ParameterNotFound';
            ssmMock.mockRejectedValueOnce(error);

            const result = await deleteCredential('nonexistent');

            expect(result).toBe(true); // Should still return true
        });

        test('should handle deletion errors', async () => {
            ssmMock.mockRejectedValueOnce(new Error('AWS Error'));

            expect(
                deleteCredential('test-site')
            ).rejects.toThrow('Failed to delete credentials: AWS Error');
        });
    });

    describe('listCredentials', () => {
        test('should list all sites with credentials', async () => {
            ssmMock.mockResolvedValueOnce({
                Parameters: [
                    { Name: '/apartment-manager/test/credentials/apartments-com' },
                    { Name: '/apartment-manager/test/credentials/zillow' },
                    { Name: '/apartment-manager/test/credentials/rentals-com' }
                ],
                NextToken: undefined
            });

            const result = await listCredentials();

            expect(result).toEqual(['apartments-com', 'zillow', 'rentals-com']);
            expect(ssmMock).toHaveBeenCalledTimes(1);

            const call = ssmMock.mock.calls[0][0];
            expect(call.constructor.name).toBe('DescribeParametersCommand');
            expect(call.input.ParameterFilters[0].Key).toBe('Name');
            expect(call.input.ParameterFilters[0].Option).toBe('BeginsWith');
            expect(call.input.ParameterFilters[0].Values[0]).toBe('/apartment-manager/test/credentials');
        });

        test('should handle pagination', async () => {
            // First page
            ssmMock.mockResolvedValueOnce({
                Parameters: [
                    { Name: '/apartment-manager/test/credentials/site1' },
                    { Name: '/apartment-manager/test/credentials/site2' }
                ],
                NextToken: 'token123'
            });

            // Second page
            ssmMock.mockResolvedValueOnce({
                Parameters: [
                    { Name: '/apartment-manager/test/credentials/site3' }
                ],
                NextToken: undefined
            });

            const result = await listCredentials();

            expect(result).toEqual(['site1', 'site2', 'site3']);
            expect(ssmMock).toHaveBeenCalledTimes(2);
        });

        test('should return empty array when no credentials exist', async () => {
            ssmMock.mockResolvedValueOnce({
                Parameters: [],
                NextToken: undefined
            });

            const result = await listCredentials();

            expect(result).toEqual([]);
        });

        test('should handle listing errors', async () => {
            ssmMock.mockRejectedValueOnce(new Error('AWS Error'));

            expect(
                listCredentials()
            ).rejects.toThrow('Failed to list credentials: AWS Error');
        });
    });

    describe('hasCredential', () => {
        test('should return true for existing credentials', async () => {
            ssmMock.mockResolvedValueOnce({
                Parameter: {
                    Name: '/apartment-manager/test/credentials/test-site',
                    Value: '{"apiKey":"key"}',
                    Type: 'SecureString'
                }
            });

            const result = await hasCredential('test-site');

            expect(result).toBe(true);
        });

        test('should return false for non-existent credentials', async () => {
            const error = new Error('Parameter not found') as AWSServiceError;
            error.name = 'ParameterNotFound';
            ssmMock.mockRejectedValueOnce(error);

            const result = await hasCredential('nonexistent');

            expect(result).toBe(false);
        });

        test('should return false on errors', async () => {
            ssmMock.mockRejectedValueOnce(new Error('AWS Error'));

            const result = await hasCredential('test-site');

            expect(result).toBe(false);
        });
    });

    describe('Credential Types', () => {
        test('should handle username/password credentials', async () => {
            const credentials: SiteCredentials = {
                username: 'testuser',
                password: 'testpass'
            };

            const result = await storeCredential('site1', credentials);

            expect(result).toBe(true);
            const call = ssmMock.mock.calls[0][0];
            expect(JSON.parse(call.input.Value)).toEqual(credentials);
        });

        test('should handle API key credentials', async () => {
            const credentials: SiteCredentials = {
                apiKey: 'test-key-123',
                apiSecret: 'test-secret-456'
            };

            const result = await storeCredential('site2', credentials);

            expect(result).toBe(true);
            const call = ssmMock.mock.calls[0][0];
            expect(JSON.parse(call.input.Value)).toEqual(credentials);
        });

        test('should handle feed URL credentials', async () => {
            const credentials: SiteCredentials = {
                feedUrl: 'https://mysite.com/mits-feed.xml'
            };

            const result = await storeCredential('site3', credentials);

            expect(result).toBe(true);
            const call = ssmMock.mock.calls[0][0];
            expect(JSON.parse(call.input.Value)).toEqual(credentials);
        });

        test('should handle metadata', async () => {
            const credentials: SiteCredentials = {
                apiKey: 'key',
                metadata: {
                    accountId: '12345',
                    region: 'us-west',
                    tier: 'premium'
                }
            };

            const result = await storeCredential('site4', credentials);

            expect(result).toBe(true);
            const call = ssmMock.mock.calls[0][0];
            expect(JSON.parse(call.input.Value)).toEqual(credentials);
        });
    });
});
