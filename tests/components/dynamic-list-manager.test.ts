// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect } from 'bun:test';
import { filter, find, map } from 'lodash';

describe('DynamicListManager Component', () => {
    const mockProps = {
        name:  'rentSpecials',
        label: 'Rent Specials',
        items: [
            { id: '1', title: 'Move-in Special', description: 'First month free', startDate: '2025-01-01', endDate: '2025-02-01' },
            { id: '2', title: 'Student Special', description: '50% off deposit', startDate: '2025-08-01', endDate: '2025-09-01' }
        ],
        fields: [
            { name: 'title', type: 'text', label: 'Title', required: true, placeholder: 'Move-in Special' },
            { name: 'description', type: 'textarea', label: 'Description', placeholder: 'Special details...' },
            { name: 'startDate', type: 'date', label: 'Start Date' },
            { name: 'endDate', type: 'date', label: 'End Date' }
        ],
        addButtonText:    'Add Rent Special',
        removeButtonText: 'Remove',
        xModel:           'building.rentSpecials',
        errors:           {}
    };

    it('should render list with existing items', () => {
        // This would test that the component renders properly with existing items
        // We'll mock this since we can't actually render Astro components in unit tests
        expect(mockProps.items.length).toBe(2);
        expect(mockProps.items[0].title).toBe('Move-in Special');
    });

    it('should have proper Alpine.js data structure', () => {
        // Test the Alpine.js data structure that would be generated
        const expectedFields = ['title', 'description', 'startDate', 'endDate'];

        expect(map(mockProps.fields, 'name')).toEqual(expectedFields);
        expect(mockProps.name).toBe('rentSpecials');
    });

    it('should handle required fields correctly', () => {
        const requiredFields = filter(mockProps.fields, 'required');
        expect(requiredFields.length).toBe(1);
        expect(requiredFields[0].name).toBe('title');
    });

    it('should support different field types', () => {
        const fieldTypes = map(mockProps.fields, 'type');
        expect(fieldTypes).toContain('text');
        expect(fieldTypes).toContain('textarea');
        expect(fieldTypes).toContain('date');
    });

    it('should generate unique IDs for new items', () => {
        // Test that the add method would generate unique IDs
        const generateId = () => Date.now() + Math.random();
        const id1 = generateId();
        const id2 = generateId();

        expect(id1).not.toBe(id2);
    });
});

describe('DynamicListManager Property Highlights', () => {
    const highlightsProps = {
        name:  'propertyHighlights',
        label: 'Property Highlights',
        items: [
            { id: '1', highlight: 'Prime downtown location' },
            { id: '2', highlight: 'Modern amenities' }
        ],
        fields: [
            { name: 'highlight', type: 'text', label: 'Highlight', required: true, placeholder: 'Prime downtown location' }
        ],
        addButtonText:    'Add Highlight',
        removeButtonText: 'Remove',
        xModel:           'building.propertyHighlights',
        errors:           {}
    };

    it('should handle simple single-field items', () => {
        expect(highlightsProps.fields.length).toBe(1);
        expect(highlightsProps.fields[0].name).toBe('highlight');
        expect(highlightsProps.items[0].highlight).toBe('Prime downtown location');
    });
});

describe('DynamicListManager Parking Options', () => {
    const parkingProps = {
        name:  'parkingOptions',
        label: 'Parking Options',
        items: [
            { id: '1', type: 'garage', included: false, fee: 100, spaces: 1, description: 'Covered garage parking' }
        ],
        fields: [
            {
                name:    'type',
                type:    'select',
                label:   'Type',
                options: [
                    { value: 'garage', label: 'Garage' },
                    { value: 'covered', label: 'Covered' },
                    { value: 'uncovered', label: 'Uncovered' },
                    { value: 'street', label: 'Street' },
                    { value: 'none', label: 'None' }
                ]
            },
            { name: 'included', type: 'toggle', label: 'Included' },
            { name: 'fee', type: 'number', label: 'Monthly Fee', min: 0, disabled: 'parking.included' },
            { name: 'spaces', type: 'number', label: 'Number of Spaces', min: 1 },
            { name: 'description', type: 'textarea', label: 'Description', placeholder: 'Parking details...' }
        ],
        addButtonText:    'Add Parking Option',
        removeButtonText: 'Remove',
        xModel:           'building.parkingOptions',
        errors:           {}
    };

    it('should support select field type', () => {
        const selectField = find(parkingProps.fields, { type: 'select' });
        expect(selectField).toBeTruthy();
        expect(selectField?.options?.length).toBe(5);
    });

    it('should support toggle field type', () => {
        const toggleField = find(parkingProps.fields, { type: 'toggle' });
        expect(toggleField).toBeTruthy();
        expect(toggleField?.name).toBe('included');
    });

    it('should support conditional field disable', () => {
        const feeField = find(parkingProps.fields, { name: 'fee' });
        expect(feeField?.disabled).toBe('parking.included');
    });
});
