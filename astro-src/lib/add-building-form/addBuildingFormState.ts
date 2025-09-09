// Add Building Form Alpine.js state
// Extracted from AddBuildingForm.astro to centralized registration system

import _ from 'lodash';

interface AddressSuggestion {
    displayText: string
    address: {
        street: string
        city: string
        state: string
        postcode: string
        postalCode?: string
        formatted: string
    }
    coordinates?: {
        lat: number
        lng: number
    }
    confidence?: number
    source: 'radar' | 'cache'
    id: string
}

// Type removed - was unused and declared but never referenced

export function createAddBuildingFormState() {
    return {
        // Form state
        buildingName: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        description: '',
        specialtyType: 'market-rate',
        propertyWebsite: '',
        managementWebsite: '',
        saving: false,
        apiURL: '',
        // Autocomplete state
        suggestions: [],
        showSuggestions: false,
        loading: false,
        selectedIndex: -1,
        debounceTimer: null as ReturnType<typeof setTimeout> | null,
        // Geolocation state
        userLocation: null as { lat: number, lon: number } | null,
        locationStatus: 'unknown',
        locationTooltip: '',

        init() {
            this.apiURL = this.$root.parentElement?.dataset.apiUrl || '';
            // Request geolocation in the background
            this.getUserLocation();
        },

        async addBuilding() {
            if(!this.buildingName) {
                this.$dispatch?.('show-toast', {
                    message: 'Building name is required.',
                    type: 'error'
                });
                return;
            }

            this.saving = true;
            try {
                const response = await fetch(`${this.apiURL}buildings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        buildingName: this.buildingName,
                        street: this.street,
                        city: this.city,
                        state: this.state,
                        zip: this.zip,
                        description: this.description,
                        specialtyType: this.specialtyType,
                        contactInfo: {
                            propertyWebsite: this.propertyWebsite || undefined,
                            managementWebsite: this.managementWebsite || undefined
                        }
                    }),
                });

                this.saving = false;

                if(response.ok) {
                    const result = await response.json();
                    this.$dispatch?.('show-toast', {
                        message: 'Building added successfully!',
                        type: 'success'
                    });

                    // Redirect to the new building using the returned buildingID
                    window.location.hash = result.buildingID;
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } else {
                    this.$dispatch?.('show-toast', {
                        message: 'Failed to add building.',
                        type: 'error'
                    });
                }
            } catch(error) {
                this.saving = false;
                this.$dispatch?.('show-toast', {
                    message: 'Failed to add building: ' + (error as Error).message,
                    type: 'error'
                });
            }
        },

        clearForm() {
            this.buildingName = '';
            this.street = '';
            this.city = '';
            this.state = '';
            this.zip = '';
            this.description = '';
            this.specialtyType = 'market-rate';
            this.propertyWebsite = '';
            this.managementWebsite = '';
            // Clear autocomplete state
            this.suggestions = [];
            this.showSuggestions = false;
            this.loading = false;
            this.selectedIndex = -1;
            if(this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }
            // Don't clear geolocation state when clearing form
        },

        updateBuildingNameFromAddress() {
            if(this.street && !this.buildingName) {
                // Simple address parsing to extract street number and main street name
                const streetParts = _.split(_.trim(this.street), /\s+/);
                if(streetParts.length >= 2) {
                    const streetNumber = streetParts[0];
                    // Find the main street name (skip directional prefixes and street types)
                    const streetWords = streetParts.slice(1);
                    const skipWords = ['n', 'north', 's', 'south', 'e', 'east', 'w', 'west', 'ne', 'nw', 'se', 'sw',
                        'st', 'street', 'ave', 'avenue', 'rd', 'road', 'blvd', 'boulevard', 'pkwy', 'parkway',
                        'ln', 'lane', 'dr', 'drive', 'ct', 'court', 'pl', 'place', 'way'];

                    const mainStreetWords = _.filter(streetWords, word =>
                        !skipWords.includes(_.replace(_.toLower(word), /[^a-z]/g, ''))
                    );

                    if(mainStreetWords.length > 0) {
                        this.buildingName = `${streetNumber} ${mainStreetWords.join(' ')}`;
                    }
                }
            }
        },

        handleStreetInput(event: Event) {
            const target = event.target as HTMLInputElement;
            const query = _.trim(target.value);

            // Clear existing timer
            if(this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            if(query.length < 3) {
                this.hideSuggestions();
                return;
            }

            // Debounce API calls to 200ms
            this.debounceTimer = setTimeout(() => {
                this.searchAddresses(query);
            }, 200);
        },

        async searchAddresses(query: string) {
            this.loading = true;
            this.selectedIndex = -1;

            try {
                // Build request with optional coordinates
                const params = new URLSearchParams({ q: query, limit: '5' });
                if(this.userLocation) {
                    params.append('lat', this.userLocation.lat.toString());
                    params.append('lon', this.userLocation.lon.toString());
                }

                const response = await fetch(`${this.apiURL}autocomplete/address?${params}`);
                if(response.ok) {
                    const data = await response.json();
                    if(data.success && data.suggestions) {
                        this.suggestions = data.suggestions;
                        this.showSuggestions = this.suggestions.length > 0;
                    } else {
                        this.hideSuggestions();
                    }
                } else {
                    // Graceful error handling - hide autocomplete but don't break form
                    this.hideSuggestions();
                }
            } catch{
                // Graceful error handling - autocomplete fails silently
                this.hideSuggestions();
            } finally {
                this.loading = false;
            }
        },

        selectSuggestion(suggestion: AddressSuggestion) {
            // Auto-populate form fields
            this.street = suggestion.address.street || '';
            this.city = suggestion.address.city || '';
            this.state = suggestion.address.state || '';
            this.zip = suggestion.address.postalCode || suggestion.address.postcode || '';

            // Update building name from the populated address
            this.updateBuildingNameFromAddress();

            this.hideSuggestions();
        },

        navigateOptions(direction: 'up' | 'down') {
            if(!this.showSuggestions || this.suggestions.length === 0) {
                return;
            }

            if(direction === 'down') {
                this.selectedIndex = this.selectedIndex < this.suggestions.length - 1
                    ? this.selectedIndex + 1
                    : 0;
            } else {
                this.selectedIndex = this.selectedIndex > 0
                    ? this.selectedIndex - 1
                    : this.suggestions.length - 1;
            }
        },

        hideSuggestions() {
            this.showSuggestions = false;
            this.suggestions = [];
            this.selectedIndex = -1;
            this.loading = false;
        },

        handleKeydown(event: KeyboardEvent) {
            if(!this.showSuggestions) {
                return;
            }

            switch(event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    this.navigateOptions('down');
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    this.navigateOptions('up');
                    break;
                case 'Enter':
                    event.preventDefault();
                    if(this.selectedIndex >= 0 && this.suggestions[this.selectedIndex]) {
                        this.selectSuggestion(this.suggestions[this.selectedIndex]);
                    }
                    break;
                case 'Escape':
                    this.hideSuggestions();
                    break;
            }
        },

        async getUserLocation() {
            if(!navigator.geolocation) {
                this.locationStatus = 'unavailable';
                this.locationTooltip = 'Geolocation not supported by browser';
                return;
            }

            this.locationStatus = 'loading';
            this.locationTooltip = 'Getting your location...';

            try {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: false,
                        timeout: 10000,
                        maximumAge: 300000 // 5 minutes
                    });
                });

                this.userLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                this.locationStatus = 'granted';
                this.locationTooltip = 'Location enabled - showing nearby results first';
            } catch{
                // Geolocation permission denied or unavailable - silent fallback
                this.locationStatus = 'denied';
                this.locationTooltip = 'Location permission denied - showing general results';
            }
        },

        // Alpine magic properties are provided by AlpineComponentData
        $dispatch: (() => undefined) as ((name: string, detail?: unknown) => void),
        $root: null as unknown as HTMLElement,
        $el: null as unknown as HTMLElement,
        $watch: (() => undefined) as ((property: string, callback: (...args: unknown[]) => void) => void),
        $nextTick: (() => undefined) as ((callback: () => void) => void),
        $store: {} as Record<string, unknown>
    };
}
