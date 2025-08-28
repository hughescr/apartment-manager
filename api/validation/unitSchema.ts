import { z } from 'zod';
import { isValidBuildingId } from '../../src/utils/building-id.js';

// Helper schema for deposit validation
const DepositSchema = z.union([
    z.number().min(0, 'Deposit amount cannot be negative'),
    z.object({
        amount: z.number().min(0, 'Deposit amount is required and cannot be negative'),
        refundable: z.boolean().optional(),
        partialRefundPercentage: z.number().min(0).max(100, 'Partial refund percentage must be between 0 and 100').optional(),
        notes: z.string().optional()
    })
]).optional();

// Helper schema for rent special validation
const UnitRentSpecialSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1, 'Rent special title is required'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
}).refine(data => !(data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)), {
    message: 'Start date must be before end date',
    path: ['endDate'],
}).optional();

// Helper schema for amenity validation
const AmenitySchema = z.object({
    type: z.string().min(1, 'Amenity type is required'),
    description: z.string().optional(),
    category: z.string().optional()
}).optional();

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
const UnitSchemaBase = z.looseObject({
    // Required fields for identification
    // buildingID is optional in request body since it comes from URL path parameter during creation
    buildingID: z.string().min(1, 'Building ID is required').max(255).refine((id) => {
        // Use proper building ID validation for short-uuid format
        return isValidBuildingId(id);
    }, 'Building ID must be a valid building ID format').optional(),
    unitID: z.string().min(1, 'Unit ID is required').max(255).regex(/^[\w-]+$/, 'Unit ID can only contain letters, numbers, underscores, and hyphens'),

    // Optional descriptive fields (work-in-progress support)
    description: z.string().optional(),
    notes: z.string().optional(),
    features: z.array(z.string()).optional(),

    // Room and space information (optional for draft state)
    beds: z.number().int().min(0).max(10, 'Number of beds must be between 0 and 10').optional(),
    baths: z.number().min(0).max(10, 'Number of baths must be between 0 and 10').optional(),
    sqft: z.number().int().min(0).max(10000, 'Square footage must be between 0 and 10000').optional(),

    // Financial fields
    rent: z.number().min(0, 'Rent cannot be negative').optional(),
    perPersonRent: z.number().min(0, 'Per person rent cannot be negative').optional(),
    deposit: DepositSchema,

    // Occupancy and availability
    occupied: z.boolean().optional(),
    availableDate: dateString(),
    maxOccupants: z.number().int().min(1).max(20, 'Max occupants must be between 1 and 20').optional(),

    // Lease terms
    minLeaseTerm: z.number().int().min(1).max(36, 'Min lease term must be between 1 and 36 months').optional(),
    maxLeaseTerm: z.number().int().min(1).max(36, 'Max lease term must be between 1 and 36 months').optional(),

    // References and identifiers
    modelID: z.string().regex(/^[\w-]*$/, 'Model ID can only contain letters, numbers, underscores, and hyphens').optional(),
    unitNumber: z.string().optional(),

    // Marketing content
    unitDescription: z.string().optional(),
    unitRentSpecial: UnitRentSpecialSchema,
    unitAmenities: z.array(AmenitySchema).optional(),
    photos: z.array(z.url({ error: 'Photo URL must be a valid URL' })).optional(),

    // MITS compliance fields
    vacancyClass: z.enum(['Occupied', 'Unoccupied', 'Notice', 'Down']).optional(),
    vacateDate: dateString(),
    madeReadyDate: dateString(),

    // Feed management
    feedInclusion: z.record(z.string(), z.boolean()).optional(),
    manualReferences: z.record(z.string(), z.string()).optional(),
    feedLastPulled: z.record(z.string(), z.object({
        timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid ISO 8601 datetime format'),
        ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/, 'Invalid IP address format').optional(),
    })).optional(),
    feedLastModified: z.string().optional(),
    updatedAt: z.string().optional(),
});

// Apply refinements to create the final schema
export const UnitSchema = UnitSchemaBase
.refine((data) => {
    // Cross-field validation: min lease term cannot be greater than max lease term
    if(data.minLeaseTerm !== undefined && data.minLeaseTerm !== null &&
      data.maxLeaseTerm !== undefined && data.maxLeaseTerm !== null) {
        return data.minLeaseTerm <= data.maxLeaseTerm;
    }
    return true;
}, {
    message: 'Min lease term cannot be greater than max lease term',
    path: ['maxLeaseTerm'],
});

export type UnitInput = z.infer<typeof UnitSchema>;

// Validation for MITS publication requirements
// Create a new schema by merging the original base schema with new field definitions
const mitsExtensions = {
    // For MITS compliance, certain fields become required
    beds: z.number().int().min(0).max(10),
    baths: z.number().min(0).max(10),
    sqft: z.number().int().min(1, 'Square footage is required for MITS compliance'),
    rent: z.number().min(0, 'Rent is required for MITS compliance'),
    vacancyClass: z.enum(['Occupied', 'Unoccupied', 'Notice', 'Down'], { message: 'Vacancy class is required for MITS compliance' }),
};

export const UnitMITSSchema = z.looseObject({
    ...UnitSchemaBase.shape,
    ...mitsExtensions
})
.refine((data) => {
    // Cross-field validation: min lease term cannot be greater than max lease term
    if(data.minLeaseTerm !== undefined && data.minLeaseTerm !== null &&
      data.maxLeaseTerm !== undefined && data.maxLeaseTerm !== null) {
        return data.minLeaseTerm <= data.maxLeaseTerm;
    }
    return true;
}, {
    message: 'Min lease term cannot be greater than max lease term',
    path: ['maxLeaseTerm'],
});

export type UnitMITSInput = z.infer<typeof UnitMITSSchema>;
