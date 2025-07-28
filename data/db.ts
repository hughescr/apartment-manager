import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';

const client = new DynamoDBClient({});
export const db = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
    },
});
export const tableName = Resource.BuildingsUnits.name;
