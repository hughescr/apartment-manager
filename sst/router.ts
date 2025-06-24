/// <reference path="../.sst/platform/config.d.ts" />

const router = new sst.aws.Router('Router', {
    domain: {
        name: 'apartments.rungie.com',
        redirects: ['www.apartments.rungie.com'],
    },
});

export { router };
