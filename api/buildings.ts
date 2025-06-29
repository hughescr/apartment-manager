import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../data/buildings';

export const list: APIGatewayProxyHandlerV2 = async () => ({
    statusCode: 200,
    body: JSON.stringify(await getBuildings()),
});

export const get: APIGatewayProxyHandlerV2 = async (evt) => {
    const building = await getBuilding(evt.pathParameters?.buildingID ?? '');
    return building ? { statusCode: 200, body: JSON.stringify(building) } : { statusCode: 404, body: 'Not Found' };
};

export const create: APIGatewayProxyHandlerV2 = async (evt) => {
    const newBuilding = await createBuilding(JSON.parse(evt.body!));
    return { statusCode: 201, body: JSON.stringify(newBuilding) };
};

export const update: APIGatewayProxyHandlerV2 = async (evt) => {
    const updatedBuilding = await updateBuilding(evt.pathParameters?.buildingID ?? '', JSON.parse(evt.body!));
    return updatedBuilding ? { statusCode: 200, body: JSON.stringify(updatedBuilding) } : { statusCode: 404, body: 'Not Found' };
};

export const del: APIGatewayProxyHandlerV2 = async (evt) => {
    const success = await deleteBuilding(evt.pathParameters?.buildingID ?? '');
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
