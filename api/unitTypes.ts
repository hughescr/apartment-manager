import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getUnitTypes, getUnitType, createUnitType, updateUnitType, deleteUnitType } from '../data/unitTypes';

export const list = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => ({
    statusCode: 200,
    body: JSON.stringify(await getUnitTypes(evt.pathParameters?.buildingID ?? '')),
});

export const get = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const unitType = await getUnitType(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.modelID ?? '');
    return unitType ? { statusCode: 200, body: JSON.stringify(unitType) } : { statusCode: 404, body: 'Not Found' };
};

export const create = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const unitTypeData = JSON.parse(evt.body!);
    const existing = await getUnitType(unitTypeData.buildingID, unitTypeData.modelID);
    if(existing) {
        return { statusCode: 409, body: JSON.stringify({ error: 'Unit type already exists' }) };
    }
    const newUnitType = await createUnitType(unitTypeData);
    return { statusCode: 201, body: JSON.stringify(newUnitType) };
};

export const update = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const updatedUnitType = await updateUnitType(
        evt.pathParameters?.buildingID ?? '',
        evt.pathParameters?.modelID ?? '',
        JSON.parse(evt.body!)
    );
    return updatedUnitType ? { statusCode: 200, body: JSON.stringify(updatedUnitType) } : { statusCode: 404, body: 'Not Found' };
};

export const del = async (evt: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
    const success = await deleteUnitType(evt.pathParameters?.buildingID ?? '', evt.pathParameters?.modelID ?? '');
    return success ? { statusCode: 204, body: '' } : { statusCode: 404, body: 'Not Found' };
};
