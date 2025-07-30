import { getDynamoClient } from './clients';
import { getConfig } from './config';

export const db = getDynamoClient();

// Lazy evaluation to avoid accessing Resource at module load time
export const getTableName = () => {
    return getConfig().tableName;
};

// For backward compatibility, export tableName as a getter
export const tableName = getTableName();
