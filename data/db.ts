import { getDynamoClient } from './clients';
import { getConfig } from './config';

export const db = getDynamoClient();

// Lazy evaluation to avoid accessing Resource at module load time
export const getTableName = () => {
    return getConfig().tableName;
};

// Note: tableName is now accessed via getTableName() function to avoid
// module load time access to SST Resources
// This allows proper mocking in test environments
