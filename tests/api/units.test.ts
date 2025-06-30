import { describe, test, expect, mock } from 'bun:test';
import { APIGatewayProxyEventV2, APIGatewayEventRequestContextV2 } from 'aws-lambda';
import { list, get, create, update, del } from '../../api/units';
import { UnitData } from '../../astro-src/types';
import _ from 'lodash';

describe('units API', () => {
    describe('list', () => {
        test('should return a list of units for a given building', async () => {
            const mockUnits = [{ unitID: '1', name: 'Unit 1' }];
            mock.module('../../data/units', () => ({
                getUnits: (buildingID: string) => (buildingID === 'building1' ? mockUnits : []),
            }));

            const response = await list({ pathParameters: { buildingID: 'building1' } } as unknown as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body!)).toEqual(mockUnits);
        });
    });

    describe('get', () => {
        test('should return a unit if found', async () => {
            const mockUnit = { unitID: '1', name: 'Unit 1' };
            mock.module('../../data/units', () => ({
                getUnit: (buildingID: string, unitID: string) => (buildingID === 'building1' && unitID === '1' ? mockUnit : undefined),
            }));

            const response = await get({ pathParameters: { buildingID: 'building1', unitID: '1' } } as unknown as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body!)).toEqual(mockUnit);
        });

        test('should return 404 if unit not found', async () => {
            mock.module('../../data/units', () => ({
                getUnit: () => undefined,
            }));

            const response = await get({ pathParameters: { buildingID: 'building1', unitID: '2' } } as unknown as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(404);
            expect(response.body).toBe('Not Found');
        });
    });

    describe('create', () => {
        test('should create a new unit', async () => {
            const newUnitData = { name: 'New Unit', buildingID: 'building1' };
            const createdUnit = { unitID: '3', ...newUnitData };
            mock.module('../../data/units', () => ({
                createUnit: (_data: UnitData) => createdUnit,
            }));

            const response = await create({ body: JSON.stringify(newUnitData) } as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body!)).toEqual(createdUnit);
        });
    });

    describe('update', () => {
        test('should update an existing unit if found', async () => {
            const updatedUnitData = { name: 'Updated Unit' };
            const updatedUnit = { unitID: '1', buildingID: 'building1', ...updatedUnitData };
            mock.module('../../data/units', () => ({
                updateUnit: (buildingID: string, unitID: string, _data: Partial<UnitData>) => (buildingID === 'building1' && unitID === '1' ? updatedUnit : undefined),
            }));

            const response = (await update({ pathParameters: { buildingID: 'building1', unitID: '1' }, body: JSON.stringify(updatedUnitData) } as unknown as APIGatewayProxyEventV2));
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body!)).toEqual(updatedUnit);
        });

        test('should return 404 if unit not found for update', async () => {
            mock.module('../../data/units', () => ({
                updateUnit: () => undefined,
            }));

            const response = await update({ version: '2.0', routeKey: '$default', rawPath: '/', rawQueryString: '', headers: {}, requestContext: {} as APIGatewayEventRequestContextV2, isBase64Encoded: false, pathParameters: { buildingID: 'building1', unitID: '2' }, body: JSON.stringify({ name: 'Non Existent' }) } as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(404);
            expect(response.body).toBe('Not Found');
        });
    });

    describe('del', () => {
        test('should delete a unit if found', async () => {
            mock.module('../../data/units', () => ({
                deleteUnit: (buildingID: string, unitID: string) => (!!(buildingID === 'building1' && unitID === '1')),
            }));

            const response = await del({ pathParameters: { buildingID: 'building1', unitID: '1' } } as unknown as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(204);
            expect(response.body).toBe('');
        });

        test('should return 404 if unit not found for deletion', async () => {
            mock.module('../../data/units', () => ({
                deleteUnit: _.constant(false),
            }));

            const response = (await del({ version: '2.0', routeKey: '$default', rawPath: '/', rawQueryString: '', headers: {}, requestContext: {} as APIGatewayEventRequestContextV2, isBase64Encoded: false, pathParameters: { buildingID: 'building1', unitID: '2' } } as APIGatewayProxyEventV2));
            expect(response.statusCode).toBe(404);
            expect(response.body).toBe('Not Found');
        });
    });
});
