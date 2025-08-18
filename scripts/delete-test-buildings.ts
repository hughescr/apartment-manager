/**
 * Script to delete test buildings with IDs 'test-building-1' and 'test-building-2'
 * from the DynamoDB table to fix the building ID validation issue.
 */

import { DeleteItemCommand } from 'dynamodb-toolbox/entity/actions/delete';
import { getBuildingEntity } from '../data/model';
import { isError } from 'lodash';
import { logger } from '@hughescr/logger';

async function deleteTestBuildings() {
    logger.info('🗑️  Deleting test buildings from DynamoDB...');

    const BuildingEntity = getBuildingEntity();
    const testBuildingIds = ['test-building-1', 'test-building-2'];

    for(const buildingID of testBuildingIds) {
        try {
            logger.info(`Deleting building: ${buildingID}`);

            await BuildingEntity.build(DeleteItemCommand)
                .key({
                    buildingID,
                    unitID: 'BUILDING'
                })
                .send();

            logger.info(`✅ Successfully deleted ${buildingID}`);
        } catch(error) {
            if(isError(error) && error.message.includes('ConditionalCheckFailedException')) {
                logger.info(`ℹ️  Building ${buildingID} not found (already deleted or never existed)`);
            } else {
                logger.error(`❌ Error deleting ${buildingID}:`, error);
            }
        }
    }

    logger.info('🎉 Test building cleanup complete!');
}

// Run the script
deleteTestBuildings().catch(error => logger.error(error));
