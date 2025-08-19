/**
 * Migration script to add buildingName field to existing buildings
 * This script will:
 * 1. Read all existing buildings
 * 2. Generate building names from their street addresses
 * 3. Update buildings that don't have a buildingName field
 */

import { getBuildings, updateBuilding } from '../data/buildings.js';
import { generateBuildingName } from '../src/utils/index.js';
import { createMigrationLogger } from '../src/utils/logger.js';

interface MigrationStats {
    totalBuildings: number
    buildingsWithNames: number
    buildingsUpdated: number
    errors: { buildingID: string, error: string }[]
}

async function migrateBuildingNames(dryRun = false): Promise<MigrationStats> {
    const migrationLogger = createMigrationLogger('migrate-building-names');
    migrationLogger.start(`Starting building name migration ${dryRun ? '(DRY RUN)' : ''}`);

    const stats: MigrationStats = {
        totalBuildings: 0,
        buildingsWithNames: 0,
        buildingsUpdated: 0,
        errors: []
    };

    try {
        // Get all existing buildings
        const buildings = await getBuildings();
        stats.totalBuildings = buildings.length;

        migrationLogger.progress(`Found ${buildings.length} buildings to check`);

        for(const building of buildings) {
            try {
                // Check if building already has a name
                if(building.buildingName) {
                    stats.buildingsWithNames++;
                    migrationLogger.progress(`Building ${building.buildingID} already has name: "${building.buildingName}"`);
                    continue;
                }

                // Generate name from street address
                let generatedName = '';
                if(building.street) {
                    generatedName = generateBuildingName(building.street);
                }

                // Fallback to building ID if no street address or generation failed
                if(!generatedName) {
                    generatedName = building.buildingID;
                }

                migrationLogger.progress(`Building ${building.buildingID}: "${building.street}" → "${generatedName}"`);

                if(!dryRun) {
                    // Update the building with the generated name
                    await updateBuilding(building.buildingID, {
                        buildingName: generatedName
                    });
                    migrationLogger.success(`Updated building ${building.buildingID} with name: "${generatedName}"`);
                } else {
                    migrationLogger.progress(`Would update building ${building.buildingID} with name: "${generatedName}"`);
                }

                stats.buildingsUpdated++;
            } catch(error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                stats.errors.push({
                    buildingID: building.buildingID,
                    error: errorMessage
                });
                migrationLogger.error(`Failed to update building ${building.buildingID}`, { buildingID: building.buildingID, error: errorMessage });
            }
        }

        // Print summary
        migrationLogger.summary('Migration Summary', {
            totalBuildings: stats.totalBuildings,
            buildingsWithNames: stats.buildingsWithNames,
            buildingsUpdated: stats.buildingsUpdated,
            errorCount: stats.errors.length,
            mode: dryRun ? 'DRY RUN' : 'LIVE'
        });

        if(stats.errors.length > 0) {
            migrationLogger.error('Errors encountered during migration', { errors: stats.errors });
        }

        if(!dryRun && stats.buildingsUpdated > 0) {
            migrationLogger.complete(`Successfully migrated ${stats.buildingsUpdated} buildings!`);
        }
    } catch(error) {
        migrationLogger.error('Migration failed', error);
        throw error;
    }

    return stats;
}

// Main execution
async function main() {
    const migrationLogger = createMigrationLogger('migrate-building-names');
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-d');

    if(dryRun) {
        migrationLogger.progress('Running in DRY RUN mode - no changes will be made');
    }

    try {
        await migrateBuildingNames(dryRun);
        migrationLogger.complete('Migration completed successfully!');
        process.exit(0);
    } catch(error) {
        migrationLogger.error('Migration failed', error);
        process.exit(1);
    }
}

// Run the migration if this script is executed directly
if(import.meta.main) {
    main();
}

export { migrateBuildingNames };
