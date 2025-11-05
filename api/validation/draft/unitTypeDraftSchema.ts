import { z } from 'zod';
import { trim } from 'lodash';
import { isValidBuildingId } from '../../../src/utils/building-id.js';
import {
    createDepositSchema,
    createUnitAmenitySchema,
    createDateStringSchema
} from '../shared/unit-schemas';

/**
 * Draft validation schema for unit types - permissive schema for work-in-progress saves
 * Only unitTypeId (modelID) and modelName are required. All other fields are optional to support
 * incremental data entry and auto-save functionality.
 */

// Create draft-mode schemas using shared builders
const DepositDraftSchema = createDepositSchema({ mode: 'draft' });
const AmenityDraftSchema = createUnitAmenitySchema({ mode: 'draft' });
const dateStringDraft = () => createDateStringSchema('date', { mode: 'draft' });

export const UnitTypeDraftSchema = z.looseObject({
    // Required identification fields
    buildingID: z.string().min(1, 'Building ID is required').max(255).refine((id) => {
        // Use proper building ID validation for short-uuid format
        return isValidBuildingId(id);
    }, 'Building ID must be a valid building ID format'),
    modelID: z.string().min(1, 'Model ID is required').max(255).regex(/^[\w-]+$/, 'Model ID can only contain letters, numbers, underscores, and hyphens'),

    // All other fields are optional for draft state
    modelName: z.string().transform(val => trim(val)).refine(val => val.length > 0, { message: 'Model name cannot be empty' }).optional(),

    // Required room configuration (optional for draft state)
    beds:  z.number().int().min(0).max(10, 'Number of beds must be between 0 and 10').optional(),
    baths: z.number().min(0).max(10, 'Number of baths must be between 0 and 10').optional(),

    // Availability information (optional for draft)
    countAvailable: z.number().int().min(0, 'Count available cannot be negative').optional(),
    dateAvailable:  dateStringDraft(),

    // Occupancy limits (optional for draft)
    maxOccupants: z.number().int().min(1, 'Number must be greater than or equal to 1').max(20, 'Max occupants must be between 1 and 20').optional(),

    // Rent ranges (optional for draft)
    minRent:       z.number().min(0, 'Min rent cannot be negative').optional(),
    maxRent:       z.number().min(0, 'Max rent cannot be negative').optional(),
    perPersonRent: z.number().min(0, 'Per person rent cannot be negative').optional(),

    // Size ranges (optional for draft)
    minSqft: z.number().int().min(0).max(10000, 'Min square footage must be between 0 and 10000').optional(),
    maxSqft: z.number().int().min(0).max(10000, 'Max square footage must be between 0 and 10000').optional(),

    // Financial terms (optional for draft)
    deposit:      DepositDraftSchema,
    minLeaseTerm: z.number().int().min(1).max(36, 'Min lease term must be between 1 and 36 months').optional(),
    maxLeaseTerm: z.number().int().min(1).max(36, 'Max lease term must be between 1 and 36 months').optional(),

    // Amenities (optional for draft)
    modelAmenities: z.array(AmenityDraftSchema).optional(),

    // Timestamps
    updatedAt: z.string().optional(),
})
.refine((data) => {
    // Cross-field validation: min rent cannot be greater than max rent (only if both exist)
    if(data.minRent !== undefined && data.maxRent !== undefined) {
        return data.minRent <= data.maxRent;
    }
    return true;
}, {
    message: 'Min rent cannot be greater than max rent',
    path:    ['maxRent'],
})
.refine((data) => {
    // Cross-field validation: min sqft cannot be greater than max sqft (only if both exist)
    if(data.minSqft !== undefined && data.maxSqft !== undefined) {
        return data.minSqft <= data.maxSqft;
    }
    return true;
}, {
    message: 'Min square footage cannot be greater than max square footage',
    path:    ['maxSqft'],
})
.refine((data) => {
    // Cross-field validation: min lease term cannot be greater than max lease term (only if both exist)
    if(data.minLeaseTerm !== undefined && data.maxLeaseTerm !== undefined) {
        return data.minLeaseTerm <= data.maxLeaseTerm;
    }
    return true;
}, {
    message: 'Min lease term cannot be greater than max lease term',
    path:    ['maxLeaseTerm'],
});

export type UnitTypeDraftInput = z.infer<typeof UnitTypeDraftSchema>;
