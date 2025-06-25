/// <reference path="../.sst/platform/config.d.ts" />

import { router } from './router';

export const api = new sst.aws.Function('Api', {
    handler: 'api/index.handler',
    router: {
        instance: router,
        path: '/api',
    },
});
