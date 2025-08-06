import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { getBuildings } from '../data/buildings';
import { getUnits } from '../data/units';
import { getUnitTypes } from '../data/unitTypes';
import { generateMultiBuildingMITSFeed } from '../src/mits/generator';
import { UnitData, UnitTypeData } from '../src/types';
import _ from 'lodash';

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

        // Fetch data for each building in parallel
        await Promise.all(_.map(allBuildings, async (building) => {
            const [unitTypes, units] = await Promise.all([
                getUnitTypes(building.buildingID),
                getUnits(building.buildingID)
            ]);

            unitTypesByBuilding[building.buildingID] = unitTypes;
            // Filter units by feed inclusion for this site
            const filteredUnits = _.filter(units, unit =>
                unit.feedInclusion && unit.feedInclusion[validatedSite] === true
            ) as UnitData[];
            unitsByBuilding[building.buildingID] = filteredUnits;
        }));

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
        const errorMessage = _.isError(error) ? error.message : 'Unknown error';

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
