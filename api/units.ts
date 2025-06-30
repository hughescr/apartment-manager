import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getUnits, getUnit, createUnit, updateUnit, deleteUnit } from '../data/units';

export const list = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => ({
    statusCode: 200,
    body: JSON.stringify(await getUnits(evt.pathParameters?.buildingID ?? '')),
});

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const unit = await getUnit(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.unitID ?? '');
    return unit ? { statusCode: 200, body: JSON.stringify(unit) } : { statusCode: 404, body: 'Not Found' };
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const newUnit = await createUnit(JSON.parse(evt.body!));
    return { statusCode: 201, body: JSON.stringify(newUnit) };
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const updatedUnit = await updateUnit(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.unitID ?? '', JSON.parse(evt.body!));
    return updatedUnit ? { statusCode: 200, body: JSON.stringify(updatedUnit) } : { statusCode: 404, body: 'Not Found' };
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const success = await deleteUnit(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.unitID ?? '');
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
