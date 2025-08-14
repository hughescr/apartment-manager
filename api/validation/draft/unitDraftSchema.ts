import { z } from 'zod';

/**
 * Draft validation schema for units - permissive schema for work-in-progress saves
 * Only unitId and unitNumber are required. All other fields are optional to support
 * incremental data entry and auto-save functionality.
 */

// Helper schema for deposit validation (made optional for draft)
const DepositDraftSchema = z.union([
    z.number().min(0, 'Deposit amount cannot be negative'),
    z.object({
        amount: z.number().min(0, 'Deposit amount is required and cannot be negative').optional(),
        refundable: z.boolean().optional(),
        partialRefundPercentage: z.number().min(0).max(100, 'Partial refund percentage must be between 0 and 100').optional(),
        notes: z.string().optional()
    })
]).optional();

// Helper schema for rent special validation (made optional for draft)
const UnitRentSpecialDraftSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1, 'Rent special title is required').optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
}).optional();

// Helper schema for amenity validation (made optional for draft)
const AmenityDraftSchema = z.object({
    type: z.string().min(1, 'Amenity type is required').optional(),
    description: z.string().optional(),
    category: z.string().optional()
}).optional();

// Date validation helper (optional for draft)
const dateStringDraft = () => z.string().optional().refine(
    (date) => {
        if(!date) {
            return true; // Empty strings are valid for optional dates
        }
        const parsed = new Date(date);
        return !isNaN(parsed.getTime());
    },
    { message: 'Invalid date format' }
);

export const UnitDraftSchema = z.object({
    // Required fields for identification in draft
    buildingID: z.string().min(1, 'Building ID is required').max(255).regex(/^[\w-]+$/, 'Building ID can only contain letters, numbers, underscores, and hyphens'),
    unitID: z.string().min(1, 'Unit ID is required').max(255).regex(/^[\w-]+$/, 'Unit ID can only contain letters, numbers, underscores, and hyphens'),
    unitNumber: z.string().min(1, 'Unit number is required'),

    // All other fields are optional for draft state
    description: z.string().optional(),
    notes: z.string().optional(),
    features: z.array(z.string()).optional(),

    // Room and space information (optional for draft state)
    beds: z.number().int().min(0, 'Number of beds must be between 0 and 10').max(10, 'Number of beds must be between 0 and 10').optional(),
    baths: z.number().min(0).max(10, 'Number of baths must be between 0 and 10').optional(),
    sqft: z.number().int().min(0, 'Square footage cannot be negative').max(10000, 'Square footage must be between 0 and 10000').optional(),

    // Financial fields (optional for draft)
    rent: z.number().min(0, 'Rent cannot be negative').optional(),
    perPersonRent: z.number().min(0, 'Per person rent cannot be negative').optional(),
    deposit: DepositDraftSchema,

    // Occupancy and availability (optional for draft)
    occupied: z.boolean().optional(),
    availableDate: dateStringDraft(),
    dateAvailable: dateStringDraft(), // Alternative field name used in tests
    maxOccupants: z.number().int().min(1).max(20, 'Max occupants must be between 1 and 20').optional(),

    // Lease terms (optional for draft)
    minLeaseTerm: z.number().int().min(1).max(36, 'Min lease term must be between 1 and 36 months').optional(),
    maxLeaseTerm: z.number().int().min(1).max(36, 'Max lease term must be between 1 and 36 months').optional(),
    leaseLength: z.number().int().min(1).max(36, 'Lease length must be between 1 and 36 months').optional(), // Alternative field name

    // References and identifiers (optional for draft)
    modelID: z.string().regex(/^[\w-]*$/, 'Model ID can only contain letters, numbers, underscores, and hyphens').optional(),

    // Marketing content (optional for draft)
    unitDescription: z.string().optional(),
    unitRentSpecial: UnitRentSpecialDraftSchema,
    unitAmenities: z.array(AmenityDraftSchema).optional(),
    photos: z.array(z.string().url('Photo URL must be a valid URL')).optional(),

    // MITS compliance fields (optional for draft)
    vacancyClass: z.enum(['Occupied', 'Unoccupied', 'Notice', 'Down', 'Available']).optional(),
    vacateDate: dateStringDraft(),
    madeReadyDate: dateStringDraft(),

    // Feed management (optional for draft)
    feedInclusion: z.record(z.string(), z.boolean()).optional(),
    manualReferences: z.record(z.string(), z.string()).optional(),
    feedLastPulled: z.record(z.string(), z.any()).optional(),
    feedLastModified: z.string().optional(),
    updatedAt: z.string().optional(),
}).passthrough()
.refine((data) => {
    // Cross-field validation: min lease term cannot be greater than max lease term (only if both exist)
    if(data.minLeaseTerm !== undefined && data.minLeaseTerm !== null &&
      data.maxLeaseTerm !== undefined && data.maxLeaseTerm !== null) {
        return data.minLeaseTerm <= data.maxLeaseTerm;
    }
    return true;
}, {
    message: 'Min lease term cannot be greater than max lease term',
    path: ['maxLeaseTerm'],
});

export type UnitDraftInput = z.infer<typeof UnitDraftSchema>;
