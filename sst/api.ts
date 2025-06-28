/// <reference path="../.sst/platform/config.d.ts" />

import { router } from './router';

export const api = new sst.aws.Function('API', {
    handler: 'api/index.handler',
    url: {
        router: {
            instance: router,
            path: '/api',
        }
    },
});
