/// <reference path="../.sst/platform/config.d.ts" />

import { router } from './router';
import { buildingsUnitsTable } from './dynamo';
import { uploadedDocs } from './s3';
import { api } from './api';

const site = new sst.aws.Astro('Web', {
    buildCommand: 'bunx astro build',
    link: [buildingsUnitsTable, uploadedDocs, api],
    router: {
        instance: router,
        path: '/',
    },
});

export { site };
