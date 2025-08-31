import { z } from 'zod';
import { some } from 'lodash';
import { isValidBuildingId } from '../../../src/utils/building-id.js';

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

export const UnitDraftSchema = z.looseObject({
    // Required fields for identification in draft
    // buildingID is optional in request body since it comes from URL path parameter during creation
    buildingID: z.string().min(1, 'Building ID is required').max(255).refine((id) => {
        // Use proper building ID validation for short-uuid format
        return isValidBuildingId(id);
    }, 'Building ID must be a valid building ID format').optional(),
    unitID: z.string().min(1, 'Unit ID is required').max(255).regex(/^[\w-]+$/, 'Unit ID can only contain letters, numbers, underscores, and hyphens').refine((id) => {
        // Security validation: prevent injection patterns
        const maliciousPatterns = [
            /[{}"'$()|*?[\]^]/,  // NoSQL injection characters
            /[()&|!]/,                       // LDAP injection characters
            /[\r\n]/,                        // Header injection (CRLF)
            /\0/,                          // Null bytes
            /\.\.[/\\]/,                   // Path traversal
        ];

        return !some(maliciousPatterns, pattern => pattern.test(id));
    }, 'Unit ID contains invalid or potentially dangerous characters').optional(),
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
    unitAmenities: z.array(AmenityDraftSchema).max(100, 'Too many amenities (max 100)').optional(),
    unitRentSpecial: UnitRentSpecialDraftSchema,
    photos: z.array(z.url({ error: 'Photo URL must be a valid URL' })).max(50, 'Too many photos (max 50)').optional(),

    // MITS compliance fields (optional for draft)
    vacancyClass: z.enum(['Occupied', 'Unoccupied', 'Notice', 'Down', 'Available']).optional(),
    vacateDate: dateStringDraft(),
    madeReadyDate: dateStringDraft(),

    // Feed management (optional for draft)
    feedInclusion: z.record(z.string(), z.boolean()).optional(),
    manualReferences: z.record(z.string(), z.string()).optional(),
    feedLastPulled: z.record(z.string(), z.object({
        timestamp: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/, 'Invalid ISO 8601 datetime format'),
        ipAddress: z.string().regex(/^(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})$/, 'Invalid IP address format').optional(),
    })).optional(),
    feedLastModified: z.string().optional(),
    updatedAt: z.string().optional(),
})
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
