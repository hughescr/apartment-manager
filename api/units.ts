import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../data/units';

export const list: APIGatewayProxyHandlerV2 = async evt => ({
    statusCode: 200,
    body: JSON.stringify(await getUnits(evt.pathParameters?.buildingID ?? '')),
});

export const get: APIGatewayProxyHandlerV2 = async (evt) => {
    const unit = await getUnit(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.unitID ?? '');
    return unit ? { statusCode: 200, body: JSON.stringify(unit) } : { statusCode: 404, body: 'Not Found' };
};

export const create: APIGatewayProxyHandlerV2 = async (evt) => {
    const newUnit = await createUnit(JSON.parse(evt.body!));
    return { statusCode: 201, body: JSON.stringify(newUnit) };
};

export const update: APIGatewayProxyHandlerV2 = async (evt) => {
    const updatedUnit = await updateUnit(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.unitID ?? '', JSON.parse(evt.body!));
    return updatedUnit ? { statusCode: 200, body: JSON.stringify(updatedUnit) } : { statusCode: 404, body: 'Not Found' };
};

export const del: APIGatewayProxyHandlerV2 = async (evt) => {
    const success = await deleteUnit(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.unitID ?? '');
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
