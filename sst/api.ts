/// <reference path="../.sst/platform/config.d.ts" />
import { buildingsUnitsTable } from './dynamo';
import { photosBucket } from './s3';

export const api = new sst.aws.Function('API', {
    handler: 'api/index.handler',
    url: true,
    link: [buildingsUnitsTable],
    logging: {
        retention: '1 month',
        format: 'json',
    }
});

export const uploadApi = new sst.aws.Function('UploadAPI', {
    handler: 'api/upload.handler',
    url: true,
    link: [photosBucket],
    permissions: [
        {
            actions: ['s3:PutObject', 's3:DeleteObject', 's3:GetObject'],
            resources: [photosBucket.arn.apply(arn => `${arn}/*`)]
        }
    ],
    logging: {
        retention: '1 month',
        format: 'json',
    }
});
