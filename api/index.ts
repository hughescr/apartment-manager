import { APIGatewayProxyHandlerV2, APIGatewayProxyEventV2 } from 'aws-lambda';
import { handler as buildingsHandler } from './buildings';
import { handler as unitsHandler } from './units';
import { noop } from 'lodash';

const routes: Record<string, APIGatewayProxyHandlerV2> = {
    '/api/buildings': buildingsHandler,
    '/api/units': unitsHandler,
};

export const handler: APIGatewayProxyHandlerV2 = async (evt: APIGatewayProxyEventV2) => {
    const { rawPath } = evt;
    const routeHandler = routes[rawPath];

    if(routeHandler) {
        return routeHandler(evt, null, noop);
    }

    return {
        statusCode: 404,
        body: 'Not Found',
    };
};
