/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
            name: 'apartment-manager',
            region: 'us-west-2',
            removal: input?.stage === 'production' ? 'retain' : 'remove',
            protect: ['production'].includes(input?.stage),
            home: 'aws',
        };
    },

    async run() {
        /* ────────────── 0. Router (for custom domain) ────────────── */
        const router = new sst.aws.Router('Router', {
            domain: {
                name: 'apartments.rungie.com',
                redirects: [
                    'www.apartments.rungie.com', // redirect www to non-www
                ],
            },
        });

        const uploadedDocs = new sst.aws.Bucket('ApartmentsUploads', {
            access: 'public',
        });

        /* ────────────── 1. Data layer (free-tier DynamoDB) ────────────── */
        const buildingsUnitsTable = new sst.aws.Dynamo('BuildingsUnits', {
            fields: { buildingID: 'string', unitID: 'string' },
            primaryIndex: { hashKey: 'buildingID', rangeKey: 'unitID' },

        });

        /* ────────────── 4. Front-end (Astro) ───────────────────── */
        const site = new sst.aws.Astro('Web', {
            link: [buildingsUnitsTable, uploadedDocs],
            router: {
                instance: router,
                path: '/',
            },
        });

        return {
            router: router.url,
            site: site.url,
        };
    },
});
