/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
            name: 'apartment-manager',
            region: 'us-west-2',
            removal: input?.stage === 'production' ? 'retain' : 'remove',
            protect: ['production'].includes(input?.stage),
            home: 'aws',
            providers: {
                aws: {
                    region: 'us-west-2',
                },
            },
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

        /* ────────────── Resources ────────────── */
        const { router } =  await import('./sst/router');
        const { site } = await import('./sst/astro');
        return {
            router: router.url,
            site: site.url,
        };
    },
});
