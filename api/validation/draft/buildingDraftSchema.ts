import { z } from 'zod';
import { PropertyType } from '../../../src/types';
import { isValidBuildingId } from '../../../src/utils/building-id.js';
import { chain } from 'lodash';

/**
 * Draft validation schema for buildings - permissive schema for work-in-progress saves
 * Only buildingId and buildingName are required. All other fields are optional to support
 * incremental data entry and auto-save functionality.
 */

// Helper for website URLs with custom message (made optional)
// Allow any string for security testing, sanitization will handle malicious URLs
const websiteUrl = () => z.string().optional();

const ContactInfoDraftSchema = z.object({
    name:  z.string().optional(),
    email: z.string().optional().refine(email => !email || /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email), {
        message: 'Invalid email address format'
    }),
    phone:             z.string().optional(),
    propertyWebsite:   websiteUrl(),
    managementWebsite: websiteUrl(),
    officeHours:       z.record(z.string(), z.object({
        open:  z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
        close: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    })).optional(),
}).partial().optional();

const TourAvailabilityDraftSchema = z.object({
    selfGuidedTours:   z.boolean().optional(),
    virtualTours:      z.boolean().optional(),
    inPersonTours:     z.boolean().optional(),
    tourSchedulingUrl: websiteUrl(),
    tourHours:         z.record(z.string(), z.object({
        open:  z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
        close: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format')
    })).optional(),
}).partial().optional();

const RentSpecialDraftSchema = z.object({
    id:          z.union([z.string(), z.number()]).optional(),
    title:       z.string().min(1, 'Rent special title is required').optional(),
    startDate:   z.string().optional(),
    endDate:     z.string().optional(),
    description: z.string().optional(),
}).optional();

const IncomeRestrictionsDraftSchema = z.object({
    amiLimit: z.union([
        z.number().min(0).max(200),
        z.null().transform(() => undefined)
    ]).optional(),
    maxIncomeByHouseholdSize: z.record(z.string(), z.number()).optional(),
}).partial().optional();

// Enhanced complex structure schemas for draft
const PetTypePolicyDraftSchema = z.object({
    type:              z.string().min(1, 'Pet type is required').optional(),
    weightLimit:       z.number().min(0).optional(),
    countLimit:        z.number().int().min(0).optional(),
    fee:               z.number().min(0).optional(),
    deposit:           z.number().min(0).optional(),
    breedRestrictions: z.array(z.string()).optional(),
}).partial().optional();

const PetPolicyDraftSchema = z.object({
    allowed:           z.boolean().optional(),
    types:             z.array(z.string()).optional(),
    maxCount:          z.number().int().min(0).optional(),
    weightLimit:       z.number().min(0).optional(),
    breedRestrictions: z.array(z.string()).optional(),
    deposit:           z.number().min(0).optional(),
    monthlyFee:        z.number().min(0).optional(),
    oneTimeFee:        z.number().min(0).optional(),
    notes:             z.string().optional(),
    petTypes:          z.array(PetTypePolicyDraftSchema).optional(),
}).partial().optional();

const FeeDraftSchema = z.object({
    type:        z.string().min(1, 'Fee type is required').optional(),
    amount:      z.number().min(0, 'Fee amount cannot be negative').optional(),
    description: z.string().optional(),
    refundable:  z.boolean().optional(),
}).partial();

const ParkingOptionDraftSchema = z.object({
    type:        z.string().min(1, 'Parking type is required').optional(),
    included:    z.boolean().optional(),
    fee:         z.number().min(0).optional(),
    spaces:      z.number().int().min(0).optional(),
    description: z.string().optional(),
}).partial();

const StorageOptionDraftSchema = z.object({
    type:        z.string().min(1, 'Storage type is required').optional(),
    included:    z.boolean().optional(),
    fee:         z.number().min(0).optional(),
    dimensions:  z.string().optional(),
    description: z.string().optional(),
}).partial();

const AmenityDraftSchema = z.object({
    name:        z.string().min(1, 'Amenity name is required').optional(),
    category:    z.string().min(1, 'Amenity category is required').optional(),
    description: z.string().optional(),
}).partial();

