import { z } from 'zod';
import { isValidBuildingId } from '../../src/utils/building-id.js';

// Helper schema for deposit validation (same as unit schema)
const DepositSchema = z.union([
    z.number().min(0, 'Deposit amount cannot be negative'),
    z.object({
        amount:                  z.number().min(0, 'Deposit amount is required and cannot be negative'),
        refundable:              z.boolean().optional(),
        partialRefundPercentage: z.number().min(0).max(100, 'Partial refund percentage must be between 0 and 100').optional(),
        notes:                   z.string().optional()
    })
]).optional();

// Helper schema for amenity validation
const AmenitySchema = z.object({
    type:        z.string().min(1, 'Amenity type is required'),
    description: z.string().optional(),
    category:    z.string().optional()
});

// Date validation helper
const dateString = () => z.string().refine(
    (date) => {
        if(!date) {
            return true; // Optional dates are valid
        }
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
    },
    { message: 'Invalid date format' }
).optional();

// Base schema without refinements
const UnitTypeSchemaBase = z.looseObject({
    // Required identification fields
    buildingID: z.string().min(1, 'Building ID is required').max(255).refine((id) => {
        // Use proper building ID validation for short-uuid format
        return isValidBuildingId(id);
    }, 'Building ID must be a valid building ID format'),
    modelID: z.string().min(1, 'Model ID is required').max(255).regex(/^[\w-]+$/, 'Model ID can only contain letters, numbers, underscores, and hyphens'),

    // Model name (optional for work-in-progress, but should be required for publishing)
    modelName: z.string().min(1, 'Model name cannot be empty').optional(),

    // Required room configuration (optional for draft state)
    beds:  z.number().int().min(0).max(10, 'Number of beds must be between 0 and 10').optional(),
    baths: z.number().min(0).max(10, 'Number of baths must be between 0 and 10').optional(),

    // Availability information
    countAvailable: z.number().int().min(0, 'Count available cannot be negative').optional(),
    dateAvailable:  dateString(),

    // Occupancy limits
    maxOccupants: z.number().int().min(1).max(20, 'Max occupants must be between 1 and 20').optional(),

    // Rent ranges
    minRent:       z.number().min(0, 'Min rent cannot be negative').optional(),
    maxRent:       z.number().min(0, 'Max rent cannot be negative').optional(),
    perPersonRent: z.number().min(0, 'Per person rent cannot be negative').optional(),

    // Size ranges
    minSqft: z.number().int().min(0).max(10000, 'Min square footage must be between 0 and 10000').optional(),
    maxSqft: z.number().int().min(0).max(10000, 'Max square footage must be between 0 and 10000').optional(),

    // Financial terms
    deposit:      DepositSchema,
    minLeaseTerm: z.number().int().min(1).max(36, 'Min lease term must be between 1 and 36 months').optional(),
    maxLeaseTerm: z.number().int().min(1).max(36, 'Max lease term must be between 1 and 36 months').optional(),

    // Amenities
    modelAmenities: z.array(AmenitySchema).optional(),

    // Timestamps
    updatedAt: z.string().optional(),
});

// Apply refinements to create the final schema
export const UnitTypeSchema = UnitTypeSchemaBase
.refine((data) => {
    // Cross-field validation: min rent cannot be greater than max rent
    if(data.minRent !== undefined && data.maxRent !== undefined) {
        return data.minRent <= data.maxRent;
    }
    return true;
}, {
    message: 'Min rent cannot be greater than max rent',
    path:    ['maxRent'],
})
.refine((data) => {
    // Cross-field validation: min sqft cannot be greater than max sqft
    if(data.minSqft !== undefined && data.maxSqft !== undefined) {
        return data.minSqft <= data.maxSqft;
    }
    return true;
}, {
    message: 'Min square footage cannot be greater than max square footage',
    path:    ['maxSqft'],
})
.refine((data) => {
    // Cross-field validation: min lease term cannot be greater than max lease term
    if(data.minLeaseTerm !== undefined && data.maxLeaseTerm !== undefined) {
        return data.minLeaseTerm <= data.maxLeaseTerm;
    }
    return true;
}, {
    message: 'Min lease term cannot be greater than max lease term',
    path:    ['maxLeaseTerm'],
});

export type UnitTypeInput = z.infer<typeof UnitTypeSchema>;

// Validation for MITS publication requirements
// Create a new schema by merging the original base schema with new field definitions
const mitsExtensions = {
    // For MITS compliance, these fields become required
    modelName: z.string().min(1, 'Model name is required for MITS compliance'),
    beds:      z.number().int().min(0).max(10),
    baths:     z.number().min(0).max(10),
};

export const UnitTypeMITSSchema = z.looseObject({
    ...UnitTypeSchemaBase.shape,
    ...mitsExtensions
})
.refine((data) => {
    // Cross-field validation: min rent cannot be greater than max rent
    if(data.minRent !== undefined && data.maxRent !== undefined) {
        return data.minRent <= data.maxRent;
    }
    return true;
}, {
    message: 'Min rent cannot be greater than max rent',
    path:    ['maxRent'],
})
.refine((data) => {
    // Cross-field validation: min sqft cannot be greater than max sqft
    if(data.minSqft !== undefined && data.maxSqft !== undefined) {
        return data.minSqft <= data.maxSqft;
    }
    return true;
}, {
    message: 'Min square footage cannot be greater than max square footage',
    path:    ['maxSqft'],
})
.refine((data) => {
    // Cross-field validation: min lease term cannot be greater than max lease term
    if(data.minLeaseTerm !== undefined && data.maxLeaseTerm !== undefined) {
        return data.minLeaseTerm <= data.maxLeaseTerm;
    }
    return true;
}, {
    message: 'Min lease term cannot be greater than max lease term',
    path:    ['maxLeaseTerm'],
})
.refine((data: { minSqft?: number, maxSqft?: number }) => {
    // MITS requires at least some size information
    return data.minSqft !== undefined || data.maxSqft !== undefined;
}, {
    message: 'At least one square footage value (min or max) is required for MITS compliance',
    path:    ['minSqft'],
});

export type UnitTypeMITSInput = z.infer<typeof UnitTypeMITSSchema>;
