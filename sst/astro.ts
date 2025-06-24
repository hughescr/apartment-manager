/// <reference path="../.sst/platform/config.d.ts" />

import { router } from './router';
import { buildingsUnitsTable } from './dynamo';
import { uploadedDocs } from './s3';

const site = new sst.aws.Astro('Web', {
    link: [buildingsUnitsTable, uploadedDocs],
    router: {
        instance: router,
        path: '/',
    },
});

export { site };
