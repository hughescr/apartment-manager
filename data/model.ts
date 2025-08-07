import { Table, Entity } from 'dynamodb-toolbox';
import { db, getTableName } from './db';
import { item } from 'dynamodb-toolbox/schema/item';
import { string } from 'dynamodb-toolbox/schema/string';
import { number } from 'dynamodb-toolbox/schema/number';
import { boolean } from 'dynamodb-toolbox/schema/boolean';
import { list } from 'dynamodb-toolbox/schema/list';
import { record } from 'dynamodb-toolbox/schema/record';
import { any } from 'dynamodb-toolbox/schema/any';

export const ApartmentTable = new Table({
    name: getTableName(),
    partitionKey: {
        name: 'buildingID',
        type: 'string',
    },
    sortKey: {
        name: 'unitID',
        type: 'string',
    },
    documentClient: db,
});

// Workaround for DynamoDB Toolbox v2.7.0 compatibility issue
// The getDocumentClient() method returns an empty object instead of the actual client
// This override ensures it returns the correct document client
ApartmentTable.getDocumentClient = () => db;

export const Building = new Entity({
    name: 'Building',
    table: ApartmentTable,
    schema: item({
        buildingID: string().key(),
        unitID: string().key().default('BUILDING'),
        street: string().optional(),
        city: string().optional(),
        state: string().optional(),
        zip: string().optional(),
        description: string().optional(),
        yearBuilt: number().optional(),
        numberStories: number().optional(),
        totalUnits: number().optional(),
        // New fields for listing sites
        propertyType: string().optional(),
        roomsForRent: boolean().optional(),
        photos: list(string()).optional(),
        leaseLength: number().optional(),
        shortTermLeaseAllowed: boolean().optional(),
        propertyLicenseNumber: string().optional(),
        specialtyType: string().optional(),
        specialtySubType: string().optional(),
        propertyDescription: string().optional(),
        rentSpecials: list(any()).optional(),
        incomeRestrictions: any().optional(),
        utilitiesIncluded: record(string(), boolean()).optional(),
        oneTimeFees: list(any()).optional(),
        monthlyFees: list(any()).optional(),
        parkingOptions: list(any()).optional(),
        petPolicies: any().optional(),
        storageOptions: list(any()).optional(),
        propertyAmenities: list(any()).optional(),
        screeningCriteria: any().optional(),
        contactInfo: any().optional(),
        tourAvailability: any().optional(),
        applicationFee: number().optional(),
        acceptsOnlineApplications: boolean().optional(),
        updatedAt: string().optional(),
    }),
});

export const Unit = new Entity({
    name: 'Unit',
    table: ApartmentTable,
    schema: item({
        buildingID: string().key(),
        unitID: string().key(),
        description: string().optional(),
        beds: number().optional(),
        baths: number().optional(),
        sqft: number().optional(),
        rent: number().optional(),
        occupied: boolean().optional(),
        availableDate: string().optional(),
        // New fields for listing sites
        modelID: string().optional(),
        unitNumber: string().optional(),
        maxOccupants: number().optional(),
        perPersonRent: number().optional(),
        deposit: number().optional(),
        minLeaseTerm: number().optional(),
        maxLeaseTerm: number().optional(),
        unitDescription: string().optional(),
        unitRentSpecial: any().optional(),
        unitAmenities: list(any()).optional(),
        photos: list(string()).optional(),
        feedInclusion: record(string(), boolean()).optional(),
        manualReferences: record(string(), string()).optional(),
        feedLastPulled: record(string(), any()).optional(),
        feedLastModified: string().optional(),
        updatedAt: string().optional(),
    }),
});

export const UnitType = new Entity({
    name: 'UnitType',
    table: ApartmentTable,
    schema: item({
        buildingID: string().key(),
        unitID: string().key(), // Will be 'MODEL#' + modelID
        modelID: string().required(),
        modelName: string().required(),
        countAvailable: number().optional(),
        dateAvailable: string().optional(),
        beds: number().required(),
        baths: number().required(),
        maxOccupants: number().optional(),
        minRent: number().optional(),
        maxRent: number().optional(),
        perPersonRent: number().optional(),
        minSqft: number().optional(),
        maxSqft: number().optional(),
        deposit: number().optional(),
        minLeaseTerm: number().optional(),
        maxLeaseTerm: number().optional(),
        modelAmenities: list(any()).optional(),
        updatedAt: string().optional(),
    }),
});
