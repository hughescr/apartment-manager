/// <reference path="../.sst/platform/config.d.ts" />

const uploadedDocs = new sst.aws.Bucket('ApartmentsUploads', {
    access: 'public',
});

export { uploadedDocs };
