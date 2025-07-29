import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

// Client instances - lazily initialized
let _dynamoClient: DynamoDBDocumentClient | null = null;
let _s3Client: S3Client | null = null;

/**
 * Get the DynamoDB Document client instance.
 * Creates a new client on first call, then reuses the same instance.
 */
export function getDynamoClient(): DynamoDBDocumentClient {
    if(!_dynamoClient) {
        const client = new DynamoDBClient({});
        _dynamoClient = DynamoDBDocumentClient.from(client, {
            marshallOptions: {
                removeUndefinedValues: true,
                convertEmptyValues: false,
            },
            unmarshallOptions: {
                wrapNumbers: false,
            },
        });
    }
    return _dynamoClient;
}

/**
 * Get the S3 client instance.
 * Creates a new client on first call, then reuses the same instance.
 */
export function getS3Client(): S3Client {
    if(!_s3Client) {
        _s3Client = new S3Client({});
    }
    return _s3Client;
}

// Testing-only functions - not exported in production builds
/* istanbul ignore next */
if(process.env.NODE_ENV === 'test') {
    // Extend globalThis type for testing functions
    interface TestGlobal {
        _setDynamoClient: (client: DynamoDBDocumentClient) => void
        _setS3Client: (client: S3Client) => void
        _resetClients: () => void
    }

    const testGlobal = globalThis as unknown as TestGlobal;

    /**
     * Set the DynamoDB client for testing.
     * @internal For testing only
     */
    testGlobal._setDynamoClient = (client: DynamoDBDocumentClient) => {
        _dynamoClient = client;
    };

    /**
     * Set the S3 client for testing.
     * @internal For testing only
     */
    testGlobal._setS3Client = (client: S3Client) => {
        _s3Client = client;
    };

    /**
     * Reset all clients for testing.
     * @internal For testing only
     */
    testGlobal._resetClients = () => {
        _dynamoClient = null;
        _s3Client = null;
    };
}
