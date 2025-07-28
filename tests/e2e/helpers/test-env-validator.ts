import { Resource } from 'sst';
import { DynamoDBClient, DescribeTableCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import _ from 'lodash';

// Type definitions
export interface ValidationCheck {
    name: string
    success: boolean
    message: string
    error?: string
    details?: Record<string, unknown>
}

export interface ValidationResult {
    success: boolean
    checks: ValidationCheck[]
    summary: {
        total: number
        passed: number
        failed: number
    }
    timestamp: string
}

export interface ValidationOptions {
    verbose?: boolean
    skipSSTCheck?: boolean
    skipDynamoDBCheck?: boolean
    skipCredentialsCheck?: boolean
    skipAPICheck?: boolean
}

// Individual validation functions
async function checkEnvironmentVariables(): Promise<ValidationCheck> {
    const check: ValidationCheck = {
        name: 'Environment Variables',
        success: true,
        message: 'Required environment variables are set',
    };

    const issues: string[] = [];
    const warnings: string[] = [];

    // E2E_BASE_URL is optional - default works fine
    if(!process.env.E2E_BASE_URL) {
        warnings.push('E2E_BASE_URL is not set (defaulting to http://localhost:4321)');
    }

    // AWS_REGION is required
    if(!process.env.AWS_REGION) {
        issues.push('AWS_REGION is not set');
    }

    if(issues.length > 0) {
        check.success = false;
        check.message = 'Some required environment variables are missing';
        check.error = issues.join('; ');
        check.details = {
            E2E_BASE_URL: process.env.E2E_BASE_URL || 'not set (using default)',
            AWS_REGION: process.env.AWS_REGION || 'not set',
        };
    } else if(warnings.length > 0) {
        // Only warnings, not failures
        check.message = 'All required environment variables are set';
        check.details = {
            E2E_BASE_URL: process.env.E2E_BASE_URL || 'not set (using default)',
            AWS_REGION: process.env.AWS_REGION || 'set',
            warnings: warnings,
        };
    }

    return check;
}

async function checkSSTResources(): Promise<ValidationCheck> {
    const check: ValidationCheck = {
        name: 'SST Resources',
        success: true,
        message: 'SST resources are available',
    };

    try {
        if(!Resource || !_.isObject(Resource)) {
            throw new Error('Resource object is not available');
        }

        const requiredResources = {
            'BuildingsUnits.name': _.get(Resource, 'BuildingsUnits.name'),
            'API.url': _.get(Resource, 'API.url'),
        };

        const missingResources = _([])
            .thru(() => Object.entries(requiredResources))
            .filter(([, value]) => !value)
            .map(([key]) => key)
            .value();

        if(missingResources.length > 0) {
            throw new Error(`Missing resources: ${missingResources.join(', ')}`);
        }

        check.details = requiredResources;
    } catch(error) {
        check.success = false;
        check.message = 'SST resources are not properly configured';
        check.error = _.isError(error) ? error.message : String(error);
        check.details = {
            hint: "Make sure you're running tests with 'bun run sst-dev' or against a deployed environment",
        };
    }

    return check;
}

async function checkAWSCredentials(): Promise<ValidationCheck> {
    const check: ValidationCheck = {
        name: 'AWS Credentials',
        success: true,
        message: 'AWS credentials are properly configured',
    };

    try {
        const stsClient = new STSClient({});
        const command = new GetCallerIdentityCommand({});
        const response = await stsClient.send(command);

        check.details = {
            account: response.Account,
            userId: response.UserId,
            arn: response.Arn,
        };
    } catch(error) {
        check.success = false;
        check.message = 'AWS credentials are not properly configured';
        check.error = _.isError(error) ? error.message : String(error);
        check.details = {
            hint: 'Check that AWS credentials are available in your environment',
        };
    }

    return check;
}

async function checkDynamoDBTable(): Promise<ValidationCheck> {
    const check: ValidationCheck = {
        name: 'DynamoDB Table',
        success: true,
        message: 'DynamoDB table exists and is accessible',
    };

    try {
        // Get table name from SST resources
        const tableName = _.get(Resource, 'BuildingsUnits.name');
        if(!tableName) {
            throw new Error('Table name not found in SST resources');
        }

        const client = new DynamoDBClient({});

        // Describe table
        const describeCommand = new DescribeTableCommand({ TableName: tableName });
        const describeResponse = await client.send(describeCommand);

        // Try a scan to ensure we have permissions
        const scanCommand = new ScanCommand({
            TableName: tableName,
            Limit: 1,
        });
        const scanResponse = await client.send(scanCommand);

        check.details = {
            tableName,
            tableStatus: describeResponse.Table?.TableStatus,
            itemCount: describeResponse.Table?.ItemCount,
            scanSuccessful: true,
            scannedCount: scanResponse.ScannedCount,
        };
    } catch(error) {
        check.success = false;
        check.message = 'DynamoDB table is not accessible';
        check.error = _.isError(error) ? error.message : String(error);

        // Provide specific hints based on error type
        const errorMessage = _.isError(error) ? error.message : '';
        if(errorMessage.includes('UnrecognizedClientException')) {
            check.details = {
                hint: 'Invalid AWS credentials. Check your AWS configuration.',
            };
        } else if(errorMessage.includes('AccessDeniedException')) {
            check.details = {
                hint: 'AWS credentials lack DynamoDB permissions. Check IAM policies.',
            };
        } else if(errorMessage.includes('ResourceNotFoundException')) {
            check.details = {
                hint: "DynamoDB table does not exist. Run 'bun run sst-dev' to create it.",
            };
        } else {
            check.details = {
                hint: 'Unknown error accessing DynamoDB. Check logs for details.',
            };
        }
    }

    return check;
}

async function checkAPIEndpoints(): Promise<ValidationCheck> {
    const check: ValidationCheck = {
        name: 'API Endpoints',
        success: true,
        message: 'API endpoints are responding',
    };

    try {
        const apiUrl = _.get(Resource, 'API.url');
        const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:4321';

        const endpoints = [
            { name: 'Base URL', url: baseUrl },
            ...(apiUrl ? [{ name: 'API URL', url: apiUrl }] : []),
        ];

        const results: Record<string, { status: number, ok: boolean }> = {};

        for(const endpoint of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

                const response = await fetch(endpoint.url, {
                    method: 'GET',
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                results[endpoint.name] = {
                    status: response.status,
                    ok: response.ok,
                };

                if(!response.ok && response.status !== 404) {
                    throw new Error(`${endpoint.name} returned status ${response.status}`);
                }
            } catch(fetchError) {
                if(_.isError(fetchError) && fetchError.name === 'AbortError') {
                    throw new Error(`${endpoint.name} request timed out after 5 seconds`);
                }
                throw new Error(`${endpoint.name} is not reachable: ${_.isError(fetchError) ? fetchError.message : String(fetchError)}`);
            }
        }

        check.details = {
            baseUrl,
            apiUrl,
            results,
        };
    } catch(error) {
        check.success = false;
        check.message = 'API endpoints are not accessible';
        check.error = _.isError(error) ? error.message : String(error);
        check.details = {
            hint: "Make sure the development server is running with 'bun run sst-dev'",
        };
    }

    return check;
}

// Export individual validators for debugging
export const validators = {
    checkEnvironmentVariables,
    checkSSTResources,
    checkAWSCredentials,
    checkDynamoDBTable,
    checkAPIEndpoints,
};

// Helper function to run a validation check
async function runCheck(
    checkName: string,
    checkFunction: () => Promise<ValidationCheck>,
    checks: ValidationCheck[],
    verbose?: boolean
): Promise<void> {
    if(verbose) {
        // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
        console.log(`Checking ${checkName}...`);
    }
    checks.push(await checkFunction());
}

// Main validation function
export async function validateTestEnvironment(options: ValidationOptions = {}): Promise<ValidationResult> {
    const startTime = new Date();
    const checks: ValidationCheck[] = [];

    // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
    console.log('\n🔍 Validating test environment...\n');

    // Run environment variable check
    await runCheck('environment variables', checkEnvironmentVariables, checks, options.verbose);

    // Run SST resource check
    if(!options.skipSSTCheck) {
        await runCheck('SST resources', checkSSTResources, checks, options.verbose);
    }

    // Run AWS credentials check
    if(!options.skipCredentialsCheck) {
        await runCheck('AWS credentials', checkAWSCredentials, checks, options.verbose);
    }

    // Run DynamoDB check
    if(!options.skipDynamoDBCheck) {
        await runCheck('DynamoDB table', checkDynamoDBTable, checks, options.verbose);
    }

    // Run API endpoint check
    if(!options.skipAPICheck) {
        await runCheck('API endpoints', checkAPIEndpoints, checks, options.verbose);
    }

    // Calculate summary
    const passed = _.filter(checks, 'success').length;
    const failed = checks.length - passed;
    const success = failed === 0;

    // Log results
    // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
    console.log('\n📊 Validation Results:\n');

    for(const check of checks) {
        const icon = check.success ? '✅' : '❌';
        // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
        console.log(`${icon} ${check.name}: ${check.message}`);

        if(!check.success && check.error) {
            // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
            console.log(`   Error: ${check.error}`);
        }

        if(options.verbose && check.details) {
            // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
            console.log(`   Details:`, check.details);
        }
    }

    const summary = {
        total: checks.length,
        passed,
        failed,
    };

    // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
    console.log('\n📈 Summary:');
    // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
    console.log(`   Total checks: ${summary.total}`);
    // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
    console.log(`   Passed: ${summary.passed}`);
    // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
    console.log(`   Failed: ${summary.failed}`);
    // eslint-disable-next-line no-console -- This is a validation utility that needs to log progress
    console.log(`   Status: ${success ? '✅ READY' : '❌ NOT READY'}\n`);

    return {
        success,
        checks,
        summary,
        timestamp: startTime.toISOString(),
    };
}

// Convenience functions
export async function quickValidate(): Promise<boolean> {
    const result = await validateTestEnvironment({ verbose: false });
    return result.success;
}

export async function verboseValidate(): Promise<ValidationResult> {
    return validateTestEnvironment({ verbose: true });
}

// Types are already exported with the interfaces above
