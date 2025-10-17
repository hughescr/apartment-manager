import type {} from '../.sst/platform/config';

import { buildingsUnitsTable } from './dynamo';
import { uploadedDocs } from './s3';
import { api, uploadApi } from './api';

const site = new sst.aws.Astro('Web', {
    link:   [buildingsUnitsTable, uploadedDocs, api, uploadApi],
    domain: {
        name:      'apartments.rungie.com',
        redirects: ['www.apartments.rungie.com'],
    },
});

export { site };
