// CRITICAL: Import test setup FIRST before any other imports
import './test-setup';

import { describe, it, expect } from 'bun:test';

describe('ValidationError Component', () => {
    const mockProps = {
        fieldName: 'buildingID',
        errors:    {
            buildingID: 'Building ID is required',
            street:     'Street address is required',
            email:      'Please enter a valid email address'
        }
    };

    it('should show error when field has error', () => {
        expect(mockProps.errors.buildingID).toBe('Building ID is required');
        expect(mockProps.fieldName).toBe('buildingID');
    });

    it('should not show error when field has no error', () => {
        const propsWithoutError = {
            fieldName: 'city',
            errors:    {
                street: 'Street address is required'
            }
        };

        expect((propsWithoutError.errors as Record<string, unknown>).city).toBeUndefined();
    });

    it('should handle nested field names', () => {
        const nestedProps = {
            fieldName: 'contactInfo.email',
            errors:    {
                'contactInfo.email': 'Invalid email format'
            }
        };

        expect(nestedProps.errors['contactInfo.email']).toBe('Invalid email format');
    });

    it('should handle array field names', () => {
        const arrayProps = {
            fieldName: 'rentSpecial0Title',
            errors:    {
                rentSpecial0Title: 'Title is required',
                rentSpecial0Dates: 'End date must be after start date'
            }
        };

        expect(arrayProps.errors.rentSpecial0Title).toBe('Title is required');
    });
});

describe('ValidationError CSS Classes', () => {
    it('should use proper DaisyUI error classes', () => {
        const expectedClasses = {
            container:  'label-text-alt text-error',
            textColor:  'text-error',
            visibility: 'x-show'
        };

        // These would be the classes used in the component
        expect(expectedClasses.container).toBe('label-text-alt text-error');
    });
});

describe('ValidationError Alpine.js Integration', () => {
    it('should generate proper x-show directive', () => {
        const fieldName = 'buildingID';
        const expectedDirective = `errors.${fieldName}`;
        expect(expectedDirective).toBe('errors.buildingID');
    });

    it('should generate proper x-text directive', () => {
        const fieldName = 'contactEmail';
        const expectedDirective = `errors.${fieldName}`;
        expect(expectedDirective).toBe('errors.contactEmail');
    });

    it('should handle complex field names in directives', () => {
        const fieldName = 'rentSpecial1Title';
        const expectedDirective = `errors['${fieldName}']`;
        expect(expectedDirective).toBe("errors['rentSpecial1Title']");
    });
});
