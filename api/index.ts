import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import * as buildings from './buildings';
import * as units from './units';
import * as unitTypes from './unitTypes';
import * as version from './version';
import * as credentials from './credentials';
import * as feed from './feed';
import * as geocoding from './geocoding';
import { noop, split, every, startsWith, endsWith, forEach, keys } from 'lodash';

const routes: Record<string, Record<string, APIGatewayProxyHandlerV2>> = {
    '/version': {
        GET: version.get,
    },
    '/buildings': {
        GET: buildings.list,
        POST: buildings.create,
    },
    '/buildings/{buildingID}': {
        GET: buildings.get,
        PUT: buildings.update,
        DELETE: buildings.del,
    },
    '/buildings/{buildingID}/units': {
        GET: units.list,
        POST: units.create,
    },
    '/buildings/{buildingID}/units/{unitID}': {
        GET: units.get,
        PUT: units.update,
        DELETE: units.del,
    },
    '/buildings/{buildingID}/units/bulk-status': {
        PUT: units.bulkStatusUpdate,
    },
    '/buildings/{buildingID}/units/bulk-rent': {
        PUT: units.bulkRentUpdate,
    },
    '/buildings/{buildingID}/unit-types': {
        GET: unitTypes.list,
        POST: unitTypes.create,
    },
    '/buildings/{buildingID}/unit-types/{modelID}': {
        GET: unitTypes.get,
        PUT: unitTypes.update,
        DELETE: unitTypes.del,
    },
    '/credentials': {
        GET: credentials.list,
    },
    '/credentials/{site}': {
        GET: credentials.get,
        POST: credentials.create,
        PUT: credentials.update,
        DELETE: credentials.del,
    },
    '/feed/{site}/live': {
        GET: feed.live,
    },
    '/geocoding': {
        POST: geocoding.geocode,
    },
    '/geocoding/status': {
        GET: geocoding.status,
    },
    '/geocoding/cache': {
        DELETE: geocoding.clearCache,
    },
};

export function findRoute(rawPath: string): string | undefined {
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

export function extractPathParameters(routeKey: string, rawPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const routeParts = split(routeKey, '/');
    const pathParts = split(rawPath, '/');

    forEach(routeParts, (part, i) => {
        if(startsWith(part, '{') && endsWith(part, '}')) {
            const paramName = part.substring(1, part.length - 1);
            params[paramName] = decodeURIComponent(pathParts[i]);
        }
    });

    return params;
}

export const handler: APIGatewayProxyHandlerV2 = (evt, ctx) => {
    const { rawPath, requestContext } = evt;
    const { http } = requestContext;
    const { method } = http;

    const route = findRoute(rawPath);
    const routeHandler = route ? routes[route][method] : undefined;

    if(routeHandler) {
        const pathParameters = route ? extractPathParameters(route, rawPath) : {};
        const newEvt = { ...evt, pathParameters };
        return routeHandler(newEvt, ctx, noop);
    }
};
