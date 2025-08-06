/// <reference path="../.sst/platform/config.d.ts" />

/**
 * Parameter Store configuration for secure credential storage
 * Using AWS Systems Manager Parameter Store for free tier compatibility
 */

// Parameter Store permissions for Lambda functions
export const parameterStorePermissions = {
    actions: [
        'ssm:PutParameter',
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:DeleteParameter',
        'ssm:DescribeParameters',
        'kms:Decrypt',
        'kms:Encrypt'
    ],
    resources: [
        `arn:aws:ssm:${$app.stage === 'production' ? 'us-west-2' : 'us-west-2'}:*:parameter/apartment-manager/*`,
        `arn:aws:kms:${$app.stage === 'production' ? 'us-west-2' : 'us-west-2'}:*:key/*`
    ]
};

// Helper to get parameter path prefix for the current stage
export function getParameterPrefix(): string {
    return `/apartment-manager/${$app.stage}`;
}
