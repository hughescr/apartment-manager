// Factory function for locationMapData Alpine component
// Extracted from LocationMapPicker.astro for centralized registry

// Type declarations for Alpine.js magic properties and global variables
declare global {
    interface Window {
        L: typeof import('leaflet')
    }
}

// Address models configuration
interface AddressModels {
    addressModel?: string
    cityModel?:    string
    stateModel?:   string
}

// Alpine.js context with magic properties
interface AlpineContext {
    $el:           HTMLElement
    $refs:         { mapElement: HTMLElement }
    $dispatch:     (event: string, data?: unknown) => void
    $nextTick:     () => Promise<void>
    $watch:        (property: string, callback: (newValue: unknown) => void) => () => void
    $root?:        { activeSectionTab?: string }
    [key: string]: unknown // Allow dynamic property access for x-model bindings
}

// LocationMapPicker Alpine.js context interface
interface LocationMapContext extends AlpineContext {
    map:            import('leaflet').Map | null
    marker:         import('leaflet').Marker | null
    geocoding:      boolean
    mapInitialized: boolean
    getNestedProperty(path: string): unknown
    setNestedProperty(path: string, value: unknown): void
    initMap(): Promise<void>
    addMarker(lat: number, lng: number): void
    setMarker(lat: number, lng: number): void
    centerOnMarker(): void
    geocodeAddress(): Promise<void>
    handleTabVisibility(): void
    initMapWhenReady(): Promise<void>
    destroy(): void
}

/**
 * Extract configuration from data attributes
 */
function extractConfig(element: HTMLElement | undefined) {
    const dataset = element?.dataset ?? {};

    return {
        latModel:      dataset.latModel ?? '',
        lngModel:      dataset.lngModel ?? '',
        verifiedModel: dataset.verifiedModel ?? null,
        defaultLat:    parseFloat(dataset.defaultLat ?? '39.8283'),
        defaultLng:    parseFloat(dataset.defaultLng ?? '-98.5795'),
        apiUrl:        dataset.apiUrl ?? '',
        addressModels: (() => {
            try {
                return JSON.parse(dataset.addressModels ?? '{}') as AddressModels;
            } catch{
                return {} as AddressModels;
            }
        })()
    };
}

/**
 * Create helper methods for property access
 */
function createPropertyHelpers(alpineContext: AlpineContext) {
    const collectDataContexts = (): Record<string, unknown>[] => {
        const contexts: Record<string, unknown>[] = [];
        const visited = new Set<Record<string, unknown>>();

        const pushContext = (context: unknown) => {
            if(context && typeof context === 'object') {
                const record = context as Record<string, unknown>;
                if(!visited.has(record)) {
                    visited.add(record);
                    contexts.push(record);
                }
            }
        };

        pushContext(alpineContext as Record<string, unknown>);

        let element: HTMLElement | null = alpineContext.$el || null;
        while(element) {
            const stack = (element as unknown as { _x_dataStack?: unknown[] })._x_dataStack;
            if(Array.isArray(stack)) {
                for(let i = stack.length - 1; i >= 0; i--) {
                    pushContext(stack[i]);
                }
            }
            element = element.parentElement;
        }

        return contexts;
    };

    const resolvePath = (context: Record<string, unknown>, parts: string[]) => {
        let current: unknown = context;

        for(let index = 0; index < parts.length; index++) {
            const part = parts[index];
            if(current == null || typeof current !== 'object' || !(part in current)) {
                return null;
            }

            if(index === parts.length - 1) {
                return {
                    container: current as Record<string, unknown>,
                    key:       part,
                    value:     (current as Record<string, unknown>)[part]
                };
            }

            current = (current as Record<string, unknown>)[part];
        }

        return null;
    };

    const resolveContainer = (context: Record<string, unknown>, parts: string[]) => {
        let current: unknown = context;

        for(const part of parts) {
            if(current == null || typeof current !== 'object' || !(part in current)) {
                return null;
            }
            current = (current as Record<string, unknown>)[part];
        }

        return current != null && typeof current === 'object' ? current as Record<string, unknown> : null;
    };

    return {
        // Helper function to get nested property value
        getNestedProperty(path: string): unknown {
            if(!path) {
                return undefined;
            }
            const parts = path.split('.');
            const contexts = collectDataContexts();

            for(const context of contexts) {
                const resolved = resolvePath(context, parts);
                if(resolved) {
                    return resolved.value;
                }
            }

            return undefined;
        },

        // Helper function to set nested property value
        setNestedProperty(path: string, value: unknown): void {
            if(!path) {
                return;
            }
            const parts = path.split('.');
            const lastPart = parts.pop();
            if(!lastPart) {
                return;
            }

            const contexts = collectDataContexts();
            let updated = false;

            for(const context of contexts) {
                const container = resolveContainer(context, parts);
                if(container) {
                    container[lastPart] = value;
                    updated = true;
                }
            }

            if(updated) {
                return;
            }

            const fallbackContext = contexts[0];
            if(!fallbackContext) {
                return;
            }

            let current: Record<string, unknown> = fallbackContext;
            for(const part of parts) {
                if(current[part] == null || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part] as Record<string, unknown>;
            }
            current[lastPart] = value;
        }
    };
}