const ScreeningCriteriaDraftSchema = z.object({
    minCreditScore:          z.number().int().min(300).max(850).optional(),
    incomeRatio:             z.number().min(0).max(10).optional(),
    maxOccupantsPerBedroom:  z.number().int().min(0).max(5).optional(),
    backgroundCheckRequired: z.boolean().optional(),
    evictionHistory:         z.boolean().optional(),
    criminalHistory:         z.boolean().optional(),
    references:              z.number().optional(),
    employmentVerification:  z.boolean().optional(),
    rentalHistory:           z.boolean().optional(),
    notes:                   z.string().optional(),
}).partial().optional();

export const BuildingDraftSchema = z.looseObject({
    // Required fields for draft - only ID and name
    buildingID: z.string().min(1).max(255).refine((id) => {
        // Use proper building ID validation for short-uuid format
        return isValidBuildingId(id);
    }, 'buildingID must be a valid building ID format'),
    buildingName: z.string().min(1, 'buildingName is required').transform((name) => {
        // Sanitize to prevent XSS while preserving content
        return chain(name)
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .value();
    }),
    // All other fields are optional for draft state
    street:                    z.string().min(1, 'Street address cannot be empty').optional(),
    city:                      z.string().min(1, 'City cannot be empty').optional(),
    state:                     z.string().min(1, 'State cannot be empty').optional(),
    zip:                       z.string().regex(/^\d{5}(?:-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789').optional(),
    applicationFee:            z.number().min(0).optional(),
    numberStories:             z.number().int().min(1).max(100).optional(),
    leaseLength:               z.number().int().min(1).max(36).optional(),
    contactInfo:               ContactInfoDraftSchema,
    tourAvailability:          TourAvailabilityDraftSchema,
    rentSpecials:              z.array(RentSpecialDraftSchema).optional(),
    incomeRestrictions:        IncomeRestrictionsDraftSchema,
    screeningCriteria:         ScreeningCriteriaDraftSchema,
    latitude:                  z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
    longitude:                 z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
    coordinatesVerified:       z.boolean().optional(),
    propertyType:              z.enum(PropertyType).optional(),
    photos:                    z.array(z.url({ error: 'Photo URLs must be valid URLs' })).optional(),
    acceptsOnlineApplications: z.boolean().optional(),

    // Additional MITS compliance fields (all optional for draft)
    yearBuilt:           z.number().int().min(1800).max(new Date().getFullYear() + 5, 'Year built cannot be in the future').optional(),
    totalUnits:          z.number().int().min(1, 'Total units must be at least 1').optional(),
    description:         z.string().optional(),
    propertyDescription: z.string().optional(),
    propertyHighlights:  z.array(z.object({
        id:        z.union([z.string(), z.number()]),
        highlight: z.string().min(1, 'Highlight text cannot be empty')
    })).optional(),
    propertyLicenseNumber: z.string().optional(),

    // MITS Structure types (optional for draft)
    structureType: z.enum(['Apartment', 'Condo', 'Townhouse', 'Single Family', 'House']).optional(),
    // Field removed - use specialtyType instead (converted to rentalType by MITS generator)

    // Additional property features for MITS (optional for draft)
    roomsForRent:          z.boolean().optional(),
    shortTermLeaseAllowed: z.boolean().optional(),
    specialtyType:         z.enum(['market-rate', 'affordable', 'student', 'senior']).optional(),
    specialtySubType:      z.string().optional(),

    // Complex data structures (all optional for draft)
    // Complex data structures - now with proper validation (all optional for draft)
    petPolicies:       PetPolicyDraftSchema,
    parkingOptions:    z.array(ParkingOptionDraftSchema).optional(),
    storageOptions:    z.array(StorageOptionDraftSchema).optional(),
    propertyAmenities: z.array(AmenityDraftSchema).optional(),
    oneTimeFees:       z.array(FeeDraftSchema).optional(),
    monthlyFees:       z.array(FeeDraftSchema).optional(),
    utilitiesIncluded: z.record(z.string(), z.boolean()).optional(),
    notes:             z.string().optional(),

    // Timestamps
    updatedAt: z.string().optional(),
});

export type BuildingDraftInput = z.infer<typeof BuildingDraftSchema>;
