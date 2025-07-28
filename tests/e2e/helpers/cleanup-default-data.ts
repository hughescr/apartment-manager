import { cleanupTestDataByPrefix } from './cleanup-test-data';
import { logger } from '@hughescr/logger';

async function main() {
    try {
        logger.info('Cleaning up test data...');

        // Clean up common test data prefixes
        const prefixes = ['test-', 'building-test-', 'model-test-', 'unit-test-'];

        for(const prefix of prefixes) {
            logger.info(`Cleaning up data with prefix: ${prefix}`);
            await cleanupTestDataByPrefix(prefix);
        }

        logger.info('Successfully cleaned up test data');
    } catch(error) {
        logger.error('Failed to clean up test data:', error);
        throw error;
    }
}

await main();
