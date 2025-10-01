import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getAllData } from '../data/all-data';
import { createSuccessResponse, createServerErrorResponse } from './shared/request-handlers';
import { logger } from '@hughescr/logger';
import _ from 'lodash';

/**
 * Unified API endpoint that loads ALL apartment data in a single DynamoDB scan.
 * This replaces the pattern of making 1 + 3×N API calls (where N = number of buildings)
 * with a single efficient scan operation.
 *
 * Returns all buildings with their complete data (units, unit-types, etc.) in a format
 * compatible with existing frontend components.
 *
 * For small datasets (expected <1000 items total), the single scan approach is optimal
 * as network latency dominates over in-memory processing time.
 */
export const get = async (): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
        const allData = await getAllData();

        logger.debug('Unified all-data endpoint response', {
            buildingCount:  allData.buildings.length,
            totalUnits:     _(allData.unitsByBuilding).values().reduce((sum, units) => sum + (units).length, 0),
            totalUnitTypes: _(allData.unitTypesByBuilding).values().reduce((sum, types) => sum + (types).length, 0)
        });

        return createSuccessResponse(allData);
    } catch (error) {
        logger.error('Failed to fetch all data', { error });
        return createServerErrorResponse(error, 'getAllData');
    }
};
