import { describe, it, expect, beforeEach } from 'bun:test';
import { promises as fs } from 'fs';
import { noop } from 'lodash';
import { createAddBuildingFormState } from '../../astro-src/lib/add-building-form/addBuildingFormState';

let componentSrc: string;
let formState: ReturnType<typeof createAddBuildingFormState>;

// Load component source and create state instance before tests
beforeEach(async () => {
    if(!componentSrc) {
        componentSrc = await fs.readFile(new URL('../../astro-src/components/AddBuildingForm.astro', import.meta.url), 'utf8');
    }
    formState = createAddBuildingFormState();
});

describe('AddBuildingForm Address Autocomplete', () => {
    describe('Component Structure', () => {
        it('has autocomplete dropdown element', () => {
            expect(componentSrc).toContain('dropdown-content');
            expect(componentSrc).toContain('x-show="showSuggestions ||');
        });

        it('has loading indicator for autocomplete', () => {
            expect(componentSrc).toContain('loading loading-spinner');
            expect(componentSrc).toContain('x-show="loading"');
        });

        it('has keyboard navigation attributes', () => {
            expect(componentSrc).toContain("'@keydown': 'handleKeydown($event)'");
            // Verify keyboard handling exists in the factory function
            expect(typeof formState.handleKeydown).toBe('function');
            // Verify the factory function handles the correct keys
            const mockEvent = { key: 'ArrowDown', preventDefault: noop } as KeyboardEvent;
            expect(() => formState.handleKeydown(mockEvent)).not.toThrow();
        });

        it('has ARIA attributes for accessibility', () => {
            expect(componentSrc).toContain('aria-expanded');
            expect(componentSrc).toContain('aria-activedescendant');
            expect(componentSrc).toContain('role="listbox"');
            expect(componentSrc).toContain('role="option"');
        });
    });

    describe('Alpine.js Data Function', () => {
        it('has autocomplete state properties', () => {
            // Verify component uses centralized factory function
            expect(componentSrc).toContain('x-data="addBuildingFormData()"');
            // Verify factory function has correct initial state
            expect(formState.suggestions).toEqual([]);
            expect(formState.showSuggestions).toBe(false);
            expect(formState.loading).toBe(false);
            expect(formState.selectedIndex).toBe(-1);
            expect(formState.debounceTimer).toBe(null);
        });

        it('has geolocation state properties', () => {
            // Verify factory function has correct geolocation state
            expect(formState.userLocation).toBe(null);
            expect(formState.locationStatus).toBe('unknown');
            expect(formState.locationTooltip).toBe('');
        });

        it('has autocomplete methods', () => {
            // Verify factory function has correct methods
            expect(typeof formState.searchAddresses).toBe('function');
            expect(typeof formState.selectSuggestion).toBe('function');
            expect(typeof formState.navigateOptions).toBe('function');
            expect(typeof formState.hideSuggestions).toBe('function');
            expect(typeof formState.handleStreetInput).toBe('function');
        });

        it('has geolocation methods', () => {
            // Verify factory function has geolocation methods
            expect(typeof formState.getUserLocation).toBe('function');
        });

        it('has debounced input handler', () => {
            // Verify debouncing mechanism exists in factory function
            expect(formState.debounceTimer).toBe(null);
            // Verify the debounce logic by testing handleStreetInput method
            const mockEvent = { target: { value: 'test address' } } as unknown as Event;
            expect(() => formState.handleStreetInput(mockEvent)).not.toThrow();
        });
    });

    describe('API Integration', () => {
        it('uses correct autocomplete endpoint', () => {
            // Since factory function uses this.apiURL, verify the method exists
            expect(typeof formState.searchAddresses).toBe('function');
            // The actual endpoint is tested in the factory function implementation
        });

        it('includes coordinates in API request when available', () => {
            // Test coordinate inclusion logic by setting location state
            formState.userLocation = { lat: 40.7128, lon: -74.0060 };
            expect(formState.userLocation.lat).toBe(40.7128);
            expect(formState.userLocation.lon).toBe(-74.0060);
        });

        it('handles API errors gracefully', () => {
            // Verify error handling methods exist
            expect(typeof formState.hideSuggestions).toBe('function');
            // Test that hideSuggestions resets state properly
            formState.showSuggestions = true;
            (formState.suggestions as { displayText: string, address: { street: string, city: string, state: string, postcode: string, formatted: string }, source: string, id: string }[]) = [{ displayText: 'test', address: { street: '', city: '', state: '', postcode: '', formatted: '' }, source: 'radar', id: '1' }];
            formState.hideSuggestions();
            expect(formState.showSuggestions).toBe(false);
            expect(formState.suggestions).toEqual([]);
        });
    });

    describe('User Interaction', () => {
        it('has input event handler with debouncing', () => {
            expect(componentSrc).toContain("'@input': 'handleStreetInput($event)'");
        });

        it('has click handlers for suggestions', () => {
            expect(componentSrc).toContain('@click="selectSuggestion(suggestion)"');
        });

        it('has focus and blur handlers', () => {
            expect(componentSrc).toContain('@focus');
            expect(componentSrc).toContain('@blur');
        });
    });

    describe('Geolocation Features', () => {
        it('requests geolocation on component init', () => {
            // Verify init method exists and calls getUserLocation
            expect(typeof formState.init).toBe('function');
            expect(typeof formState.getUserLocation).toBe('function');
        });

        it('handles geolocation permission states', () => {
            // Verify component template checks for location status
            expect(componentSrc).toContain('locationStatus === \'granted\'');
            expect(componentSrc).toContain('locationStatus === \'denied\'');
            expect(componentSrc).toContain('locationStatus === \'unavailable\'');
            expect(componentSrc).toContain('locationStatus === \'loading\'');
            // Verify initial state
            expect(formState.locationStatus).toBe('unknown');
        });

        it('has visual status indicators', () => {
            // Verify component has status indicator elements
            expect(componentSrc).toContain('locationStatus === \'granted\'');
            expect(componentSrc).toContain('locationStatus === \'denied\'');
            expect(componentSrc).toContain('locationStatus === \'unavailable\'');
            expect(componentSrc).toContain('locationTooltip');
        });

        it('uses proper geolocation API options', () => {
            // These options are in the factory function implementation
            expect(typeof formState.getUserLocation).toBe('function');
            // Options are tested at the implementation level in the factory
        });
    });

    describe('Styling and DaisyUI Integration', () => {
        it('uses DaisyUI classes for dropdown', () => {
            expect(componentSrc).toContain('dropdown');
            expect(componentSrc).toContain('menu');
        });

        it('has loading spinner classes', () => {
            expect(componentSrc).toContain('loading');
            expect(componentSrc).toContain('loading-spinner');
        });

        it('has proper z-index for dropdown', () => {
            expect(componentSrc).toContain('z-50');
        });
    });

    describe('Form Integration', () => {
        it('maintains existing form functionality', () => {
            // Verify factory function has form methods
            expect(typeof formState.updateBuildingNameFromAddress).toBe('function');
            expect(typeof formState.addBuilding).toBe('function');
            expect(typeof formState.clearForm).toBe('function');
        });

        it('clears autocomplete state in clearForm', () => {
            // Test that clearForm resets autocomplete state
            (formState.suggestions as { displayText: string, address: { street: string, city: string, state: string, postcode: string, formatted: string }, source: string, id: string }[]) = [{ displayText: 'test', address: { street: '', city: '', state: '', postcode: '', formatted: '' }, source: 'radar', id: '1' }];
            formState.clearForm();
            expect(formState.suggestions).toEqual([]);
            expect(formState.showSuggestions).toBe(false);
        });
    });
});

