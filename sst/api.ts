/// <reference path="../.sst/platform/config.d.ts" />
import { buildingsUnitsTable } from './dynamo';

export const api = new sst.aws.Function('API', {
    handler: 'api/index.handler',
    url: true,
    link: [buildingsUnitsTable],
});
