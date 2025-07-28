import { seedDefaultTestData } from './seed-test-data';
import { logger } from '@hughescr/logger';

async function main() {
    try {
        logger.info('Seeding default test data...');
        const testData = await seedDefaultTestData();
        logger.info(`Successfully seeded:
- ${testData.buildings.length} buildings
- ${testData.unitTypes.length} unit types  
- ${testData.units.length} units`);
    } catch(error) {
        logger.error('Failed to seed test data:', error);
        throw error;
    }
}

await main();
