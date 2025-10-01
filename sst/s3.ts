/// <reference path="../.sst/platform/config.d.ts" />

const uploadedDocs = new sst.aws.Bucket('ApartmentsUploads', {
    access: 'public',
});

const photosBucket = new sst.aws.Bucket('PhotosBucket', {
    access: 'public',
    cors:   {
        allowOrigins:  ['*'],
        allowMethods:  ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        allowHeaders:  ['*'],
        exposeHeaders: ['ETag'],
        maxAge:        '3000 seconds'
    }
});

export { uploadedDocs, photosBucket };
