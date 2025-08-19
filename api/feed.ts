import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getBuildings } from '../data/buildings';
import { getUnits } from '../data/units';
import { getUnitTypes } from '../data/unitTypes';
import { generateMultiBuildingMITSFeed } from '../src/mits/generator';
import { UnitData, UnitTypeData } from '../src/types';
import { filter, isError, map } from 'lodash';

// Helper function to validate site name
function validateSiteName(site: string): 'apartments_com' | 'zillow' | null {
    if(site === 'apartments_com' || site === 'zillow') {
        return site;
    }
    return null;
}

// GET /feed/{site}/live - Live feed endpoint for crawlers
// This is the main MITS feed endpoint that returns all properties
export async function live(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    try {
        const site = event.pathParameters?.site;

        // Validate site name
        const validatedSite = validateSiteName(site || '');
        if(!validatedSite) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid site name. Must be "apartments_com" or "zillow"' })
            };
        }

        // Get all buildings
        const allBuildings = await getBuildings();

        // Get unit types and units for all buildings
        const unitTypesByBuilding: Record<string, UnitTypeData[]> = {};
        const unitsByBuilding: Record<string, UnitData[]> = {};
        const buildingErrors: Record<string, string> = {};

        // Process buildings in smaller batches to prevent overwhelming the database
        const BATCH_SIZE = 5; // Process 5 buildings at a time
        const buildingBatches: typeof allBuildings[] = [];

        for(let i = 0; i < allBuildings.length; i += BATCH_SIZE) {
            buildingBatches.push(allBuildings.slice(i, i + BATCH_SIZE));
        }

        // Process each batch sequentially, but buildings within each batch concurrently
        for(const batch of buildingBatches) {
            await Promise.all(map(batch, async (building) => {
                // Fetch unit types and units individually to handle partial failures
                let unitTypes: UnitTypeData[] = [];
                let units: UnitData[] = [];

                // Try to get unit types
                try {
                    unitTypes = await getUnitTypes(building.buildingID);
                } catch(error: unknown) {
                    const errorMessage = isError(error) ? error.message : 'Unknown error';
                    buildingErrors[`${building.buildingID}_unitTypes`] = errorMessage;
                    unitTypes = []; // Empty array on failure
                }

                // Try to get units
                try {
                    units = await getUnits(building.buildingID);
                    // Filter units by feed inclusion for this site
                    const filteredUnits = filter(units, unit =>
                        unit.feedInclusion && unit.feedInclusion[validatedSite] === true
                    ) as UnitData[];
                    units = filteredUnits;
                } catch(error: unknown) {
                    const errorMessage = isError(error) ? error.message : 'Unknown error';
                    buildingErrors[`${building.buildingID}_units`] = errorMessage;
                    units = []; // Empty array on failure
                }

                // Set the results regardless of partial failures
                unitTypesByBuilding[building.buildingID] = unitTypes;
                unitsByBuilding[building.buildingID] = units;
            }));

            // Small delay between batches to be respectful to the database
            if(buildingBatches.indexOf(batch) < buildingBatches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Generate the aggregated MITS XML feed
        const xml = await generateMultiBuildingMITSFeed({
            buildings: allBuildings,
            unitTypesByBuilding,
            unitsByBuilding,
            siteName: validatedSite
        });

        // Return the XML feed
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                'X-Robots-Tag': 'noindex' // Don't index feed URLs
            },
            body: xml
        };
    } catch(error: unknown) {
        // Log error for debugging (in production, use proper logging)
        const errorMessage = isError(error) ? error.message : 'Unknown error';

        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Failed to generate MITS feed',
                details: errorMessage
            })
        };
    }
}
