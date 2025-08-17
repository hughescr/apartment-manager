import { describe, it, expect, beforeEach } from 'bun:test';
import { promises as fs } from 'fs';

let componentSrc: string;

// Load component source before tests
beforeEach(async () => {
    if(!componentSrc) {
        componentSrc = await fs.readFile(new URL('../../astro-src/components/AddBuildingForm.astro', import.meta.url), 'utf8');
    }
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
            expect(componentSrc).toContain('@keydown="handleKeydown($event)"');
            expect(componentSrc).toContain('ArrowDown');
            expect(componentSrc).toContain('ArrowUp');
            expect(componentSrc).toContain('Enter');
            expect(componentSrc).toContain('Escape');
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
            expect(componentSrc).toContain('suggestions: []');
            expect(componentSrc).toContain('showSuggestions: false');
            expect(componentSrc).toContain('loading: false');
            expect(componentSrc).toContain('selectedIndex: -1');
            expect(componentSrc).toContain('debounceTimer: null');
        });

        it('has geolocation state properties', () => {
            expect(componentSrc).toContain('userLocation: null');
            expect(componentSrc).toContain('locationStatus: \'unknown\'');
            expect(componentSrc).toContain('locationTooltip: \'\'');
        });

        it('has autocomplete methods', () => {
            expect(componentSrc).toContain('searchAddresses');
            expect(componentSrc).toContain('selectSuggestion');
            expect(componentSrc).toContain('navigateOptions');
            expect(componentSrc).toContain('hideSuggestions');
            expect(componentSrc).toContain('handleStreetInput');
        });

        it('has geolocation methods', () => {
            expect(componentSrc).toContain('getUserLocation');
        });

        it('has debounced input handler', () => {
            expect(componentSrc).toContain('debounceTimer');
            expect(componentSrc).toContain('200'); // 200ms debounce
            expect(componentSrc).toContain('setTimeout');
            expect(componentSrc).toContain('clearTimeout');
        });
    });

    describe('API Integration', () => {
        it('uses correct autocomplete endpoint', () => {
            expect(componentSrc).toContain('autocomplete/address');
            expect(componentSrc).toContain('limit');
        });

        it('includes coordinates in API request when available', () => {
            expect(componentSrc).toContain('if(this.userLocation)');
            expect(componentSrc).toContain('lat');
            expect(componentSrc).toContain('lon');
        });

        it('handles API errors gracefully', () => {
            expect(componentSrc).toContain('catch');
            expect(componentSrc).toContain('hideSuggestions()');
        });
    });

    describe('User Interaction', () => {
        it('has input event handler with debouncing', () => {
            expect(componentSrc).toContain('@input="handleStreetInput($event)"');
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
            expect(componentSrc).toContain('this.getUserLocation()');
        });

        it('handles geolocation permission states', () => {
            expect(componentSrc).toContain('locationStatus === \'granted\'');
            expect(componentSrc).toContain('locationStatus === \'denied\'');
            expect(componentSrc).toContain('locationStatus === \'unavailable\'');
            expect(componentSrc).toContain('locationStatus === \'loading\'');
        });

        it('has visual status indicators', () => {
            expect(componentSrc).toContain('Location enabled');
            expect(componentSrc).toContain('Location permission denied');
            expect(componentSrc).toContain('Geolocation not supported');
        });

        it('uses proper geolocation API options', () => {
            expect(componentSrc).toContain('enableHighAccuracy: false');
            expect(componentSrc).toContain('timeout: 10000');
            expect(componentSrc).toContain('maximumAge: 300000');
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
            expect(componentSrc).toContain('updateBuildingNameFromAddress');
            expect(componentSrc).toContain('addBuilding');
            expect(componentSrc).toContain('clearForm');
        });

        it('clears autocomplete state in clearForm', () => {
            // Should clear suggestions and hide dropdown when form is cleared
            expect(componentSrc).toContain('this.suggestions = []');
            expect(componentSrc).toContain('this.showSuggestions = false');
        });
    });
});

describe('AddBuildingForm Autocomplete Types', () => {
    it('has proper TypeScript types for autocomplete', () => {
        expect(componentSrc).toContain('suggestions: AddressSuggestion[]');
        expect(componentSrc).toContain('showSuggestions: boolean');
        expect(componentSrc).toContain('loading: boolean');
        expect(componentSrc).toContain('selectedIndex: number');
        expect(componentSrc).toContain('debounceTimer: ReturnType<typeof setTimeout> | null');
    });

    it('has proper TypeScript types for geolocation', () => {
        expect(componentSrc).toContain('userLocation: { lat: number; lon: number } | null');
        expect(componentSrc).toContain('locationStatus: \'unknown\' | \'granted\' | \'denied\' | \'unavailable\' | \'loading\'');
        expect(componentSrc).toContain('locationTooltip: string');
    });

    it('has AddressSuggestion interface', () => {
        expect(componentSrc).toContain('interface AddressSuggestion');
        expect(componentSrc).toContain('displayText: string');
        expect(componentSrc).toContain('address: {');
        expect(componentSrc).toContain('street: string');
        expect(componentSrc).toContain('city: string');
        expect(componentSrc).toContain('state: string');
        expect(componentSrc).toContain('postcode: string');
    });
});
