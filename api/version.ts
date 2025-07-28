import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

// Version info to track deployments
const VERSION_INFO = {
    version: '1.0.3',
    deployedAt: new Date().toISOString(),
    features: {
        consistentReads: true,
        logging: true,
        description: 'Added consistent reads and debug logging to getBuildings'
    }
};

export const get = async (): Promise<APIGatewayProxyStructuredResultV2> => ({
    statusCode: 200,
    body: JSON.stringify(VERSION_INFO),
});
