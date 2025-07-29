import { Resource } from 'sst';
import { getDynamoClient } from './clients';

export const db = getDynamoClient();

// Lazy evaluation to avoid accessing Resource at module load time
export const getTableName = () => {
    // In test environment, return the mocked value
    if(process.env.NODE_ENV === 'test' || process.env.BUN_ENV === 'test') {
        return 'test-table-name';
    }
    return Resource.BuildingsUnits.name;
};

// For backward compatibility, export tableName as a getter
export const tableName = getTableName();