/**
 * Create map initialization methods
 */
function createMapMethods(
    context: LocationMapContext,
    config: { latModel: string, lngModel: string, verifiedModel: string | null, defaultLat: number, defaultLng: number, apiUrl: string, addressModels: AddressModels }
) {
    const { latModel, lngModel, defaultLat, defaultLng } = config;

    return {
        async initMapWhenReady() {
            // Check if we're in a tab system
            const isInTab = context.$root?.activeSectionTab !== undefined;

            if(isInTab && context.$root!.activeSectionTab !== 'building-info') {
                // Map is in a hidden tab, waiting for tab to be visible
                const unwatch = context.$watch('$root.activeSectionTab', (newTab: unknown) => {
                    if(newTab === 'building-info') {
                        // Tab is now visible, initializing map
                        unwatch(); // Stop watching
                        void context.initMap();
                    }
                });
            } else {
                // Initialize immediately if not in a tab or if already visible
                await context.initMap();
            }
        },

        async initMap() {
            // Prevent multiple initialization
            if(context.mapInitialized || context.map) {
                return;
            }

            // Import Leaflet dynamically
            if(typeof window !== 'undefined') {
                // Import Leaflet CSS
                if(!document.querySelector('link[href*="leaflet.css"]')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    document.head.appendChild(link);
                }

                // Import Leaflet JS
                const LeafletModule = await import('leaflet');
                window.L = LeafletModule;

                // Use Alpine's $nextTick to ensure DOM is ready
                await context.$nextTick();

                // Initialize map
                const _lat = (context.getNestedProperty(latModel) as number) || defaultLat;
                const _lng = (context.getNestedProperty(lngModel) as number) || defaultLng;

                // Use x-ref to get the map element
                const mapElement = context.$refs.mapElement;
                if(!mapElement) {
                    return;
                }

                // Ensure the container has dimensions before initializing
                const rect = mapElement.getBoundingClientRect();

                // If container has no dimensions, force them
                if(rect.width === 0 || rect.height === 0) {
                    mapElement.style.minHeight = '350px';
                    mapElement.style.width = '100%';
                    await new Promise(resolve => requestAnimationFrame(resolve));
                }

                context.map = LeafletModule.map(mapElement, {
                    center:      [_lat, _lng],
                    zoom:        context.getNestedProperty(latModel) && context.getNestedProperty(lngModel) ? 16 : 4,
                    zoomControl: true,
                });

                // Add OpenStreetMap tiles
                LeafletModule.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom:     19,
                }).addTo(context.map);

                // Add marker if coordinates exist
                if(context.getNestedProperty(latModel) && context.getNestedProperty(lngModel)) {
                    context.addMarker(
                        context.getNestedProperty(latModel) as number,
                        context.getNestedProperty(lngModel) as number
                    );
                }

                // Add click handler to add/move marker
                context.map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
                    context.setMarker(e.latlng.lat, e.latlng.lng);
                });

                // Mark map as initialized to hide loading text
                context.mapInitialized = true;

                // Multiple invalidateSize calls with increasing delays for robustness
                const refreshMap = () => {
                    if(context.map) {
                        context.map.invalidateSize();
                    }
                };

                // Immediate refresh after Alpine's next tick
                await context.$nextTick();
                refreshMap();

                // Quick refresh after a short delay
                setTimeout(refreshMap, 100);
                setTimeout(refreshMap, 300);
                setTimeout(refreshMap, 1000);

                // Set up tab visibility handler
                context.handleTabVisibility();

                // Also refresh on window resize
                window.addEventListener('resize', () => refreshMap());
            }
        }
    };
}

/**
 * Create marker management methods
 */
