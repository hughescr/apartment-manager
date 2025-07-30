import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

// Client instances - lazily initialized
let _dynamoClient: DynamoDBDocumentClient | null = null;
let _s3Client: S3Client | null = null;

/**
 * Get the DynamoDB Document client instance.
 * Creates a new client on first call, then reuses the same instance.
 * @param injectedClient - Optional client to use instead of creating one (for testing)
 */
export function getDynamoClient(injectedClient?: DynamoDBDocumentClient): DynamoDBDocumentClient {
    if(injectedClient) {
        return injectedClient;
    }

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
 * @param injectedClient - Optional client to use instead of creating one (for testing)
 */
export function getS3Client(injectedClient?: S3Client): S3Client {
    if(injectedClient) {
        return injectedClient;
    }

    if(!_s3Client) {
        _s3Client = new S3Client({});
    }
    return _s3Client;
}
