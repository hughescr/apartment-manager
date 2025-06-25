import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { buildingsUnitsTable } from '../sst/dynamo';

const client = new DynamoDBClient({});
export const db = DynamoDBDocumentClient.from(client);
export const tableName = buildingsUnitsTable.name;
