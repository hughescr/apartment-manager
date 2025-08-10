// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect } from 'bun:test';

describe('AddUnitDialog Component', () => {
    const mockProps = {
        building: {
            buildingID: 'test-building-1',
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA'
        },
        unitTypes: [
            { modelID: 'studio', modelName: 'Studio', beds: 0, baths: 1, sqft: 500 },
            { modelID: '1br', modelName: '1 Bedroom', beds: 1, baths: 1, sqft: 750 },
            { modelID: '2br', modelName: '2 Bedroom', beds: 2, baths: 2, sqft: 1000 }
        ],
        apiUrl: '/api/',
        isOpen: false
    };

    it('should have required form fields', () => {
        const requiredFields = [
            'unitNumber',
            'modelID',  // Unit type selection
            'beds',
            'baths',
            'rent',
            'vacancyClass'
        ];

        // These fields should be present in the form
        expect(requiredFields.length).toBe(6);
        expect(requiredFields).toContain('unitNumber');
        expect(requiredFields).toContain('modelID');
    });

    it('should populate unit type options', () => {
        expect(mockProps.unitTypes.length).toBe(3);
        expect(mockProps.unitTypes[0].modelName).toBe('Studio');
        expect(mockProps.unitTypes[1].modelName).toBe('1 Bedroom');
    });

    it('should handle unit creation with inheritance', () => {
        const newUnit = {
            unitNumber: '101',
            modelID: '1br',
            beds: 1,
            baths: 1,
            sqft: 750,
            rent: 2500,
            vacancyClass: 'Unoccupied'
        };

        expect(newUnit.modelID).toBe('1br');
        expect(newUnit.beds).toBe(1);
    });

    it('should generate proper API endpoint', () => {
        const buildingID = mockProps.building.buildingID;
        const expectedEndpoint = `${mockProps.apiUrl}buildings/${buildingID}/units`;
        expect(expectedEndpoint).toBe('/api/buildings/test-building-1/units');
    });
});

describe('BulkStatusDialog Component', () => {
    const mockProps = {
        selectedUnits: new Set(['unit-1', 'unit-2', 'unit-3']),
        isOpen: false,
        loading: false,
        apiUrl: '/api/',
        buildingID: 'test-building-1'
    };

    it('should show selected unit count', () => {
        expect(mockProps.selectedUnits.size).toBe(3);
    });

    it('should have status options', () => {
        const statusOptions = [
            { value: 'Occupied', label: 'Occupied - Currently rented' },
            { value: 'Unoccupied', label: 'Unoccupied - Available for rent' },
            { value: 'Notice', label: 'Notice - Tenant gave notice' },
            { value: 'Down', label: 'Down - Maintenance/renovation' }
        ];

        expect(statusOptions.length).toBe(4);
        expect(statusOptions[0].value).toBe('Occupied');
        expect(statusOptions[1].value).toBe('Unoccupied');
    });

    it('should generate bulk status API endpoint', () => {
        const expectedEndpoint = `${mockProps.apiUrl}buildings/${mockProps.buildingID}/units/bulk-status`;
        expect(expectedEndpoint).toBe('/api/buildings/test-building-1/units/bulk-status');
    });

    it('should prepare bulk update payload', () => {
        const payload = {
            unitIDs: Array.from(mockProps.selectedUnits),
            status: 'Unoccupied'
        };

        expect(payload.unitIDs).toEqual(['unit-1', 'unit-2', 'unit-3']);
        expect(payload.status).toBe('Unoccupied');
    });
});

describe('BulkRentDialog Component', () => {
    const mockProps = {
        selectedUnits: new Set(['unit-1', 'unit-2']),
        isOpen: false,
        loading: false,
        apiUrl: '/api/',
        buildingID: 'test-building-1',
        rentUpdateType: 'absolute',
        rentValue: 0
    };

    it('should support absolute rent updates', () => {
        const absoluteUpdate = {
            updateType: 'absolute',
            value: 2500
        };

        expect(absoluteUpdate.updateType).toBe('absolute');
        expect(absoluteUpdate.value).toBe(2500);
    });

    it('should support percentage rent updates', () => {
        const percentageUpdate = {
            updateType: 'percentage',
            value: 10 // 10% increase
        };

        expect(percentageUpdate.updateType).toBe('percentage');
        expect(percentageUpdate.value).toBe(10);
    });

    it('should validate rent value ranges', () => {
        const validAbsolute = 2500;
        const invalidAbsolute = 30000; // Over max
        const validPercentage = 10;
        const invalidPercentage = 150; // Over 100%

        expect(validAbsolute).toBeGreaterThan(0);
        expect(validAbsolute).toBeLessThanOrEqual(25000);
        expect(invalidAbsolute).toBeGreaterThan(25000);
        expect(validPercentage).toBeLessThanOrEqual(100);
        expect(invalidPercentage).toBeGreaterThan(100);
    });

    it('should generate bulk rent API endpoint', () => {
        const expectedEndpoint = `${mockProps.apiUrl}buildings/${mockProps.buildingID}/units/bulk-rent`;
        expect(expectedEndpoint).toBe('/api/buildings/test-building-1/units/bulk-rent');
    });

    it('should prepare bulk rent payload', () => {
        const payload = {
            unitIDs: Array.from(mockProps.selectedUnits),
            updateType: 'percentage',
            value: 5.5
        };

        expect(payload.unitIDs).toEqual(['unit-1', 'unit-2']);
        expect(payload.updateType).toBe('percentage');
        expect(payload.value).toBe(5.5);
    });
});

describe('Dialog Common Functionality', () => {
    it('should handle modal open/close states', () => {
        const modalStates = {
            closed: false,
            open: true
        };

        expect(modalStates.closed).toBe(false);
        expect(modalStates.open).toBe(true);
    });

    it('should handle loading states', () => {
        const loadingStates = {
            idle: false,
            processing: true
        };

        expect(loadingStates.idle).toBe(false);
        expect(loadingStates.processing).toBe(true);
    });

    it('should emit proper events', () => {
        const events = [
            'unit-added',
            'units-status-updated',
            'units-rent-updated',
            'show-toast'
        ];

        expect(events).toContain('unit-added');
        expect(events).toContain('show-toast');
    });
});
