import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import * as buildings from './buildings';
import * as units from './units';
import { noop, split, every, startsWith, keys } from 'lodash';

const routes: Record<string, Record<string, APIGatewayProxyHandlerV2>> = {
    '/api/buildings': {
        GET: buildings.list,
        POST: buildings.create,
    },
    '/api/buildings/{buildingID}': {
        GET: buildings.get,
        POST: buildings.createWithId,
        PUT: buildings.update,
        DELETE: buildings.del,
    },
    '/api/buildings/{buildingID}/units': {
        GET: units.list,
        POST: units.create,
    },
    '/api/buildings/{buildingID}/units/{unitID}': {
        GET: units.get,
        PUT: units.update,
        DELETE: units.del,
    },
};

function findRoute(rawPath: string): string | undefined {
    for(const routeKey of keys(routes)) {
        const routeParts = split(routeKey, '/');
        const pathParts = split(rawPath, '/');
        if(routeParts.length !== pathParts.length) {
            continue;
        }

        if(every(routeParts, (part, i) => startsWith(part, '{') || part === pathParts[i])) {
            return routeKey;
        }
    }
    return undefined;
}

export const handler: APIGatewayProxyHandlerV2 = (evt, ctx) => {
    const { rawPath, requestContext } = evt;
    const { http } = requestContext;
    const { method } = http;

    const route = findRoute(rawPath);
    const routeHandler = route ? routes[route][method] : undefined;

    if(routeHandler) {
        return routeHandler(evt, ctx, noop);
    }
};
