// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';
import { dynamoDbMock, jest } from './test-setup';

import { describe, it, expect, beforeEach } from 'bun:test';
import { PropertyType, UtilityType, FeeType, PetType, ParkingType, StorageType, AmenityCategory } from '../../src/types';
import { mockScanResponse, mockGetResponse, mockPutResponse, mockUpdateResponse, mockDeleteResponse } from '../helpers/mock-responses';

// Import the functions AFTER mocking
import { getBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding } from '../../data/buildings';

describe('Building Data Layer', () => {
    beforeEach(() => {
        // Clear mock calls before each test
        jest.clearAllMocks();
    });

    const testBuilding = {
        buildingID: 'test-building-1',
        street: '123 Test St',
        city: 'Testville',
        state: 'TS',
        zip: '12345',
        description: 'A test building',
        yearBuilt: 2020,
        numberStories: 3,
        totalUnits: 10,
        // New fields
        propertyType: PropertyType.APARTMENT,
        roomsForRent: false,
        photos: ['https://s3.example.com/photo1.jpg', 'https://s3.example.com/photo2.jpg'],
        leaseLength: 12,
        shortTermLeaseAllowed: false,
        propertyLicenseNumber: 'LIC-123',
        propertyDescription: 'Modern apartment building with great amenities',
        rentSpecials: [
            { title: 'Summer Special', description: '$500 off first month', startDate: '2024-06-01', endDate: '2024-08-31' }
        ],
        incomeRestrictions: { amiLimit: 80, maxIncomeByHouseholdSize: { '1': 50000, '2': 60000 } },
        utilitiesIncluded: { [UtilityType.WATER]: true, [UtilityType.TRASH]: true, [UtilityType.SEWER]: true },
        oneTimeFees: [
            { type: FeeType.APPLICATION, amount: 50, description: 'Non-refundable application fee' }
        ],
        monthlyFees: [
            { type: FeeType.PARKING, amount: 100, description: 'Covered parking' }
        ],
        parkingOptions: [
            { type: ParkingType.COVERED, included: false, fee: 100, spaces: 1 }
        ],
        petPolicies: {
            allowed: true,
            types: [PetType.CAT, PetType.DOG],
            maxCount: 2,
            deposit: 300,
            monthlyFee: 50
        },
        storageOptions: [
            { type: StorageType.CLOSET, included: true, description: 'Large walk-in closet' }
        ],
        propertyAmenities: [
            { name: 'Pool', category: AmenityCategory.PROPERTY },
            { name: 'Fitness Center', category: AmenityCategory.PROPERTY }
        ],
        screeningCriteria: {
            incomeRatio: 3,
            minCreditScore: 650,
            backgroundCheckRequired: true
        },
        contactInfo: {
            name: 'Test Leasing Office',
            phone: '555-1234',
            email: 'leasing@test.com'
        },
        tourAvailability: {
            inPersonTours: true,
            virtualTours: true,
            selfGuidedTours: false
        },
        applicationFee: 50,
        acceptsOnlineApplications: true
    };

    it('should create a building', async () => {
        expect.assertions(2);
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' }));
        dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }));

        const createdBuilding = await createBuilding(testBuilding);
        expect(createdBuilding).toEqual({ ...testBuilding });

        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding).toEqual({ ...testBuilding });
    });

    it('should get all buildings', async () => {
        expect.assertions(1);
        dynamoDbMock.mockResolvedValueOnce(mockScanResponse([{ ...testBuilding, unitID: 'BUILDING' }]));
        const buildings = await getBuildings();
        expect(buildings).toEqual([{ ...testBuilding }]);
    });

    it('should get a single building', async () => {
        expect.assertions(1);
        dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING' }));
        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding).toEqual({ ...testBuilding });
    });

    it('should update a building', async () => {
        expect.assertions(2);
        const updatedDescription = 'Updated description';
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testBuilding, unitID: 'BUILDING', description: updatedDescription }));
        dynamoDbMock.mockResolvedValueOnce(mockGetResponse({ ...testBuilding, unitID: 'BUILDING', description: updatedDescription }));

        const updatedBuilding = await updateBuilding(testBuilding.buildingID, { description: updatedDescription });
        expect(updatedBuilding.description).toBe(updatedDescription);

        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding?.description).toBe(updatedDescription);
    });

    it('should delete a building', async () => {
        expect.assertions(2);
        dynamoDbMock.mockResolvedValueOnce(mockDeleteResponse()); // Successful delete
        dynamoDbMock.mockResolvedValueOnce(mockGetResponse(undefined)); // Item not found after delete

        const success = await deleteBuilding(testBuilding.buildingID);
        expect(success).toBeTrue();

        const fetchedBuilding = await getBuilding(testBuilding.buildingID);
        expect(fetchedBuilding).toBeUndefined();
    });

    it('should return true if building to delete does not exist (idempotent delete)', async () => {
        expect.assertions(1);
        dynamoDbMock.mockResolvedValueOnce(mockDeleteResponse()); // Delete operation is idempotent
        const success = await deleteBuilding('non-existent-building');
        expect(success).toBeTrue();
    });

    it('should not create a building if it already exists', async () => {
        expect.assertions(1);
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...testBuilding, unitID: 'BUILDING' })); // Simulate existing item
        const result = await createBuilding(testBuilding);
        expect(result).toEqual({ ...testBuilding });
    });

    it('should handle error during building deletion', async () => {
        expect.assertions(2);
        const { logger } = await import('@hughescr/logger');
        dynamoDbMock.mockRejectedValueOnce(new Error('DynamoDB error'));

        const success = await deleteBuilding(testBuilding.buildingID);
        expect(success).toBeFalse();
        expect(logger.error).toHaveBeenCalledWith('Error deleting building:', expect.any(Error));
    });

    it('should handle building with minimal fields', async () => {
        expect.assertions(1);
        const minimalBuilding = {
            buildingID: 'minimal-building-1',
            street: '456 Minimal Ave'
        };
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...minimalBuilding, unitID: 'BUILDING' }));

        const createdBuilding = await createBuilding(minimalBuilding);
        expect(createdBuilding).toEqual(minimalBuilding);
    });

    it('should handle building with complex nested structures', async () => {
        expect.assertions(4);
        const complexBuilding = {
            ...testBuilding,
            rentSpecials: [
                { title: 'Special 1', description: 'First special' },
                { title: 'Special 2', description: 'Second special', startDate: '2024-12-01' }
            ],
            propertyAmenities: [
                { name: 'Pool', category: AmenityCategory.PROPERTY },
                { name: 'Gym', category: AmenityCategory.PROPERTY },
                { name: 'Sauna', category: AmenityCategory.PROPERTY, description: 'Finnish sauna' }
            ]
        };
        dynamoDbMock.mockResolvedValueOnce(mockPutResponse({ ...complexBuilding, unitID: 'BUILDING' }));

        const createdBuilding = await createBuilding(complexBuilding);
        expect(createdBuilding.rentSpecials!).toHaveLength(2);
        expect(createdBuilding.propertyAmenities!).toHaveLength(3);
        expect(createdBuilding.rentSpecials![1].startDate).toBe('2024-12-01');
        expect(createdBuilding.propertyAmenities![2].description).toBe('Finnish sauna');
    });

    it('should update complex fields in building', async () => {
        expect.assertions(3);
        const updatedFields = {
            petPolicies: {
                allowed: false
            },
            screeningCriteria: {
                incomeRatio: 2.5,
                minCreditScore: 700,
                backgroundCheckRequired: true,
                employmentVerification: true
            },
            photos: ['https://s3.example.com/new-photo1.jpg']
        };
        dynamoDbMock.mockResolvedValueOnce(mockUpdateResponse({ ...testBuilding, unitID: 'BUILDING', ...updatedFields }));

        const updatedBuilding = await updateBuilding(testBuilding.buildingID, updatedFields);
        expect(updatedBuilding.petPolicies!.allowed).toBe(false);
        expect(updatedBuilding.screeningCriteria!.minCreditScore).toBe(700);
        expect(updatedBuilding.photos).toHaveLength(1);
    });
});