function createMarkerMethods(
    context: LocationMapContext,
    config: { latModel: string, lngModel: string, verifiedModel: string | null }
) {
    const { latModel, lngModel, verifiedModel } = config;

    return {
        addMarker(lat: number, lng: number) {
            if(typeof window !== 'undefined' && window.L) {
                const L = window.L;

                // Remove existing marker
                if(context.marker) {
                    context.map!.removeLayer(context.marker);
                }

                // Add new draggable marker
                context.marker = L.marker([lat, lng], { draggable: true })
                    .addTo(context.map!);

                // Handle marker drag
                context.marker.on('dragend', (e: import('leaflet').DragEndEvent) => {
                    const position = (e.target as import('leaflet').Marker).getLatLng();
                    context.setMarker(position.lat, position.lng);
                });

                // Add popup
                context.marker.bindPopup(`
                    <div class="text-center">
                        <div class="font-medium">Building Location</div>
                        <div class="text-xs text-base-content/70 mt-1">
                            ${lat.toFixed(6)}, ${lng.toFixed(6)}
                        </div>
                        <div class="text-xs mt-2">
                            <em>Drag pin to adjust location</em>
                        </div>
                    </div>
                `);
            }
        },

        setMarker(lat: number, lng: number) {
            // Update the Alpine.js models
            context.setNestedProperty(latModel, lat);
            context.setNestedProperty(lngModel, lng);
            if(verifiedModel) {
                context.setNestedProperty(verifiedModel, true); // Mark as verified when manually set
            }

            // Add or update marker
            context.addMarker(lat, lng);

            // Update popup content
            if(context.marker) {
                context.marker.setPopupContent(`
                    <div class="text-center">
                        <div class="font-medium">Building Location</div>
                        <div class="text-xs text-base-content/70 mt-1">
                            ${lat.toFixed(6)}, ${lng.toFixed(6)}
                        </div>
                        <div class="text-xs mt-2">
                            <em>Drag pin to adjust location</em>
                        </div>
                    </div>
                `);
            }
        },

        centerOnMarker() {
            if(context.map && context.getNestedProperty(latModel) && context.getNestedProperty(lngModel)) {
                context.map.setView([
                    context.getNestedProperty(latModel) as number,
                    context.getNestedProperty(lngModel) as number
                ], 16);
                if(context.marker) {
                    context.marker.openPopup();
                }
            }
        }
    };
}

/**
 * Factory function for locationMapData Alpine component
 *
 * Creates an Alpine.js component for interactive map functionality with address geocoding.
 * This factory function replaces the inline component definition in LocationMapPicker.astro
 * and supports the centralized Alpine.js registration pattern.
 *
 * @returns Alpine.js component object with interactive map functionality
 *
 * @description
 * The component creates an interactive map using Leaflet.js with the following features:
 * - Interactive map with marker placement
 * - Address geocoding using Nominatim service
 * - Bidirectional data binding with form fields
 * - Automatic map initialization when component becomes visible
 * - Tab visibility handling for proper map rendering
 *
 * Data attributes used for configuration:
 * - `data-lat-model`: Property path for latitude binding
 * - `data-lng-model`: Property path for longitude binding
 * - `data-verified-model`: Property path for location verification status
 * - `data-default-lat`: Default latitude (defaults to US center: 39.8283)
 * - `data-default-lng`: Default longitude (defaults to US center: -98.5795)
 * - `data-api-url`: Base API URL for requests
 * - `data-address-models`: JSON object with address field bindings
 *
 * @example
 * ```html
 * <div
 *   x-data="locationMapData"
 *   data-lat-model="building.latitude"
 *   data-lng-model="building.longitude"
 *   data-verified-model="building.locationVerified"
 *   data-address-models='{"addressModel":"building.address","cityModel":"building.city"}'
 *   data-api-url="/api/"
 * >
 * ```
 *
 * @requires window.L - Leaflet.js library must be loaded globally
 */
