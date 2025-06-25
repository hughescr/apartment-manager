/// <reference path="../.sst/platform/config.d.ts" />

import { router } from './router';

export const api = new sst.aws.Function('Api', {
    handler: 'api/index.handler',
    router: {
        instance: router,
        routes: {
            'GET /api/buildings': 'api/index.handler',
            'POST /api/buildings': 'api/index.handler',
            'GET /api/buildings/{buildingID}': 'api/index.handler',
            'PUT /api/buildings/{buildingID}': 'api/index.handler',
            'DELETE /api/buildings/{buildingID}': 'api/index.handler',
            'GET /api/buildings/{buildingID}/units': 'api/index.handler',
            'POST /api/buildings/{buildingID}/units': 'api/index.handler',
            'GET /api/buildings/{buildingID}/units/{unitID}': 'api/index.handler',
            'PUT /api/buildings/{buildingID}/units/{unitID}': 'api/index.handler',
            'DELETE /api/buildings/{buildingID}/units/{unitID}': 'api/index.handler',
        }
    },
});
