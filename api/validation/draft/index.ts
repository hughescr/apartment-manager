/**
 * Draft validation schemas for work-in-progress saves
 *
 * These schemas are permissive versions of the main validation schemas,
 * designed to support incremental data entry and auto-save functionality.
 * Only the essential ID and primary name fields are required.
 */

export { BuildingDraftSchema, type BuildingDraftInput } from './buildingDraftSchema';
export { UnitTypeDraftSchema, type UnitTypeDraftInput } from './unitTypeDraftSchema';
export { UnitDraftSchema, type UnitDraftInput } from './unitDraftSchema';
