/// <reference path="../.sst/platform/config.d.ts" />

import { buildingsUnitsTable } from './dynamo';
import { uploadedDocs } from './s3';
import { api } from './api';

const site = new sst.aws.Astro('Web', {
    link: [buildingsUnitsTable, uploadedDocs, api],
    domain: {
        name: 'apartments.rungie.com',
        redirects: ['www.apartments.rungie.com'],
    },
});

export { site };