export function createLocationMapFactory(this: AlpineContext): LocationMapContext {
    // Extract config from data attributes on the component element
    const element = (this.$root ?? this.$el) as HTMLElement | undefined;
    const config = extractConfig(element);
    const { latModel, lngModel, verifiedModel, apiUrl, addressModels } = config;

    const context: LocationMapContext = {
        map:            null as import('leaflet').Map | null,
        marker:         null as import('leaflet').Marker | null,
        geocoding:      false,
        mapInitialized: false,
        $el:            this.$el || null as unknown as HTMLElement,
        $refs:          this.$refs || { mapElement: null as unknown as HTMLElement },
        $dispatch:      this.$dispatch || (null as unknown as (event: string, data?: unknown) => void),
        $nextTick:      this.$nextTick || (null as unknown as () => Promise<void>),
        $watch:         this.$watch || (null as unknown as (property: string, callback: (newValue: unknown) => void) => () => void),
        $root:          this.$root ?? undefined as { activeSectionTab?: string } | undefined,

        // Placeholder properties that will be set after context is complete
        getNestedProperty: null as unknown as (path: string) => unknown,
        setNestedProperty: null as unknown as (path: string, value: unknown) => void,
        initMapWhenReady:  null as unknown as () => Promise<void>,
        initMap:           null as unknown as () => Promise<void>,
        addMarker:         null as unknown as () => void,
        setMarker:         null as unknown as () => void,
        centerOnMarker:    null as unknown as () => void,

        async geocodeAddress() {
            if(!addressModels.addressModel) {
                return;
            }

            context.geocoding = true;

            try {
                const address = context.getNestedProperty(addressModels.addressModel) as string | undefined;
                const city = addressModels.cityModel ? context.getNestedProperty(addressModels.cityModel) as string | undefined : undefined;
                const state = addressModels.stateModel ? context.getNestedProperty(addressModels.stateModel) as string | undefined : undefined;

                if(!address?.trim()) {
                    context.$dispatch('show-toast', {
                        message: 'Please enter an address first',
                        type:    'error'
                    });
                    return;
                }

                const requestBody = {
                    address: address.trim(),
                    ...(city ? { city: city.trim() } : {}),
                    ...(state ? { state: state.trim() } : {})
                };

                const response = await fetch(`${apiUrl}geocoding`, {
                    method:  'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                const data = await response.json() as {
                    success: boolean
                    result?: { lat: number, lng: number, displayName?: string }
                    error?:  string
                };

                if(data.success && data.result) {
                    // Set coordinates
                    context.setMarker(data.result.lat, data.result.lng);

                    // Center map on new location
                    context.map?.setView([data.result.lat, data.result.lng], 16);

                    // Mark as geocoded (not manually verified)
                    if(verifiedModel) {
                        context.setNestedProperty(verifiedModel, false);
                    }

                    context.$dispatch('show-toast', {
                        message: `Address geocoded: ${data.result.displayName ?? 'Location found'}`,
                        type:    'success'
                    });
                } else {
                    context.$dispatch('show-toast', {
                        message: data.error ?? 'Could not find coordinates for this address',
                        type:    'error'
                    });
                }
            } catch{
                context.$dispatch('show-toast', {
                    message: 'Failed to geocode address. Please try again.',
                    type:    'error'
                });
            } finally {
                context.geocoding = false;
            }
        },

        handleTabVisibility() {
            // Watch for tab changes and refresh map when visible
            context.$watch('$root.activeSectionTab', (newTab: unknown) => {
                if(newTab === 'building-info' && context.map) {
                    // Use Alpine's nextTick first
                    void context.$nextTick().then(() => {
                        if(!context.map) {
                            return undefined;
                        }

                        // Multiple refreshes for robustness
                        context.map.invalidateSize();

                        setTimeout(() => {
                            if(context.map) {
                                context.map.invalidateSize();
                            }
                        }, 100);

                        setTimeout(() => {
                            if(context.map) {
                                context.map.invalidateSize();
                                // Also re-center if we have coordinates
                                if(context.getNestedProperty(latModel) && context.getNestedProperty(lngModel)) {
                                    context.map.setView([
                                        context.getNestedProperty(latModel) as number,
                                        context.getNestedProperty(lngModel) as number
                                    ]);
                                }
                            }
                        }, 300);

                        return undefined;
                    });
                }
            });

            // Also handle visibility changes (for modals, hidden tabs, etc.)
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if(entry.isIntersecting && context.map) {
                        setTimeout(() => {
                            if(context.map) {
                                context.map.invalidateSize();
                            }
                        }, 100);
                    }
                });
            });

            const mapElement = context.$refs.mapElement;
            if(mapElement) {
                observer.observe(mapElement);
            }
        },

        // Clean up when component is destroyed
        destroy() {
            if(context.map) {
                context.map.remove();
                context.map = null;
            }
        }
    };

    // Fix the context references in helper methods
    const helpers = createPropertyHelpers(this);
    context.getNestedProperty = (path: string) => helpers.getNestedProperty(path);
    context.setNestedProperty = (path: string, value: unknown) => helpers.setNestedProperty(path, value);

    const mapMethods = createMapMethods(context, config);
    context.initMapWhenReady = () => mapMethods.initMapWhenReady();
    context.initMap = () => mapMethods.initMap();

    const markerMethods = createMarkerMethods(context, { latModel, lngModel, verifiedModel });
    context.addMarker = (lat: number, lng: number) => markerMethods.addMarker(lat, lng);
    context.setMarker = (lat: number, lng: number) => markerMethods.setMarker(lat, lng);
    context.centerOnMarker = () => markerMethods.centerOnMarker();

    return context;
}
