import { describe, test, expect, mock } from 'bun:test';
import { APIGatewayProxyEventV2, APIGatewayEventRequestContextV2 } from 'aws-lambda';
import { list, get, create, update, del } from '../../api/buildings';
import { BuildingData } from '../../astro-src/types';
import _ from 'lodash';

describe('buildings API', () => {
    describe('list', () => {
        test('should return a list of buildings', async () => {
            const mockBuildings = [{ buildingID: '1', name: 'Building 1' }];
            mock.module('../../data/buildings', () => ({
                getBuildings: () => mockBuildings,
            }));

            const response = await list();
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body!)).toEqual(mockBuildings);
        });
    });

    describe('get', () => {
        test('should return a building if found', async () => {
            const mockBuilding = { buildingID: '1', name: 'Building 1' };
            mock.module('../../data/buildings', () => ({
                getBuilding: (id: string) => (id === '1' ? mockBuilding : undefined),
            }));

            const response = await get({ pathParameters: { buildingID: '1' } } as unknown as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body!)).toEqual(mockBuilding);
        });

        test('should return 404 if building not found', async () => {
            mock.module('../../data/buildings', () => ({
                getBuilding: () => undefined,
            }));

            const response = await get({ version: '2.0', routeKey: '$default', rawPath: '/', rawQueryString: '', headers: {}, requestContext: {} as APIGatewayEventRequestContextV2, isBase64Encoded: false, pathParameters: { buildingID: '1' } } as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(404);
            expect(response.body).toBe('Not Found');
        });
    });

    describe('create', () => {
        test('should create a new building', async () => {
            const newBuildingData = { name: 'New Building' };
            const createdBuilding = { buildingID: '3', ...newBuildingData };
            mock.module('../../data/buildings', () => ({
                createBuilding: (_data: BuildingData) => createdBuilding,
            }));

            const response = await create({ body: JSON.stringify(newBuildingData) } as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(201);
            expect(JSON.parse(response.body!)).toEqual(createdBuilding);
        });
    });

    describe('update', () => {
        test('should update an existing building if found', async () => {
            const updatedBuildingData = { name: 'Updated Building' };
            const updatedBuilding = { buildingID: '1', ...updatedBuildingData };
            mock.module('../../data/buildings', () => ({
                updateBuilding: (id: string, _data: Partial<BuildingData>) => (id === '1' ? updatedBuilding : undefined),
            }));

            const response = await update({ pathParameters: { buildingID: '1' }, body: JSON.stringify(updatedBuildingData) } as unknown as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(200);
            expect(JSON.parse(response.body!)).toEqual(updatedBuilding);
        });

        test('should return 404 if building not found for update', async () => {
            mock.module('../../data/buildings', () => ({
                updateBuilding: () => undefined,
            }));

            const response = await update({ pathParameters: { buildingID: '2' }, body: JSON.stringify({ name: 'Non Existent' }) } as unknown as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(404);
            expect(response.body).toBe('Not Found');
        });
    });

    describe('del', () => {
        test('should delete a building if found', async () => {
            mock.module('../../data/buildings', () => ({
                deleteBuilding: (id: string) => (id === '1'),
            }));

            const response = await del({ pathParameters: { buildingID: '1' } } as unknown as APIGatewayProxyEventV2);
            expect(response.statusCode).toBe(204);
            expect(response.body).toBe('');
        });

        test('should return 404 if building not found for deletion', async () => {
            mock.module('../../data/buildings', () => ({
                deleteBuilding: _.constant(false),
            }));

            const response = (await del({ pathParameters: { buildingID: '2' } } as unknown as APIGatewayProxyEventV2));
            expect(response.statusCode).toBe(404);
            expect(response.body).toBe('Not Found');
        });
    });
});
