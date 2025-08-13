import { z } from 'zod';
import { PropertyType } from '../../src/types';

// Helper for website URLs with custom message
const websiteUrl = (field: string) => z.string().url({ message: `${field} must start with http:// or https://` });

const ContactInfoSchema = z.object({
    email: z.string().email('Invalid email address format').optional(),
    phone: z.string().regex(/^[\d\s\-().+]+$/, 'Invalid phone number format').optional(),
    propertyWebsite: websiteUrl('Website').optional(),
    managementWebsite: websiteUrl('Management website').optional(),
}).partial();

const TourAvailabilitySchema = z.object({
    tourSchedulingUrl: websiteUrl('Tour scheduling URL').optional(),
}).partial();

const RentSpecialSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1, 'Rent special title is required'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
}).refine(data => !(data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)), {
    message: 'Start date must be before end date',
    path: ['endDate'],
});

const IncomeRestrictionsSchema = z.object({
    amiLimit: z.number().min(0).max(200).optional(),
    maxIncomeByHouseholdSize: z.record(z.number()).optional(),
}).partial();

const ScreeningCriteriaSchema = z.object({
    minCreditScore: z.number().int().min(300).max(850).optional(),
    incomeRatio: z.number().min(0).max(10).optional(),
    maxOccupantsPerBedroom: z.number().int().min(0).max(5).optional(),
}).partial();

export const BuildingSchema = z.object({
    buildingID: z.string().min(1).max(255).regex(/^[\w-]+$/),
    buildingName: z.string().min(1, 'buildingName is required').optional(),
    street: z.string().min(1, 'Street address cannot be empty').optional(),
    city: z.string().min(1, 'City cannot be empty').optional(),
    state: z.string().min(1, 'State cannot be empty').optional(),
    zip: z.string().regex(/^\d{5}(?:-\d{4})?$/, 'ZIP code must be in format 12345 or 12345-6789').optional(),
    applicationFee: z.number().min(0).optional(),
    numberStories: z.number().int().min(1).max(100).optional(),
    leaseLength: z.number().int().min(1).max(36).optional(),
    contactInfo: ContactInfoSchema.optional(),
    tourAvailability: TourAvailabilitySchema.optional(),
    rentSpecials: z.array(RentSpecialSchema).optional(),
    incomeRestrictions: IncomeRestrictionsSchema.optional(),
    screeningCriteria: ScreeningCriteriaSchema.optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    coordinatesVerified: z.boolean().optional(),
    propertyType: z.nativeEnum(PropertyType).optional(),
    photos: z.array(z.string()).optional(),
    acceptsOnlineApplications: z.boolean().optional(),
}).passthrough();

export type BuildingInput = z.infer<typeof BuildingSchema>;