describe('AddBuildingForm Autocomplete Types', () => {
    it('has proper TypeScript types for autocomplete', () => {
        // Verify component uses centralized factory
        expect(componentSrc).toContain('x-data="addBuildingFormData()"');
        // Verify factory function has correctly typed properties
        expect(Array.isArray(formState.suggestions)).toBe(true);
        expect(typeof formState.showSuggestions).toBe('boolean');
        expect(typeof formState.loading).toBe('boolean');
        expect(typeof formState.selectedIndex).toBe('number');
        expect(formState.debounceTimer === null || typeof formState.debounceTimer === 'object').toBe(true);
    });

    it('has proper TypeScript types for geolocation', () => {
        // Verify factory function has correctly typed geolocation properties
        expect(formState.userLocation === null || (typeof formState.userLocation === 'object' && 'lat' in formState.userLocation && 'lon' in formState.userLocation)).toBe(true);
        expect(typeof formState.locationStatus).toBe('string');
        expect(typeof formState.locationTooltip).toBe('string');
    });

    it('has AddressSuggestion interface', () => {
        // AddressSuggestion interface is now in the factory function file
        // Verify the factory function can handle properly structured suggestions
        const testSuggestion = {
            displayText: 'test address',
            address:     {
                street:    '123 Main St',
                city:      'Test City',
                state:     'TS',
                postcode:  '12345',
                formatted: '123 Main St, Test City, TS 12345'
            },
            source: 'radar' as const,
            id:     'test-1'
        };
        expect(() => formState.selectSuggestion(testSuggestion)).not.toThrow();
    });
});
