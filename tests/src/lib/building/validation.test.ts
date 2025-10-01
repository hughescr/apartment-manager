import { describe, test, expect } from 'bun:test';
import { hasUnsavedChanges } from '../../../../astro-src/lib/building/validation';
import type { BuildingData } from '../../../../astro-src/types';
import { FeeType } from '../../../../src/types';

describe('hasUnsavedChanges', () => {
    test('returns false when both building and original are null', () => {
        expect(hasUnsavedChanges(null, null)).toBe(false);
    });

    test('returns false when building is null', () => {
        const original = { buildingID: 'test' } as BuildingData;
        expect(hasUnsavedChanges(null, original)).toBe(false);
    });

    test('returns false when original is null', () => {
        const building = { buildingID: 'test' } as BuildingData;
        expect(hasUnsavedChanges(building, null)).toBe(false);
    });

    test('returns false when building and original are identical', () => {
        const buildingData = {
            buildingID: 'test',
            street:     '123 Main St',
            city:       'San Francisco',
            state:      'CA',
            zip:        '94102'
        } as BuildingData;

        const original = JSON.parse(JSON.stringify(buildingData));
        expect(hasUnsavedChanges(buildingData, original)).toBe(false);
    });

    test('returns true when building data has changed', () => {
        const original = {
            buildingID: 'test',
            street:     '123 Main St',
            city:       'San Francisco',
            state:      'CA',
            zip:        '94102'
        } as BuildingData;

        const building = {
            ...original,
            street: '456 Oak Ave'
        };

        expect(hasUnsavedChanges(building, original)).toBe(true);
    });

    test('returns false when only undefined properties differ', () => {
        const original = {
            buildingID: 'test',
            street:     '123 Main St',
            city:       'San Francisco',
            state:      'CA',
            zip:        '94102'
        } as BuildingData;

        const building = {
            ...original,
            description: undefined
        };

        expect(hasUnsavedChanges(building, original)).toBe(false);
    });

    test('handles array properties correctly', () => {
        const original = {
            buildingID:  'test',
            oneTimeFees: [{ type: FeeType.SECURITY_DEPOSIT, amount: 500 }]
        } as BuildingData;

        const building = {
            ...original,
            oneTimeFees: [{ type: FeeType.SECURITY_DEPOSIT, amount: 500 }]
        };

        expect(hasUnsavedChanges(building, original)).toBe(false);
    });

    test('detects changes in array properties', () => {
        const original = {
            buildingID:  'test',
            oneTimeFees: [{ type: FeeType.SECURITY_DEPOSIT, amount: 500 }]
        } as BuildingData;

        const building = {
            ...original,
            oneTimeFees: [
                { type: FeeType.SECURITY_DEPOSIT, amount: 500 },
                { type: FeeType.PET_FEE, amount: 250 }
            ]
        };

        expect(hasUnsavedChanges(building, original)).toBe(true);
    });

    test('handles nested object properties correctly', () => {
        const original = {
            buildingID:  'test',
            contactInfo: {
                phone: '555-1234',
                email: 'test@example.com'
            }
        } as BuildingData;

        const building = JSON.parse(JSON.stringify(original));

        expect(hasUnsavedChanges(building, original)).toBe(false);
    });

    test('detects changes in nested object properties', () => {
        const original = {
            buildingID:  'test',
            contactInfo: {
                phone: '555-1234',
                email: 'test@example.com'
            }
        } as BuildingData;

        const building = {
            ...original,
            contactInfo: {
                ...original.contactInfo!,
                phone: '555-9999'
            }
        };

        expect(hasUnsavedChanges(building, original)).toBe(true);
    });

    test('handles property reordering correctly', () => {
        const original = {
            buildingID: 'test',
            street:     '123 Main St',
            city:       'San Francisco'
        } as BuildingData;

        const building = {
            city:       'San Francisco',
            buildingID: 'test',
            street:     '123 Main St'
        } as BuildingData;

        expect(hasUnsavedChanges(building, original)).toBe(false);
    });

    test('handles initialization timing issues correctly', () => {
        // Simulate the case where building data is loaded from server
        // but might have slightly different serialization
        const serverData = {
            buildingID: 'test',
            street:     '123 Main St',
            city:       'San Francisco',
            state:      'CA',
            zip:        '94102',
            yearBuilt:  2020,
            totalUnits: 50
        } as BuildingData;

        // Simulate the original state being set from parsed JSON
        const original = JSON.parse(JSON.stringify(serverData));

        // Simulate building state being updated from same server data
        const building = { ...serverData };

        expect(hasUnsavedChanges(building, original)).toBe(false);
    });

    test('handles very small coordinate differences as equal', () => {
        const building: BuildingData = {
            buildingID:          'test',
            latitude:            37.7749295,
            longitude:           -122.4194155,
            coordinatesVerified: true
        };
        const original: BuildingData = {
            buildingID:          'test',
            latitude:            37.7749295 + 1e-15, // Tiny floating point difference
            longitude:           -122.4194155 + 1e-15,
            coordinatesVerified: true
        };

        const result = hasUnsavedChanges(building, original);
        expect(result).toBe(false);
    });

    test('detects actual coordinate differences', () => {
        const building: BuildingData = {
            buildingID:          'test',
            latitude:            37.7749295,
            longitude:           -122.4194155,
            coordinatesVerified: true
        };
        const original: BuildingData = {
            buildingID:          'test',
            latitude:            37.7748295, // Different by 0.0001
            longitude:           -122.4194155,
            coordinatesVerified: true
        };

        const result = hasUnsavedChanges(building, original);
        expect(result).toBe(true);
    });

    test('handles coordinate verification flag changes', () => {
        const building: BuildingData = {
            buildingID:          'test',
            latitude:            37.7749295,
            longitude:           -122.4194155,
            coordinatesVerified: true
        };
        const original: BuildingData = {
            buildingID:          'test',
            latitude:            37.7749295,
            longitude:           -122.4194155,
            coordinatesVerified: false
        };

        const result = hasUnsavedChanges(building, original);
        expect(result).toBe(true);
    });
});
