// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, jest, resetAllMocks } from '../data/test-setup';

import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AmenityCategory } from '../../src/types';

export { dynamoDbMock, jest, resetAllMocks };

export const createMockEvent = (overrides: Partial<APIGatewayProxyEventV2> = {}): APIGatewayProxyEventV2 => {
    const baseEvent: APIGatewayProxyEventV2 = {
        headers: {},
        isBase64Encoded: false,
        rawPath: '/api/buildings/test-building-1/unit-types',
        rawQueryString: '',
        requestContext: {
            accountId: 'test-account',
            apiId: 'test-api',
            domainName: 'test.com',
            domainPrefix: 'test',
            http: {
                method: 'GET',
                path: '/api/buildings/test-building-1/unit-types',
                protocol: 'HTTP/1.1',
                sourceIp: '127.0.0.1',
                userAgent: 'test-agent',
            },
            requestId: 'test-request-id',
            routeKey: 'GET /api/buildings/{buildingID}/unit-types',
            stage: 'test',
            time: '01/Jan/2024:00:00:00 +0000',
            timeEpoch: 1704067200000,
        },
        routeKey: 'GET /api/buildings/{buildingID}/unit-types',
        version: '2.0',
    };
    // Merge overrides while preserving required properties
    const result = { ...baseEvent, ...overrides };
    // Ensure requestContext is preserved
    if(overrides.requestContext) {
        result.requestContext = { ...baseEvent.requestContext, ...overrides.requestContext };
    }
    return result;
};

export const testUnitType = {
    buildingID: 'test-building-1',
    modelID: 'model-2br',
    modelName: '2 Bedroom Deluxe',
    countAvailable: 5,
    dateAvailable: '2024-04-01',
    beds: 2,
    baths: 2,
    maxOccupants: 4,
    minRent: 1500,
    maxRent: 1800,
    perPersonRent: 450,
    minSqft: 950,
    maxSqft: 1100,
    deposit: 1500,
    minLeaseTerm: 6,
    maxLeaseTerm: 12,
    modelAmenities: [
        { name: 'Balcony', category: AmenityCategory.UNIT },
        { name: 'In-unit Washer/Dryer', category: AmenityCategory.UNIT }
    ],
};
