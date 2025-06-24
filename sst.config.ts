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
        // Global defaults for all DynamoDB tables: provisioned mode with 1 RCU/1 WCU
        $transform(sst.aws.Dynamo, (args) => {
            args.transform ??= {};
            args.transform.table = {
                ...(args.transform.table ?? {}),
                billingMode: 'PROVISIONED',
                readCapacity: 1,
                writeCapacity: 1,
            };
        });
        // Global defaults for all Lambda functions: nodejs22.x runtime and arm64 architecture
        $transform(sst.aws.Function, (args) => {
            args.runtime ??= 'nodejs22.x';
            args.architecture ??= 'arm64';
        });
        /* ────────────── 0. Router (for custom domain) ────────────── */
        const router = new sst.aws.Router('Router', {
            domain: {
                name: 'apartments.rungie.com',
                redirects: [
                    'www.apartments.rungie.com', // redirect www to non-www
                ],
            },
        });

        /* ────────────── 1. Data layer (S3 and free-tier DynamoDB) ────────────── */
        const uploadedDocs = new sst.aws.Bucket('ApartmentsUploads', {
            access: 'public',
        });

        const buildingsUnitsTable = new sst.aws.Dynamo('BuildingsUnits', {
            fields: { buildingID: 'string', unitID: 'string' },
            primaryIndex: { hashKey: 'buildingID', rangeKey: 'unitID' },
        });

        /* ────────────── 2. Any needed server-side logic (Lambdas, Cron jobs, etc) ────────────── */

        /* ────────────── 3. Front-end (Astro) ───────────────────── */
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
